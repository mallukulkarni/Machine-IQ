import { type ReactNode } from 'react'
import { clsx } from 'clsx'

interface CardProps {
  children: ReactNode
  className?: string
  glass?: boolean
  noPad?: boolean
}

export function Card({ children, className, glass, noPad }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-lg border transition-colors duration-200',
        glass
          ? 'bg-white/5 dark:bg-white/5 border-white/8 backdrop-blur-sm'
          : 'bg-[var(--bg-card)] border-[var(--border-color)]',
        !noPad && 'p-4',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex items-center justify-between mb-3', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={clsx('text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider', className)}>
      {children}
    </h3>
  )
}
