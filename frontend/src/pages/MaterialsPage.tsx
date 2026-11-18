import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, Plus, ChevronRight, Calendar, MapPin, Cpu, X } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { RiskGauge } from '@/components/ui/RiskGauge'
import { apiEndpoints } from '@/utils/api'
import { getRiskColor, getConditionLabel, formatTimestamp } from '@/utils/helpers'
import { createPassportQr } from '@/utils/qr'
import { useAppStore } from '@/store/appStore'
import type { Material, MaterialCondition, MaintenanceTask, TimeSeriesPoint } from '@/types'
import toast from 'react-hot-toast'

const CONDITION_FILTERS: { label: string; value: MaterialCondition | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Healthy', value: 'healthy' },
  { label: 'Warning', value: 'warning' },
  { label: 'High Risk', value: 'high_risk' },
  { label: 'Critical', value: 'critical' },
]

function MaterialCard({ material, selected, onClick }: { material: Material; selected: boolean; onClick: () => void }) {
  const riskColor = getRiskColor(material.risk_level)
  return (
    <motion.div
      whileHover={{ x: 2 }}
      onClick={onClick}
      className={`p-3.5 rounded-lg border cursor-pointer transition-all duration-150 ${
        selected
          ? 'bg-teal-500/10 border-teal-500/30'
          : 'bg-[#151F30] border-white/[0.06] hover:border-white/15'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: riskColor }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#F4F7FB] truncate">{material.name}</p>
          <p className="text-xs text-[#9AA9BD] truncate">{material.id} · {material.category}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant={material.condition}>{getConditionLabel(material.condition)}</Badge>
            <span className="text-xs font-semibold" style={{ color: riskColor }}>Risk: {material.risk_score.toFixed(0)}%</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#9AA9BD] flex-shrink-0" />
      </div>
    </motion.div>
  )
}

function MaterialDetail({ material, records, history }: { material: Material; records: MaintenanceTask[]; history: TimeSeriesPoint[] }) {
  const sensorConfig = material.sensor_config ? JSON.parse(material.sensor_config) : {}
  const passportUrl = new URL(`/materials/${encodeURIComponent(material.id)}`, window.location.origin).toString()
  const qr = useMemo(() => createPassportQr(passportUrl), [passportUrl])
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#F4F7FB]">{material.name}</h2>
          <p className="text-xs text-[#9AA9BD]">{material.id} · {material.category}</p>
        </div>
        <RiskGauge score={material.risk_score} size={72} />
      </div>
      
      {/* Status */}
      <div className="flex items-center gap-3">
        <Badge variant={material.condition}>{getConditionLabel(material.condition)}</Badge>
        <Badge variant={material.risk_level}>{material.risk_level} risk</Badge>
      </div>
      
      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#101827] rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1"><MapPin className="w-3 h-3 text-[#9AA9BD]" /><span className="text-xs text-[#9AA9BD]">Location</span></div>
          <p className="text-xs font-medium text-[#F4F7FB]">{material.location}</p>
        </div>
        <div className="bg-[#101827] rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1"><Calendar className="w-3 h-3 text-[#9AA9BD]" /><span className="text-xs text-[#9AA9BD]">Installed</span></div>
          <p className="text-xs font-medium text-[#F4F7FB]">{material.installation_date ?? 'N/A'}</p>
        </div>
      </div>
      
      {/* Sensor Config */}
      <div>
        <p className="text-xs text-[#9AA9BD] mb-2 font-medium uppercase tracking-wider">Sensor Configuration</p>
        <div className="flex gap-2">
          {Object.entries(sensorConfig).map(([key, enabled]) => (
            <div key={key} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border ${enabled ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' : 'bg-white/5 border-white/10 text-[#9AA9BD]'}`}>
              <Cpu className="w-3 h-3" />
              {key}
            </div>
          ))}
        </div>
      </div>
      
      {/* Notes */}
      {material.notes && (
        <div className="bg-[#101827] rounded-lg p-3">
          <p className="text-xs text-[#9AA9BD] mb-1 font-medium uppercase tracking-wider">Notes</p>
          <p className="text-xs text-[#F4F7FB] leading-relaxed">{material.notes}</p>
        </div>
      )}
      
      <div className="flex items-center gap-4 p-3 bg-[#101827] rounded-lg border border-white/10">
        <svg viewBox="-4 -4 37 37" role="img" aria-label={`Digital passport QR code for ${material.id}`} className="w-24 h-24 bg-white p-1 rounded">
          <rect x="-4" y="-4" width="37" height="37" fill="white" />
          {qr.flatMap((row, y) => row.map((dark, x) => dark ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#111827" /> : null))}
        </svg>
        <div>
          <p className="text-xs font-medium text-[#F4F7FB]">Material Digital Passport</p>
          <p className="text-xs text-[#9AA9BD] mt-1">Scan for the unique {material.id} profile URL.</p>
        </div>
      </div>

      <div>
        <p className="text-xs text-[#9AA9BD] mb-2 font-medium uppercase tracking-wider">Sensor History · Last 24 samples</p>
        <div className="h-36 bg-[#101827] rounded-lg p-2">
          {history.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <XAxis dataKey="timestamp" hide />
                <YAxis width={35} tick={{ fontSize: 9, fill: '#9AA9BD' }} />
                <Tooltip contentStyle={{ background: '#151F30', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 10 }} />
                <Line type="monotone" dataKey="vibration_rms" stroke="#20D3C2" dot={false} strokeWidth={1.5} name="Vibration RMS · mm/s" />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-[#9AA9BD] p-2">Sensor history unavailable.</p>}
        </div>
      </div>

      <div>
        <p className="text-xs text-[#9AA9BD] mb-2 font-medium uppercase tracking-wider">Maintenance Records</p>
        {records.length ? <div className="space-y-2">
          {records.map((task) => (
            <div key={task.id} className="p-2.5 bg-[#101827] rounded-lg border border-white/[0.04]">
              <div className="flex justify-between gap-2">
                <p className="text-xs text-[#F4F7FB] font-medium">{task.title}</p>
                <Badge variant={task.priority === 'critical' ? 'critical' : task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'warning' : 'healthy'}>{task.priority}</Badge>
              </div>
              <p className="text-xs text-[#9AA9BD] mt-1">{task.status.replace('_', ' ')}{task.due_date ? ` · Due ${formatTimestamp(task.due_date)}` : ''}</p>
            </div>
          ))}
        </div> : <p className="text-xs text-[#9AA9BD]">No maintenance records.</p>}
      </div>
      
      {/* Disclaimer */}
      <p className="text-xs text-[#9AA9BD]/50 text-center">Risk estimates are prototype calculations · Not certified safety assessments</p>
    </div>
  )
}

export function MaterialsPage() {
  const { id: routeMaterialId } = useParams()
  const setGlobalSelectedMaterial = useAppStore((state) => state.setSelectedMaterial)
  const [materials, setMaterials] = useState<Material[]>([])
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([])
  const [history, setHistory] = useState<TimeSeriesPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [conditionFilter, setConditionFilter] = useState<MaterialCondition | 'all'>('all')
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMaterial, setNewMaterial] = useState({ id: '', name: '', category: '', location: '' })
  
  useEffect(() => {
    apiEndpoints.materials()
      .then((r) => {
        setMaterials(r.data)
        if (r.data.length > 0) {
          const preferredId = routeMaterialId ?? useAppStore.getState().selectedMaterialId
          const selected = r.data.find((material: Material) => material.id === preferredId) ?? r.data[0]
          setSelectedMaterial(selected)
          setGlobalSelectedMaterial(selected.id)
        }
      })
      .catch(() => setLoadError('Material records could not be loaded. Check the FastAPI connection.'))
      .finally(() => setLoading(false))
    apiEndpoints.tasks().then((r) => setMaintenanceTasks(r.data)).catch(() => setMaintenanceTasks([]))
  }, [routeMaterialId, setGlobalSelectedMaterial])

  useEffect(() => {
    if (!selectedMaterial) return
    const config = selectedMaterial.sensor_config ? JSON.parse(selectedMaterial.sensor_config) : {}
    apiEndpoints.timeseries(selectedMaterial.id, config.scenario ?? 'normal', 24)
      .then((r) => setHistory(r.data))
      .catch(() => setHistory([]))
  }, [selectedMaterial])
  
  const filtered = materials.filter((m) => {
    const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase())
    const matchesCondition = conditionFilter === 'all' || m.condition === conditionFilter
    return matchesSearch && matchesCondition
  })

  const createMaterial = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const { data } = await apiEndpoints.createMaterial({
        ...newMaterial,
        id: newMaterial.id.trim() || undefined,
      })
      setMaterials((current) => [...current, data])
      setSelectedMaterial(data)
      setGlobalSelectedMaterial(data.id)
      setNewMaterial({ id: '', name: '', category: '', location: '' })
      setShowAddForm(false)
      toast.success('Material registered')
    } catch {
      toast.error('Could not register material. Check the backend connection.')
    }
  }
  
  return (
    <div className="p-5 min-h-[calc(100vh-3.5rem)] flex flex-col md:flex-row gap-4">
      {/* Left Panel - List */}
      <div className="w-full md:w-72 flex-shrink-0 flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA9BD]" />
          <input
            type="text" placeholder="Search materials..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#151F30] border border-white/[0.06] rounded-lg pl-9 pr-3 py-2 text-sm text-[#F4F7FB] placeholder:text-[#9AA9BD]/50 focus:outline-none focus:border-teal-500/40 transition-all"
          />
        </div>
        
        {/* Filters */}
        <div className="flex gap-1.5 flex-wrap">
          {CONDITION_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setConditionFilter(value)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${conditionFilter === value ? 'bg-teal-500/15 border-teal-500/30 text-teal-400' : 'border-white/10 text-[#9AA9BD] hover:bg-white/5'}`}
            >
              {label}
            </button>
          ))}
        </div>
        
        {/* Add Material */}
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-teal-500/30 text-teal-400 text-sm hover:bg-teal-500/10 transition-colors"
        >
          <Plus className="w-4 h-4" /> Register Material
        </button>

        {showAddForm && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[#F4F7FB]">Register a material</p>
              <button onClick={() => setShowAddForm(false)} aria-label="Close registration form"><X className="w-4 h-4 text-[#9AA9BD]" /></button>
            </div>
            <form onSubmit={createMaterial} className="space-y-2">
              {([
                ['id', 'Material ID (optional)'],
                ['name', 'Material name'],
                ['category', 'Type / category'],
                ['location', 'Factory location'],
              ] as const).map(([field, label]) => (
                <input key={field} required={field !== 'id'} placeholder={label} value={newMaterial[field]}
                  onChange={(event) => setNewMaterial((current) => ({ ...current, [field]: event.target.value }))}
                  className="w-full bg-[#101827] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F4F7FB] placeholder:text-[#9AA9BD]/60 focus:outline-none focus:border-teal-500/40" />
              ))}
              <button type="submit" className="w-full py-2 rounded-lg bg-teal-500 text-slate-950 text-xs font-semibold">Save material</button>
            </form>
          </Card>
        )}
        
        {/* Material List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loadError && <p role="alert" className="text-xs text-amber-300">{loadError}</p>}
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} lines={2} />)
          ) : filtered.length === 0 ? (
            <p className="text-xs text-[#9AA9BD] text-center py-8">No materials match your filter</p>
          ) : (
            filtered.map((m) => (
              <MaterialCard
                key={m.id} material={m}
                selected={selectedMaterial?.id === m.id}
                onClick={() => { setSelectedMaterial(m); setGlobalSelectedMaterial(m.id) }}
              />
            ))
          )}
        </div>
      </div>
      
      {/* Right Panel - Detail */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {selectedMaterial ? (
          <Card className="h-full">
            <MaterialDetail
              material={selectedMaterial}
              history={history}
              records={maintenanceTasks.filter((task) => task.material_id === selectedMaterial.id)}
            />
          </Card>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Cpu className="w-10 h-10 text-[#9AA9BD]/30 mx-auto mb-3" />
              <p className="text-sm text-[#9AA9BD]">Select a material to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
