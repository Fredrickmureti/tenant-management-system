import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatKES } from '@/lib/utils';
import { Plus, Gauge } from 'lucide-react';
import { ExportButton } from '@/components/ExportButton';
import { formatMeterReadingDataForExport } from '@/lib/export-utils';

type Tenant = {
  id: string;
  name: string;
  house_unit_number: string;
  meter_connection_number: string;
  status: string;
};

type MeterReading = {
  id: string;
  tenant_id: string;
  current_reading: number;
  previous_reading: number;
  units_used: number;
  bill_amount: number;
  month: number;
  year: number;
  tenants: { name: string; house_unit_number: string };
};

const MeterReadings = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [currentReading, setCurrentReading] = useState('');
  const { toast } = useToast();

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    fetchTenants();
    fetchCurrentMonthReadings();
  }, []);

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('status', 'active')
        .order('house_unit_number');

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast({
        title: "Error",
        description: "Failed to load tenants.",
        variant: "destructive",
      });
    }
  };

  const fetchCurrentMonthReadings = async () => {
    try {
      const { data, error } = await supabase
        .from('billing_cycles')
        .select(`
          id,
          tenant_id,
          current_reading,
          previous_reading,
          units_used,
          bill_amount,
          month,
          year,
          tenants!billing_cycles_tenant_id_fkey (name, house_unit_number)
        `)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReadings(data || []);
    } catch (error) {
      console.error('Error fetching readings:', error);
    }
  };

  const handleSubmitReading = async () => {
    if (!selectedTenant || !currentReading) return;

    setLoading(true);
    try {
      // Get previous month's reading or default to 0
      const { data: previousBilling } = await supabase
        .from('billing_cycles')
        .select('current_reading')
        .eq('tenant_id', selectedTenant.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
        .maybeSingle();

      const previousReading = previousBilling?.current_reading || 0;
      const reading = parseFloat(currentReading);
      const ratePerUnit = 50; // Default rate

      // Check if reading already exists for this month
      const { data: existingBilling } = await supabase
        .from('billing_cycles')
        .select('id')
        .eq('tenant_id', selectedTenant.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle();

      if (existingBilling) {
        // Update existing - don't set bill_amount or units_used as they're calculated automatically
        const { error } = await supabase
          .from('billing_cycles')
          .update({
            current_reading: reading
          })
          .eq('id', existingBilling.id);

        if (error) throw error;
      } else {
        // Create new billing cycle - don't set bill_amount or units_used as they're calculated automatically
        const { error } = await supabase
          .from('billing_cycles')
          .insert({
            tenant_id: selectedTenant.id,
            month: currentMonth,
            year: currentYear,
            previous_reading: previousReading,
            current_reading: reading,
            rate_per_unit: ratePerUnit
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Meter reading recorded successfully.",
      });

      fetchCurrentMonthReadings();
      setIsDialogOpen(false);
      setSelectedTenant(null);
      setCurrentReading('');
    } catch (error) {
      console.error('Error submitting reading:', error);
      toast({
        title: "Error",
        description: "Failed to record meter reading.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const tenantsWithoutReadings = tenants.filter(tenant => 
    !readings.some(reading => reading.tenant_id === tenant.id)
  );

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meter Readings</h1>
          <p className="text-muted-foreground">
            {months[currentMonth - 1]} {currentYear}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            data={readings}
            filename={`meter-readings-${months[currentMonth - 1]}-${currentYear}`}
            formatData={formatMeterReadingDataForExport}
            disabled={loading}
          />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Record Reading
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Meter Reading</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Tenant</label>
                <select 
                  className="w-full mt-1 p-2 border rounded-md"
                  value={selectedTenant?.id || ''}
                  onChange={(e) => {
                    const tenant = tenants.find(t => t.id === e.target.value);
                    setSelectedTenant(tenant || null);
                  }}
                >
                  <option value="">Select a tenant...</option>
                  {tenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} - Unit {tenant.house_unit_number}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Current Reading (m³)</label>
                <Input
                  type="number"
                  placeholder="Enter meter reading"
                  value={currentReading}
                  onChange={(e) => setCurrentReading(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitReading} disabled={loading}>
                  Submit Reading
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Readings Recorded</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readings.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Readings</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantsWithoutReadings.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Readings */}
      {tenantsWithoutReadings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Readings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {tenantsWithoutReadings.map(tenant => (
                <div key={tenant.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Unit {tenant.house_unit_number} • Meter: {tenant.meter_connection_number}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setSelectedTenant(tenant);
                      setIsDialogOpen(true);
                    }}
                  >
                    Record Reading
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Month Readings */}
      <Card>
        <CardHeader>
          <CardTitle>Current Month Readings</CardTitle>
        </CardHeader>
        <CardContent>
          {readings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No readings recorded for this month
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Previous</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Bill Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readings.map((reading) => (
                  <TableRow key={reading.id}>
                    <TableCell className="font-medium">
                      {reading.tenants.name}
                    </TableCell>
                    <TableCell>{reading.tenants.house_unit_number}</TableCell>
                    <TableCell>{reading.previous_reading} m³</TableCell>
                    <TableCell>{reading.current_reading} m³</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {reading.units_used} m³
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatKES(reading.bill_amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MeterReadings;
