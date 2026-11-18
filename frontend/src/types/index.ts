export type Theme = 'dark' | 'light'

export type MaterialCondition = 'healthy' | 'warning' | 'high_risk' | 'critical'
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical'
export type AlertSeverity = 'info' | 'warning' | 'high' | 'critical'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type Scenario = 'normal' | 'excessive_vibration' | 'temperature_rise' | 'mechanical_overload' | 'combined_abnormal'

export interface Material {
  id: string
  name: string
  category: string
  location: string
  installation_date?: string
  condition: MaterialCondition
  risk_level: RiskLevel
  risk_score: number
  last_inspection?: string
  notes?: string
  sensor_config?: string
  sensor_reading?: SensorReading
  ai_analysis?: AIAnalysis
  created_at?: string
  updated_at?: string
}

export interface SensorReading {
  material_id: string
  scenario: string
  region: string
  timestamp: string
  vibration: {
    rms: number
    peak: number
    acceleration: number
    unit: string
    baseline: number
    max_normal: number
  }
  temperature: {
    current: number
    variation: number
    unit: string
    baseline: number
    max_normal: number
  }
  strain: {
    value: number
    variation: number
    unit: string
    baseline: number
    max_normal: number
  }
}

export interface AIAnalysis {
  is_anomaly: boolean
  anomaly_score: number
  risk_score: number
  risk_level: RiskLevel
  health_score: number
  risk_percentage: number
  concerning_region: string
  contributing_factors: string[]
  explanation: string
  recommendation: string
  sensor_readings: { vibration_rms: number; temperature: number; strain: number }
  baselines: { vibration_rms: number; temperature: number; strain: number }
}

export interface Alert {
  id: string
  material_id: string
  material_name: string
  severity: AlertSeverity
  title: string
  message: string
  sensor_type: string
  is_acknowledged: boolean
  created_at: string
}

export interface MaintenanceTask {
  id: string
  material_id: string
  title: string
  description?: string
  priority: TaskPriority
  status: TaskStatus
  assigned_to?: string
  due_date?: string
  estimated_cost?: number
  actual_cost?: number
  notes?: string
  created_at?: string
  completed_at?: string
}

export interface TimeSeriesPoint {
  timestamp: string
  vibration_rms: number
  temperature: number
  strain: number
  scenario: string
}

export interface OverviewStats {
  safe_index: number
  total_materials: number
  healthy: number
  warning: number
  high_risk: number
  critical: number
  factory_health: number
  active_sensors: number
  active_alerts: number
  active_ai_alerts: number
  alerts: Alert[]
  anomalies: Alert[]
  materials: Material[]
  generated_at: string
  safe_index_method?: string
  data_source?: string
}

export interface FactoryNode {
  id: string
  type: 'material' | 'machine' | 'output'
  label: string
  category: string
  risk_score: number
  affected: boolean
}

export interface FactoryEdge {
  source: string
  target: string
  weight: number
  relationship: string
}

export interface FactoryGraph {
  nodes: FactoryNode[]
  edges: FactoryEdge[]
}

export interface FactoryImpact {
  material_id: string
  risk_level: string
  risk_score: number
  affected_machines: string[]
  total_affected_nodes: number
  estimated_production_impact_pct: number
  downstream_nodes: string[]
  impact_note: string
  recommendation: string
}
