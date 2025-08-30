import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, Receipt, DollarSign, AlertTriangle } from 'lucide-react';

interface DashboardStats {
  totalTenants: number;
  totalBilledThisMonth: number;
  totalPaid: number;
  totalOutstanding: number;
  defaultersCount: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalTenants: 0,
    totalBilledThisMonth: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    defaultersCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // Get total tenants
      const { count: totalTenants } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get current month billing stats
      const { data: billingData } = await supabase
        .from('billing_cycles')
        .select('bill_amount, paid_amount, current_balance')
        .eq('month', currentMonth)
        .eq('year', currentYear);

      // Calculate stats
      const totalBilledThisMonth = billingData?.reduce((sum, bill) => sum + (bill.bill_amount || 0), 0) || 0;
      const totalPaid = billingData?.reduce((sum, bill) => sum + (bill.paid_amount || 0), 0) || 0;
      const totalOutstanding = billingData?.reduce((sum, bill) => sum + (bill.current_balance || 0), 0) || 0;
      const defaultersCount = billingData?.filter(bill => (bill.current_balance || 0) > 0).length || 0;

      setStats({
        totalTenants: totalTenants || 0,
        totalBilledThisMonth,
        totalPaid,
        totalOutstanding,
        defaultersCount,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Tenants',
      value: stats.totalTenants,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Billed This Month',
      value: `₹${stats.totalBilledThisMonth.toLocaleString()}`,
      icon: Receipt,
      color: 'text-green-600',
    },
    {
      title: 'Total Paid',
      value: `₹${stats.totalPaid.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-emerald-600',
    },
    {
      title: 'Outstanding',
      value: `₹${stats.totalOutstanding.toLocaleString()}`,
      icon: AlertTriangle,
      color: 'text-red-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString('en-IN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {stats.defaultersCount > 0 
                ? `${stats.defaultersCount} tenant(s) have outstanding balances`
                : 'All tenants are up to date with payments'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalBilledThisMonth > 0 
                ? `${Math.round((stats.totalPaid / stats.totalBilledThisMonth) * 100)}%`
                : '0%'
              }
            </div>
            <p className="text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              • Add new tenant
            </p>
            <p className="text-sm text-muted-foreground">
              • Record meter readings
            </p>
            <p className="text-sm text-muted-foreground">
              • Send payment reminders
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;