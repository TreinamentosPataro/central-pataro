import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { getBanco } from '@/lib/db'
import { exigirUsuario } from '@/lib/sessao'
import { alternarParada, listarAgentes } from '@/lib/agentes'
import { pode } from '@/lib/papeis'
import { listarVerbetes, resumoPorTema, situacao } from '@/lib/cerebro'
import { Onda, type EstadoOnda } from './onda'

const STATUS: Record<string, string> = { no_ar: 'No ar', em_construcao: 'Em construção', parado: 'Parado' }

async function pararOuRetomar(formData: FormData) {
  'use server'
  const u = await exigirUsuario('parar_agente')
  const db = await getBanco()
  await alternarParada(db, u, String(formData.get('id')))
  revalidatePath('/')
}

function quando(iso: string | null): string {
  if (!iso) return 'nunca rodou'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default async function Agentes() {
  const u = await exigirUsuario()
  const db = await getBanco()
  const agentes = await listarAgentes(db)
  const pendentes = agentes.reduce((s, a) => s + (a.pendentes ?? 0), 0)
  const verbetes = await listarVerbetes(db)
  const emDia = verbetes.filter((v) => situacao(v) === 'ok').length
  const temas = resumoPorTema(verbetes)
  const [c] = await db.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM auditoria WHERE acao = 'cerebro.buscar' AND quando > now() - interval '7 days'`)
  const consultas = c?.n ?? 0

  const estado = (a: (typeof agentes)[number]): EstadoOnda => (a.parado ? 'parado' : (a.status as EstadoOnda))
  const noAr = agentes.filter((a) => a.status === 'no_ar' && !a.parado).length

  return (
    <>
      <section className="heroi">
        <div>
          <span className="sobrancelha">Central Pataro</span>
          <h1>Os agentes da Pataro, <em>num lugar só</em></h1>
          <p className="sub">
            Cada um com função, dono e prazo. Nada sai pra fora sem uma pessoa aprovar.{' '}
            {pendentes > 0
              ? <Link href="/fila">{pendentes} {pendentes === 1 ? 'item espera' : 'itens esperam'} aprovação.</Link>
              : 'Nada esperando aprovação.'}
          </p>
        </div>
        <div className="time" aria-label={`${noAr} de ${agentes.length} agentes no ar`}>
          <div className="faixa-ondas">
            {agentes.map((a) => (
              <span key={a.id} className={`tile ${estado(a)}`} title={`${a.nome}: ${a.parado ? 'parado' : STATUS[a.status]}`}>
                <Onda id={a.id} estado={estado(a)} tamanho={44} />
              </span>
            ))}
          </div>
          <div className="contagem"><b>{noAr}</b> de {agentes.length} no ar</div>
          <div className="barra"><span style={{ width: `${agentes.length ? (noAr / agentes.length) * 100 : 0}%` }} /></div>
        </div>
      </section>

      <Link href="/cerebro" className="faixa-cerebro">
        <span className="nucleo" aria-hidden />
        <span className="faixa-texto">
          <b>Cérebro</b>
          <span>
            {emDia} de {verbetes.length} verbetes em dia · {consultas} {consultas === 1 ? 'consulta' : 'consultas'} dos agentes em 7 dias
          </span>
        </span>
        <span className="faixa-temas" aria-hidden>
          {temas.map((t) => (
            <span key={t.id} title={t.nome} style={{ '--p': t.verbetes.length ? t.ok / t.verbetes.length : 0 } as React.CSSProperties} />
          ))}
        </span>
        <span className="faixa-ir">Abrir →</span>
      </Link>

      <div className="cartoes agentes">
        {agentes.map((a) => {
          const decididos = (a.aprovados_semana ?? 0) + (a.ajustados_semana ?? 0) + (a.descartados_semana ?? 0)
          return (
            <article className={`cartao agente ${estado(a)}`} key={a.id}>
              <div className="agente-cabeca">
                <span className="avatar"><Onda id={a.id} estado={estado(a)} tamanho={46} /></span>
                <div>
                  <h3>{a.nome}</h3>
                  <span className="mudo">Dono: {a.dono}</span>
                </div>
              </div>
              {a.funcao && <p className="lema">{a.funcao}</p>}
              {a.descricao && <p className="descricao">{a.descricao}</p>}
              {a.habilidades?.length > 0 && (
                <div className="habilidades">
                  {a.habilidades.map((h) => <span key={h} className={h === 'Buscar no Cérebro' ? 'cerebro' : ''}>{h}</span>)}
                </div>
              )}
              <div className="numeros">
                <span><b>{a.pendentes ?? 0}</b>na fila</span>
                <span title="Aprovados sem mexer nos últimos 7 dias"><b>{decididos ? `${a.aprovados_semana}/${decididos}` : '—'}</b>aprovados (7d)</span>
                <span><b>{a.erros_semana ?? 0}</b>erros (7d)</span>
              </div>
              <div className="rodape-agente">
                <span className={`situacao ${estado(a)}`}>
                  {a.parado ? 'Parado pelo botão' : a.status === 'no_ar' ? '✓ No ar' : STATUS[a.status]}
                  {a.prazo && a.status === 'em_construcao' && <span className="mudo"> · prazo {a.prazo}</span>}
                </span>
                <span className="mudo">{a.ultima_execucao ? `rodou ${quando(a.ultima_execucao)}` : 'nunca rodou'}</span>
              </div>
              {pode(u.papel, 'parar_agente') && a.status !== 'em_construcao' && (
                <form action={pararOuRetomar} style={{ marginTop: 12 }}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className={`botao ${a.parado ? 'leve' : 'perigo'}`} type="submit">
                    {a.parado ? 'Retomar' : 'Parar execução'}
                  </button>
                </form>
              )}
            </article>
          )
        })}
      </div>
      {agentes.length === 0 && <div className="vazio">Nenhum agente cadastrado. Rode <code>npm run db:semear</code>.</div>}
    </>
  )
}
