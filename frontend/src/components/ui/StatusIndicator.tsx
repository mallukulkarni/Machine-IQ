import { clsx } from 'clsx'

interface StatusIndicatorProps {
  status: 'online' | 'warning' | 'critical' | 'offline'
  label?: string
  size?: 'sm' | 'md'
}

const COLORS = {
  online: 'bg-teal-400',
  warning: 'bg-yellow-400',
  critical: 'bg-red-400',
  offline: 'bg-gray-500',
}

export function StatusIndicator({ status, label, size = 'sm' }: StatusIndicatorProps) {
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'
  return (
    <div className="flex items-center gap-1.5">
      <span className={clsx('rounded-full animate-pulse', dotSize, COLORS[status])} />
      {label && <span className="text-xs text-[#9AA9BD]">{label}</span>}
    </div>
  )
}
