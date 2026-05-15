'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ShiftRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/attendance') }, [])
  return null
}
