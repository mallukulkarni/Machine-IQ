import { useState, useEffect } from 'react'
import { Download, RefreshCw, FileText } from 'lucide-react'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { apiEndpoints } from '@/utils/api'
import { downloadBlob } from '@/utils/helpers'
import { useAppStore } from '@/store/appStore'
import type { TimeSeriesPoint } from '@/types'
import toast from 'react-hot-toast'

export function ReportsPage() {
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [trendData, setTrendData] = useState<TimeSeriesPoint[]>([])
  const [error, setError] = useState<string | null>(null)
  const { currentScenario, selectedMaterialId } = useAppStore()
  
  useEffect(() => {
    apiEndpoints.reportSummary()
      .then((r) => { setSummary(r.data); setError(null) })
      .catch(() => setError('Report data is unavailable. Check the backend connection.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    apiEndpoints.timeseries(selectedMaterialId ?? 'MAT-001', currentScenario, 24)
      .then((response) => setTrendData(response.data))
      .catch(() => setTrendData([]))
  }, [selectedMaterialId, currentScenario])

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const { data } = await apiEndpoints.exportCSV()
      downloadBlob(data, `materialiq_report_${new Date().toISOString().slice(0,10)}.csv`)
      toast.success('CSV report downloaded')
    } catch {
      toast.error('Export failed. Backend may be offline.')
    } finally {
      setExporting(false)
    }
  }
  
  const conditionData = summary ? [
    { name: 'Healthy', value: summary.healthy, fill: '#20D3C2' },
    { name: 'Warning', value: summary.warning, fill: '#F5B942' },
    { name: 'High Risk', value: summary.high_risk, fill: '#F97316' },
    { name: 'Critical', value: summary.critical, fill: '#F05B66' },
  ] : []
  
  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#F4F7FB]">Reports & Analytics</h2>
          <p className="text-xs text-[#9AA9BD]">Generated: {summary ? new Date(summary.generated_at).toLocaleString() : '—'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} disabled={exporting}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-400 hover:bg-teal-500/20 transition-colors text-sm disabled:opacity-50">
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
        </div>
      </div>
      
      {/* KPI Row */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <CardSkeleton key={i} lines={1} />)}</div>
      ) : !summary ? (
        <Card><p className="text-sm font-medium text-amber-300">Reports unavailable</p><p className="text-xs text-[#9AA9BD] mt-1">{error}</p></Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Materials Monitored', value: summary.total_materials, color: '#4B8DFF' },
            { label: 'Material Safe Index*', value: summary.avg_health_score.toFixed(1), color: '#20D3C2' },
            { label: 'Active AI Alerts', value: summary.active_alerts, color: '#F05B66' },
            { label: 'Factory Operational Health', value: `${summary.operational_health.toFixed(1)}%`, color: '#F5B942' },
          ].map((kpi) => (
            <Card key={kpi.label} className="text-center">
              <p className="text-2xl font-bold font-display" style={{ color: kpi.color }}>{kpi.value}</p>
              <p className="text-xs text-[#9AA9BD] mt-1">{kpi.label}</p>
            </Card>
          ))}
        </div>
      )}
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Condition Distribution</CardTitle></CardHeader>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conditionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9AA9BD' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9AA9BD' }} />
                <Tooltip contentStyle={{ background: '#151F30', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {conditionData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        <Card>
          <CardHeader><CardTitle>Recent Sensor Trend · {selectedMaterialId ?? 'MAT-001'}</CardTitle></CardHeader>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 11, fill: '#9AA9BD' }} tickFormatter={(value: string) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                <YAxis tick={{ fontSize: 11, fill: '#9AA9BD' }} />
                <Tooltip contentStyle={{ background: '#151F30', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="vibration_rms" stroke="#20D3C2" strokeWidth={2} dot={false} name="Vibration RMS · mm/s" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      
      {/* Report Info */}
      <Card>
        <CardHeader><CardTitle>Report Contents</CardTitle></CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#9AA9BD]">
          <div className="space-y-1.5">
            <p className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-teal-400" /> Material ID and properties</p>
            <p className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-teal-400" /> Current condition and risk level</p>
            <p className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-teal-400" /> Prototype risk score (simulation)</p>
            <p className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-teal-400" /> AI anomaly detection result</p>
          </div>
          <div className="space-y-1.5">
            <p className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-blue-400" /> Sensor baseline comparison</p>
            <p className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-blue-400" /> Maintenance recommendations</p>
            <p className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-blue-400" /> Report timestamp</p>
            <p className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-blue-400" /> Installation date & location</p>
          </div>
        </div>
      </Card>
      
      <p className="text-xs text-[#9AA9BD]/50 text-center">All data in reports is from simulated sensors and prototype AI analysis. Not for safety-critical use.</p>
    </div>
  )
}
