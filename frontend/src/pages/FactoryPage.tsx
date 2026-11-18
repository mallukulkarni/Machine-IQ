import { useState, useEffect, useCallback } from 'react'
import { Factory, AlertTriangle, Play, RotateCcw } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { apiEndpoints } from '@/utils/api'
import { useAppStore } from '@/store/appStore'
import type { FactoryGraph, FactoryImpact } from '@/types'

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  'MAT-001': { x: 80, y: 60 },
  'MAT-002': { x: 80, y: 140 },
  'MAT-003': { x: 80, y: 220 },
  'MAT-004': { x: 80, y: 300 },
  'MAT-005': { x: 80, y: 380 },
  'MCH-001': { x: 260, y: 180 },
  'MCH-002': { x: 400, y: 220 },
  'MCH-003': { x: 540, y: 220 },
  'MCH-004': { x: 540, y: 300 },
  'MCH-005': { x: 680, y: 260 },
  'PROD-001': { x: 820, y: 260 },
}

const NODE_COLORS: Record<string, string> = {
  material: '#20D3C2',
  machine: '#4B8DFF',
  output: '#F5B942',
}

function FactoryGraphSVG({ graph, impact, selectedNode, onNodeClick }: {
  graph: FactoryGraph
  impact: FactoryImpact | null
  selectedNode: string | null
  onNodeClick: (id: string) => void
}) {
  const affectedSet = new Set(impact?.downstream_nodes ?? [])
  if (impact?.material_id) affectedSet.add(impact.material_id)

  return (
    <svg viewBox="0 0 920 460" className="w-full h-full" style={{ minHeight: 320 }}>
      {/* Edges */}
      {graph.edges.map((edge, i) => {
        const src = NODE_POSITIONS[edge.source]
        const dst = NODE_POSITIONS[edge.target]
        if (!src || !dst) return null
        const isAffected = affectedSet.has(edge.source) || affectedSet.has(edge.target)
        return (
          <g key={i}>
            <line
              x1={src.x + 32} y1={src.y + 16} x2={dst.x} y2={dst.y + 16}
              stroke={isAffected ? '#F05B66' : 'rgba(255,255,255,0.1)'}
              strokeWidth={isAffected ? 2 : 1}
              strokeDasharray={isAffected ? '6 3' : 'none'}
            />
            <polygon
              points={`${dst.x},${dst.y+10} ${dst.x-8},${dst.y+16} ${dst.x},${dst.y+22}`}
              fill={isAffected ? '#F05B66' : 'rgba(255,255,255,0.15)'}
            />
          </g>
        )
      })}
      {/* Nodes */}
      {graph.nodes.map((node) => {
        const pos = NODE_POSITIONS[node.id]
        if (!pos) return null
        const isAffected = affectedSet.has(node.id)
        const isSelected = selectedNode === node.id
        const baseColor = NODE_COLORS[node.type] ?? '#9AA9BD'
        const fillColor = isAffected ? '#F05B66' : baseColor
        return (
          <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`} onClick={() => onNodeClick(node.id)} className="cursor-pointer">
            <rect width={120} height={32} rx={6}
              fill={`${fillColor}18`}
              stroke={isSelected ? '#fff' : fillColor}
              strokeWidth={isSelected ? 2 : 1}
              className="transition-all"
            />
            {isAffected && (
              <rect width={120} height={32} rx={6} fill="none" stroke={fillColor} strokeWidth={2} opacity={0.5}>
                <animate attributeName="opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite" />
              </rect>
            )}
            <text x={8} y={14} fill={fillColor} fontSize={8} fontWeight="600"
              style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {node.type.toUpperCase()}
            </text>
            <text x={8} y={25} fill="rgba(244,247,251,0.9)" fontSize={9} fontWeight="500">
              {node.label.length > 15 ? node.label.slice(0, 14) + '…' : node.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function FactoryPage() {
  const [graph, setGraph] = useState<FactoryGraph | null>(null)
  const [impact, setImpact] = useState<FactoryImpact | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [simResult, setSimResult] = useState<{ disrupted_systems: string[]; total_disrupted: number; note: string } | null>(null)
  const [plannedImpact, setPlannedImpact] = useState<FactoryImpact | null>(null)
  const [riskReduction, setRiskReduction] = useState(50)
  const [error, setError] = useState<string | null>(null)
  const { currentScenario, setLatestAnalysis, setLatestReading } = useAppStore()

  useEffect(() => {
    apiEndpoints.factoryGraph()
      .then((r) => setGraph(r.data))
      .catch(() => setError('Factory graph unavailable. Check the FastAPI service connection.'))
      .finally(() => setLoading(false))
  }, [])

  const analyzeImpact = useCallback(async (materialId: string) => {
    setAnalyzing(true)
    setSimResult(null)
    setPlannedImpact(null)
    setError(null)
    try {
      const { data: analysisResult } = await apiEndpoints.analyze(materialId, currentScenario)
      setLatestAnalysis(analysisResult.analysis)
      setLatestReading(analysisResult.reading)
      const { data: impactResult } = await apiEndpoints.factoryImpact(
        materialId,
        analysisResult.analysis.risk_score,
        analysisResult.analysis.risk_level,
      )
      setImpact(impactResult)
    } catch {
      setImpact(null)
      setError('Impact analysis failed. Verify the backend connection and material selection.')
    } finally {
      setAnalyzing(false)
    }
  }, [currentScenario, setLatestAnalysis, setLatestReading])

  const simulateFailure = useCallback(async (materialId: string) => {
    try {
      const { data } = await apiEndpoints.simulateFailure(materialId)
      setSimResult(data)
    } catch {
      setSimResult(null)
      setError('Failure simulation unavailable. Verify the backend connection.')
    }
  }, [])

  const compareProductionScenarios = async () => {
    if (!impact) return
    const plannedRisk = impact.risk_score * (1 - riskReduction / 100)
    const plannedLevel = plannedRisk >= 80 ? 'critical' : plannedRisk >= 60 ? 'high' : plannedRisk >= 30 ? 'moderate' : 'low'
    try {
      const { data } = await apiEndpoints.factoryImpact(impact.material_id, plannedRisk, plannedLevel)
      setPlannedImpact(data)
      setError(null)
    } catch {
      setError('Production scenario comparison failed. Verify the backend connection.')
    }
  }

  const handleNodeClick = (id: string) => {
    setSelectedNode(id)
    if (id.startsWith('MAT-')) analyzeImpact(id)
  }

  if (loading) return <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <CardSkeleton key={i} lines={4} />)}</div>

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#F4F7FB]">Factory Dependency Graph</h2>
          <p className="text-xs text-[#9AA9BD]">Click a material node to analyze downstream impact · NetworkX dependency engine</p>
        </div>
        {error && <p className="text-xs text-amber-300">{error}</p>}
        <button onClick={() => { setImpact(null); setSelectedNode(null); setSimResult(null) }}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-[#9AA9BD] hover:bg-white/5 transition-colors">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {/* Graph */}
      <Card noPad>
        <div className="p-4" style={{ minHeight: 340 }}>
          {graph && (
            <FactoryGraphSVG
              graph={graph} impact={impact}
              selectedNode={selectedNode} onNodeClick={handleNodeClick}
            />
          )}
        </div>
        <div className="px-4 pb-3 flex items-center gap-4 text-xs text-[#9AA9BD] border-t border-white/[0.04]">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-teal-400/20 border border-teal-400/50 inline-block" /> Material</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-400/20 border border-blue-400/50 inline-block" /> Machine</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400/20 border border-yellow-400/50 inline-block" /> Output</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400/20 border border-red-400/50 inline-block" /> Affected</span>
        </div>
      </Card>

      {/* Impact Analysis */}
      {impact && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Impact Analysis — {impact.material_id}</CardTitle></CardHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Risk Level', value: <Badge variant={impact.risk_level as any}>{impact.risk_level}</Badge> },
                  { label: 'Risk Score', value: <span className="text-sm font-bold text-red-400">{impact.risk_score}%</span> },
                  { label: 'Affected Systems', value: <span className="text-sm font-bold text-orange-400">{impact.total_affected_nodes}</span> },
                  { label: 'Production Impact*', value: <span className="text-sm font-bold text-yellow-400">{impact.estimated_production_impact_pct}%</span> },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#101827] rounded-lg p-3">
                    <p className="text-xs text-[#9AA9BD] mb-1">{label}</p>
                    {value}
                  </div>
                ))}
              </div>
              <div className="p-3 bg-[#101827] rounded-lg">
                <p className="text-xs font-medium text-[#F4F7FB] mb-1">Recommendation</p>
                <p className="text-xs text-[#9AA9BD] leading-relaxed">{impact.recommendation}</p>
              </div>
              <div className="p-2.5 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-xs text-yellow-400/80 leading-relaxed">
                ⚠ {impact.impact_note}
              </div>
              <div className="p-3 bg-[#101827] rounded-lg border border-white/[0.04]">
                <p className="text-xs font-semibold text-[#F4F7FB] mb-1">Production What-if Analysis</p>
                <label className="text-xs text-[#9AA9BD]">
                  Assumed risk reduction after planned maintenance: {riskReduction}%
                  <input type="range" min="0" max="80" step="5" value={riskReduction}
                    onChange={(event) => setRiskReduction(Number(event.target.value))}
                    className="w-full mt-2 accent-teal-400" />
                </label>
                <button onClick={compareProductionScenarios} className="mt-2 px-3 py-1.5 rounded-lg border border-teal-500/30 text-teal-300 text-xs">
                  Compare scenarios
                </button>
                {plannedImpact && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="p-2 rounded bg-white/[0.03]">
                      <p className="text-[10px] text-[#9AA9BD]">Continue operation</p>
                      <p className="text-sm font-bold text-orange-300">{impact.estimated_production_impact_pct}% estimated</p>
                    </div>
                    <div className="p-2 rounded bg-white/[0.03]">
                      <p className="text-[10px] text-[#9AA9BD]">Planned maintenance</p>
                      <p className="text-sm font-bold text-teal-300">{plannedImpact.estimated_production_impact_pct}% estimated</p>
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-[#9AA9BD]/70 mt-2">Hypothetical graph-model estimates only; risk reduction is an explicit planner assumption, not a measured outcome.</p>
              </div>
              <button
                onClick={() => simulateFailure(impact.material_id)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
              >
                <Play className="w-3.5 h-3.5" /> Simulate Complete Failure
              </button>
            </div>
          </Card>

          {simResult && (
            <Card>
              <CardHeader><CardTitle>Failure Simulation Result</CardTitle></CardHeader>
              <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 mb-3">
                <p className="text-xs font-semibold text-red-400 mb-1">⚠ {simResult.total_disrupted} Systems Disrupted (Simulated)</p>
                <p className="text-xs text-[#9AA9BD] leading-relaxed">{simResult.note}</p>
              </div>
              <div className="space-y-1.5">
                {simResult.disrupted_systems.map((sys) => (
                  <div key={sys} className="flex items-center gap-2 text-xs py-1.5 border-b border-white/[0.04] last:border-0">
                    <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                    <span className="text-[#F4F7FB]">{sys}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {!impact && !loading && (
        <div className="text-center py-8 text-[#9AA9BD] text-sm">
          <Factory className="w-10 h-10 mx-auto mb-3 opacity-30" />
          Click any material node (teal) in the graph to analyze its downstream factory impact
        </div>
      )}
      {analyzing && <p className="text-xs text-[#9AA9BD] text-center">Calculating downstream impact from the current AI risk estimate…</p>}

      <p className="text-xs text-[#9AA9BD]/50 text-center">Factory dependency analysis uses NetworkX graph engine · All impact figures are hypothetical scenario estimates</p>
    </div>
  )
}
