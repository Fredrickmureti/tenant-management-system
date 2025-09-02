import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { formatKES } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useRealTimeClock, getTimeGreeting, formatTime, formatDate } from '@/hooks/useRealTime'
import { 
  Calendar, 
  CreditCard, 
  DropletIcon, 
  AlertCircle, 
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  User,
  LogOut,
  Clock
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'

type TenantInfo = {
  id: string
  name: string
  email: string | null
  phone: string
  house_unit_number: string
  meter_connection_number: string
  status: string
}

type BillingCycle = {
  id: string
  month: number
  year: number
  current_reading: number
  previous_reading: number
  units_used: number
  rate_per_unit: number
  bill_amount: number
  paid_amount: number
  previous_balance: number
  current_balance: number
  bill_date: string
  due_date: string
  created_at: string
}

type Payment = {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  notes: string | null
  created_at: string
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const TenantDashboard = () => {
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const currentTime = useRealTimeClock()
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [currentBill, setCurrentBill] = useState<BillingCycle | null>(null)
  const [recentBills, setRecentBills] = useState<BillingCycle[]>([])
  const [recentPayments, setRecentPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/tenant-auth')
  }

  const fetchTenantData = async () => {
    if (!user) return

    if (!loading) setIsRefreshing(true)
    setLoading(true)
    try {
      // Get tenant info linked to this user
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (tenantError && tenantError.code !== 'PGRST116') {
        console.error('Error fetching tenant data:', tenantError)
        toast({
          title: "Error",
          description: "Failed to load tenant information.",
          variant: "destructive",
        })
        return
      }

      if (!tenantData) {
        toast({
          title: "No Access",
          description: "You don't have access to any tenant account.",
          variant: "destructive",
        })
        return
      }

      setTenantInfo(tenantData)

      // Get current month's bill
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1
      const currentYear = currentDate.getFullYear()

      const { data: currentBillData } = await supabase
        .from('billing_cycles')
        .select('*')
        .eq('tenant_id', tenantData.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle()

      setCurrentBill(currentBillData)

      // Get recent bills (last 6 months)
      const { data: billsData } = await supabase
        .from('billing_cycles')
        .select('*')
        .eq('tenant_id', tenantData.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(6)

      setRecentBills(billsData || [])

      // Get recent payments (last 10)
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantData.id)
        .order('payment_date', { ascending: false })
        .limit(10)

      setRecentPayments(paymentsData || [])
      setLastUpdated(new Date())

    } catch (error) {
      console.error('Error fetching tenant data:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchTenantData()
      
      // Set up auto-refresh every 60 seconds (less frequent than admin dashboard)
      const interval = setInterval(() => {
        fetchTenantData()
      }, 60000)

      return () => clearInterval(interval)
    } else {
      navigate('/tenant-auth')
    }
  }, [user, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!tenantInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have access to any tenant account. Please contact your administrator.
            </p>
            <Button onClick={handleSignOut} variant="outline">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalOutstanding = recentBills.reduce((sum, bill) => sum + bill.current_balance, 0)
  const isCurrentBillOverdue = currentBill && new Date(currentBill.due_date) < new Date()

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Sign Out */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              {getTimeGreeting(currentTime)}, {tenantInfo.name}
            </h1>
            <p className="text-muted-foreground">Unit {tenantInfo.house_unit_number} • Mwanzo Flats</p>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-mono">
                {formatTime(currentTime)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(currentTime)}
            </p>
            <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
              {isRefreshing && (
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              )}
              Last updated: {formatTime(lastUpdated).slice(0, -3)}
            </p>
            <Button onClick={handleSignOut} variant="outline" size="sm" className="self-center sm:self-end mt-2">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={`bg-card shadow-sm transition-all duration-300 ${
            isRefreshing ? 'animate-pulse' : ''
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Bill</p>
                  <p className="text-2xl font-bold text-foreground">
                    {currentBill ? formatKES(currentBill.current_balance) : 'N/A'}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${currentBill?.current_balance > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                  <CreditCard className={`h-6 w-6 ${currentBill?.current_balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
                </div>
              </div>
              {currentBill && (
                <div className="mt-2">
                  <Badge variant={isCurrentBillOverdue ? "destructive" : "secondary"}>
                    Due: {new Date(currentBill.due_date).toLocaleDateString()}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`bg-card shadow-sm transition-all duration-300 ${
            isRefreshing ? 'animate-pulse' : ''
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Outstanding</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatKES(totalOutstanding)}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${totalOutstanding > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                  <AlertCircle className={`h-6 w-6 ${totalOutstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-card shadow-sm transition-all duration-300 ${
            isRefreshing ? 'animate-pulse' : ''
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Water Usage</p>
                  <p className="text-2xl font-bold text-foreground">
                    {currentBill ? `${currentBill.units_used} m³` : 'N/A'}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <DropletIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              {currentBill && (
                <p className="text-sm text-muted-foreground mt-1">
                  This month
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={`bg-card shadow-sm transition-all duration-300 ${
            isRefreshing ? 'animate-pulse' : ''
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Account Status</p>
                  <p className="text-lg font-semibold text-foreground capitalize">
                    {tenantInfo.status}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Bill Details */}
          <div className="lg:col-span-2 space-y-6">
            {currentBill && (
              <Card className="bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Current Bill - {months[currentBill.month - 1]} {currentBill.year}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Meter Readings</p>
                      <div className="space-y-1">
                        <p className="text-sm">Previous: {currentBill.previous_reading} m³</p>
                        <p className="text-sm">Current: {currentBill.current_reading} m³</p>
                        <p className="text-sm font-semibold">Usage: {currentBill.units_used} m³</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Billing Details</p>
                      <div className="space-y-1">
                        <p className="text-sm">Rate: {formatKES(currentBill.rate_per_unit)}/m³</p>
                        <p className="text-sm">Water Charge: {formatKES(currentBill.bill_amount)}</p>
                        <p className="text-sm">Previous Balance: {formatKES(currentBill.previous_balance)}</p>
                        <p className="text-sm">Payments: {formatKES(currentBill.paid_amount)}</p>
                        <p className="text-sm font-semibold border-t pt-1">
                          Current Balance: {formatKES(currentBill.current_balance)}
                        </p>
                      </div>
                    </div>
                  </div>
                  {isCurrentBillOverdue && (
                    <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <p className="text-sm font-medium text-destructive">Bill Overdue</p>
                      </div>
                      <p className="text-sm mt-1">
                        This bill was due on {new Date(currentBill.due_date).toLocaleDateString()}. 
                        Please make payment as soon as possible.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recent Bills */}
            <Card className="bg-card shadow-sm">
              <CardHeader>
                <CardTitle>Recent Bills</CardTitle>
              </CardHeader>
              <CardContent>
                {recentBills.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No billing history available</p>
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
                        </tr>
                      </thead>
                      <tbody>
                        {recentBills.map((bill) => (
                          <tr key={bill.id} className="border-b last:border-0">
                            <td className="py-3 pr-4">
                              {months[bill.month - 1]} {bill.year}
                            </td>
                            <td className="py-3 pr-4">{bill.units_used} m³</td>
                            <td className="py-3 pr-4">{formatKES(bill.bill_amount)}</td>
                            <td className="py-3 pr-4">{formatKES(bill.paid_amount)}</td>
                            <td className={`py-3 pr-4 font-medium ${
                              bill.current_balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                            }`}>
                              {formatKES(bill.current_balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card className="bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">Unit {tenantInfo.house_unit_number}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{tenantInfo.phone}</span>
                </div>
                {tenantInfo.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{tenantInfo.email}</span>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Meter Connection</p>
                  <p className="text-sm font-mono text-foreground">{tenantInfo.meter_connection_number}</p>
                </div>
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card className="bg-card shadow-sm">
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
              </CardHeader>
              <CardContent>
                {recentPayments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No payments recorded</p>
                ) : (
                  <div className="space-y-3">
                    {recentPayments.slice(0, 5).map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{formatKES(payment.amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {payment.payment_method}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Notice */}
            {totalOutstanding > 0 && (
              <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <p className="font-medium text-amber-800 dark:text-amber-300">Payment Required</p>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                    You have an outstanding balance of {formatKES(totalOutstanding)}. 
                    Please contact the office to make a payment.
                  </p>
                  <Button size="sm" className="w-full">
                    Contact Office
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TenantDashboard
