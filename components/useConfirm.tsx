'use client'
import { useState, useCallback } from 'react'

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean
    message: string
    resolve: ((v: boolean) => void) | null
  }>({ open: false, message: '', resolve: null })

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, message, resolve })
    })
  }, [])

  const answer = (v: boolean) => {
    state.resolve?.(v)
    setState({ open: false, message: '', resolve: null })
  }

  const dialog = state.open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6">
        <p className="text-sm text-gray-700 text-center mb-6 leading-relaxed">{state.message}</p>
        <div className="flex gap-3">
          <button
            onClick={() => answer(false)}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            いいえ
          </button>
          <button
            onClick={() => answer(true)}
            className="flex-1 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-xl hover:bg-rose-600 transition-colors"
          >
            はい
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { confirm, ConfirmDialog: dialog }
}
