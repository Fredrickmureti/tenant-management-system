import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

type TenantInfo = {
  id: string
  name: string
  email: string | null
  phone: string
  house_unit_number: string
  meter_connection_number: string
  status: string
}

const Profile = () => {
  const { user } = useAuth()
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      setLoading(true)
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      setTenant((data as TenantInfo) || null)
      setLoading(false)
    }
    load()
  }, [user])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Profile</h2>
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6 text-center text-muted-foreground">Loading…</div>
          ) : !tenant ? (
            <div className="py-6 text-center text-muted-foreground">No tenant record linked</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Full name</div>
                <div className="font-medium">{tenant.name}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Email</div>
                <div className="font-medium">{tenant.email || '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Phone</div>
                <div className="font-medium">{tenant.phone}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Unit</div>
                <div className="font-medium">{tenant.house_unit_number}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-muted-foreground">Meter Connection</div>
                <div className="font-medium font-mono">{tenant.meter_connection_number}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Status</div>
                <div className="font-medium capitalize">{tenant.status}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Profile
