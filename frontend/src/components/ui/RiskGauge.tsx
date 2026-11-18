interface RiskGaugeProps {
  score: number
  size?: number
}

export function RiskGauge({ score, size = 80 }: RiskGaugeProps) {
  const pct = Math.min(100, Math.max(0, score))
  const color = pct >= 80 ? '#F05B66' : pct >= 60 ? '#F97316' : pct >= 30 ? '#F5B942' : '#20D3C2'
  const r = (size / 2) - 6
  const circumference = 2 * Math.PI * r
  const dash = (pct / 100) * circumference * 0.75
  const gap = circumference * 0.75 - dash
  const offset = -circumference * 0.125

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={5} strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`} strokeDashoffset={offset} strokeLinecap="round" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray={`${dash} ${gap + circumference * 0.25}`} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
      </div>
    </div>
  )
}
