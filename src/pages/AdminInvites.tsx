import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Mail, Clock, Check, X, AlertCircle, Trash2, Users, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';

interface AdminInvite {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'clerk';
  invited_by: string;
  status: 'pending' | 'sent' | 'accepted' | 'failed';
  error?: string;
  created_at: string;
  updated_at: string;
  accepted_at?: string;
}

interface InviteForm {
  email: string;
  full_name: string;
  role: 'admin' | 'clerk';
  temporaryPassword: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: 'admin' | 'clerk' | 'superadmin';
  created_at: string;
}

const AdminInvites = () => {
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { canManageAdmins, isSuperAdmin } = useUserRole();
  const { user } = useAuth();

  const [form, setForm] = useState<InviteForm>({
    email: '',
    full_name: '',
    role: 'clerk',
    temporaryPassword: ''
  });

  useEffect(() => {
    if (!canManageAdmins) return;
    loadInvites();
    loadUsers();
  }, [canManageAdmins]);

  // Generate a random password when the dialog opens
  useEffect(() => {
    if (isDialogOpen && !form.temporaryPassword) {
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      setForm(prev => ({ ...prev, temporaryPassword: randomPassword }));
    }
  }, [isDialogOpen, form.temporaryPassword]);

  const loadInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_invites' as any)
        .select('*')
        // Show both pending and sent invites, but not failed ones (they should be auto-deleted)
        .in('status', ['pending', 'sent', 'accepted'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites((data as unknown as AdminInvite[]) || []);
    } catch (error) {
      console.error('Error loading invites:', error);
      toast({
        title: "Error",
        description: "Failed to load admin invites",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'clerk', 'superadmin'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Filter and cast to ensure correct types
      const adminUsers = (data || []).filter(user => 
        ['admin', 'clerk', 'superadmin'].includes(user.role)
      ) as UserProfile[];
      setUsers(adminUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName}? This action cannot be undone.`)) {
      return;
    }

    setUsersLoading(true);
    try {
      console.log('Attempting to delete user:', userId);
      
      // Delete from profiles table first 
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
        throw new Error(`Failed to remove user profile: ${profileError.message}`);
      }

      // Then delete from auth.users using admin API
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) {
        console.error('Error deleting auth user:', authError);
        // Profile deletion already succeeded, so we'll continue but warn about auth deletion
        console.warn('Profile deleted but auth user deletion failed:', authError);
      }

      toast({
        title: "Success",
        description: `${userName} has been removed successfully`,
      });

      // Reload users list
      await loadUsers();
    } catch (error: any) {
      console.error('Error removing user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove user",
        variant: "destructive"
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!form.email || !form.full_name || !form.temporaryPassword) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    try {
      // First create the invite record
      const { data: inviteData, error: inviteError } = await supabase
        .from('admin_invites' as any)
        .insert({
          email: form.email,
          full_name: form.full_name,
          role: form.role,
          invited_by: user?.id,
          status: 'pending'
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      const invite = inviteData as unknown as AdminInvite;

      // Then send the invite email
      const { data: functionData, error: functionError } = await supabase.functions.invoke('send-admin-invite', {
        body: {
          inviteId: invite.id,
          email: form.email,
          fullName: form.full_name,
          role: form.role,
          temporaryPassword: form.temporaryPassword
        }
      });

      if (functionError) {
        console.error('Function error:', functionError);
        
        // Try to delete the invite record, with fallback to marking as failed
        try {
          const { error: deleteError } = await supabase
            .from('admin_invites' as any)
            .delete()
            .eq('id', invite.id);
            
          if (deleteError) {
            console.error('Failed to delete invite:', deleteError);
            // Fallback: mark as failed if deletion doesn't work
            await supabase
              .from('admin_invites' as any)
              .update({ 
                status: 'failed', 
                error: functionError.context?.error || functionError.message || "Email sending failed"
              })
              .eq('id', invite.id);
          }
        } catch (deleteErr) {
          console.error('Error during cleanup:', deleteErr);
          // Fallback: mark as failed
          await supabase
            .from('admin_invites' as any)
            .update({ 
              status: 'failed', 
              error: functionError.context?.error || functionError.message || "Email sending failed"
            })
            .eq('id', invite.id);
        }
        
        // Extract better error message from the function response
        const errorMessage = functionError.context?.error || functionError.message || "Failed to send invite";
        
        toast({
          title: "Failed to send invite",
          description: errorMessage,
          variant: "destructive"
        });
        
        // Refresh the list and return early
        loadInvites();
        return;
      }

      // Update invite status to sent
      await supabase
        .from('admin_invites' as any)
        .update({ status: 'sent' })
        .eq('id', invite.id);

      // Show success message
      toast({
        title: "User account created!",
        description: `Account created for ${form.email}. Login credentials have been sent via email.`,
      });

      setForm({ email: '', full_name: '', role: 'clerk', temporaryPassword: '' });
      setIsDialogOpen(false);
      loadInvites();
      loadUsers();

    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invite",
        variant: "destructive"
      });
      // Always refresh the list to ensure it's current
      loadInvites();
      loadUsers();
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Mail className="h-4 w-4" />;
      case 'accepted': return <Check className="h-4 w-4" />;
      case 'failed': return <X className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (!canManageAdmins) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Access Denied</h3>
          <p className="text-muted-foreground">You don't have permission to manage admin invites.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-3xl font-bold">Admin Invites</h1>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Send Invite
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Admin or Clerk</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={form.role} onValueChange={(value: 'admin' | 'clerk') => 
                  setForm(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clerk">Clerk</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="temporaryPassword">Temporary Password</Label>
                <div className="relative">
                  <Input
                    id="temporaryPassword"
                    type={showPassword ? "text" : "password"}
                    value={form.temporaryPassword}
                    onChange={(e) => setForm(prev => ({ ...prev, temporaryPassword: e.target.value }))}
                    placeholder="Enter temporary password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This password will be sent to the user. They should change it after first login.
                </p>
              </div>

              <Button onClick={handleSendInvite} disabled={sending} className="w-full">
                {sending ? 'Sending...' : 'Send Invite'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* User Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current Admin Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="py-10 text-center text-muted-foreground">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No admin users found.
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((userProfile) => (
                <div key={userProfile.id} className="border rounded-md p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">{userProfile.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Added {new Date(userProfile.created_at).toLocaleString('en-KE')}
                        </div>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {userProfile.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {(isSuperAdmin || (userProfile.role !== 'admin' && userProfile.role !== 'superadmin')) && userProfile.user_id !== user?.id && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveUser(userProfile.user_id, userProfile.full_name)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invites</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Loading...</div>
          ) : invites.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No invites sent yet. Send your first invite using the button above.
            </div>
          ) : (
            <div className="space-y-4">
              {invites.map((invite) => (
                <div key={invite.id} className="border rounded-md p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">{invite.full_name || invite.email}</div>
                        <div className="text-sm text-muted-foreground">{invite.email}</div>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {invite.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(invite.status)}>
                        {getStatusIcon(invite.status)}
                        <span className="ml-1 capitalize">{invite.status}</span>
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Sent {new Date(invite.created_at).toLocaleString('en-KE')}
                  </div>
                  {invite.error && (
                    <div className="text-xs text-red-600 mt-1">
                      Error: {invite.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInvites;