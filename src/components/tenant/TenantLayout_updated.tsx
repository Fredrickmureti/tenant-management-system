import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Home, Receipt, CreditCard, User, Menu, X, LogOut, Droplets } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

type TenantInfo = {
  id: string
  name: string
  email: string | null
  phone: string
  house_unit_number: string
}

const TenantLayout = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tenant, setTenant] = useState<TenantInfo | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from('tenants')
        .select('id, name, email, phone, house_unit_number')
        .eq('user_id', user.id)
        .maybeSingle()
      setTenant((data as TenantInfo) || null)
      setLoading(false)
    }
    load()
  }, [user])

  if (!user && !loading) return <Navigate to="/tenant-auth" replace />

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border rounded-md p-6 text-center">
          <Droplets className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-1">No Tenant Account</h2>
          <p className="text-sm text-muted-foreground mb-4">Your login isn't linked to a tenant record yet. Please contact Mwanzo Flats management.</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate('/tenant-auth')}>Back</Button>
            <Button variant="ghost" onClick={() => signOut()}>Sign out</Button>
          </div>
        </div>
      </div>
    )
  }

  const nav = [
    { to: '/tenant', label: 'Overview', icon: Home, exact: true },
    { to: '/tenant/bills', label: 'Bills', icon: Receipt },
    { to: '/tenant/payments', label: 'Payments', icon: CreditCard },
    { to: '/tenant/profile', label: 'Profile', icon: User },
  ]

  return (
    <div className="flex h-screen bg-background">
      {/* Backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0`}>
        <div className="h-14 px-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            <span className="font-semibold">Mwanzo Flats</span>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 border-b">
          <div className="font-medium text-foreground truncate">{tenant.name}</div>
          <div className="text-xs text-muted-foreground">Unit {tenant.house_unit_number}</div>
        </div>

        <nav className="p-2 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const Icon = item.icon
            const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto p-3 border-t flex items-center justify-between">
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col">
        <header className="h-14 border-b bg-background/95 backdrop-blur flex items-center px-4 justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="text-base font-medium">{location.pathname === '/tenant' ? 'Overview' : nav.find(n => n.to === location.pathname)?.label || 'Tenant'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="container mx-auto py-4 px-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default TenantLayout
