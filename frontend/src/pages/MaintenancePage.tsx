import { useState, useEffect } from 'react'
import { Wrench, Plus, Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { apiEndpoints } from '@/utils/api'
import { useAppStore } from '@/store/appStore'
import { formatTimestamp } from '@/utils/helpers'
import type { MaintenanceTask, TaskPriority, TaskStatus } from '@/types'
import toast from 'react-hot-toast'

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'text-yellow-400' },
  in_progress: { label: 'In Progress', icon: Wrench, color: 'text-blue-400' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'text-teal-400' },
  overdue: { label: 'Overdue', icon: XCircle, color: 'text-red-400' },
}

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  low: 'healthy', medium: 'warning', high: 'high', critical: 'critical'
}

function TaskCard({ task }: { task: MaintenanceTask }) {
  const StatusIcon = STATUS_CONFIG[task.status]?.icon ?? Clock
  const statusColor = STATUS_CONFIG[task.status]?.color ?? 'text-[#9AA9BD]'
  
  return (
    <Card className="hover:border-white/15 transition-all cursor-default">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 mr-3">
          <p className="text-sm font-medium text-[#F4F7FB] leading-tight">{task.title}</p>
          <p className="text-xs text-[#9AA9BD] mt-0.5">Material: {task.material_id}</p>
        </div>
        <Badge variant={PRIORITY_BADGE[task.priority] as any}>{task.priority}</Badge>
      </div>
      {task.description && (
        <p className="text-xs text-[#9AA9BD] leading-relaxed mb-3">{task.description}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <StatusIcon className={`w-3.5 h-3.5 ${statusColor}`} />
          <span className={`text-xs ${statusColor}`}>{STATUS_CONFIG[task.status]?.label}</span>
        </div>
        {task.estimated_cost && (
          <div className="flex items-center gap-1 text-xs text-[#9AA9BD]">
            <DollarSign className="w-3 h-3" />
            ${task.estimated_cost.toLocaleString()} est.
          </div>
        )}
      </div>
      {task.due_date && (
        <p className="text-xs text-[#9AA9BD] mt-2">Due: {formatTimestamp(task.due_date)}</p>
      )}
    </Card>
  )
}

export function MaintenancePage() {
  const { latestAnalysis, latestReading } = useAppStore()
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newTask, setNewTask] = useState({ material_id: 'MAT-001', title: '', description: '', priority: 'medium', estimated_cost: '' })
  
  useEffect(() => {
    apiEndpoints.tasks()
      .then((r) => setTasks(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])
  
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data } = await apiEndpoints.createTask({
        ...newTask,
        estimated_cost: newTask.estimated_cost ? parseFloat(newTask.estimated_cost) : undefined
      })
      setTasks((prev) => [data, ...prev])
      setShowForm(false)
      toast.success('Maintenance task created')
    } catch {
      toast.error('Failed to create task. Is the backend running?')
    }
  }
  
  const byPriority = {
    critical: tasks.filter((t) => t.priority === 'critical'),
    high: tasks.filter((t) => t.priority === 'high'),
    medium: tasks.filter((t) => t.priority === 'medium'),
    low: tasks.filter((t) => t.priority === 'low'),
  }
  
  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#F4F7FB]">Maintenance Tasks</h2>
          <p className="text-xs text-[#9AA9BD]">AI-driven maintenance recommendations based on risk assessment</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-400 hover:bg-teal-500/20 transition-colors text-sm">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {latestAnalysis && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Current model recommendation</CardTitle>
              <p className="text-xs text-[#9AA9BD] mt-1">
                {latestReading?.material_id ?? 'Selected material'} · {latestReading?.scenario ?? 'Latest analysis'} · prototype estimate
              </p>
            </div>
            <Badge variant={latestAnalysis.risk_level}>{latestAnalysis.risk_level} risk</Badge>
          </CardHeader>
          <p className="text-sm text-[#F4F7FB]">{latestAnalysis.recommendation}</p>
          <p className="text-xs text-[#9AA9BD] mt-2">Review the recommendation with a qualified engineer; it is not an automated work order.</p>
        </Card>
      )}
      
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Create Maintenance Task</CardTitle></CardHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#9AA9BD] mb-1 block">Material ID</label>
                <input value={newTask.material_id} onChange={(e) => setNewTask(p => ({...p, material_id: e.target.value}))}
                  className="w-full bg-[#101827] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4F7FB] focus:outline-none focus:border-teal-500/40" />
              </div>
              <div>
                <label className="text-xs text-[#9AA9BD] mb-1 block">Priority</label>
                <select value={newTask.priority} onChange={(e) => setNewTask(p => ({...p, priority: e.target.value}))}
                  className="w-full bg-[#101827] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4F7FB] focus:outline-none focus:border-teal-500/40">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-[#9AA9BD] mb-1 block">Task Title *</label>
              <input required value={newTask.title} onChange={(e) => setNewTask(p => ({...p, title: e.target.value}))}
                placeholder="e.g. Vibration inspection — Bearing Assembly C"
                className="w-full bg-[#101827] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4F7FB] focus:outline-none focus:border-teal-500/40" />
            </div>
            <div>
              <label className="text-xs text-[#9AA9BD] mb-1 block">Description</label>
              <textarea value={newTask.description} onChange={(e) => setNewTask(p => ({...p, description: e.target.value}))}
                rows={2} className="w-full bg-[#101827] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4F7FB] focus:outline-none focus:border-teal-500/40 resize-none" />
            </div>
            <div>
              <label className="text-xs text-[#9AA9BD] mb-1 block">Estimated Cost ($)</label>
              <input type="number" value={newTask.estimated_cost} onChange={(e) => setNewTask(p => ({...p, estimated_cost: e.target.value}))}
                className="w-full bg-[#101827] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4F7FB] focus:outline-none focus:border-teal-500/40" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 rounded-lg bg-teal-500 text-[#090D16] font-semibold text-sm hover:bg-teal-400 transition-colors">Create Task</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-white/10 text-[#9AA9BD] text-sm hover:bg-white/5 transition-colors">Cancel</button>
            </div>
          </form>
        </Card>
      )}
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <CardSkeleton key={i} lines={4} />)}
        </div>
      ) : (
        <div className="space-y-5">
          {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((priority) => (
            byPriority[priority].length > 0 && (
              <div key={priority}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={PRIORITY_BADGE[priority] as any} className="capitalize">{priority} Priority</Badge>
                  <span className="text-xs text-[#9AA9BD]">{byPriority[priority].length} task{byPriority[priority].length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {byPriority[priority].map((task) => <TaskCard key={task.id} task={task} />)}
                </div>
              </div>
            )
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-16">
              <Wrench className="w-10 h-10 text-[#9AA9BD]/30 mx-auto mb-3" />
              <p className="text-sm text-[#9AA9BD]">No maintenance tasks. Backend may be offline.</p>
            </div>
          )}
        </div>
      )}
      
      <div className="p-3 bg-[#151F30] rounded-lg border border-white/[0.06]">
        <p className="text-xs text-[#9AA9BD]/70">⚠ Maintenance recommendations are AI-generated prototype suggestions based on sensor risk scores. All maintenance decisions must be reviewed by qualified engineers following facility safety procedures.</p>
      </div>
    </div>
  )
}
