import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { formatKES } from '@/lib/utils'

type Payment = {
  id: string
  amount: number
  payment_date: string
  payment_method: string | null
  notes: string | null
}

const TenantPayments = () => {
  const { user } = useAuth()
  const [rows, setRows] = useState<Payment[]>([])
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
        .from('payments')
        .select('id, amount, payment_date, payment_method, notes')
        .eq('tenant_id', (tenant as any).id)
        .order('payment_date', { ascending: false })
      setRows((data as Payment[]) || [])
      setLoading(false)
    }
    load()
  }, [user])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Payments</h2>
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No payments yet</div>
          ) : (
            <div className="space-y-3">
              {rows.map(p => (
                <div key={p.id} className="flex items-center justify-between border-b last:border-0 py-2">
                  <div>
                    <div className="text-sm font-medium">{formatKES(p.amount)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(p.payment_date).toLocaleDateString()}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{p.payment_method || '—'}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default TenantPayments
