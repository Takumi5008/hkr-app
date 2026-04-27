'use client'
import { useRef, useEffect, useState } from 'react'

export default function TableScrollContainer({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [scrollable, setScrollable] = useState(false)
  const [scrollPct, setScrollPct] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const updateBar = () => {
      const maxScroll = el.scrollWidth - el.clientWidth
      setScrollable(maxScroll > 1)
      setScrollPct(maxScroll > 1 ? (el.scrollLeft / maxScroll) * 100 : 0)
    }

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
    el.addEventListener('scroll', updateBar, { passive: true })

    updateBar()
    const observer = new ResizeObserver(updateBar)
    observer.observe(el)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('scroll', updateBar)
      observer.disconnect()
    }
  }, [])

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = ref.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    el.scrollLeft = (Number(e.target.value) / 100) * maxScroll
  }

  return (
    <div data-table-scroll className="flex flex-col">
      <div ref={ref} className={`overflow-x-auto overscroll-x-contain ${className}`}>
        {children}
      </div>
      {scrollable && (
        <div className="sm:hidden px-3 py-1.5 bg-gray-50 border-t border-gray-100">
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={scrollPct}
            onChange={handleSlider}
            className="w-full h-1 cursor-ew-resize accent-teal-500"
          />
        </div>
      )}
    </div>
  )
}
