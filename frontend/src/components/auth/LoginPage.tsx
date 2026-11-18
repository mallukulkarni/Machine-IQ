import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Mail, ArrowRight, RefreshCw, AlertCircle, Chrome } from 'lucide-react'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { useAppStore } from '@/store/appStore'
import { supabase } from '@/utils/supabase'
import toast from 'react-hot-toast'

type Step = 'email' | 'otp'

export function LoginPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const { setUser } = useAppStore()
  const navigate = useNavigate()
  const authConfigured = supabase !== null
  
  const startCountdown = () => {
    if (countdownInterval.current) clearInterval(countdownInterval.current)
    setCountdown(60)
    countdownInterval.current = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { if (countdownInterval.current) clearInterval(countdownInterval.current); return 0 } return c - 1 })
    }, 1000)
  }

  useEffect(() => () => {
    if (countdownInterval.current) clearInterval(countdownInterval.current)
  }, [])
  
  const sendOTP = async () => {
    if (!email || !email.includes('@')) { setError('Please enter a valid email address'); return }
    if (!supabase) {
      setError('Email sign-in is unavailable. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.local.')
      return
    }
    setLoading(true); setError('')
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({ email })
      if (authError) throw authError
      toast.success('Sign-in code sent. Check your email.')
      setStep('otp')
      startCountdown()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send the sign-in code.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault()
    void sendOTP()
  }

  const handleGoogleSignIn = async () => {
    if (!supabase) return
    setLoading(true)
    setError('')
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      })
      if (authError) throw authError
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in could not be started.')
      setLoading(false)
    }
  }
  
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp || otp.length < 6) { setError('Enter the 6-digit OTP from your email'); return }
    if (!supabase) {
      setError('Email sign-in is unavailable. Configure Supabase credentials and try again.')
      return
    }
    setLoading(true); setError('')
    try {
      const { data, error: authError } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
      if (authError) throw authError
      if (!data.user) throw new Error('Supabase did not return a verified user.')
      const verifiedEmail = data.user.email ?? email
      setUser({
        email: verifiedEmail,
        name: data.user.user_metadata.full_name ?? data.user.user_metadata.name ?? verifiedEmail.split('@')[0],
      })
      navigate('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'The sign-in code could not be verified.')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDemoLogin = () => {
    setUser({ email: 'demo@materialiq.dev', name: 'Demo User' })
    navigate('/dashboard')
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#090D16]">
      <AnimatedBackground />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-500 mb-4 shadow-lg shadow-teal-500/20">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#F4F7FB] font-display tracking-tight">MATERIAL IQ</h1>
          <p className="text-sm text-[#9AA9BD] mt-1">See the Damage. Predict the Risk.</p>
        </div>
        
        {/* Auth Card */}
        <div className="bg-[#151F30] rounded-xl border border-white/[0.08] p-6 shadow-2xl">
          {step === 'email' && (
            <motion.div key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-base font-semibold text-[#F4F7FB] mb-1">Sign in</h2>
              <p className="text-xs text-[#9AA9BD] mb-5">Access your factory intelligence dashboard</p>
              
              {/* Google OAuth */}
              <button
                onClick={handleGoogleSignIn}
                disabled={!authConfigured || loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-white/10 text-[#F4F7FB] hover:bg-white/5 transition-colors text-sm mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Chrome className="w-4 h-4" />
                Continue with Google
              </button>
              {!authConfigured && (
                <p className="text-xs text-amber-300 mb-4">
                  Authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.local to enable email or Google sign-in.
                </p>
              )}
              
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-[#9AA9BD]">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              
              {/* Email OTP */}
              <form onSubmit={handleSendOTP} className="space-y-3">
                <div>
                  <label className="block text-xs text-[#9AA9BD] mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA9BD]" />
                    <input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-[#101827] border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#F4F7FB] placeholder:text-[#9AA9BD]/50 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
                    />
                  </div>
                </div>
                {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
                <button type="submit" disabled={loading || !authConfigured} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-teal-500 hover:bg-teal-400 text-[#090D16] font-semibold text-sm transition-colors disabled:opacity-50">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><span>Send OTP</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
              
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <button onClick={handleDemoLogin} className="w-full text-xs text-[#9AA9BD] hover:text-teal-400 transition-colors py-1">
                  → Enter Demo Mode (no credentials needed)
                </button>
              </div>
            </motion.div>
          )}
          
          {step === 'otp' && (
            <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-base font-semibold text-[#F4F7FB] mb-1">Verify OTP</h2>
              <p className="text-xs text-[#9AA9BD] mb-1">Enter the 6-digit code sent to</p>
              <p className="text-xs font-medium text-teal-400 mb-5">{email}</p>
              
              <form onSubmit={handleVerifyOTP} className="space-y-3">
                <input
                  type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0,6))}
                  placeholder="000000" maxLength={6}
                  className="w-full bg-[#101827] border border-white/10 rounded-lg px-4 py-3 text-center text-xl tracking-[0.5em] font-mono text-[#F4F7FB] focus:outline-none focus:border-teal-500/50 transition-all"
                />
                {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
                <button type="submit" disabled={loading || otp.length < 6} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-[#090D16] font-semibold text-sm transition-colors disabled:opacity-50">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify & Sign In'}
                </button>
              </form>
              
              <div className="mt-4 flex items-center justify-between">
                <button onClick={() => { setStep('email'); setOtp(''); setError('') }} className="text-xs text-[#9AA9BD] hover:text-[#F4F7FB] transition-colors">← Change email</button>
                <button disabled={countdown > 0 || loading || !authConfigured} onClick={() => void sendOTP()} className="text-xs text-teal-400 hover:text-teal-300 disabled:text-[#9AA9BD] transition-colors">
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                </button>
              </div>
            </motion.div>
          )}
        </div>
        
        <p className="text-center text-xs text-[#9AA9BD]/50 mt-4">
          Demo mode does not authenticate a user. Configure Supabase for account sign-in.
        </p>
      </motion.div>
    </div>
  )
}
