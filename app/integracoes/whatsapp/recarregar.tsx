'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** O QR do WhatsApp vence em ~40 s: a tela se atualiza sozinha enquanto o chip não conecta. */
export function Recarregar({ segundos = 15 }: { segundos?: number }) {
  const router = useRouter()
  useEffect(() => {
    const t = setInterval(() => router.refresh(), segundos * 1000)
    return () => clearInterval(t)
  }, [router, segundos])
  return null
}
