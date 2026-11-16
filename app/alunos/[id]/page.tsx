import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBanco } from '@/lib/db'
import { exigirUsuario } from '@/lib/sessao'
import { fichaDoEscritorio } from '@/lib/alunos'

const PAPEL: Record<string, string> = { titular: 'Titular', socio: 'Sócio', segunda_cadeira: 'Segunda cadeira' }
const COR: Record<string, string> = { verde: 'Bem', amarelo: 'Atenção', vermelho: 'Esfriou' }

export default async function FichaAluno({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigirUsuario()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const db = await getBanco()
  const f = await fichaDoEscritorio(db, u, id)
  if (!f) notFound()

  return (
    <>
      <p className="mudo"><Link href="/alunos">← Alunos</Link></p>
      <h1>{f.escritorio.nome}</h1>
      <p className="sub">
        {[f.escritorio.cidade, f.escritorio.uf].filter(Boolean).join('/') || 'Cidade não informada'}
        {f.escritorio.responsavel_cs && <> · CS: {f.escritorio.responsavel_cs}</>}
        {f.saude && <> · <span className={`etiqueta ${f.saude.cor}`}>{COR[f.saude.cor]}</span> {f.saude.motivo}</>}
      </p>

      <div className="ficha">
        <div className="cartao">
          <h3>Pessoas</h3>
          {f.pessoas.map((p) => (
            <div key={p.id} style={{ marginBottom: 12 }}>
              <b>{p.nome}</b> <span className="mudo">{p.papel ? PAPEL[p.papel] : ''}</span>
              <div className="mudo">{[p.telefone, p.email].filter(Boolean).join(' · ') || 'sem contato'}</div>
              {p.restrito && (p.restrito.cpf || p.restrito.rg || p.restrito.endereco) && (
                <div className="restrito">
                  Área restrita · {p.restrito.cpf && <>CPF {p.restrito.cpf} </>}
                  {p.restrito.rg && <>· RG {p.restrito.rg} </>}
                  {p.restrito.endereco && <>· {p.restrito.endereco}</>}
                </div>
              )}
            </div>
          ))}
          {!f.mostrouRestrito && <p className="mudo">CPF, RG e endereço ficam ocultos pro seu papel.</p>}
        </div>

        <div className="cartao">
          <h3>Programa e jornada</h3>
          {f.matriculas.length === 0 && <p className="mudo">Sem matrícula registrada.</p>}
          <ul className="lista-simples">
            {f.matriculas.map((m, i) => (
              <li key={i}><b>{m.produto}</b> · {m.status} · início {m.inicio ?? '—'} · vence {m.vencimento ?? '—'}</li>
            ))}
          </ul>
          {f.jornada && (
            <p style={{ marginBottom: 0 }}>
              Etapa: <b>{f.jornada.etapa}</b>
              {f.jornada.bloqueio && <> · <span className="etiqueta vermelho">Bloqueio</span> {f.jornada.bloqueio}</>}
            </p>
          )}
        </div>

        <div className="cartao">
          <h3>O que ele disse querer</h3>
          {f.objetivos.length === 0 ? <p className="mudo">Nada registrado ainda. Entra com a leitura das calls (US-05).</p> : (
            <ul className="lista-simples">
              {f.objetivos.map((o, i) => (
                <li key={i}>
                  {o.texto} <span className="etiqueta">{o.origem}</span>
                  {!o.revisado && <span className="etiqueta amarelo">a revisar</span>}
                  {o.trecho && <div className="mudo">“{o.trecho}”</div>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="cartao">
          <h3>Sinais</h3>
          {f.sinais.length === 0 ? <p className="mudo">Nenhum sinal ainda. Entram com plano de ação, Raio-X, ranking e grupos.</p> : (
            <ul className="lista-simples">
              {f.sinais.map((s, i) => <li key={i}>{s.data} · <b>{s.tipo}</b>{s.valor && <>: {s.valor}</>}</li>)}
            </ul>
          )}
        </div>
      </div>

      <h2>Na fila</h2>
      {f.fila.length === 0 ? <div className="vazio">Nenhuma sugestão pra esse escritório.</div> : (
        <ul className="lista-simples">
          {f.fila.map((i) => (
            <li key={i.id}><span className={`etiqueta ${i.estado}`}>{i.estado}</span> {i.titulo} <span className="mudo">{i.criado_em}</span></li>
          ))}
        </ul>
      )}
    </>
  )
}
