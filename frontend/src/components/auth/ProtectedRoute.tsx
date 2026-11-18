import { Navigate, Outlet } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'

export function ProtectedRoute() {
  const { user, authReady } = useAppStore()
  if (!authReady) {
    return <div className="min-h-screen flex items-center justify-center bg-[#090D16] text-sm text-[#9AA9BD]">Restoring session…</div>
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
