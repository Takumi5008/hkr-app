'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MtgRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/attendance?tab=mtg') }, [])
  return null
}
