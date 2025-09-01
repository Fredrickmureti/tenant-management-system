import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { supabase } from '@/integrations/supabase/client'
import { formatKES } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, PlusCircle, Pencil, Trash2, AlertTriangle, Info } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ExportButton } from '@/components/ExportButton'
import { formatBillingDataForExport } from '@/lib/export-utils'

type Billing = {
  id: string
  tenant_id: string
  month: number
  year: number
  previous_reading: number
  current_reading: number
  units_used: number
  rate_per_unit: number
  standing_charge: number
  bill_amount: number
  paid_amount: number
  previous_balance: number
  current_balance: number
  bill_date: string
  due_date: string
}

type Tenant = { id: string; name: string; house_unit_number: string }

const months = [
  'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'
]

const Billing = () => {
  const { toast } = useToast()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<(Billing & { tenant: Tenant | null })[]>([])
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingBill, setEditingBill] = useState<(Billing & { tenant: Tenant | null }) | undefined>(undefined)
  const [allTenants, setAllTenants] = useState<Tenant[]>([])
  
  // Form data state
  const [formData, setFormData] = useState({
    tenant_id: '',
    previous_reading: 0,
    current_reading: 0,
    rate_per_unit: 0,
    standing_charge: 100,
    due_date: ''
  })
  
  // Additional state for enhanced features
  const [lastRecordedReading, setLastRecordedReading] = useState<number | null>(null)
  const [loadingLastReading, setLoadingLastReading] = useState(false)
  const [readingValidation, setReadingValidation] = useState<{
    type: 'warning' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: bills } = await supabase
        .from('billing_cycles')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .order('created_at', { ascending: false })

      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name, house_unit_number')

      setAllTenants(tenants as Tenant[] || [])

      const byId = new Map((tenants || []).map(t => [t.id, t]))
      const withTenant = (bills || []).map(b => ({ ...b, tenant: byId.get(b.tenant_id) || null }))
      setRows(withTenant)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [year, month])

  // Helper function to get latest reading for a tenant
  const getLatestReadingForTenant = async (tenantId: string) => {
    if (!tenantId) return null
    
    setLoadingLastReading(true)
    try {
      const { data } = await supabase
        .from('billing_cycles')
        .select('current_reading, month, year')
        .eq('tenant_id', tenantId)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      return data ? { reading: data.current_reading, month: data.month, year: data.year } : null
    } catch (error) {
      console.error('Error fetching latest reading:', error)
      return null
    } finally {
      setLoadingLastReading(false)
    }
  }

  // Validate readings and show warnings
  const validateReadings = (prevReading: number, currentReading: number) => {
    if (currentReading < prevReading) {
      setReadingValidation({
        type: 'error',
        message: 'Current reading cannot be less than previous reading. Please check the values.'
      })
      return
    }
    
    const consumption = currentReading - prevReading
    if (consumption > 50) {
      setReadingValidation({
        type: 'warning',
        message: `High consumption detected: ${consumption} m³. Please verify the readings are correct.`
      })
      return
    }
    
    if (consumption === 0) {
      setReadingValidation({
        type: 'warning',
        message: 'Zero consumption detected. Please verify the meter reading.'
      })
      return
    }
    
    setReadingValidation({ type: null, message: '' })
  }

  // Handle tenant selection and auto-populate previous reading
  const handleTenantSelect = async (tenantId: string) => {
    setFormData(prev => ({ ...prev, tenant_id: tenantId }))
    
    if (tenantId) {
      const latestReading = await getLatestReadingForTenant(tenantId)
      if (latestReading) {
        setLastRecordedReading(latestReading.reading)
        setFormData(prev => ({ 
          ...prev, 
          previous_reading: latestReading.reading 
        }))
      } else {
        setLastRecordedReading(null)
        setFormData(prev => ({ ...prev, previous_reading: 0 }))
      }
    } else {
      setLastRecordedReading(null)
    }
  }

  // Update validation when readings change
  useEffect(() => {
    if (formData.previous_reading && formData.current_reading) {
      validateReadings(formData.previous_reading, formData.current_reading)
    } else {
      setReadingValidation({ type: null, message: '' })
    }
  }, [formData.previous_reading, formData.current_reading])

  const handleDeleteBill = async (id: string) => {
    try {
      const { error } = await supabase
        .from('billing_cycles')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting bill:', error)
        toast({
          title: "Error",
          description: "Failed to delete billing record",
          variant: "destructive"
        })
        return
      }
      toast({
        title: "Success",
        description: "Billing record deleted successfully"
      })
      await fetchData()
    } catch (err) {
      console.error('Error deleting bill:', err)
      toast({
        title: "Error", 
        description: "Failed to delete billing record",
        variant: "destructive"
      })
    }
  }

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    
    try {
      const units_used = formData.current_reading - formData.previous_reading
      const bill_amount = (units_used * formData.rate_per_unit) + formData.standing_charge
      
      const { error } = await supabase
        .from('billing_cycles')
        .insert({
          tenant_id: formData.tenant_id,
          month: month,
          year: year,
          previous_reading: formData.previous_reading,
          current_reading: formData.current_reading,
          rate_per_unit: formData.rate_per_unit,
          standing_charge: formData.standing_charge,
          paid_amount: 0,
          bill_date: new Date().toISOString(),
          due_date: formData.due_date
          // previous_balance will be automatically set by the database trigger
        })

      if (error) {
        console.error('Error creating bill:', error)
        toast({
          title: "Error",
          description: "Failed to create billing record",
          variant: "destructive"
        })
        return
      }

      toast({
        title: "Success",
        description: "Billing record created successfully"
      })
      setShowAddDialog(false)
      setFormData({
        tenant_id: '',
        previous_reading: 0,
        current_reading: 0,
        rate_per_unit: 0,
        standing_charge: 100,
        due_date: ''
      })
      await fetchData()
    } catch (err) {
      console.error('Error creating bill:', err)
      toast({
        title: "Error",
        description: "Failed to create billing record", 
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUpdateBill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBill) return
    
    setIsProcessing(true)
    
    try {
      const units_used = formData.current_reading - formData.previous_reading
      const bill_amount = (units_used * formData.rate_per_unit) + formData.standing_charge
      const current_balance = bill_amount - editingBill.paid_amount
      
      const { error } = await supabase
        .from('billing_cycles')
        .update({
          previous_reading: formData.previous_reading,
          current_reading: formData.current_reading,
          rate_per_unit: formData.rate_per_unit,
          standing_charge: formData.standing_charge,
          due_date: formData.due_date
        })
        .eq('id', editingBill.id)

      if (error) {
        console.error('Error updating bill:', error)
        toast({
          title: "Error",
          description: "Failed to update billing record",
          variant: "destructive"
        })
        return
      }

      toast({
        title: "Success", 
        description: "Billing record updated successfully"
      })
      setEditingBill(undefined)
      await fetchData()
    } catch (err) {
      console.error('Error updating bill:', err)
      toast({
        title: "Error",
        description: "Failed to update billing record",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Initialize form data when editing
  useEffect(() => {
    if (editingBill) {
      setFormData({
        tenant_id: editingBill.tenant_id,
        previous_reading: editingBill.previous_reading,
        current_reading: editingBill.current_reading,
        rate_per_unit: editingBill.rate_per_unit,
        standing_charge: editingBill.standing_charge,
        due_date: editingBill.due_date.split('T')[0] // Format date for input
      })
    }
  }, [editingBill])

  // Reset form when opening add dialog
  useEffect(() => {
    if (showAddDialog) {
      setFormData({
        tenant_id: '',
        previous_reading: 0,
        current_reading: 0,
        rate_per_unit: 0,
        standing_charge: 100,
        due_date: ''
      })
      setLastRecordedReading(null)
      setReadingValidation({ type: null, message: '' })
    }
  }, [showAddDialog])

  const filtered = rows.filter(r =>
    `${r.tenant?.name || ''}`.toLowerCase().includes(query.toLowerCase())
  )

  const years = Array.from({ length: 6 }).map((_, i) => 2020 + i)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold">Billing</h1>

        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto sm:justify-end">
          <div className="flex gap-2 items-center">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-20 sm:w-24"><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent>
                {months.map((m, idx) => (
                  <SelectItem key={m} value={String(idx + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-20 sm:w-24"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Search tenant..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full sm:w-48" />
          <ExportButton 
            data={filtered}
            filename={`billing-${months[month - 1]}-${year}`}
            formatData={formatBillingDataForExport}
            disabled={loading}
            className="shrink-0"
          />
          <Button onClick={() => setShowAddDialog(true)} className="shrink-0">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Bill
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Billing for {months[month - 1]} {year}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
  {loading ? (
    <div className="py-10 px-6 text-center text-muted-foreground">
      <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
      <p>Loading billing data...</p>
    </div>
  ) : filtered.length === 0 ? (
    <div className="py-10 px-6 text-center text-muted-foreground">
      <p>No bills found for {months[month - 1]} {year}</p>
      <Button 
        variant="outline" 
        className="mt-4"
        onClick={() => setShowAddDialog(true)}
      >
        <PlusCircle className="h-4 w-4 mr-2" />
        Create New Bill
      </Button>
    </div>
  ) : (
    <div>
      {/* Desktop table */}
      <div className="relative hidden sm:block">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pl-4 pr-2 sm:px-4 min-w-[120px] sticky left-0 bg-background dark:bg-background z-10">Tenant</th>
                  <th className="py-2 px-2 sm:px-4">Unit</th>
                  <th className="py-2 px-2 sm:px-4">Prev → Curr</th>
                  <th className="py-2 px-2 sm:px-4">Units</th>
                  <th className="py-2 px-2 sm:px-4">Standing</th>
                  <th className="py-2 px-2 sm:px-4">Billed</th>
                  <th className="py-2 px-2 sm:px-4">Paid</th>
                  <th className="py-2 px-2 sm:px-4">Balance</th>
                  <th className="py-2 px-2 sm:px-4">Due Date</th>
                  <th className="py-2 pl-2 pr-4 sm:px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-3 pl-4 pr-2 sm:px-4 font-medium sticky left-0 bg-background dark:bg-background">
                      <div className="max-w-[100px] truncate">
                        {r.tenant?.name || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-2 sm:px-4">{r.tenant?.house_unit_number || '—'}</td>
                    <td className="py-3 px-2 sm:px-4 text-xs">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">{r.previous_reading} → {r.current_reading}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 sm:px-4">{r.units_used} m³</td>
                    <td className="py-3 px-2 sm:px-4">{formatKES(r.standing_charge || 100)}</td>
                    <td className="py-3 px-2 sm:px-4">{formatKES(r.bill_amount)}</td>
                    <td className="py-3 px-2 sm:px-4">{formatKES(r.paid_amount)}</td>
                    <td className={`py-3 px-2 sm:px-4 ${r.current_balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {formatKES(r.current_balance)}
                    </td>
                    <td className="py-3 px-2 sm:px-4">{new Date(r.due_date).toLocaleDateString()}</td>
                    <td className="py-3 pl-2 pr-4 sm:px-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setEditingBill(r)}
                          className="px-2"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive px-2">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this billing record.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteBill(r.id)}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              >
                                Delete Bill
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile stacked cards */}
      <div className="grid gap-4 sm:hidden">
        {filtered.map((r) => (
          <div key={r.id} className="border rounded-lg p-4 bg-card dark:bg-card shadow-sm space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Tenant</span>
              <span>{r.tenant?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Unit</span>
              <span>{r.tenant?.house_unit_number || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Readings</span>
              <span className="text-sm text-muted-foreground">{r.previous_reading} → {r.current_reading}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Units</span>
              <span>{r.units_used} m³</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Standing</span>
              <span>{formatKES(r.standing_charge || 100)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Billed</span>
              <span>{formatKES(r.bill_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Paid</span>
              <span>{formatKES(r.paid_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Balance</span>
              <span className={r.current_balance > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                {formatKES(r.current_balance)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Due Date</span>
              <span>{new Date(r.due_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setEditingBill(r)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this billing record.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteBill(r.id)}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      Delete Bill
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  )}
</CardContent>

      </Card>

      {/* Add New Bill Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Bill</DialogTitle>
            <DialogDescription>
              Create a new billing record for {months[month - 1]} {year}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBill} className="space-y-4">
            <div>
              <Label htmlFor="tenant">Tenant</Label>
              <Select value={formData.tenant_id} onValueChange={handleTenantSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {allTenants.map(tenant => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name} - Unit {tenant.house_unit_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingLastReading && (
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Loading last reading...</span>
                </div>
              )}
              {lastRecordedReading !== null && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-md">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">
                    Last recorded reading: <span className="font-medium">{lastRecordedReading} m³</span>
                  </span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="previous_reading">Previous Reading</Label>
                <Input
                  id="previous_reading"
                  type="number"
                  value={formData.previous_reading}
                  onChange={(e) => setFormData(prev => ({ ...prev, previous_reading: Number(e.target.value) }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="current_reading">Current Reading</Label>
                <Input
                  id="current_reading"
                  type="number"
                  value={formData.current_reading}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_reading: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rate_per_unit">Rate per Unit (KES)</Label>
                <Input
                  id="rate_per_unit"
                  type="number"
                  step="0.01"
                  value={formData.rate_per_unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, rate_per_unit: Number(e.target.value) }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="standing_charge">Standing Charge (KES)</Label>
                <Input
                  id="standing_charge"
                  type="number"
                  step="0.01"
                  value={formData.standing_charge}
                  onChange={(e) => setFormData(prev => ({ ...prev, standing_charge: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>

            {/* Reading Validation Alert */}
            {readingValidation.type && (
              <Alert variant={readingValidation.type === 'error' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{readingValidation.message}</AlertDescription>
              </Alert>
            )}

            {/* Consumption Preview */}
            {formData.previous_reading > 0 && formData.current_reading > 0 && (
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm font-medium mb-2">Billing Preview:</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Consumption:</span>
                    <span className="font-medium">{formData.current_reading - formData.previous_reading} m³</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Water charges:</span>
                    <span>{formatKES((formData.current_reading - formData.previous_reading) * formData.rate_per_unit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Standing charge:</span>
                    <span>{formatKES(formData.standing_charge)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Total bill:</span>
                    <span>{formatKES((formData.current_reading - formData.previous_reading) * formData.rate_per_unit + formData.standing_charge)}</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isProcessing || readingValidation.type === 'error'}
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Bill
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Bill Dialog */}
      <Dialog open={!!editingBill} onOpenChange={(open) => !open && setEditingBill(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bill</DialogTitle>
            <DialogDescription>
              Edit billing record for {editingBill?.tenant?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateBill} className="space-y-4">
            <div>
              <Label>Tenant</Label>
              <div className="p-2 bg-gray-100 rounded">
                {editingBill?.tenant?.name} - Unit {editingBill?.tenant?.house_unit_number}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_previous_reading">Previous Reading</Label>
                <Input
                  id="edit_previous_reading"
                  type="number"
                  value={formData.previous_reading}
                  onChange={(e) => setFormData(prev => ({ ...prev, previous_reading: Number(e.target.value) }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_current_reading">Current Reading</Label>
                <Input
                  id="edit_current_reading"
                  type="number"
                  value={formData.current_reading}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_reading: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_rate_per_unit">Rate per Unit (KES)</Label>
                <Input
                  id="edit_rate_per_unit"
                  type="number"
                  step="0.01"
                  value={formData.rate_per_unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, rate_per_unit: Number(e.target.value) }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_standing_charge">Standing Charge (KES)</Label>
                <Input
                  id="edit_standing_charge"
                  type="number"
                  step="0.01"
                  value={formData.standing_charge}
                  onChange={(e) => setFormData(prev => ({ ...prev, standing_charge: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>

            {/* Reading Validation Alert for Edit */}
            {readingValidation.type && (
              <Alert variant={readingValidation.type === 'error' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{readingValidation.message}</AlertDescription>
              </Alert>
            )}

            {/* Consumption Preview for Edit */}
            {formData.previous_reading > 0 && formData.current_reading > 0 && (
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm font-medium mb-2">Updated Billing Preview:</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Consumption:</span>
                    <span className="font-medium">{formData.current_reading - formData.previous_reading} m³</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Water charges:</span>
                    <span>{formatKES((formData.current_reading - formData.previous_reading) * formData.rate_per_unit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Standing charge:</span>
                    <span>{formatKES(formData.standing_charge)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Total bill:</span>
                    <span>{formatKES((formData.current_reading - formData.previous_reading) * formData.rate_per_unit + formData.standing_charge)}</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="edit_due_date">Due Date</Label>
              <Input
                id="edit_due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingBill(undefined)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isProcessing || readingValidation.type === 'error'}
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Update Bill
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Billing
