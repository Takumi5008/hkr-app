'use client'
import { useRef, useEffect } from 'react'

export default function TableScrollContainer({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let startX = 0
    let startY = 0
    let startScrollLeft = 0
    let isHorizontal: boolean | null = null

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      startScrollLeft = el.scrollLeft
      isHorizontal = null
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY

      if (isHorizontal === null) {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 4) {
          isHorizontal = true
        } else if (Math.abs(dy) > 4) {
          isHorizontal = false
        }
      }

      if (isHorizontal) {
        e.preventDefault()
        el.scrollLeft = startScrollLeft - dx
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  return (
    <div ref={ref} data-table-scroll className={`overflow-x-auto overscroll-x-contain ${className}`}>
      {children}
    </div>
  )
}
