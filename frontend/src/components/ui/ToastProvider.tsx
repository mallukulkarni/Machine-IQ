import { Toaster } from 'react-hot-toast'
import { useAppStore } from '@/store/appStore'

export function ToastProvider() {
  const { theme } = useAppStore()
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: theme === 'dark' ? '#151F30' : '#FFFFFF',
          color: theme === 'dark' ? '#F4F7FB' : '#172033',
          border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          borderRadius: '8px',
          fontSize: '13px',
        },
      }}
    />
  )
}
