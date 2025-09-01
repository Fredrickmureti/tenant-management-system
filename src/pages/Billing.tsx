import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { Loader2, PlusCircle, Pencil, Trash2 } from 'lucide-react'
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

  const handleDeleteBill = async (id: string) => {
    try {
      const { error } = await supabase
        .from('billing_cycles')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting bill:', error)
        return
      }
      await fetchData()
    } catch (err) {
      console.error('Error deleting bill:', err)
    }
  }

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
                  <th className="py-2 pl-4 pr-2 sm:px-4 min-w-[120px] sticky left-0 bg-white z-10">Tenant</th>
                  <th className="py-2 px-2 sm:px-4">Unit</th>
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
                    <td className="py-3 pl-4 pr-2 sm:px-4 font-medium sticky left-0 bg-white">
                      <div className="max-w-[100px] truncate">
                        {r.tenant?.name || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-2 sm:px-4">{r.tenant?.house_unit_number || '—'}</td>
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
          <div key={r.id} className="border rounded-lg p-4 bg-white shadow-sm space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Tenant</span>
              <span>{r.tenant?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Unit</span>
              <span>{r.tenant?.house_unit_number || '—'}</span>
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
    </div>
  )
}

export default Billing
