import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'

export function useTheme() {
  const { theme, setTheme, toggleTheme } = useAppStore()
  
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
      root.style.setProperty('--bg-primary', '#090D16')
      root.style.setProperty('--bg-card', '#151F30')
      root.style.setProperty('--border-color', 'rgba(255,255,255,0.07)')
      root.style.setProperty('--accent-teal', '#20D3C2')
      root.style.setProperty('--text-primary', '#F4F7FB')
      root.style.setProperty('--text-secondary', '#9AA9BD')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
      root.style.setProperty('--bg-primary', '#F3F6FA')
      root.style.setProperty('--bg-card', '#FFFFFF')
      root.style.setProperty('--border-color', '#DCE3EB')
      root.style.setProperty('--accent-teal', '#087F83')
      root.style.setProperty('--text-primary', '#172033')
      root.style.setProperty('--text-secondary', '#64748B')
    }
  }, [theme])
  
  return { theme, setTheme, toggleTheme, isDark: theme === 'dark' }
}
