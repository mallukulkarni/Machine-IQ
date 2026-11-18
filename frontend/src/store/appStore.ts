import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme, Scenario, AIAnalysis, SensorReading, OverviewStats, Alert } from '@/types'

interface AppState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  
  currentScenario: Scenario
  setScenario: (scenario: Scenario) => void
  
  selectedMaterialId: string | null
  setSelectedMaterial: (id: string | null) => void
  
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
  toggleSidebar: () => void
  
  // Live sensor data
  latestReading: SensorReading | null
  latestAnalysis: AIAnalysis | null
  setLatestReading: (r: SensorReading | null) => void
  setLatestAnalysis: (a: AIAnalysis) => void
  
  // Overview
  overviewStats: OverviewStats | null
  setOverviewStats: (s: OverviewStats) => void
  
  // Alerts
  alerts: Alert[]
  setAlerts: (a: Alert[]) => void
  
  // User
  user: { email?: string; name?: string } | null
  setUser: (u: { email?: string; name?: string } | null) => void
  authReady: boolean
  setAuthReady: (ready: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      
      currentScenario: 'normal',
      setScenario: (scenario) => set({ currentScenario: scenario }),
      
      selectedMaterialId: 'MAT-001',
      setSelectedMaterial: (id) => set({ selectedMaterialId: id }),
      
      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      
      latestReading: null,
      latestAnalysis: null,
      setLatestReading: (r) => set({ latestReading: r }),
      setLatestAnalysis: (a) => set({ latestAnalysis: a }),
      
      overviewStats: null,
      setOverviewStats: (s) => set({ overviewStats: s }),
      
      alerts: [],
      setAlerts: (a) => set({ alerts: a }),
      
      user: null,
      setUser: (u) => set({ user: u }),
      authReady: false,
      setAuthReady: (ready) => set({ authReady: ready }),
    }),
    {
      name: 'materialiq-store',
      partialize: (s) => ({ theme: s.theme, sidebarCollapsed: s.sidebarCollapsed, selectedMaterialId: s.selectedMaterialId }),
    }
  )
)
