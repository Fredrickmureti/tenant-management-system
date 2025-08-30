import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { Loader2, DropletIcon } from 'lucide-react'

const TenantAuth = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  const checkTenantAccess = async (userEmail: string) => {
    const { data, error } = await supabase.rpc('check_tenant_access' as any, {
      user_email: userEmail
    })
    
    if (error) {
      console.error('Error checking tenant access:', error)
      return null
    }
    
    return data?.[0] || null
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // First check if the email exists in tenants table
      const tenantAccess = await checkTenantAccess(email)
      
      if (!tenantAccess?.has_access) {
        toast({
          title: "Access Denied",
          description: "This email is not registered as a tenant. Please contact your administrator.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast({
            title: "Email Not Verified",
            description: "Please check your email and click the verification link before signing in.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          })
        }
        return
      }

      if (data.user) {
        // Check if user has tenant record linked
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('*')
          .eq('user_id', data.user.id)
          .single()

        if (tenantData) {
          navigate('/tenant')
        } else {
          toast({
            title: "Account Setup Required",
            description: "Your account needs to be linked. Please contact your administrator.",
            variant: "destructive",
          })
          await supabase.auth.signOut()
        }
      }
    } catch (error) {
      console.error('Error signing in:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // First check if this email exists in tenants table
      const tenantAccess = await checkTenantAccess(email)
      
      if (!tenantAccess?.has_access) {
        toast({
          title: "Registration Not Allowed",
          description: "This email is not registered as a tenant. Please contact your administrator to add you as a tenant first.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/tenant`,
          data: {
            role: 'tenant',
            full_name: fullName || tenantAccess.tenant_name
          }
        }
      })

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      if (data.user) {
        toast({
          title: "Success",
          description: "Account created! Please check your email to verify your account, then return here to sign in.",
        })
        setIsSignUp(false)
        setPassword('')
        setFullName('')
      }
    } catch (error) {
      console.error('Error signing up:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-blue-100">
              <DropletIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {isSignUp ? 'Create Tenant Account' : 'Tenant Portal'}
          </CardTitle>
          <p className="text-muted-foreground">
            {isSignUp 
              ? 'Sign up to access your billing information' 
              : 'Sign in to view your bills and payments'
            }
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? "Create a password" : "Enter your password"}
                required
              />
            </div>
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name (Optional)</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
                <p className="text-xs text-muted-foreground">
                  If left empty, we'll use the name from your tenant record.
                </p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </>
              ) : (
                <>{isSignUp ? 'Create Account' : 'Sign In'}</>
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setPassword('')
                setFullName('')
              }}
              className="text-sm"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </Button>
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="text-sm"
            >
              Admin Portal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TenantAuth
