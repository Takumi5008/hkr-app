'use client'

import { useEffect } from 'react'

// スマホのソフトキーボード表示時にフォーカス要素をスクロールして見えるようにする
export default function VirtualKeyboardFix() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const onResize = () => {
      const focused = document.activeElement as HTMLElement | null
      if (!focused || focused === document.body) return
      // キーボードが出て viewport が縮んだときだけ実行
      if (vv.height < window.innerHeight * 0.75) {
        setTimeout(() => {
          focused.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 50)
      }
    }

    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [])

  return null
}
