'use client'
import { useEffect, useRef } from 'react'

/** No celular o mapa é mais largo que a tela: abre já centralizado no Cérebro. */
export function PainelMapa({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
  }, [])
  return <div className="mapa-rolagem" ref={ref}>{children}</div>
}
