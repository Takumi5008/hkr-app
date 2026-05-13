'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number; y: number; vx: number; vy: number
  alpha: number; color: string; size: number; trail: { x: number; y: number }[]
}
interface Rocket {
  x: number; y: number; vy: number; targetY: number
  color: string; exploded: boolean; particles: Particle[]
  trail: { x: number; y: number; alpha: number }[]
}

const COLORS = [
  '#a78bfa', '#818cf8', '#60a5fa', '#38bdf8',
  '#34d399', '#f472b6', '#fb923c', '#facc15',
  '#c084fc', '#e879f9',
]

function randomColor() { return COLORS[Math.floor(Math.random() * COLORS.length)] }

function explode(rocket: Rocket) {
  rocket.exploded = true
  const count = 90 + Math.floor(Math.random() * 50)
  const baseColor = rocket.color
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const speed = 1.5 + Math.random() * 4.5
    const useAlt = Math.random() > 0.6
    rocket.particles.push({
      x: rocket.x, y: rocket.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      alpha: 1,
      color: useAlt ? randomColor() : baseColor,
      size: 1.2 + Math.random() * 2.2,
      trail: [],
    })
  }
  // sparks – fast thin streaks
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 5 + Math.random() * 6
    rocket.particles.push({
      x: rocket.x, y: rocket.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      alpha: 1, color: '#ffffff', size: 0.7, trail: [],
    })
  }
}

export default function FireworksCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const cv = canvas

    function resize() {
      cv.width = window.innerWidth
      cv.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const rockets: Rocket[] = []

    function launch() {
      if (rockets.filter(r => !r.exploded).length >= 4) return
      const x = cv.width * (0.1 + Math.random() * 0.8)
      const targetY = cv.height * (0.08 + Math.random() * 0.45)
      const dist = cv.height - targetY
      const color = randomColor()
      rockets.push({
        x, y: cv.height,
        vy: -(dist / (38 + Math.random() * 12)),
        targetY, color, exploded: false, particles: [], trail: [],
      })
    }

    let lastTime = 0
    let nextLaunch = 600 + Math.random() * 800

    function animate(time: number) {
      ctx.fillStyle = 'rgba(0,0,0,0)'
      ctx.clearRect(0, 0, cv.width, cv.height)

      // auto launch
      if (time - lastTime > nextLaunch) {
        launch()
        lastTime = time
        nextLaunch = 500 + Math.random() * 900
      }

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i]
        if (!r.exploded) {
          // record trail
          r.trail.push({ x: r.x, y: r.y, alpha: 1 })
          if (r.trail.length > 18) r.trail.shift()

          // draw trail
          r.trail.forEach((t, ti) => {
            const a = (ti / r.trail.length) * 0.7
            ctx.globalAlpha = a
            ctx.beginPath()
            ctx.arc(t.x, t.y, 1.5 * (ti / r.trail.length), 0, Math.PI * 2)
            ctx.fillStyle = r.color
            ctx.fill()
          })

          // draw rocket head
          ctx.globalAlpha = 1
          ctx.beginPath()
          ctx.arc(r.x, r.y, 3, 0, Math.PI * 2)
          ctx.fillStyle = '#ffffff'
          ctx.fill()

          r.y += r.vy
          if (r.y <= r.targetY) explode(r)
        } else {
          let alive = false
          r.particles.forEach(p => {
            if (p.alpha <= 0) return
            alive = true
            p.trail.push({ x: p.x, y: p.y })
            if (p.trail.length > 4) p.trail.shift()

            p.x += p.vx; p.y += p.vy
            p.vy += 0.06
            p.vx *= 0.97; p.vy *= 0.97
            p.alpha -= 0.013 + Math.random() * 0.005

            // trail
            p.trail.forEach((t, ti) => {
              ctx.globalAlpha = p.alpha * (ti / p.trail.length) * 0.4
              ctx.beginPath()
              ctx.arc(t.x, t.y, p.size * 0.5, 0, Math.PI * 2)
              ctx.fillStyle = p.color
              ctx.fill()
            })

            ctx.globalAlpha = Math.max(0, p.alpha)
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
            ctx.fillStyle = p.color
            ctx.shadowBlur = 6
            ctx.shadowColor = p.color
            ctx.fill()
            ctx.shadowBlur = 0
          })
          ctx.globalAlpha = 1
          if (!alive) rockets.splice(i, 1)
        }
      }

      raf = requestAnimationFrame(animate)
    }

    let raf = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 2 }}
    />
  )
}
