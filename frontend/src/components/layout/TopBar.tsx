import { Bell, Search, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useAppStore } from '@/store/appStore'
import { useNavigate } from 'react-router-dom'

interface TopBarProps {
  title: string
  backendOnline?: boolean
}

export function TopBar({ title, backendOnline = true }: TopBarProps) {
  const { theme, toggleTheme } = useTheme()
  const { alerts } = useAppStore()
  const navigate = useNavigate()
  const unreadAlerts = alerts.filter((a) => !a.is_acknowledged).length
  
  return (
    <header className="h-14 bg-[#101827]/80 backdrop-blur-sm border-b border-white/[0.06] flex items-center justify-between px-4 flex-shrink-0 z-10 relative">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-[#F4F7FB] font-display">{title}</h1>
        <div className="flex items-center gap-1.5">
          {backendOnline ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" /><span className="text-xs text-[#9AA9BD]">Connected</span></>
          ) : (
            <><span className="w-1.5 h-1.5 rounded-full bg-red-400" /><span className="text-xs text-red-400">Backend Offline</span></>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Search */}
        <button onClick={() => navigate('/materials')} aria-label="Search materials" title="Search materials" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9AA9BD] hover:bg-white/5 transition-colors">
          <Search className="w-4 h-4" />
        </button>
        
        {/* Alerts */}
        <button onClick={() => navigate('/dashboard')} aria-label={`View ${unreadAlerts} active alerts`} title="View alerts" className="relative w-8 h-8 rounded-lg flex items-center justify-center text-[#9AA9BD] hover:bg-white/5 transition-colors">
          <Bell className="w-4 h-4" />
          {unreadAlerts > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
              {unreadAlerts}
            </span>
          )}
        </button>
        
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9AA9BD] hover:bg-white/5 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  )
}
