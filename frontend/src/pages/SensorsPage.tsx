import { useState, useEffect, useCallback } from 'react'
import { Activity, Thermometer, Zap, Play, Square, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area } from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { useAppStore } from '@/store/appStore'
import { apiEndpoints } from '@/utils/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { Scenario, SensorReading, AIAnalysis, TimeSeriesPoint } from '@/types'

const SCENARIOS: { value: Scenario; label: string; color: string; icon: string }[] = [
  { value: 'normal', label: 'Normal', color: '#20D3C2', icon: '✓' },
  { value: 'excessive_vibration', label: 'High Vibration', color: '#F97316', icon: '〜' },
  { value: 'temperature_rise', label: 'Temp Rise', color: '#F5B942', icon: '↑' },
  { value: 'mechanical_overload', label: 'Overload', color: '#F97316', icon: '⚡' },
  { value: 'combined_abnormal', label: 'Combined', color: '#F05B66', icon: '⚠' },
]

const BASELINES = { vibration_rms: 2.5, temperature: 65.0, strain: 150.0 }
const THRESHOLDS = { vibration_rms: 5.0, temperature: 85.0, strain: 220.0 }

function SensorCard({ title, icon: Icon, value, unit, baseline, threshold, color }: {
  title: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  value: number; unit: string; baseline: number; threshold: number; color: string
}) {
  const pct = Math.min(100, (value / (threshold * 1.5)) * 100)
  const isHigh = value > threshold
  const diff = ((value - baseline) / baseline * 100).toFixed(0)
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}18` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <span className="text-xs font-medium text-[#9AA9BD] uppercase tracking-wider">{title}</span>
        </div>
        {isHigh ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-teal-400" />}
      </div>
      <div className="mb-3">
        <span className="text-2xl font-bold font-display" style={{ color }}>{value.toFixed(2)}</span>
        <span className="text-sm text-[#9AA9BD] ml-1">{unit}</span>
      </div>
      <div className="mb-3">
        <div className="flex justify-between text-xs text-[#9AA9BD] mb-1">
          <span>0</span><span>Threshold: {threshold}</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-[#9AA9BD]">Baseline: {baseline}</span>
        <span style={{ color: parseFloat(diff) > 0 ? '#F05B66' : '#20D3C2' }}>{parseFloat(diff) > 0 ? '+' : ''}{diff}%</span>
      </div>
    </Card>
  )
}

export function SensorsPage() {
  const { currentScenario, setScenario, selectedMaterialId, setLatestReading, setLatestAnalysis } = useAppStore()
  const [reading, setReading] = useState<SensorReading | null>(null)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([])
  const [connected, setConnected] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(false)
  const { latest, connected: streamConnected, sendScenario } = useWebSocket(
    selectedMaterialId ?? 'MAT-001',
    streaming,
  )

  const fetchReading = useCallback(async (scenario: Scenario) => {
    try {
      const { data } = await apiEndpoints.reading(selectedMaterialId ?? 'MAT-001', scenario)
      setReading(data.reading)
      setAnalysis(data.analysis)
      setLatestReading(data.reading)
      setLatestAnalysis(data.analysis)
      setTimeSeries((previous) => [...previous.slice(-39), {
        timestamp: data.reading.timestamp,
        vibration_rms: data.reading.vibration.rms,
        temperature: data.reading.temperature.current,
        strain: data.reading.strain.value,
        scenario: data.reading.scenario,
      }])
      setConnected(true)
    } catch {
      setConnected(false)
    }
  }, [selectedMaterialId, setLatestReading, setLatestAnalysis])

  const fetchTimeSeries = useCallback(async (scenario: Scenario) => {
    try {
      const { data } = await apiEndpoints.timeseries(selectedMaterialId ?? 'MAT-001', scenario, 40)
      setTimeSeries(data)
    } catch {
      setTimeSeries([])
    }
  }, [selectedMaterialId])

  const handleScenarioChange = (scenario: Scenario) => setScenario(scenario)

  useEffect(() => {
    let active = true
    setLoading(true)
    const load = async () => {
      await fetchTimeSeries(currentScenario)
      await fetchReading(currentScenario)
      if (active) setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [currentScenario, selectedMaterialId, fetchReading, fetchTimeSeries])

  useEffect(() => {
    sendScenario(currentScenario)
  }, [currentScenario, sendScenario])

  useEffect(() => {
    if (!latest) return
    setReading(latest.reading)
    setAnalysis(latest.analysis)
    setLatestReading(latest.reading)
    setLatestAnalysis(latest.analysis)
    setTimeSeries((previous) => [...previous.slice(-39), {
      timestamp: latest.reading.timestamp,
      vibration_rms: latest.reading.vibration.rms,
      temperature: latest.reading.temperature.current,
      strain: latest.reading.strain.value,
      scenario: latest.reading.scenario,
    }])
  }, [latest, setLatestReading, setLatestAnalysis])

  const toggleStream = () => {
    setStreaming((current) => !current)
  }

  const riskColor = analysis
    ? { critical: '#F05B66', high: '#F97316', moderate: '#F5B942', low: '#20D3C2' }[analysis.risk_level] ?? '#20D3C2'
    : '#20D3C2'

  return (
    <div className="p-5 space-y-5">
      {/* Scenario + Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {SCENARIOS.map((s) => (
            <button
              key={s.value}
              onClick={() => handleScenarioChange(s.value)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={currentScenario === s.value
                ? { backgroundColor: `${s.color}18`, borderColor: `${s.color}50`, color: s.color }
                : { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.08)', color: '#9AA9BD' }}
            >
              <span>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <StatusIndicator status={connected || streamConnected ? 'online' : 'offline'} label={connected || streamConnected ? 'Backend Connected' : 'Backend Offline'} />
          <button
            onClick={toggleStream}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${streaming ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-teal-500/10 border-teal-500/30 text-teal-400'}`}
          >
            {streaming ? <><Square className="w-3 h-3" /> Stop</> : <><Play className="w-3 h-3" /> Stream</>}
          </button>
        </div>
      </div>

      {/* Sensor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SensorCard
          title="Vibration RMS" icon={Activity}
          value={reading?.vibration.rms ?? 2.5} unit="mm/s"
          baseline={BASELINES.vibration_rms} threshold={THRESHOLDS.vibration_rms}
          color={reading && reading.vibration.rms > THRESHOLDS.vibration_rms ? '#F05B66' : '#20D3C2'}
        />
        <SensorCard
          title="Temperature" icon={Thermometer}
          value={reading?.temperature.current ?? 65.0} unit="°C"
          baseline={BASELINES.temperature} threshold={THRESHOLDS.temperature}
          color={reading && reading.temperature.current > THRESHOLDS.temperature ? '#F5B942' : '#4B8DFF'}
        />
        <SensorCard
          title="Strain" icon={Zap}
          value={reading?.strain.value ?? 150.0} unit="μstrain"
          baseline={BASELINES.strain} threshold={THRESHOLDS.strain}
          color={reading && reading.strain.value > THRESHOLDS.strain ? '#F97316' : '#9AA9BD'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Vibration History</CardTitle>
            <span className="text-xs text-[#9AA9BD]">Last 40 readings · Simulated</span>
          </CardHeader>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeries} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="vibGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#20D3C2" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#20D3C2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="timestamp" tick={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9AA9BD' }} />
                <Tooltip contentStyle={{ background: '#151F30', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }} />
                <ReferenceLine y={THRESHOLDS.vibration_rms} stroke="#F05B66" strokeDasharray="4 4" label={{ value: 'Threshold', fill: '#F05B66', fontSize: 10 }} />
                <Area type="monotone" dataKey="vibration_rms" stroke="#20D3C2" fill="url(#vibGrad)" strokeWidth={1.5} name="Vibration (mm/s)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Temperature & Strain History</CardTitle>
          </CardHeader>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="timestamp" tick={false} />
                <YAxis yAxisId="temp" tick={{ fontSize: 10, fill: '#9AA9BD' }} orientation="left" />
                <YAxis yAxisId="strain" tick={{ fontSize: 10, fill: '#9AA9BD' }} orientation="right" />
                <Tooltip contentStyle={{ background: '#151F30', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }} />
                <ReferenceLine yAxisId="temp" y={THRESHOLDS.temperature} stroke="#F5B942" strokeDasharray="4 4" />
                <Line yAxisId="temp" type="monotone" dataKey="temperature" stroke="#4B8DFF" strokeWidth={1.5} name="Temp (°C)" dot={false} />
                <Line yAxisId="strain" type="monotone" dataKey="strain" stroke="#F97316" strokeWidth={1.5} name="Strain (με)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* AI Status */}
      {analysis && (
        <Card>
          <CardHeader><CardTitle>Live AI Analysis</CardTitle><span className="text-xs text-[#9AA9BD]">Isolation Forest · Prototype</span></CardHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
            <div>
              <p className="text-xs text-[#9AA9BD] mb-1">Anomaly Detected</p>
              <div className="flex items-center gap-1.5">
                {analysis.is_anomaly ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-teal-400" />}
                <span className="text-sm font-semibold" style={{ color: riskColor }}>{analysis.is_anomaly ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-[#9AA9BD] mb-1">Risk Score</p>
              <span className="text-sm font-bold" style={{ color: riskColor }}>{analysis.risk_score.toFixed(1)}%</span>
            </div>
            <div>
              <p className="text-xs text-[#9AA9BD] mb-1">Risk Level</p>
              <Badge variant={analysis.risk_level}>{analysis.risk_level}</Badge>
            </div>
            <div>
              <p className="text-xs text-[#9AA9BD] mb-1">Region</p>
              <span className="text-xs text-[#F4F7FB] font-medium">{analysis.concerning_region}</span>
            </div>
          </div>
          <div className="p-3 bg-[#101827] rounded-lg text-xs text-[#9AA9BD] leading-relaxed">{analysis.explanation}</div>
          <div className="mt-2 flex items-start gap-1.5 text-xs text-[#9AA9BD]/60">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>All readings are simulated virtual sensor data. Risk scores are prototype estimates only.</span>
          </div>
        </Card>
      )}
    </div>
  )
}
