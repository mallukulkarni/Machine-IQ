import { Sun, Moon, ExternalLink } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAppStore } from '@/store/appStore'
import { useTheme } from '@/hooks/useTheme'
import { supabase } from '@/utils/supabase'

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const { currentScenario } = useAppStore()
  
  return (
    <div className="p-5 space-y-5 max-w-2xl">
      <div>
        <h2 className="text-base font-semibold text-[#F4F7FB]">Settings</h2>
        <p className="text-xs text-[#9AA9BD]">Application preferences and system configuration</p>
      </div>
      
      {/* Theme */}
      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#F4F7FB]">Interface Theme</p>
            <p className="text-xs text-[#9AA9BD] mt-0.5">Switch between dark and light mode</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-teal-500' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform flex items-center justify-center ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'}`}>
              {theme === 'dark' ? <Moon className="w-2.5 h-2.5 text-gray-700" /> : <Sun className="w-2.5 h-2.5 text-yellow-500" />}
            </div>
          </button>
        </div>
      </Card>
      
      {/* Authentication */}
      <Card>
        <CardHeader><CardTitle>Authentication</CardTitle></CardHeader>
        <div className="space-y-3">
          <div className="p-3 bg-[#101827] rounded-lg border border-yellow-500/20">
            <p className={`text-xs font-medium mb-1 ${supabase ? 'text-teal-400' : 'text-yellow-400'}`}>
              {supabase ? 'Supabase configured' : 'Setup Required'}
            </p>
            <p className="text-xs text-[#9AA9BD] leading-relaxed mb-2">
              {supabase
                ? 'Enable the Google provider and email OTP in your Supabase project. Provider credentials and email delivery are managed by Supabase.'
                : 'To enable account sign-in, create a Supabase project and add its public URL and anon key to frontend/.env.local. Demo mode is unauthenticated.'}
            </p>
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer"
              className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors">
              supabase.com <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="text-xs text-[#9AA9BD] space-y-1">
            <p>1. Create project at supabase.com</p>
            <p>2. Enable Google OAuth in Authentication → Providers (optional)</p>
            <p>3. Enable email OTP and configure email delivery in Authentication</p>
            <p>4. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.local</p>
          </div>
        </div>
      </Card>
      
      {/* System Info */}
      <Card>
        <CardHeader><CardTitle>System Information</CardTitle></CardHeader>
        <div className="space-y-2 text-xs">
          {[
            { label: 'Application', value: 'MATERIAL IQ v1.0.0' },
            { label: 'AI Model', value: 'Isolation Forest (scikit-learn)' },
            { label: 'Database', value: 'SQLite (prototype)' },
            { label: 'Current Scenario', value: currentScenario },
            { label: 'Backend URL', value: 'http://localhost:8000' },
            { label: 'Frontend URL', value: 'http://localhost:5173' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
              <span className="text-[#9AA9BD]">{label}</span>
              <span className="text-[#F4F7FB] font-medium">{value}</span>
            </div>
          ))}
        </div>
      </Card>
      
      {/* Disclaimer */}
      <Card>
        <CardHeader><CardTitle>Important Disclaimer</CardTitle></CardHeader>
        <div className="text-xs text-[#9AA9BD] leading-relaxed space-y-2">
          <p>MATERIAL IQ is a college hackathon prototype developed for demonstration purposes only.</p>
          <p>• All sensor readings are simulated by a virtual IoT engine</p>
          <p>• Risk scores are prototype estimates, not certified safety limits</p>
          <p>• AI anomaly detection is based on synthetic training data</p>
          <p>• Factory impact analysis uses hypothetical scenario models</p>
          <p>• Do not use this system for real safety-critical engineering decisions</p>
          <p className="text-teal-400/70 font-medium">See the Damage. Predict the Risk. Protect the Production.</p>
        </div>
      </Card>
    </div>
  )
}
