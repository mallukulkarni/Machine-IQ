import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Layers, Cpu, AlertTriangle, Activity, TrendingUp, TrendingDown, Zap } from 'lucide-react'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { RiskGauge } from '@/components/ui/RiskGauge'
import { useAppStore } from '@/store/appStore'
import { apiEndpoints } from '@/utils/api'
import { formatRelativeTime, getRiskColor } from '@/utils/helpers'
import type { OverviewStats, Material, Alert, TimeSeriesPoint } from '@/types'

function KPICard({ title, value, subtitle, icon: Icon, color, trend }: {
  title: string; value: string | number; subtitle?: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <motion.div whileHover={{ y: -2 }} className="bg-[#151F30] rounded-lg border border-white/[0.06] p-4 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[#9AA9BD] font-medium uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-bold text-[#F4F7FB] font-display">{value}</p>
          {subtitle && <p className="text-xs text-[#9AA9BD] mt-1">{subtitle}</p>}
        </div>
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}18` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1">
          {trend === 'up' ? <TrendingUp className="w-3 h-3 text-teal-400" /> : trend === 'down' ? <TrendingDown className="w-3 h-3 text-red-400" /> : null}
          <span className="text-xs text-[#9AA9BD]">Last 24h</span>
        </div>
      )}
      <div className="absolute bottom-0 right-0 w-16 h-16 rounded-tl-full opacity-5" style={{ backgroundColor: color }} />
    </motion.div>
  )
}

function AlertRow({ alert }: { alert: Alert }) {
  const severityColor = {
    critical: 'text-red-400', high: 'text-orange-400',
    warning: 'text-yellow-400', info: 'text-blue-400'
  }[alert.severity] ?? 'text-blue-400'
  
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${severityColor}`} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[#F4F7FB] truncate">{alert.title}</p>
        <p className="text-xs text-[#9AA9BD] mt-0.5">{alert.material_name} · {alert.created_at ? formatRelativeTime(alert.created_at) : 'Active'}</p>
      </div>
      <Badge variant={alert.severity}>{alert.severity}</Badge>
    </div>
  )
}

function MaterialRiskRow({ material }: { material: Material }) {
  const riskColor = getRiskColor(material.risk_level)
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
      <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: riskColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#F4F7FB] truncate">{material.name}</p>
        <p className="text-xs text-[#9AA9BD] truncate">{material.location}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold" style={{ color: riskColor }}>{material.risk_score.toFixed(0)}%</p>
        <Badge variant={material.risk_level}>{material.risk_level}</Badge>
      </div>
    </div>
  )
}

