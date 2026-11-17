import type { Metadata } from 'next'
import Link from 'next/link'
import { Inter, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { usuarioAtual } from '@/lib/sessao'
import { getBanco } from '@/lib/db'
import { NOME_PAPEL } from '@/lib/papeis'

export const metadata: Metadata = {
  title: 'Central · Pataro',
  description: 'Agentes de IA da Pataro num lugar só: Cérebro, fila de aprovação, alunos e auditoria.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

const sans = Inter({ subsets: ['latin'], variable: '--f-sans', display: 'swap' })
const serifa = Instrument_Serif({ subsets: ['latin'], weight: '400', style: 'italic', variable: '--f-serifa', display: 'swap' })

export default async function Layout({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioAtual()
  let pendentes = 0
  if (usuario) {
    const db = await getBanco()
    const [r] = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM fila WHERE estado = 'pendente'`)
    pendentes = r?.n ?? 0
  }
  return (
    <html lang="pt-BR" className={`${sans.variable} ${serifa.variable}`}>
      <body>
        {usuario && (
          <header className="topo">
            <div className="topo-dentro">
              <Link href="/" className="marca">
                <span className="marca-p" aria-hidden>P</span> Central
              </Link>
              <nav className="nav" aria-label="Seções">
                <Link href="/">Agentes</Link>
                <Link href="/cerebro">Cérebro</Link>
                <Link href="/fila">
                  Fila{pendentes > 0 && <span className="contador">{pendentes}</span>}
                </Link>
                <Link href="/alunos">Alunos</Link>
                <Link href="/auditoria">Auditoria</Link>
              </nav>
              <div className="quem">
                <span>{usuario.nome} · {NOME_PAPEL[usuario.papel]}</span>
                <form action="/sair" method="post"><button type="submit">Sair</button></form>
              </div>
            </div>
          </header>
        )}
        <main>{children}</main>
      </body>
    </html>
  )
}
