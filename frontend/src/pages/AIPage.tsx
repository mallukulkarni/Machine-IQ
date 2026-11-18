import { useState, useEffect, useCallback } from 'react'
import { Brain, AlertTriangle, CheckCircle, Info, Zap, SlidersHorizontal } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { RiskGauge } from '@/components/ui/RiskGauge'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { apiEndpoints } from '@/utils/api'
import { useAppStore } from '@/store/appStore'
import type { AIAnalysis, Scenario, SensorReading } from '@/types'

const SCENARIOS: { value: Scenario; label: string; desc: string; color: string }[] = [
  { value: 'normal', label: 'Normal Operation', desc: 'All parameters within range', color: '#20D3C2' },
  { value: 'excessive_vibration', label: 'Excessive Vibration', desc: 'Vibration > 12 mm/s RMS', color: '#F97316' },
  { value: 'temperature_rise', label: 'Temperature Rise', desc: 'Temperature > 110°C', color: '#F5B942' },
  { value: 'mechanical_overload', label: 'Mechanical Overload', desc: 'Strain > 280 μstrain', color: '#F97316' },
  { value: 'combined_abnormal', label: 'Combined Abnormal', desc: 'All sensors out of range', color: '#F05B66' },
]

export function AIPage() {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [modelStatus, setModelStatus] = useState<{ trained: boolean; model_type: string; note?: string } | null>(null)
  const [customValues, setCustomValues] = useState({ vibration: 2.5, temperature: 65, strain: 150 })
  const [error, setError] = useState<string | null>(null)
  const { currentScenario, setScenario, selectedMaterialId, setLatestAnalysis, setLatestReading } = useAppStore()
  
  const runAnalysis = useCallback(async (scenario: Scenario) => {
    setLoading(true)
    try {
      const { data } = await apiEndpoints.analyze(selectedMaterialId ?? 'MAT-001', scenario)
      setAnalysis(data.analysis)
      setLatestAnalysis(data.analysis)
      setLatestReading(data.reading)
      setError(null)
    } catch {
      setAnalysis(null)
      setError('Analysis is unavailable. The FastAPI service must be online to run the Isolation Forest model.')
    } finally {
      setLoading(false)
    }
  }, [selectedMaterialId, setLatestAnalysis, setLatestReading])

  const runCustomAnalysis = async () => {
    setLoading(true)
    try {
      const reading: SensorReading = {
        material_id: selectedMaterialId ?? 'MAT-001',
        scenario: 'what_if',
        region: 'Zone-A (Drive End)',
        timestamp: new Date().toISOString(),
        vibration: {
          rms: customValues.vibration, peak: customValues.vibration * 1.6, acceleration: customValues.vibration,
          unit: 'mm/s', baseline: 2.5, max_normal: 5,
        },
        temperature: { current: customValues.temperature, variation: 0, unit: '°C', baseline: 65, max_normal: 85 },
        strain: { value: customValues.strain, variation: 0, unit: 'μstrain', baseline: 150, max_normal: 220 },
      }
      const { data } = await apiEndpoints.analyzeCustom(reading)
      setAnalysis(data.analysis)
      setLatestAnalysis(data.analysis)
      setLatestReading(reading)
      setError(null)
    } catch {
      setAnalysis(null)
      setError('What-if analysis failed. Verify the backend connection and sensor values.')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    apiEndpoints.modelStatus().then((r) => setModelStatus(r.data)).catch(() => setModelStatus(null))
    runAnalysis(currentScenario)
  }, [currentScenario, runAnalysis])
  
  const radarData = analysis ? [
    { subject: 'Vibration', value: Math.min(100, (analysis.sensor_readings.vibration_rms / 15) * 100) },
    { subject: 'Temperature', value: Math.min(100, ((analysis.sensor_readings.temperature - 10) / 120) * 100) },
    { subject: 'Strain', value: Math.min(100, ((analysis.sensor_readings.strain - 50) / 300) * 100) },
    { subject: 'Health', value: analysis.health_score },
    { subject: 'Anomaly', value: (1 - analysis.anomaly_score) * 100 },
  ] : []
  
  const riskColor = analysis
    ? { critical: '#F05B66', high: '#F97316', moderate: '#F5B942', low: '#20D3C2' }[analysis.risk_level] ?? '#20D3C2'
    : '#20D3C2'
  
  return (
    <div className="p-5 space-y-5 max-w-screen-2xl">
      {/* Model Status Bar */}
      <div className="flex items-center justify-between p-3 bg-[#151F30] rounded-lg border border-white/[0.06]">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-teal-400" />
          <div>
            <span className="text-sm font-semibold text-[#F4F7FB]">{modelStatus?.model_type ?? 'Isolation Forest'}</span>
            <span className="text-xs text-[#9AA9BD] ml-2">{modelStatus?.trained ? modelStatus.note : 'Model status unavailable'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#9AA9BD]">
          <Info className="w-3.5 h-3.5" />
          Prototype risk estimates — Not certified safety limits
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>What-if Scenario Engine</CardTitle>
            <p className="text-xs text-[#9AA9BD] mt-1">Submit custom readings to the same Isolation Forest model. Values are hypothetical.</p>
          </div>
          <SlidersHorizontal className="w-4 h-4 text-teal-400" />
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([
            { key: 'vibration', label: 'Vibration RMS', unit: 'mm/s', min: 0, max: 20, step: 0.1 },
            { key: 'temperature', label: 'Temperature', unit: '°C', min: 20, max: 150, step: 1 },
            { key: 'strain', label: 'Strain', unit: 'μstrain', min: 50, max: 400, step: 5 },
          ] as const).map(({ key, label, unit, min, max, step }) => (
            <label key={key} className="text-xs text-[#9AA9BD]">
              <span className="flex justify-between mb-2"><span>{label}</span><strong className="text-[#F4F7FB]">{customValues[key]} {unit}</strong></span>
              <input aria-label={label} type="range" min={min} max={max} step={step} value={customValues[key]}
                onChange={(event) => setCustomValues((values) => ({ ...values, [key]: Number(event.target.value) }))}
                className="w-full accent-teal-400" />
            </label>
          ))}
        </div>
        <button onClick={runCustomAnalysis} disabled={loading}
          className="mt-4 px-3 py-2 rounded-lg bg-teal-500 text-slate-950 text-xs font-semibold disabled:opacity-50">
          Assess these readings
        </button>
      </Card>
      
      {/* Scenario Selector */}
      <div>
        <p className="text-xs text-[#9AA9BD] font-medium uppercase tracking-wider mb-2">Operating Scenario</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.value}
              onClick={() => setScenario(s.value)}
              className={`p-3 rounded-lg border text-left transition-all ${currentScenario === s.value ? 'border-opacity-60 bg-opacity-10' : 'border-white/[0.06] bg-[#151F30] hover:border-white/15'}`}
              style={currentScenario === s.value ? { borderColor: s.color, backgroundColor: `${s.color}12` } : {}}
            >
              <p className="text-xs font-semibold text-[#F4F7FB]">{s.label}</p>
              <p className="text-xs text-[#9AA9BD] mt-0.5">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <CardSkeleton key={i} lines={6} />)}
        </div>
      ) : error ? (
        <Card><p className="text-sm font-medium text-amber-300">Prediction unavailable</p><p className="text-xs text-[#9AA9BD] mt-1">{error}</p></Card>
      ) : analysis ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Risk Summary */}
          <Card>
            <CardHeader><CardTitle>Risk Assessment</CardTitle></CardHeader>
            <div className="flex items-center justify-between mb-4">
              <RiskGauge score={analysis.risk_score} size={100} />
              <div className="text-right">
                <p className="text-xs text-[#9AA9BD] mb-1">Status</p>
                <div className="flex items-center gap-1.5 justify-end">
                  {analysis.is_anomaly ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-teal-400" />}
                  <span className="text-sm font-semibold" style={{ color: riskColor }}>
                    {analysis.is_anomaly ? 'Anomaly Detected' : 'Normal'}
                  </span>
                </div>
                <Badge variant={analysis.risk_level} className="mt-2">{analysis.risk_level} risk</Badge>
              </div>
            </div>
            
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#9AA9BD]">Health Score</span>
                <span className="font-semibold text-teal-400">{analysis.health_score.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9AA9BD]">Risk Score (prototype)</span>
                <span className="font-semibold" style={{ color: riskColor }}>{analysis.risk_score.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9AA9BD]">Anomaly score · model output</span>
                <span className="font-semibold text-[#F4F7FB]">{(analysis.anomaly_score * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9AA9BD]">Region of Concern</span>
                <span className="font-semibold text-[#F4F7FB] text-right max-w-[50%]">{analysis.concerning_region}</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 rounded-lg border" style={{ backgroundColor: `${riskColor}10`, borderColor: `${riskColor}30` }}>
              <p className="text-xs font-semibold mb-1" style={{ color: riskColor }}>Recommendation</p>
              <p className="text-xs text-[#9AA9BD] leading-relaxed">{analysis.recommendation}</p>
            </div>
          </Card>
          
          {/* Sensor Readings */}
          <Card>
            <CardHeader><CardTitle>Sensor Readings vs Baseline</CardTitle></CardHeader>
            <div className="h-44 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Vibration', current: analysis.sensor_readings.vibration_rms, baseline: analysis.baselines.vibration_rms, unit: 'mm/s' },
                  { name: 'Temp', current: analysis.sensor_readings.temperature, baseline: analysis.baselines.temperature, unit: '°C' },
                  { name: 'Strain', current: analysis.sensor_readings.strain / 10, baseline: analysis.baselines.strain / 10, unit: '×10 με' },
                ]} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9AA9BD' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9AA9BD' }} />
                  <Tooltip contentStyle={{ background: '#151F30', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="current" name="Current" fill={riskColor} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="baseline" name="Baseline" fill="rgba(255,255,255,0.1)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#9AA9BD' }} />
                  <Radar dataKey="value" stroke={riskColor} fill={riskColor} fillOpacity={0.15} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          
          {/* Explanation */}
          <Card>
            <CardHeader>
              <CardTitle>AI Explanation</CardTitle>
              <Zap className="w-4 h-4 text-teal-400" />
            </CardHeader>
            
            <div className="space-y-3 mb-4">
              <div className="p-3 bg-[#101827] rounded-lg">
                <p className="text-xs font-medium text-[#9AA9BD] mb-1.5 uppercase tracking-wider">Analysis</p>
                <p className="text-xs text-[#F4F7FB] leading-relaxed">{analysis.explanation}</p>
              </div>
              
              {analysis.contributing_factors.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[#9AA9BD] mb-1.5 uppercase tracking-wider">Contributing Factors</p>
                  <div className="space-y-1.5">
                    {analysis.contributing_factors.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: riskColor }} />
                        <span className="text-[#F4F7FB]">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {analysis.contributing_factors.length === 0 && (
                <div className="flex items-center gap-2 p-2.5 bg-teal-500/10 rounded-lg border border-teal-500/20">
                  <CheckCircle className="w-4 h-4 text-teal-400 flex-shrink-0" />
                  <p className="text-xs text-teal-400">No anomalous factors detected in this reading</p>
                </div>
              )}
            </div>
            
            <div className="p-2.5 bg-[#101827] rounded-lg border border-white/[0.04]">
              <p className="text-xs text-[#9AA9BD]/70 leading-relaxed">
                ⚠ Prototype system using simulated sensor data and Isolation Forest anomaly detection. Risk scores are demonstration estimates only. Do not use for safety-critical decisions without qualified engineering review.
              </p>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