export function OverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sensorTrend, setSensorTrend] = useState<TimeSeriesPoint[]>([])
  const [error, setError] = useState<string | null>(null)
  const { setOverviewStats, setAlerts } = useAppStore()
  const { currentScenario, selectedMaterialId } = useAppStore()
  
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await apiEndpoints.overviewStats(selectedMaterialId, currentScenario)
        setStats(data)
        setOverviewStats(data)
        setAlerts(data.alerts ?? [])
        setError(null)
      } catch {
        setError('Fleet data is unavailable. Check the FastAPI connection and retry.')
      } finally {
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [currentScenario, selectedMaterialId, setOverviewStats, setAlerts])
  
  useEffect(() => {
    apiEndpoints.timeseries(selectedMaterialId ?? 'MAT-001', currentScenario, 24)
      .then(({ data }) => setSensorTrend(data))
      .catch(() => setSensorTrend([]))
  }, [selectedMaterialId, currentScenario])
  
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} lines={2} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <CardSkeleton key={i} lines={5} />)}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-5">
        <Card>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#F4F7FB]">Command Centre unavailable</p>
              <p className="text-xs text-[#9AA9BD] mt-1">{error ?? 'No fleet snapshot is available.'}</p>
              <button onClick={() => window.location.reload()} className="text-xs text-teal-400 mt-3 hover:text-teal-300">Retry</button>
            </div>
          </div>
        </Card>
      </div>
    )
  }
  
  const donutData = stats ? [
    { name: 'Healthy', value: stats.healthy, color: '#20D3C2' },
    { name: 'Warning', value: stats.warning, color: '#F5B942' },
    { name: 'High Risk', value: stats.high_risk, color: '#F97316' },
    { name: 'Critical', value: stats.critical, color: '#F05B66' },
  ].filter(d => d.value > 0) : []
  
  return (
    <div className="p-5 space-y-5 max-w-screen-2xl">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard title="Material Safe Index*" value={`${stats.safe_index.toFixed(0)}`} subtitle="Prototype index · not certified" icon={Activity} color="#20D3C2" />
        <KPICard title="Factory Operational Health" value={`${stats.factory_health.toFixed(0)}%`} icon={TrendingUp} color="#4B8DFF" />
        <KPICard title="Materials Monitored" value={stats.total_materials} icon={Layers} color="#4B8DFF" trend="neutral" />
        <KPICard title="Active AI Alerts" value={stats.active_ai_alerts} icon={AlertTriangle} color="#F05B66" trend={stats.active_ai_alerts > 0 ? 'up' : 'neutral'} />
        <KPICard title="High Risk" value={stats.high_risk + stats.critical} icon={Zap} color="#F97316" />
        <KPICard title="Sensor Activity" value={stats.active_sensors} subtitle="Virtual sensor streams" icon={Cpu} color="#4B8DFF" />
      </div>
      <p className="text-[11px] text-[#9AA9BD]/75">{stats.safe_index_method} {stats.data_source}</p>
      
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sensor Activity · {selectedMaterialId ?? 'MAT-001'}</CardTitle>
            <span className="text-xs text-[#9AA9BD]">Virtual sensor readings · current scenario</span>
          </CardHeader>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sensorTrend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#20D3C2" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#20D3C2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: '#9AA9BD' }} tickLine={false} tickFormatter={(value: string) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#9AA9BD' }} tickLine={false} width={42} />
                <Tooltip contentStyle={{ background: '#151F30', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#9AA9BD' }} />
                <Area type="monotone" dataKey="vibration_rms" stroke="#20D3C2" strokeWidth={2} fill="url(#healthGrad)" name="Vibration RMS · mm/s" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        {/* Condition Donut */}
        <Card>
          <CardHeader><CardTitle>Material Condition</CardTitle></CardHeader>
          <div className="flex items-center justify-center h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, color: '#9AA9BD' }} />
                <Tooltip contentStyle={{ background: '#151F30', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-1">
            <RiskGauge score={100 - stats.safe_index} size={60} />
            <p className="text-xs text-[#9AA9BD] mt-1">Estimated fleet risk</p>
          </div>
        </Card>
      </div>
      
      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Anomalies & Alerts</CardTitle>
            <span className="text-xs text-[#9AA9BD]">{stats.active_ai_alerts} model anomalies</span>
          </CardHeader>
          <div className="space-y-0">
            {[...(stats.anomalies ?? []), ...(stats.alerts ?? [])].slice(0,5).map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
            {(!stats.anomalies?.length && !stats.alerts?.length) && (
              <p className="text-xs text-[#9AA9BD] text-center py-6">No recent anomalies or alerts</p>
            )}
          </div>
        </Card>
        
        {/* High-Risk Materials */}
        <Card>
          <CardHeader>
            <CardTitle>High-Risk Materials</CardTitle>
          </CardHeader>
          <div>
            {(stats.materials ?? []).filter((mat) => mat.risk_score >= 30).sort((a, b) => b.risk_score - a.risk_score).slice(0,5).map((mat) => (
              <MaterialRiskRow key={mat.id} material={mat} />
            ))}
            {(!stats.materials || stats.materials.every((mat) => mat.risk_score < 30)) && (
              <p className="text-xs text-[#9AA9BD] text-center py-6">All materials healthy</p>
            )}
          </div>
        </Card>
        
        {/* AI Insights */}
        <Card>
          <CardHeader><CardTitle>AI Insights</CardTitle></CardHeader>
          <div className="space-y-3">
            {stats.materials.slice().sort((a, b) => b.risk_score - a.risk_score).slice(0, 3).map((material, i) => {
              const insight = {
                title: `${material.name} · ${material.risk_level} risk`,
                body: material.ai_analysis?.explanation ?? material.notes ?? `Prototype risk score ${material.risk_score.toFixed(0)}% based on simulated sensor evidence.`,
                color: getRiskColor(material.risk_level),
              }
              return (
              <div key={i} className="flex gap-2.5">
                <div className="w-1 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: insight.color, minHeight: '2.5rem' }} />
                <div>
                  <p className="text-xs font-semibold text-[#F4F7FB]">{insight.title}</p>
                  <p className="text-xs text-[#9AA9BD] mt-0.5 leading-relaxed">{insight.body}</p>
                </div>
              </div>
              )
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.04]">
            <p className="text-xs text-[#9AA9BD]/60 text-center">*Computed from demo sensor evidence and prototype AI risk, not certified.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
