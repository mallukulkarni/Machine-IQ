import { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Html, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { Eye, EyeOff, Thermometer, Activity, Zap, RotateCcw, Info, AlertTriangle, CheckCircle, Play, Pause, Compass } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { RiskGauge } from '@/components/ui/RiskGauge'
import { useAppStore } from '@/store/appStore'
import { apiEndpoints } from '@/utils/api'
import type { AIAnalysis, Scenario, TimeSeriesPoint } from '@/types'

const RISK_COLORS = {
  low: new THREE.Color('#20D3C2'),
  moderate: new THREE.Color('#F5B942'),
  high: new THREE.Color('#F97316'),
  critical: new THREE.Color('#F05B66'),
}

const SENSOR_POSITIONS: { id: string; label: string; position: [number, number, number]; zone: string }[] = [
  { id: 'S1', label: 'Zone A — Drive End', position: [-1.6, 0, 0], zone: 'Zone-A (Drive End)' },
  { id: 'S2', label: 'Zone B — Mid Section', position: [0, 0.55, 0], zone: 'Zone-B (Mid-Section)' },
  { id: 'S3', label: 'Zone C — Non-Drive End', position: [1.6, 0, 0], zone: 'Zone-C (Non-Drive End)' },
]

const MODEL_PARTS = [
  {
    id: 'body',
    label: 'Roller body',
    shortLabel: 'Body',
    position: [0, 0.85, 0] as [number, number, number],
    description: 'Main cylindrical surface. The simulation applies the roller vibration and heatmap here.',
    zone: 'Mid section',
  },
  {
    id: 'drive-shaft',
    label: 'Drive-end shaft',
    shortLabel: 'Drive shaft',
    position: [-2.05, -0.55, 0] as [number, number, number],
    description: 'Drive-side end of the roller assembly, aligned with the drive-end sensor zone.',
    zone: 'Zone A — Drive End',
  },
  {
    id: 'non-drive-shaft',
    label: 'Non-drive-end shaft',
    shortLabel: 'N/D shaft',
    position: [2.05, -0.55, 0] as [number, number, number],
    description: 'Opposite end of the roller assembly, aligned with the non-drive-end sensor zone.',
    zone: 'Zone C — Non-Drive End',
  },
  {
    id: 'drive-band',
    label: 'Drive-side surface band',
    shortLabel: 'Drive band',
    position: [-1.3, 0.15, 0] as [number, number, number],
    description: 'Visual reference band on the drive side of the roller body.',
    zone: 'Near Zone A',
  },
  {
    id: 'non-drive-band',
    label: 'Non-drive-side surface band',
    shortLabel: 'N/D band',
    position: [1.3, 0.15, 0] as [number, number, number],
    description: 'Visual reference band on the non-drive side of the roller body.',
    zone: 'Near Zone C',
  },
] as const

type ModelPartId = (typeof MODEL_PARTS)[number]['id']

interface SensorMarkerProps {
  position: [number, number, number]
  label: string
  zone: string
  riskLevel: string
  selected: boolean
  visible: boolean
  analysis: AIAnalysis | null
  playing: boolean
  onClick: () => void
}

function SensorMarker({ position, label, zone, riskLevel, selected, visible, analysis, playing, onClick }: SensorMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const color = RISK_COLORS[riskLevel as keyof typeof RISK_COLORS] ?? RISK_COLORS.low
  const isConcerning = analysis?.concerning_region === zone

  useFrame((_, delta) => {
    if (!playing) return
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * (isConcerning ? 2 : 0.5)
      const scale = selected ? 1.4 : 1
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1)
    }
  })

  if (!visible) return null

  return (
    <group position={position}>
      <mesh ref={meshRef} onClick={onClick}>
        <octahedronGeometry args={[0.08, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isConcerning ? 0.8 : 0.3} />
      </mesh>
      {/* Pulse ring for concerning zone */}
      {isConcerning && (
        <mesh>
          <ringGeometry args={[0.1, 0.14, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
      {selected && (
        <Html distanceFactor={8} center>
          <div className="bg-[#151F30] border border-white/15 rounded-lg p-2 w-44 text-xs shadow-xl pointer-events-none">
            <p className="font-semibold text-[#F4F7FB] mb-1">{label}</p>
            <p className="text-[#9AA9BD] mb-1.5">{zone}</p>
            {analysis && (
              <>
                <div className="flex justify-between mb-1">
                  <span className="text-[#9AA9BD]">Vibration</span>
                  <span className="text-[#F4F7FB] font-mono">{analysis.sensor_readings.vibration_rms.toFixed(2)} mm/s</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#9AA9BD]">Temp</span>
                  <span className="text-[#F4F7FB] font-mono">{analysis.sensor_readings.temperature.toFixed(1)}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9AA9BD]">Strain</span>
                  <span className="text-[#F4F7FB] font-mono">{analysis.sensor_readings.strain.toFixed(0)} με</span>
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[#9AA9BD]">Status</span>
                  <span className="font-semibold" style={{ color: color.getStyle() }}>{riskLevel}</span>
                </div>
              </>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}

interface RollerMeshProps {
  riskLevel: string
  showHeatmap: boolean
  analysis: AIAnalysis | null
  playing: boolean
  selectedModelPart: ModelPartId | null
  onModelPartClick: (id: ModelPartId) => void
}

function RollerMesh({ riskLevel, showHeatmap, analysis, playing, selectedModelPart, onModelPartClick }: RollerMeshProps) {
  const rollerRef = useRef<THREE.Mesh>(null)
  const leftCapRef = useRef<THREE.Mesh>(null)
  const rightCapRef = useRef<THREE.Mesh>(null)
  const targetColor = useRef(RISK_COLORS.low.clone())

  useFrame((state, delta) => {
    if (rollerRef.current) {
      if (playing) {
        const vibration = analysis?.sensor_readings.vibration_rms ?? 2.5
        rollerRef.current.rotation.x += delta * (0.3 + Math.min(vibration, 20) * 0.012)
        rollerRef.current.position.y = Math.sin(state.clock.elapsedTime * (18 + vibration)) * Math.min(vibration * 0.0015, 0.03)
      } else {
        rollerRef.current.position.y = 0
      }
    }
    // Lerp color toward target
    if (showHeatmap) {
      const dest = RISK_COLORS[riskLevel as keyof typeof RISK_COLORS] ?? RISK_COLORS.low
      targetColor.current.lerp(dest, 0.05)
      if (rollerRef.current) {
        const material = rollerRef.current.material as THREE.MeshStandardMaterial
        material.color.copy(targetColor.current)
        material.emissive.copy(targetColor.current)
        material.emissiveIntensity = riskLevel === 'critical' ? 0.3 : 0.1
      }
    } else {
      if (rollerRef.current) {
        const material = rollerRef.current.material as THREE.MeshStandardMaterial
        material.color.lerp(new THREE.Color('#2a3a4a'), 0.05)
        material.emissiveIntensity = 0
      }
    }
  })

  return (
    <group>
      {/* Main roller body */}
      <mesh
        ref={rollerRef}
        rotation={[0, 0, Math.PI / 2]}
        onClick={(event) => { event.stopPropagation(); onModelPartClick('body') }}
      >
        <cylinderGeometry args={[0.45, 0.45, 3.2, 32, 8]} />
        <meshStandardMaterial
          color="#2a3a4a"
          metalness={0.85}
          roughness={0.2}
          envMapIntensity={1}
        />
      </mesh>
      {/* End caps / shafts */}
      {[-1.8, 1.8].map((x, i) => (
        <mesh
          key={i}
          ref={i === 0 ? leftCapRef : rightCapRef}
          position={[x, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          onClick={(event) => {
            event.stopPropagation()
            onModelPartClick(i === 0 ? 'drive-shaft' : 'non-drive-shaft')
          }}
        >
          <cylinderGeometry args={[0.18, 0.18, 0.5, 20]} />
          <meshStandardMaterial color="#1a2535" metalness={0.9} roughness={0.15} />
        </mesh>
      ))}
      {/* Surface detail bands */}
      {[-1.2, 0, 1.2].map((x, i) => (
        <mesh
          key={i}
          position={[x, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          onClick={(event) => {
            event.stopPropagation()
            onModelPartClick(i === 0 ? 'drive-band' : i === 2 ? 'non-drive-band' : 'body')
          }}
        >
          <cylinderGeometry args={[0.46, 0.46, 0.08, 32]} />
          <meshStandardMaterial color="#20D3C2" metalness={0.7} roughness={0.3} transparent opacity={0.3} />
        </mesh>
      ))}
      {/* Risk zone rings when heatmap on */}
      {showHeatmap && analysis && (
        <>
          {SENSOR_POSITIONS.map((sp, i) => {
            const isHot = analysis.concerning_region === sp.zone
            const c = isHot ? RISK_COLORS[riskLevel as keyof typeof RISK_COLORS] ?? RISK_COLORS.low : RISK_COLORS.low
            return (
              <mesh key={i} position={sp.position} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.47, 0.47, 0.5, 32]} />
                <meshStandardMaterial color={c} emissive={c} emissiveIntensity={isHot ? 0.6 : 0.1} transparent opacity={0.35} />
              </mesh>
            )
          })}
        </>
      )}
      {MODEL_PARTS.map((part) => (
        <Html key={part.id} position={part.position} distanceFactor={3.5} center>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onModelPartClick(part.id)
            }}
            className={`whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-medium shadow-lg transition-colors ${
              selectedModelPart === part.id
                ? 'border-teal-300 bg-teal-500/90 text-slate-950'
                : 'border-white/20 bg-[#101827]/90 text-[#F4F7FB] hover:border-teal-300/70 hover:bg-[#151F30]'
            }`}
          >
            {part.shortLabel}
          </button>
        </Html>
      ))}
    </group>
  )
}

function Scene({
  riskLevel,
  showHeatmap,
  showSensors,
  analysis,
  playing,
  selectedSensor,
  onSensorClick,
  selectedModelPart,
  onModelPartClick,
  controlsRef,
}: {
  riskLevel: string
  showHeatmap: boolean
  showSensors: boolean
  analysis: AIAnalysis | null
  playing: boolean
  selectedSensor: string | null
  onSensorClick: (id: string) => void
  selectedModelPart: ModelPartId | null
  onModelPartClick: (id: ModelPartId) => void
  controlsRef: React.RefObject<any>
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2, 5]} fov={45} />
      <OrbitControls ref={controlsRef} makeDefault />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-3, -3, -3]} intensity={0.3} color="#4B8DFF" />
      <pointLight position={[0, 3, 2]} intensity={0.5} color="#20D3C2" />
      <Environment preset="city" />

      <RollerMesh
        riskLevel={riskLevel}
        showHeatmap={showHeatmap}
        analysis={analysis}
        playing={playing}
        selectedModelPart={selectedModelPart}
        onModelPartClick={onModelPartClick}
      />

      {showSensors &&
        SENSOR_POSITIONS.map((sp) => (
          <SensorMarker
            key={sp.id}
            position={sp.position}
            label={sp.label}
            zone={sp.zone}
            riskLevel={analysis?.concerning_region === sp.zone ? riskLevel : 'low'}
            selected={selectedSensor === sp.id}
            visible={showSensors}
            analysis={analysis}
            playing={playing}
            onClick={() => onSensorClick(sp.id)}
          />
        ))}

      {/* Floor grid */}
      <gridHelper args={[10, 20, 'rgba(32,211,194,0.1)', 'rgba(32,211,194,0.05)']} position={[0, -0.8, 0]} />
    </>
  )
}

export function TwinPage() {
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showSensors, setShowSensors] = useState(true)
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null)
  const [selectedModelPart, setSelectedModelPart] = useState<ModelPartId | null>(null)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([])
  const [playing, setPlaying] = useState(true)
  const [guided, setGuided] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { currentScenario, setScenario, selectedMaterialId, latestAnalysis, latestReading, setLatestAnalysis, setLatestReading } = useAppStore()
  const controlsRef = useRef<any>(null)
  const initialWhatIf = useRef(
    latestReading?.scenario === 'what_if' && latestAnalysis
      ? { analysis: latestAnalysis, reading: latestReading }
      : null,
  )

  useEffect(() => {
    let active = true
    if (initialWhatIf.current) {
      const { analysis: whatIfAnalysis, reading } = initialWhatIf.current
      setAnalysis(whatIfAnalysis)
      const currentPoint: TimeSeriesPoint = {
        timestamp: reading.timestamp,
        vibration_rms: reading.vibration.rms,
        temperature: reading.temperature.current,
        strain: reading.strain.value,
        scenario: reading.scenario,
      }
      apiEndpoints.timeseries(selectedMaterialId ?? 'MAT-001', currentScenario, 30)
        .then((response) => { if (active) setTimeSeries([...response.data.slice(0, -1), currentPoint]) })
        .catch(() => { if (active) setTimeSeries([currentPoint]) })
      return () => { active = false }
    }
    Promise.all([
      apiEndpoints.analyze(selectedMaterialId ?? 'MAT-001', currentScenario),
      apiEndpoints.timeseries(selectedMaterialId ?? 'MAT-001', currentScenario, 30),
    ]).then(([analysisResponse, seriesResponse]) => {
      if (!active) return
      setAnalysis(analysisResponse.data.analysis)
      setLatestAnalysis(analysisResponse.data.analysis)
      setLatestReading(analysisResponse.data.reading)
      setTimeSeries(seriesResponse.data)
      setError(null)
    }).catch(() => {
      if (!active) return
      setAnalysis(null)
      setError('Simulation data is unavailable. Reconnect to the FastAPI sensor and analysis services.')
    })
    return () => { active = false }
  }, [currentScenario, selectedMaterialId, setLatestAnalysis, setLatestReading])

  useEffect(() => {
    if (latestAnalysis) setAnalysis(latestAnalysis)
  }, [latestAnalysis])

  useEffect(() => {
    if (!guided) return
    const scenarios: Scenario[] = ['normal', 'excessive_vibration', 'temperature_rise', 'mechanical_overload', 'combined_abnormal']
    const timer = window.setInterval(() => {
      const currentIndex = scenarios.indexOf(currentScenario)
      initialWhatIf.current = null
      setLatestReading(null)
      setScenario(scenarios[(currentIndex + 1) % scenarios.length])
    }, 5000)
    return () => window.clearInterval(timer)
  }, [guided, currentScenario, setScenario, setLatestReading])

  const selectScenario = (scenario: Scenario) => {
    setGuided(false)
    initialWhatIf.current = null
    setLatestReading(null)
    setScenario(scenario)
  }

  const handleSensorClick = (id: string) => {
    setSelectedSensor((prev) => (prev === id ? null : id))
  }

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
  }

  const resetSimulation = () => {
    setGuided(false)
    setPlaying(false)
    initialWhatIf.current = null
    setScenario('normal')
    setSelectedSensor(null)
    setSelectedModelPart(null)
    resetCamera()
  }

  const riskLevel = analysis?.risk_level ?? 'low'
  const riskColor =
    { critical: '#F05B66', high: '#F97316', moderate: '#F5B942', low: '#20D3C2' }[riskLevel] ?? '#20D3C2'
  const selectedPart = MODEL_PARTS.find((part) => part.id === selectedModelPart)

  return (
    <div className="p-4 min-h-[calc(100vh-3.5rem)] flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#F4F7FB]">Digital Twin · {selectedMaterialId ?? 'MAT-001'}</h2>
          <p className="text-xs text-[#9AA9BD]">Interactive roller simulation · sensor readings and model output are shared with Prediction Centre</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setPlaying((value) => !value)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-xs text-[#F4F7FB]">
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}{playing ? 'Pause' : 'Play'}
          </button>
          <button onClick={resetSimulation} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-xs text-[#F4F7FB]"><RotateCcw className="w-3.5 h-3.5" />Reset</button>
          <button onClick={() => setGuided((value) => !value)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs ${guided ? 'border-teal-400/40 text-teal-300 bg-teal-500/10' : 'border-white/10 text-[#F4F7FB]'}`}>
            <Compass className="w-3.5 h-3.5" />{guided ? 'Stop guide' : 'Guided demo'}
          </button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          ['normal', 'Normal operation'],
          ['excessive_vibration', 'Excessive vibration'],
          ['temperature_rise', 'Temperature rise'],
          ['mechanical_overload', 'Mechanical overload'],
          ['combined_abnormal', 'Combined abnormal'],
        ] as [Scenario, string][]).map(([scenario, label]) => (
          <button key={scenario} onClick={() => selectScenario(scenario)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg border text-xs transition-colors ${currentScenario === scenario ? 'border-teal-400/40 bg-teal-500/10 text-teal-300' : 'border-white/10 text-[#9AA9BD]'}`}>
            {label}
          </button>
        ))}
      </div>
      {/* 3D Viewport */}
      <div className="flex-1 min-h-[520px] flex gap-4 max-lg:flex-col">
      <div className="flex-1 min-h-[420px] relative">
        <div className="absolute top-3 left-3 z-10 flex gap-2 flex-wrap">
          <button
            onClick={() => setShowHeatmap((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
              showHeatmap
                ? 'bg-teal-500/15 border-teal-500/30 text-teal-400'
                : 'bg-[#101827] border-white/10 text-[#9AA9BD]'
            }`}
          >
            {showHeatmap ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} Risk Heatmap
          </button>
          <button
            onClick={() => setShowSensors((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
              showSensors
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                : 'bg-[#101827] border-white/10 text-[#9AA9BD]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Sensors
          </button>
          <button
            onClick={resetCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-white/10 bg-[#101827] text-[#9AA9BD] hover:bg-white/5 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Camera
          </button>
        </div>

        {/* Risk indicator overlay */}
        <div className="absolute top-3 right-3 z-10 bg-[#151F30]/90 backdrop-blur-sm rounded-lg border border-white/10 p-3 flex items-center gap-3">
          <RiskGauge score={analysis?.risk_score ?? 0} size={56} />
          <div>
            <p className="text-xs text-[#9AA9BD]">Risk Level</p>
            <p className="text-sm font-bold" style={{ color: riskColor }}>
              {riskLevel.toUpperCase()}
            </p>
            <Badge variant={riskLevel as any} className="mt-1">
              {analysis?.is_anomaly ? 'Anomaly' : 'Normal'}
            </Badge>
          </div>
        </div>

        {/* Material label */}
        <div className="absolute bottom-3 left-3 z-10 bg-[#151F30]/80 backdrop-blur-sm rounded-lg border border-white/[0.08] px-3 py-2">
          <p className="text-xs font-medium text-[#F4F7FB]">
            {selectedMaterialId ?? 'MAT-001'} — Industrial Steel Roller
          </p>
          <p className="text-xs text-[#9AA9BD]">Virtual 3D Digital Twin · Prototype</p>
        </div>

        <div className="w-full h-full rounded-xl overflow-hidden border border-white/[0.06] bg-[#0a1020]">
          <Canvas shadows>
            <Scene
              riskLevel={riskLevel}
              showHeatmap={showHeatmap}
              showSensors={showSensors}
              analysis={analysis}
              playing={playing}
              selectedSensor={selectedSensor}
              onSensorClick={handleSensorClick}
              selectedModelPart={selectedModelPart}
              onModelPartClick={setSelectedModelPart}
              controlsRef={controlsRef}
            />
          </Canvas>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-72 max-lg:w-full flex-shrink-0 overflow-y-auto space-y-3">
        {/* Sensor List */}
        <Card>
          <CardHeader>
            <CardTitle>Sensor Locations</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {SENSOR_POSITIONS.map((sp) => {
              const isConcerning = analysis?.concerning_region === sp.zone
              const isSelected = selectedSensor === sp.id
              return (
                <button
                  key={sp.id}
                  onClick={() => handleSensorClick(sp.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-teal-500/10 border-teal-500/30'
                      : 'bg-[#101827] border-white/[0.06] hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[#F4F7FB]">{sp.id}</span>
                    {isConcerning ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 text-teal-400" />
                    )}
                  </div>
                  <p className="text-xs text-[#9AA9BD]">{sp.label}</p>
                  {isConcerning && <p className="text-xs text-red-400 mt-1 font-medium">⚠ Region of concern</p>}
                </button>
              )
            })}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model Parts</CardTitle>
          </CardHeader>
          <div className="space-y-1.5">
            {MODEL_PARTS.map((part) => (
              <button
                key={part.id}
                type="button"
                onClick={() => setSelectedModelPart(part.id)}
                className={`w-full rounded-lg border p-2 text-left transition-colors ${
                  selectedModelPart === part.id
                    ? 'border-teal-500/30 bg-teal-500/10'
                    : 'border-white/[0.06] bg-[#101827] hover:border-white/15'
                }`}
              >
                <span className="text-xs font-medium text-[#F4F7FB]">{part.label}</span>
              </button>
            ))}
          </div>
          {selectedPart ? (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-xs font-semibold text-[#F4F7FB]">{selectedPart.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#9AA9BD]">
                {selectedPart.description}
              </p>
              <p className="mt-2 text-[11px] text-[#9AA9BD]/70">
                Location: {selectedPart.zone}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-xs text-[#9AA9BD]">Select a labeled part on the model to view its details.</p>
          )}
        </Card>

        {/* Current Readings */}
        {analysis && (
          <Card>
            <CardHeader>
              <CardTitle>Live Readings</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {[
                {
                  label: 'Vibration RMS',
                  value: `${analysis.sensor_readings.vibration_rms.toFixed(2)} mm/s`,
                  icon: Activity,
                  baseline: `${analysis.baselines.vibration_rms} mm/s`,
                },
                {
                  label: 'Temperature',
                  value: `${analysis.sensor_readings.temperature.toFixed(1)}°C`,
                  icon: Thermometer,
                  baseline: `${analysis.baselines.temperature}°C`,
                },
                {
                  label: 'Strain',
                  value: `${analysis.sensor_readings.strain.toFixed(0)} μstrain`,
                  icon: Zap,
                  baseline: `${analysis.baselines.strain} με`,
                },
              ].map(({ label, value, icon: Icon, baseline }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon className="w-3.5 h-3.5 text-[#9AA9BD] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#9AA9BD]">{label}</p>
                    <p className="text-sm font-semibold text-[#F4F7FB]">{value}</p>
                    <p className="text-xs text-[#9AA9BD]/60">Baseline: {baseline}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Live Sensor Trend</CardTitle></CardHeader>
          {timeSeries.length ? (
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeries}>
                  <XAxis dataKey="timestamp" hide />
                  <YAxis width={28} tick={{ fontSize: 9, fill: '#9AA9BD' }} />
                  <Tooltip contentStyle={{ background: '#151F30', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 10 }} />
                  <Line type="monotone" dataKey="vibration_rms" stroke="#20D3C2" dot={false} strokeWidth={1.5} name="Vibration mm/s" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-xs text-[#9AA9BD]">{error ?? 'Loading sensor trend…'}</p>}
        </Card>

        {/* Heatmap Legend */}
        <Card>
          <CardHeader>
            <CardTitle>Heatmap Legend</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {Object.entries(RISK_COLORS).map(([level, color]) => (
              <div key={level} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: `#${color.getHexString()}` }} />
                <span className="text-xs text-[#9AA9BD] capitalize">{level}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#9AA9BD]/60 mt-3">
            Colors show estimated risk regions based on AI analysis. Not confirmed physical damage locations.
          </p>
        </Card>

        {/* Disclaimer */}
        <div className="p-3 bg-[#151F30] rounded-lg border border-white/[0.06]">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-[#9AA9BD] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#9AA9BD]/70 leading-relaxed">
              3D model shows estimated risk regions, not confirmed physical damage. Prototype system using simulated
              sensor data.
            </p>
          </div>
        </div>
      </div>
      </div>
      {error && <p className="text-xs text-amber-300">{error}</p>}
    </div>
  )
}
