
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { Loader2, DropletIcon, AlertCircle, Mail } from 'lucide-react'

const TenantAuth = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [accountStatus, setAccountStatus] = useState<'checking' | 'exists' | 'new' | 'error' | null>(null)
  const [emailCheckDone, setEmailCheckDone] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  // Handle email confirmation on page load
  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (data.session && data.session.user) {
          console.log('User confirmed, checking tenant linkage:', data.session.user.email)
          
          // Check if user has tenant record linked
          const { data: tenantData, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('user_id', data.session.user.id)
            .maybeSingle()

          if (tenantError) {
            console.error('Error checking tenant linkage:', tenantError)
          }

          if (tenantData) {
            console.log('Tenant record found, redirecting to dashboard')
            navigate('/tenant')
            return
          }

          // Check if there's a tenant record with this email
          const { data: existingTenant, error: existingError } = await supabase
            .from('tenants')
            .select('*')
            .eq('email', data.session.user.email)
            .eq('status', 'active')
            .maybeSingle()

          if (existingError) {
            console.error('Error checking existing tenant:', existingError)
          }

          if (existingTenant) {
            console.log('Linking user to existing tenant record')
            const { error: linkError } = await supabase
              .from('tenants')
              .update({ user_id: data.session.user.id })
              .eq('id', existingTenant.id)

            if (!linkError) {
              console.log('Successfully linked, redirecting to dashboard')
              navigate('/tenant')
            } else {
              console.error('Error linking tenant:', linkError)
              toast({
                title: "Account Setup Error",
                description: "There was an issue setting up your account. Please contact support.",
                variant: "destructive",
              })
            }
          } else {
            toast({
              title: "Account Not Found",
              description: "No tenant account found for this email. Please contact your administrator.",
              variant: "destructive",
            })
          }
        }
      } catch (error) {
        console.error('Error during email confirmation:', error)
        toast({
          title: "Error",
          description: "An error occurred while setting up your account.",
          variant: "destructive",
        })
      }
    }

    handleEmailConfirmation()
  }, [navigate, toast])

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

  const checkExistingUser = async (email: string) => {
    try {
      // First check if email exists in tenant records
      const tenantAccess = await checkTenantAccess(email)
      
      if (!tenantAccess?.has_access) {
        setAccountStatus('error')
        setEmailCheckDone(true)
        return { exists: false, error: 'not_tenant' }
      }

      // Try to sign in with a dummy password to check if user exists
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: 'dummy_password_to_check_existence'
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          // User doesn't exist yet
          setAccountStatus('new')
          setEmailCheckDone(true)
          return { exists: false, error: null }
        } else if (error.message.includes('Email not confirmed')) {
          // User exists but not confirmed
          setAccountStatus('exists')
          setEmailCheckDone(true)
          return { exists: true, confirmed: false, error: null }
        } else {
          // Other error - user likely exists
          setAccountStatus('exists')
          setEmailCheckDone(true)
          return { exists: true, confirmed: true, error: null }
        }
      }

      // Successful sign in shouldn't happen with dummy password
      if (data.user) {
        await supabase.auth.signOut() // Sign out immediately
        setAccountStatus('exists')
        setEmailCheckDone(true)
        return { exists: true, confirmed: true, error: null }
      }

      return { exists: false, error: null }
    } catch (error) {
      console.error('Error checking user existence:', error)
      setAccountStatus('error')
      setEmailCheckDone(true)
      return { exists: false, error: 'unknown' }
    }
  }

  const handleEmailBlur = async () => {
    if (email && !emailCheckDone) {
      setAccountStatus('checking')
      const result = await checkExistingUser(email)
      
      if (result.error === 'not_tenant') {
        toast({
          title: "Access Denied",
          description: "This email is not registered as a tenant. Please contact your administrator.",
          variant: "destructive",
        })
      } else if (result.exists && !result.confirmed) {
        toast({
          title: "Email Verification Required",
          description: "Your account exists but needs email verification. Please check your email.",
          variant: "default",
        })
      }
    }
  }

  const resendVerificationEmail = async () => {
    if (!email) return
    
    setLoading(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/tenant-auth`
        }
      })

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Verification Email Sent",
          description: "Please check your email for the verification link.",
        })
      }
    } catch (error) {
      console.error('Error resending verification:', error)
      toast({
        title: "Error",
        description: "Failed to resend verification email.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
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
        } else if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "Invalid Credentials",
            description: "The email or password you entered is incorrect. If you haven't created an account yet, please sign up first.",
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
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('user_id', data.user.id)
          .maybeSingle()

        if (tenantError) {
          console.error('Error checking tenant linkage:', tenantError)
        }

        if (tenantData) {
          navigate('/tenant')
        } else {
          // Try to find existing tenant record by email
          const { data: existingTenant, error: existingError } = await supabase
            .from('tenants')
            .select('*')
            .eq('email', data.user.email)
            .eq('status', 'active')
            .maybeSingle()

          if (existingError) {
            console.error('Error checking existing tenant:', existingError)
          }

          if (existingTenant) {
            // Update the tenant record to link to this user
            const { error: updateError } = await supabase
              .from('tenants')
              .update({ user_id: data.user.id })
              .eq('id', existingTenant.id)
            
            if (!updateError) {
              console.log('Successfully linked tenant to user')
              navigate('/tenant')
            } else {
              console.error('Error linking tenant:', updateError)
              toast({
                title: "Account Setup Error",
                description: "There was an issue linking your account. Please contact support.",
                variant: "destructive",
              })
              await supabase.auth.signOut()
            }
          } else {
            toast({
              title: "Access Denied",
              description: "No tenant account found for your email. Please contact your administrator to set up your account.",
              variant: "destructive",
            })
            await supabase.auth.signOut()
          }
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
          emailRedirectTo: `${window.location.origin}/tenant-auth`,
          data: {
            role: 'tenant',
            full_name: fullName || tenantAccess.tenant_name
          }
        }
      })

      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            title: "Account Exists",
            description: "An account with this email already exists. Please try signing in instead.",
            variant: "destructive",
          })
          setIsSignUp(false)
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
          {/* Account Status Alert */}
          {accountStatus === 'checking' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Checking account status...
              </AlertDescription>
            </Alert>
          )}
          
          {accountStatus === 'exists' && !isSignUp && (
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Account found. Please sign in or verify your email.</span>
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={resendVerificationEmail}
                  disabled={loading}
                  className="h-auto p-0 text-xs"
                >
                  Resend verification
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {accountStatus === 'new' && isSignUp && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You can create a new account with this email.
              </AlertDescription>
            </Alert>
          )}
          
          {accountStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This email is not registered as a tenant. Please contact your administrator.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setEmailCheckDone(false)
                  setAccountStatus(null)
                }}
                onBlur={handleEmailBlur}
                placeholder="your.email@example.com"
                required
              />
              {accountStatus === 'checking' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking email...
                </div>
              )}
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
                const newSignUpState = !isSignUp
                setIsSignUp(newSignUpState)
                setPassword('')
                setFullName('')
                
                // Auto-trigger appropriate flow based on account status
                if (accountStatus === 'exists' && newSignUpState) {
                  setIsSignUp(false) // Force sign in for existing accounts
                  toast({
                    title: "Account Exists",
                    description: "Please sign in to your existing account.",
                    variant: "default",
                  })
                } else if (accountStatus === 'new' && !newSignUpState) {
                  setIsSignUp(true) // Force sign up for new accounts
                  toast({
                    title: "Create Account",
                    description: "Please create a new account first.",
                    variant: "default",
                  })
                }
              }}
              className="text-sm"
              disabled={accountStatus === 'error'}
            >
              {accountStatus === 'exists' 
                ? 'Account exists - Sign in instead' 
                : accountStatus === 'new'
                ? 'Create your account'
                : isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </Button>
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-sm"
            >
              Back to Main Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TenantAuth
