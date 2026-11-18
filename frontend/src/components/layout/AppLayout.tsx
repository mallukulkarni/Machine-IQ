import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import { useTheme } from '@/hooks/useTheme'
import { apiEndpoints } from '@/utils/api'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Command Centre',
  '/materials': 'Material Intelligence',
  '/sensors': 'Live Sensor Intelligence Lab',
  '/predictions': 'AI Prediction Centre',
  '/simulation': '3D Simulation Lab',
  '/factory-impact': 'Factory Impact Analysis',
  '/maintenance': 'Smart Maintenance Centre',
  '/reports': 'Reports & Analytics',
  '/settings': 'Settings',
}

export function AppLayout() {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] ?? (location.pathname.startsWith('/materials/') ? PAGE_TITLES['/materials'] : 'MATERIAL IQ')
  const { setAlerts } = useAppStore()
  const [backendOnline, setBackendOnline] = useState(false)
  useTheme()
  
  useEffect(() => {
    apiEndpoints.health()
      .then((r) => setBackendOnline(r.data?.status === 'ok'))
      .catch(() => setBackendOnline(false))
    apiEndpoints.alerts().then((r) => setAlerts(r.data)).catch(() => {})
  }, [setAlerts])
  
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      <AnimatedBackground />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <TopBar title={title} backendOnline={backendOnline} />
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="flex-1 overflow-y-auto"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  )
}
