import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { formatKES } from '@/lib/utils'

type Bill = {
  id: string
  month: number
  year: number
  units_used: number
  bill_amount: number
  paid_amount: number
  current_balance: number
  due_date: string
}

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const Bills = () => {
  const { user } = useAuth()
  const [rows, setRows] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      setLoading(true)
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!tenant) { setRows([]); setLoading(false); return }
      const { data } = await supabase
        .from('billing_cycles')
        .select('id, month, year, units_used, bill_amount, paid_amount, current_balance, due_date')
        .eq('tenant_id', (tenant as any).id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
      setRows((data as Bill[]) || [])
      setLoading(false)
    }
    load()
  }, [user])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Bills</h2>
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No bills yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Period</th>
                    <th className="py-2 pr-4">Usage</th>
                    <th className="py-2 pr-4">Billed</th>
                    <th className="py-2 pr-4">Paid</th>
                    <th className="py-2 pr-4">Balance</th>
                    <th className="py-2 pr-4">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(b => (
                    <tr key={b.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">{months[b.month - 1]} {b.year}</td>
                      <td className="py-3 pr-4">{b.units_used} m³</td>
                      <td className="py-3 pr-4">{formatKES(b.bill_amount)}</td>
                      <td className="py-3 pr-4">{formatKES(b.paid_amount)}</td>
                      <td className={`py-3 pr-4 ${b.current_balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatKES(b.current_balance)}</td>
                      <td className="py-3 pr-4">{new Date(b.due_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Bills
