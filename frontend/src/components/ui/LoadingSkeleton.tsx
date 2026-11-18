import { clsx } from 'clsx'

interface SkeletonProps { className?: string; lines?: number }

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={clsx('animate-pulse rounded bg-white/5', className)} />
  )
}

export function CardSkeleton({ lines = 3 }: SkeletonProps) {
  return (
    <div className="bg-[#151F30] rounded-lg border border-white/[0.06] p-4 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={clsx('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}
