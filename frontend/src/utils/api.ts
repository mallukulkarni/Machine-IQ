import axios from 'axios'
import { supabase } from '@/utils/supabase'

const BASE_URL = '/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  if (!supabase) return config
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const accessToken = data.session?.access_token
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('[API Error]', err.response?.status, err.response?.data || err.message)
    return Promise.reject(err)
  }
)

export const apiEndpoints = {
  health: () => api.get('/health'),
  
  // Overview
  overviewStats: (materialId?: string | null, scenario?: string) =>
    api.get('/overview/stats', {
      params: {
        ...(materialId ? { material_id: materialId } : {}),
        ...(scenario ? { scenario } : {}),
      },
    }),
  
  // Materials
  materials: () => api.get('/materials/').then((response) => ({
    ...response,
    data: response.data.materials ?? response.data,
  })),
  material: (id: string) => api.get(`/materials/${id}`),
  createMaterial: (data: unknown) => api.post('/materials/', data),
  
  // Sensors
  reading: (materialId: string, scenario: string, region?: string) =>
    api.get('/ai/analyze', { params: { material_id: materialId, scenario, region } }),
  timeseries: (materialId: string, scenario: string, points = 60) =>
    api.get('/sensors/timeseries', { params: { material_id: materialId, scenario, points } }).then((response) => ({
      ...response,
      data: response.data.data ?? response.data,
    })),
  scenarios: () => api.get('/sensors/scenarios'),
  baselines: () => api.get('/sensors/baselines'),
  
  // AI
  analyze: (materialId: string, scenario: string) =>
    api.get('/ai/analyze', { params: { material_id: materialId, scenario } }),
  analyzeCustom: (reading: unknown) => api.post('/ai/analyze', reading),
  trainModel: () => api.post('/ai/model/train'),
  modelStatus: () => api.get('/ai/model/status').then((response) => ({
    ...response,
    data: {
      trained: response.data.is_trained,
      model_type: response.data.model_type,
      note: response.data.note,
    },
  })),
  
  // Factory
  factoryGraph: () => api.get('/factory/graph'),
  factoryImpact: (materialId: string, riskScore: number, riskLevel: string) =>
    api.get(`/factory/impact/${materialId}`, { params: { risk_score: riskScore, risk_level: riskLevel } }),
  simulateFailure: (materialId: string) => api.get(`/factory/simulate-failure/${materialId}`),
  
  // Maintenance
  tasks: () => api.get('/maintenance/').then((response) => ({
    ...response,
    data: response.data.tasks ?? response.data,
  })),
  createTask: (data: unknown) => api.post('/maintenance/', data),
  
  // Reports
  reportSummary: () => api.get('/overview/stats').then((response) => ({
    ...response,
    data: {
      total_materials: response.data.total_materials,
      healthy: response.data.healthy,
      warning: response.data.warning,
      high_risk: response.data.high_risk,
      critical: response.data.critical,
      avg_health_score: response.data.safe_index,
      active_alerts: response.data.active_ai_alerts,
      operational_health: response.data.factory_health,
      generated_at: response.data.generated_at,
    },
  })),
  exportCSV: () => api.get('/reports/export/csv', { responseType: 'blob' }),
  
  // Alerts
  alerts: () => api.get('/alerts/').then((response) => ({
    ...response,
    data: response.data.alerts ?? response.data,
  })),
}
