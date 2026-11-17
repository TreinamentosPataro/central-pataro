import type { Metadata } from 'next'
import Link from 'next/link'
import { Inter, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { usuarioAtual } from '@/lib/sessao'
import { getBanco } from '@/lib/db'
import { NOME_PAPEL } from '@/lib/papeis'
import { Menu } from './menu'

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
        {usuario ? (
          <div className="casca">
            <aside className="lateral">
              <Link href="/" className="marca">
                <span className="marca-p" aria-hidden>P</span>
                <span className="marca-nome">Central<small>Pataro</small></span>
              </Link>
              <form action="/cerebro" className="lateral-busca" role="search">
                <input type="search" name="q" placeholder="Buscar no Cérebro…" aria-label="Buscar no Cérebro" />
              </form>
              <Menu pendentes={pendentes} />
              <div className="lateral-pe">
                <span className="avatar-pessoa" aria-hidden>{usuario.nome.slice(0, 1)}</span>
                <span className="quem-texto"><b>{usuario.nome}</b><small>{NOME_PAPEL[usuario.papel]}</small></span>
                <form action="/sair" method="post"><button type="submit" className="sair">Sair</button></form>
              </div>
            </aside>
            <main>{children}</main>
          </div>
        ) : (
          <main className="sozinho">{children}</main>
        )}
      </body>
    </html>
  )
}
