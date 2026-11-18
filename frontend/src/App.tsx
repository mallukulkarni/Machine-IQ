import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/components/auth/LoginPage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useTheme } from '@/hooks/useTheme'

// Lazy page imports for performance
import { lazy, Suspense } from 'react'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useAppStore } from '@/store/appStore'

const OverviewPage = lazy(() => import('@/pages/OverviewPage').then(m => ({ default: m.OverviewPage })))
const MaterialsPage = lazy(() => import('@/pages/MaterialsPage').then(m => ({ default: m.MaterialsPage })))
const SensorsPage = lazy(() => import('@/pages/SensorsPage').then(m => ({ default: m.SensorsPage })))
const AIPage = lazy(() => import('@/pages/AIPage').then(m => ({ default: m.AIPage })))
const TwinPage = lazy(() => import('@/pages/TwinPage').then(m => ({ default: m.TwinPage })))
const FactoryPage = lazy(() => import('@/pages/FactoryPage').then(m => ({ default: m.FactoryPage })))
const MaintenancePage = lazy(() => import('@/pages/MaintenancePage').then(m => ({ default: m.MaintenancePage })))
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then(m => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))

function PageLoader() {
  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)}
    </div>
  )
}

function ThemeInitializer() {
  useTheme()
  return null
}

function AuthSessionSync() {
  const { setUser, setAuthReady } = useAppStore()

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true)
      return
    }

    let hasReceivedAuthEvent = false
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      hasReceivedAuthEvent = true
      const user = session?.user
      if (!user?.email) {
        setUser(null)
        setAuthReady(true)
        return
      }
      setUser({
        email: user.email,
        name: user.user_metadata.full_name ?? user.user_metadata.name ?? user.email.split('@')[0],
      })
      setAuthReady(true)
    })

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || hasReceivedAuthEvent) return
      if (error) {
        console.error('[Auth Error] Could not restore Supabase session', error.message)
        setUser(null)
        setAuthReady(true)
        return
      }
      const user = data.session?.user
      if (!user?.email) {
        setUser(null)
        setAuthReady(true)
        return
      }
      setUser({
        email: user.email,
        name: user.user_metadata.full_name ?? user.user_metadata.name ?? user.email.split('@')[0],
      })
      setAuthReady(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [setUser, setAuthReady])

  return null
}

export default function App() {
  return (
    <>
      <ThemeInitializer />
      <AuthSessionSync />
      <ToastProvider />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><OverviewPage /></Suspense>} />
            <Route path="/materials" element={<Suspense fallback={<PageLoader />}><MaterialsPage /></Suspense>} />
            <Route path="/materials/:id" element={<Suspense fallback={<PageLoader />}><MaterialsPage /></Suspense>} />
            <Route path="/sensors" element={<Suspense fallback={<PageLoader />}><SensorsPage /></Suspense>} />
            <Route path="/predictions" element={<Suspense fallback={<PageLoader />}><AIPage /></Suspense>} />
            <Route path="/simulation" element={<Suspense fallback={<PageLoader />}><TwinPage /></Suspense>} />
            <Route path="/factory-impact" element={<Suspense fallback={<PageLoader />}><FactoryPage /></Suspense>} />
            <Route path="/maintenance" element={<Suspense fallback={<PageLoader />}><MaintenancePage /></Suspense>} />
            <Route path="/reports" element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
            <Route path="/ai" element={<Navigate to="/predictions" replace />} />
            <Route path="/twin" element={<Navigate to="/simulation" replace />} />
            <Route path="/factory" element={<Navigate to="/factory-impact" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )
}
