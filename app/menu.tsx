'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Item = { href: string; nome: string; icone: keyof typeof ICONES; contador?: number }

const ICONES = {
  agentes: 'M4 18c0-3 2.5-5 6-5s6 2 6 5M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M16 8a2.5 2.5 0 1 0 0-5M18 17c0-2-1-3.5-2.5-4.2',
  cerebro: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14M10 7v6M7 10h6',
  organograma: 'M8 3h4v4H8zM3 13h4v4H3zM13 13h4v4h-4zM10 7v3M5 13v-3h10v3',
  integracoes: 'M7 3v4M13 3v4M5 7h10v3a5 5 0 0 1-10 0zM10 15v3',
  fila: 'M4 5h12M4 10h12M4 15h7M14 14l2 2 3-4',
  alunos: 'M3 6l7-3 7 3-7 3zM6 8v4c0 1.5 2 3 4 3s4-1.5 4-3V8',
  auditoria: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14M10 6v4l3 2',
  leads: 'M4 5h12v8H9l-4 3v-3H4z',
}

function Icone({ nome }: { nome: keyof typeof ICONES }) {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden className="icone">
      <path d={ICONES[nome]} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Menu({ pendentes }: { pendentes: number }) {
  const atual = usePathname()
  const secoes: { titulo?: string; itens: Item[] }[] = [
    { itens: [
      { href: '/', nome: 'Agentes', icone: 'agentes' },
      { href: '/cerebro', nome: 'Cérebro', icone: 'cerebro' },
    ] },
    { titulo: 'Empresa', itens: [
      { href: '/organograma', nome: 'Organograma', icone: 'organograma' },
      { href: '/integracoes', nome: 'Integrações', icone: 'integracoes' },
      { href: '/alunos', nome: 'Alunos', icone: 'alunos' },
      { href: '/leads', nome: 'Leads', icone: 'leads' },
    ] },
    { titulo: 'Governança', itens: [
      { href: '/fila', nome: 'Aprovações', icone: 'fila', contador: pendentes },
      { href: '/auditoria', nome: 'Auditoria', icone: 'auditoria' },
    ] },
  ]
  const ativo = (href: string) => (href === '/' ? atual === '/' : atual.startsWith(href))
  return (
    <nav className="menu" aria-label="Seções">
      {secoes.map((s, i) => (
        <div key={i} className="menu-secao">
          {s.titulo && <div className="menu-titulo">{s.titulo}</div>}
          {s.itens.map((it) => (
            <Link key={it.href} href={it.href} className={`menu-item ${ativo(it.href) ? 'ativo' : ''}`} aria-current={ativo(it.href) ? 'page' : undefined}>
              <Icone nome={it.icone} />
              <span>{it.nome}</span>
              {!!it.contador && <span className="menu-contador">{it.contador}</span>}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  )
}
