import { clsx } from 'clsx'
import type { RiskLevel, MaterialCondition, AlertSeverity } from '@/types'

type BadgeVariant = RiskLevel | MaterialCondition | AlertSeverity | 'default'

const VARIANTS: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-400 border border-red-500/30',
  high: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  high_risk: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  moderate: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  warning: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  low: 'bg-teal-500/15 text-teal-400 border border-teal-500/30',
  healthy: 'bg-teal-500/15 text-teal-400 border border-teal-500/30',
  info: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  default: 'bg-white/10 text-[#9AA9BD] border border-white/10',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', VARIANTS[variant] ?? VARIANTS.default, className)}>
      {children}
    </span>
  )
}
