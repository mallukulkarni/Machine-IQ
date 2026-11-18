import { Link, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Layers, Cpu, Brain, Box, Factory, Wrench, BarChart3,
  Settings, ChevronLeft, ChevronRight, LogOut, Zap, User
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/utils/supabase'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Command Centre', icon: LayoutDashboard },
  { path: '/materials', label: 'Material Intelligence', icon: Layers },
  { path: '/sensors', label: 'Live Sensor Lab', icon: Cpu },
  { path: '/predictions', label: 'AI Prediction Centre', icon: Brain },
  { path: '/simulation', label: '3D Simulation Lab', icon: Box },
  { path: '/factory-impact', label: 'Factory Impact', icon: Factory },
  { path: '/maintenance', label: 'Maintenance Centre', icon: Wrench },
  { path: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, user, setUser } = useAppStore()
  const location = useLocation()
  const navigate = useNavigate()
  
  const handleLogout = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut()
      if (error) {
        toast.error(`Could not sign out: ${error.message}`)
        return
      }
    }
    setUser(null)
    navigate('/login', { replace: true })
  }
  
  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 220 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative z-20 flex-shrink-0 h-screen bg-[#101827] border-r border-white/[0.06] flex flex-col overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-3 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <span className="text-sm font-bold text-[#F4F7FB] font-display tracking-tight">MATERIAL IQ</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path))
          return (
            <Link
              key={path}
              to={path}
              title={sidebarCollapsed ? label : undefined}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-lg text-sm transition-all duration-150',
                active
                  ? 'bg-teal-500/15 text-teal-400 border border-teal-500/20'
                  : 'text-[#9AA9BD] hover:bg-white/5 hover:text-[#F4F7FB]'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="whitespace-nowrap overflow-hidden text-ellipsis"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )
        })}
      </nav>
      
      {/* User profile + logout */}
      <div className="border-t border-white/[0.06] p-2 space-y-1 flex-shrink-0">
        <div className={clsx('flex items-center gap-2 px-2 py-2', sidebarCollapsed && 'justify-center')}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400/20 to-blue-500/20 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[#F4F7FB] truncate">{user?.name ?? 'Demo User'}</p>
                <p className="text-xs text-[#9AA9BD] truncate">{user?.email ?? 'demo@materialiq.dev'}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={handleLogout}
          title={sidebarCollapsed ? 'Logout' : undefined}
          className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-[#9AA9BD] hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Logout</motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
      
      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-[#101827] border border-white/[0.1] flex items-center justify-center hover:bg-[#1a2535] transition-colors z-30"
      >
        {sidebarCollapsed ? <ChevronRight className="w-3 h-3 text-[#9AA9BD]" /> : <ChevronLeft className="w-3 h-3 text-[#9AA9BD]" />}
      </button>
    </motion.aside>
  )
}
