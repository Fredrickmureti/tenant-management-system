import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Eye, AlertCircle, Database, Edit, Trash, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

interface AuditLog {
  id: string;
  actor_id: string;
  actor_role: 'clerk';
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  row_id?: string;
  changes: any;
  created_at: string;
}

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { toast } = useToast();
  const { canViewAuditLogs } = useUserRole();

  useEffect(() => {
    if (!canViewAuditLogs) return;
    loadLogs();
    
    // Set up real-time subscription for new audit logs
    const channel = supabase
      .channel('audit-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs'
        },
        (payload) => {
          setLogs(current => [payload.new as AuditLog, ...current]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canViewAuditLogs]);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data as unknown as AuditLog[] || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT': return <Plus className="h-3 w-3" />;
      case 'UPDATE': return <Edit className="h-3 w-3" />;
      case 'DELETE': return <Trash className="h-3 w-3" />;
      default: return <Database className="h-3 w-3" />;
    }
  };

  const formatTableName = (tableName: string) => {
    return tableName.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatChanges = (changes: any, action: string) => {
    if (!changes) return 'No data';
    
    try {
      if (action === 'UPDATE' && changes.old && changes.new) {
        const oldData = changes.old;
        const newData = changes.new;
        const changedFields = Object.keys(newData).filter(
          key => JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])
        );
        
        return changedFields.map(field => (
          <div key={field} className="text-xs">
            <span className="font-medium">{field}:</span>{' '}
            <span className="text-red-600">{String(oldData[field])}</span>{' '}
            → <span className="text-green-600">{String(newData[field])}</span>
          </div>
        ));
      } else {
        // For INSERT or DELETE, show the data
        const data = changes;
        return (
          <div className="text-xs space-y-1">
            {Object.entries(data).slice(0, 5).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{key}:</span> {String(value)}
              </div>
            ))}
            {Object.keys(data).length > 5 && (
              <div className="text-muted-foreground">
                ... and {Object.keys(data).length - 5} more fields
              </div>
            )}
          </div>
        );
      }
    } catch (error) {
      return 'Unable to parse changes';
    }
  };

  // Filter logs based on search and date range
  const filtered = logs.filter(log => {
    const matchesSearch = `${log.table_name} ${log.action} ${log.actor_role}`
      .toLowerCase()
      .includes(query.toLowerCase());
    
    const logDate = new Date(log.created_at);
    const matchesDateRange = (!startDate || logDate >= new Date(startDate)) &&
      (!endDate || logDate <= new Date(endDate));
    
    return matchesSearch && matchesDateRange;
  });

  if (!canViewAuditLogs) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Access Denied</h3>
          <p className="text-muted-foreground">You don't have permission to view audit logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Search logs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-48"
          />
          <div className="flex gap-2 items-center">
            <CalendarIcon className="h-4 w-4" />
            <Input
              type="date"
              placeholder="Start date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              placeholder="End date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Clerk Activity Monitor
            {logs.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {filtered.length} logs
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No clerk activity recorded yet.
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((log) => (
                <div key={log.id} className="border rounded-md p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2">
                        <Badge className={getActionColor(log.action)}>
                          {getActionIcon(log.action)}
                          <span className="ml-1">{log.action}</span>
                        </Badge>
                        <Badge variant="outline">
                          <Database className="h-3 w-3 mr-1" />
                          {formatTableName(log.table_name)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('en-KE')}
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <h4 className="text-sm font-medium mb-2">Changes:</h4>
                    {formatChanges(log.changes, log.action)}
                  </div>
                  
                  {log.row_id && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Record ID: {log.row_id}
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

export default AuditLogs;