import type { MaterialCondition, RiskLevel, AlertSeverity } from '@/types'

export function getRiskColor(level: RiskLevel | MaterialCondition | string): string {
  switch (level) {
    case 'critical': return '#F05B66'
    case 'high': case 'high_risk': return '#F97316'
    case 'moderate': case 'warning': return '#F5B942'
    case 'low': case 'healthy': return '#20D3C2'
    default: return '#9AA9BD'
  }
}

export function getConditionLabel(condition: MaterialCondition): string {
  const map: Record<MaterialCondition, string> = {
    healthy: 'Healthy', warning: 'Warning', high_risk: 'High Risk', critical: 'Critical'
  }
  return map[condition] ?? condition
}

export function getRiskLabel(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    low: 'Low', moderate: 'Moderate', high: 'High', critical: 'Critical'
  }
  return map[level] ?? level
}

export function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30'
    case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/30'
    case 'warning': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
    default: return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
  }
}

export function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return ts }
}

export function formatRelativeTime(ts: string): string {
  try {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  } catch { return 'Unknown' }
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
