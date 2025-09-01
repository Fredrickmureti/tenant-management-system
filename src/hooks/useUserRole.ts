import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'admin' | 'clerk' | 'tenant' | 'superadmin';

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole(null);
        } else {
          setRole(data.role as UserRole);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  const isAdmin = role === 'admin';
  const isClerk = role === 'clerk';
  const isTenant = role === 'tenant';
  const isSuperAdmin = role === 'superadmin';

  return {
    role,
    loading,
    isAdmin,
    isClerk,
    isTenant,
    isSuperAdmin,
    canExport: isAdmin || isClerk || isSuperAdmin, // Admin, clerk, and superadmin can export data
    canImport: isAdmin || isClerk || isSuperAdmin, // Admin, clerk, and superadmin can import data
    canManageAdmins: isAdmin || isSuperAdmin, // Only admin and superadmin can manage other admins
    canViewAuditLogs: isSuperAdmin, // Only superadmin can view audit logs
    canDeleteFailedMessages: isAdmin || isSuperAdmin, // Admin and superadmin can delete failed messages
  };
};