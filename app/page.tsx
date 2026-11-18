import Link from 'next/link'
import { getBanco } from '@/lib/db'
import { exigirUsuario } from '@/lib/sessao'
import { listarAgentes } from '@/lib/agentes'
import { pode } from '@/lib/papeis'
import { listarVerbetes, resumoPorTema, situacao } from '@/lib/cerebro'
import { contratosConfigurado } from '@/lib/rodada-contratos'
import { cookies } from 'next/headers'
import { conferirContratos, pararOuRetomar, trocarVista } from './agentes/acoes'
import { avisoConferencia, horaBR } from './agentes/formato'
import { Onda, type EstadoOnda } from './onda'
import { AREAS, FLUXO, LEMA } from '@/lib/equipe'

const STATUS: Record<string, string> = { no_ar: 'No ar', em_construcao: 'Em construção', parado: 'Parado' }

export default async function Agentes({ searchParams }: { searchParams: Promise<{ contratos?: string }> }) {
  const u = await exigirUsuario()
  const aviso = avisoConferencia((await searchParams).contratos)
  const conferePasta = contratosConfigurado()
  const db = await getBanco()
  const agentes = await listarAgentes(db)
  const pendentes = agentes.reduce((s, a) => s + (a.pendentes ?? 0), 0)
  const verbetes = await listarVerbetes(db)
  const emDia = verbetes.filter((v) => situacao(v) === 'ok').length
  const temas = resumoPorTema(verbetes)
  const [c] = await db.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM auditoria WHERE acao = 'cerebro.buscar' AND quando > now() - interval '7 days'`)
  const consultas = c?.n ?? 0
  const vista = (await cookies()).get('central_vista')?.value === 'fluxo' ? 'fluxo' : 'areas'

  type Ag = (typeof agentes)[number]
  const estado = (a: Ag): EstadoOnda => (a.parado ? 'parado' : (a.status as EstadoOnda))
  const noAr = agentes.filter((a) => a.status === 'no_ar' && !a.parado).length
  const porId = new Map(agentes.map((a) => [a.id, a]))
  const naArea = new Set(AREAS.flatMap((ar) => ar.agentes))
  const grupos = [
    ...AREAS.map((ar) => ({ ...ar, lista: ar.agentes.map((id) => porId.get(id)).filter((x): x is Ag => !!x) })),
    { id: 'outros', nome: 'Outros', lema: 'Ainda sem área', agentes: [], lista: agentes.filter((a) => !naArea.has(a.id)) },
  ].filter((g) => g.lista.length)
  const noFluxo = new Set(FLUXO.flatMap((e) => e.agentes))
  const etapas = [
    ...FLUXO.map((e) => ({ ...e, lista: e.agentes.map((id) => porId.get(id)).filter((x): x is Ag => !!x) })),
    ...agentes.filter((a) => !noFluxo.has(a.id)).map((a) => ({ id: a.id, nome: a.funcao ?? a.nome, quem: a.dono, agentes: [a.id], pausada: false, lista: [a] })),
  ]
  const comAgente = etapas.filter((e) => e.lista.length).length

  const Cartao = ({ a }: { a: Ag }) => (
    <article className={`cartao agente ${estado(a)}`} title={a.descricao ?? undefined}>
      <div className="agente-cabeca">
        <span className="avatar"><Onda id={a.id} estado={estado(a)} tamanho={46} /></span>
        <div>
          <h3><Link href={`/agentes/${a.id}`} className="abrir-agente">{a.nome}</Link></h3>
          <span className="cargo">{a.funcao}</span>
        </div>
      </div>
      <p className="lema">{LEMA[a.id] ?? a.funcao}</p>
      {a.habilidades?.length > 0 && (
        <div className="habilidades">
          {a.habilidades.map((h) => <span key={h} className={h === 'Buscar no Cérebro' ? 'cerebro' : ''}>{h}</span>)}
        </div>
      )}
      <div className="rodape-agente">
        <span className={`situacao ${estado(a)}`}>
          {a.parado ? 'Parado pelo botão' : a.status === 'no_ar' ? '✓ No ar' : <>Em construção{a.prazo && <span> · {a.prazo}</span>}</>}
        </span>
        {(a.pendentes ?? 0) > 0
          ? <Link href="/fila" className="na-fila">{a.pendentes} na fila →</Link>
          : <span className="mudo">{a.dono.split(' ')[0]}</span>}
      </div>
      {a.id === 'contratos' && conferePasta && (
        <form action={conferirContratos} className="conferir">
          <input type="hidden" name="volta" value="/" />
          <button className="botao leve" type="submit" disabled={a.parado}>Conferir agora</button>
          <small>
            {aviso ?? (a.ultima_execucao ? `Pasta conferida em ${horaBR(a.ultima_execucao)} · sozinho a cada 10 min` : 'Confere a pasta sozinho a cada 10 min')}
          </small>
        </form>
      )}
      {pode(u.papel, 'parar_agente') && a.status !== 'em_construcao' && (
        <form action={pararOuRetomar} className="parar">
          <input type="hidden" name="id" value={a.id} />
          <button className={`botao ${a.parado ? 'leve' : 'perigo'}`} type="submit">{a.parado ? 'Retomar' : 'Parar execução'}</button>
        </form>
      )}
    </article>
  )

  return (
    <>
      <section className="heroi">
        <div className="heroi-texto">
          <span className="sobrancelha">Pataro 24h</span>
          <h1>
            Uma equipe que trabalha <em>enquanto você atende</em>
            <svg className="heroi-onda" viewBox="0 0 600 60" preserveAspectRatio="none" aria-hidden>
              <path d="M0 40 C 90 40, 120 18, 210 24 S 360 52, 450 30 S 560 10, 600 22" />
            </svg>
          </h1>
          <p className="sub">
            Cada agente tem função, dono e prazo, e consulta o Cérebro antes de agir. Nada sai pra fora sem uma pessoa aprovar.
          </p>
        </div>
        <div className="time" aria-label={`${noAr} de ${agentes.length} agentes no ar`}>
          <div className="faixa-ondas">
            {agentes.map((a) => (
              <span key={a.id} className={`tile ${estado(a)}`} title={`${a.nome}: ${a.parado ? 'parado' : STATUS[a.status]}`}>
                <Onda id={a.id} estado={estado(a)} tamanho={40} />
              </span>
            ))}
          </div>
          <div className="contagem"><b>{noAr}</b> de {agentes.length} no ar</div>
          <div className="barra"><span style={{ width: `${agentes.length ? Math.max(noAr / agentes.length, 0.02) * 100 : 0}%` }} /></div>
        </div>
      </section>

      <div className="atalhos">
        <Link href="/cerebro" className="atalho escuro">
          <span className="nucleo" aria-hidden />
          <span className="atalho-texto">
            <small>Cérebro</small>
            <b>O que a Pataro sabe</b>
            <span>{emDia} de {verbetes.length} verbetes em dia · {consultas} {consultas === 1 ? 'consulta' : 'consultas'} dos agentes em 7 dias</span>
          </span>
          <span className="faixa-temas" aria-hidden>
            {temas.map((t) => (
              <span key={t.id} title={t.nome} style={{ '--p': t.verbetes.length ? t.ok / t.verbetes.length : 0 } as React.CSSProperties} />
            ))}
          </span>
          <span className="seta" aria-hidden>→</span>
        </Link>
        <Link href="/fila" className="atalho">
          <span className="atalho-icone" aria-hidden>{pendentes}</span>
          <span className="atalho-texto">
            <small>Aprovações</small>
            <b>{pendentes ? `${pendentes} ${pendentes === 1 ? 'item espera' : 'itens esperam'} você` : 'Nada esperando'}</b>
            <span>O agente propõe, uma pessoa decide.</span>
          </span>
          <span className="seta" aria-hidden>→</span>
        </Link>
      </div>

      <form action={trocarVista} className="vistas" aria-label="Como ver os agentes">
        <button type="submit" name="vista" value="areas" className={vista === 'areas' ? 'ativa' : ''} aria-pressed={vista === 'areas'}>Por área</button>
        <button type="submit" name="vista" value="fluxo" className={vista === 'fluxo' ? 'ativa' : ''} aria-pressed={vista === 'fluxo'}>Fluxo da operação</button>
      </form>

      {vista === 'fluxo' ? (
        <section className="area fluxo">
          <div className="area-cabeca">
            <h2>Fluxo da operação</h2>
            <em className="area-lema">Do perfil ao financeiro, etapa por etapa</em>
            <span className="pilula">{etapas.length} etapas · {comAgente} com agente</span>
          </div>
          <ol className="trilho">
            {etapas.map((e) => {
              const a = e.lista[0]
              const tipo = e.pausada ? 'pausada' : a ? estado(a) : 'pessoa'
              const corpo = (
                <>
                  {a && <span className="etapa-onda"><Onda id={a.id} estado={estado(a)} tamanho={34} /></span>}
                  <b>{e.nome}</b>
                  {a && (
                    <small className="etapa-status">{a.parado ? 'Parado' : a.status === 'no_ar' ? '✓ No ar' : 'Em construção'}</small>
                  )}
                  {a && (a.pendentes ?? 0) > 0 && (
                    <span className="etapa-fila" title={`${a.pendentes} na fila de aprovação`}>{a.pendentes}</span>
                  )}
                </>
              )
              return (
                <li key={e.id} className={`etapa ${tipo}`}>
                  {a
                    ? <Link href={`/agentes/${a.id}`} className="etapa-caixa" title={`${a.nome}${a.prazo && a.status !== 'no_ar' ? ` · prazo ${a.prazo}` : ''}: abrir a página do agente`}>{corpo}</Link>
                    : <div className="etapa-caixa">{corpo}</div>}
                  <span className="etapa-quem">{e.quem}</span>
                </li>
              )
            })}
          </ol>
          <p className="legenda-fluxo">
            <span><i className="ponto no_ar" /> agente no ar</span>
            <span><i className="ponto em_construcao" /> agente em construção</span>
            <span><i className="ponto pessoa" /> feito por pessoa</span>
            <span><i className="ponto pausada" /> pausado</span>
            <span className="mudo">Clique na etapa com agente pra abrir a página dele.</span>
          </p>
        </section>
      ) : (
        <>
        {grupos.map((g) => {
          const vivos = g.lista.filter((a) => a.status === 'no_ar' && !a.parado).length
          return (
            <section key={g.id} className="area">
              <div className="area-cabeca">
                <h2>{g.nome}</h2>
                <em className="area-lema">{g.lema}</em>
                <span className="pilula">{g.lista.length} {g.lista.length === 1 ? 'agente' : 'agentes'} · {vivos} no ar</span>
              </div>
              <div className="cartoes agentes">
                {g.lista.map((a) => <Cartao key={a.id} a={a} />)}
              </div>
            </section>
          )
        })}
        </>
      )}
      {agentes.length === 0 && <div className="vazio">Nenhum agente cadastrado. Rode <code>npm run db:semear</code>.</div>}
    </>
  )
}
