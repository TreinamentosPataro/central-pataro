import Link from 'next/link'
import { getBanco } from '@/lib/db'
import { exigirUsuario } from '@/lib/sessao'
import { listarEscritorios } from '@/lib/alunos'

const COR: Record<string, string> = { verde: 'Bem', amarelo: 'Atenção', vermelho: 'Esfriou' }

export default async function Alunos({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await exigirUsuario()
  const { q = '' } = await searchParams
  const db = await getBanco()
  const lista = await listarEscritorios(db, q)
  const revisoes = await db.query<{ id: number; origem: string; problema: string; dados: Record<string, unknown> }>(
    `SELECT id, origem, problema, dados FROM revisoes WHERE NOT resolvido ORDER BY id DESC LIMIT 50`,
  )

  return (
    <>
      <h1>Alunos</h1>
      <p className="sub">Base única: um escritório por linha, com os sócios dentro.</p>
      <form style={{ marginBottom: 14, maxWidth: 420 }}>
        <input type="search" name="q" defaultValue={q} placeholder="Buscar escritório ou pessoa" aria-label="Buscar" />
      </form>
      {lista.length === 0 ? (
        <div className="vazio">
          {q ? 'Nada encontrado.' : <>Base vazia. Importe a planilha com <code>npm run importar -- arquivo.csv</code>.</>}
        </div>
      ) : (
        <div className="rolar">
          <table>
            <thead>
              <tr><th>Escritório</th><th>Cidade</th><th>Pessoas</th><th>Programa</th><th>Vencimento</th><th>Etapa</th><th>Saúde</th></tr>
            </thead>
            <tbody>
              {lista.map((e) => (
                <tr key={e.id}>
                  <td><Link href={`/alunos/${e.id}`}><b>{e.nome}</b></Link></td>
                  <td>{[e.cidade, e.uf].filter(Boolean).join('/') || '—'}</td>
                  <td>{e.pessoas}</td>
                  <td>{e.produto ?? '—'}</td>
                  <td>{e.vencimento ?? '—'}</td>
                  <td>{e.etapa ?? '—'}</td>
                  <td>{e.cor ? <span className={`etiqueta ${e.cor}`}>{COR[e.cor]}</span> : <span className="mudo">sem leitura</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {revisoes.length > 0 && (
        <>
          <h2>Pra revisar ({revisoes.length})</h2>
          <p className="mudo" style={{ marginTop: -6 }}>O que a importação não resolveu sozinha. Um humano confirma.</p>
          <div className="rolar">
            <table>
              <thead><tr><th>Problema</th><th>Onde</th><th>Detalhe</th></tr></thead>
              <tbody>
                {revisoes.map((r) => (
                  <tr key={r.id}>
                    <td>{r.problema}</td>
                    <td className="mono">{r.origem}</td>
                    <td className="mono">{JSON.stringify(r.dados)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
