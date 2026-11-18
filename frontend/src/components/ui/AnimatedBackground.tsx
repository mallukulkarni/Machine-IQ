import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/appStore'

interface Particle {
  x: number; y: number; vx: number; vy: number; size: number; opacity: number; life: number; maxLife: number
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useAppStore()
  const animRef = useRef<number>()
  const mouseRef = useRef({ x: 0, y: 0 })
  const particlesRef = useRef<Particle[]>([])
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const isDark = theme === 'dark'
    
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    
    // Init particles
    const initParticles = () => {
      particlesRef.current = Array.from({ length: 50 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
        life: Math.random() * 100,
        maxLife: 100 + Math.random() * 100,
      }))
    }
    initParticles()
    
    const teal = isDark ? 'rgba(32, 211, 194,' : 'rgba(8, 127, 131,'
    const grid = isDark ? 'rgba(32, 211, 194, 0.025)' : 'rgba(8, 127, 131, 0.04)'
    const bg = isDark ? '#090D16' : '#F3F6FA'
    
    let frame = 0
    const draw = () => {
      frame++
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Background
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Ambient glow
      const grad = ctx.createRadialGradient(canvas.width * 0.3, canvas.height * 0.3, 0, canvas.width * 0.3, canvas.height * 0.3, canvas.width * 0.5)
      grad.addColorStop(0, isDark ? 'rgba(32, 211, 194, 0.04)' : 'rgba(8, 127, 131, 0.03)')
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      const grad2 = ctx.createRadialGradient(canvas.width * 0.7, canvas.height * 0.7, 0, canvas.width * 0.7, canvas.height * 0.7, canvas.width * 0.4)
      grad2.addColorStop(0, isDark ? 'rgba(75, 141, 255, 0.03)' : 'rgba(37, 99, 235, 0.02)')
      grad2.addColorStop(1, 'transparent')
      ctx.fillStyle = grad2
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Grid lines
      const gridSize = 50
      ctx.strokeStyle = grid
      ctx.lineWidth = 0.5
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
      }
      
      // Particles
      const particles = particlesRef.current
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.life += 0.5
        
        // Mouse influence
        const dx = mouseRef.current.x - p.x
        const dy = mouseRef.current.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 150) {
          p.vx += dx * 0.00005
          p.vy += dy * 0.00005
        }
        
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        
        const lifeRatio = p.life / p.maxLife
        const opacity = p.opacity * Math.sin(lifeRatio * Math.PI)
        
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `${teal}${opacity})`
        ctx.fill()
        
        if (p.life >= p.maxLife) {
          p.x = Math.random() * canvas.width
          p.y = Math.random() * canvas.height
          p.life = 0
          p.maxLife = 100 + Math.random() * 100
        }
      })
      
      // Sensor network lines
      ctx.lineWidth = 0.3
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            const opacity = (1 - dist / 100) * 0.15
            ctx.strokeStyle = `${teal}${opacity})`
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
      
      // Liquid shine sweep (slow diagonal)
      const shineX = ((frame * 0.3) % (canvas.width * 2)) - canvas.width * 0.5
      const shineGrad = ctx.createLinearGradient(shineX - 100, 0, shineX + 100, canvas.height)
      shineGrad.addColorStop(0, 'transparent')
      shineGrad.addColorStop(0.5, isDark ? 'rgba(32, 211, 194, 0.015)' : 'rgba(8, 127, 131, 0.012)')
      shineGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = shineGrad
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // MATERIAL IQ watermark text
      ctx.save()
      ctx.font = `bold ${Math.min(canvas.width * 0.08, 80)}px Manrope, Inter, sans-serif`
      ctx.fillStyle = isDark ? 'rgba(32, 211, 194, 0.018)' : 'rgba(8, 127, 131, 0.025)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(-0.08)
      ctx.fillText('MATERIAL IQ', 0, 0)
      ctx.restore()
      
      animRef.current = requestAnimationFrame(draw)
    }
    
    draw()
    
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMouseMove)
    
    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [theme])
  
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 1 }}
    />
  )
}
