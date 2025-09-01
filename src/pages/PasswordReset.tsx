import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, DropletIcon, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'

const PasswordReset = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'request' | 'reset' | 'success'>('request')
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // Check if we're in password reset mode (coming from email link)
  const isResetMode = searchParams.has('access_token') || searchParams.has('refresh_token')

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // First check if this email exists in tenants table
      const { data: tenantData } = await supabase.rpc('check_tenant_access' as any, {
        user_email: email
      })
      
      if (!tenantData?.[0]?.has_access) {
        toast({
          title: "Email Not Found",
          description: "This email is not registered as a tenant. Please contact your administrator.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/password-reset`,
      })

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
      } else {
        setStep('success')
        toast({
          title: "Reset Link Sent",
          description: "Please check your email for the password reset link.",
        })
      }
    } catch (error) {
      console.error('Error requesting password reset:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      })
      return
    }

    if (password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Password Updated",
          description: "Your password has been successfully updated.",
        })
        // Redirect to tenant auth page for login
        setTimeout(() => {
          navigate('/tenant-auth')
        }, 2000)
      }
    } catch (error) {
      console.error('Error updating password:', error)
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
            {step === 'success' ? 'Check Your Email' : 
             isResetMode ? 'Reset Your Password' : 
             'Reset Password'}
          </CardTitle>
          <p className="text-muted-foreground">
            {step === 'success' 
              ? 'We\'ve sent you a password reset link'
              : isResetMode 
              ? 'Enter your new password below'
              : 'Enter your email address to receive a reset link'
            }
          </p>
        </CardHeader>
        <CardContent>
          {step === 'success' ? (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  A password reset link has been sent to <strong>{email}</strong>. 
                  Please check your email and click the link to reset your password.
                </AlertDescription>
              </Alert>
              
              <div className="text-center space-y-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/tenant-auth')}
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep('request')
                    setEmail('')
                  }}
                  className="w-full text-sm"
                >
                  Try a different email
                </Button>
              </div>
            </div>
          ) : isResetMode ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  minLength={8}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters long
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          )}
          
          {step !== 'success' && (
            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => navigate('/tenant-auth')}
                className="text-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
            </div>
          )}
          
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

export default PasswordReset