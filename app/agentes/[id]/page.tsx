import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBanco } from '@/lib/db'
import { exigirUsuario } from '@/lib/sessao'
import { pode } from '@/lib/papeis'
import { listarAgentes } from '@/lib/agentes'
import { listarFila } from '@/lib/fila'
import { contratosConfigurado } from '@/lib/rodada-contratos'
import { conversasPendentes, listarLeads } from '@/lib/sdr'
import { INSTRUCOES_SDR } from '@/lib/sdr-instrucoes'
import { INSTRUCOES_CS } from '@/lib/cs-instrucoes'
import { perguntasSemResposta, resumoGrupos } from '@/lib/cs-grupos'
import { atividadeDoAgente, nomeAcao, requisitosDoAgente } from '@/lib/painel-agente'
import { LEMA } from '@/lib/equipe'
import { Onda, type EstadoOnda } from '../../onda'
import { Item, infoDestinos } from '../../fila/item'
import { conferirContratos, pararOuRetomar } from '../acoes'
import { avisoConferencia, horaBR } from '../formato'

const SITUACAO_CONTRATO: Record<string, { nome: string; cor: string }> = {
  pronto: { nome: 'Pronto', cor: 'aprovado' }, travado: { nome: 'Travado', cor: 'descartado' },
  enviado: { nome: 'No ZapSign', cor: 'executado' }, assinado: { nome: 'Assinado', cor: 'executado' },
}
const SITUACAO_LEAD: Record<string, string> = {
  novo: 'Novos', conversando: 'Conversando', qualificado: 'Qualificados', passado: 'Com o Bruno', fora_do_perfil: 'Fora do perfil', encerrado: 'Encerrados',
}

export default async function PaginaAgente({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ contratos?: string }>
}) {
  const u = await exigirUsuario()
  const { id } = await params
  const db = await getBanco()
  const a = (await listarAgentes(db)).find((x) => x.id === id)
  if (!a) notFound()
  const aviso = avisoConferencia((await searchParams).contratos)

  const [requisitos, pendentes, atividade, destinos] = await Promise.all([
    requisitosDoAgente(db, id),
    listarFila(db, ['pendente']).then((f) => f.filter((i) => i.agente_id === id)),
    atividadeDoAgente(db, id),
    infoDestinos(db),
  ])
  const faltam = requisitos.filter((r) => !r.ok).length
  const estado: EstadoOnda = a.parado ? 'parado' : (a.status as EstadoOnda)
  const podeAprovar = pode(u.papel, 'aprovar')

  // parte própria de cada agente
  const contratos = id === 'contratos'
    ? await db.query<{ drive_id: string; nome_arquivo: string; situacao: string; falta: string[]; conferido_em: string }>(
        `SELECT drive_id, nome_arquivo, situacao, falta, conferido_em FROM contratos ORDER BY conferido_em DESC LIMIT 20`)
    : []
  const leads = id === 'sdr' ? await listarLeads(db) : []
  const esperandoRodada = id === 'sdr' ? (await conversasPendentes(db)).length : 0
  const grupos = id === 'cs' ? await resumoGrupos(db) : []
  const perguntasCs = id === 'cs' ? (await perguntasSemResposta(db)).length : 0
  const porSituacao = leads.reduce<Record<string, number>>((m, l) => ({ ...m, [l.situacao]: (m[l.situacao] ?? 0) + 1 }), {})

  return (
    <>
      <span className="sobrancelha"><Link href="/">Agentes</Link> · {a.funcao}</span>
      <div className="agente-topo">
        <span className={`avatar ${estado}`}><Onda id={a.id} estado={estado} tamanho={56} /></span>
        <div>
          <h1>{a.nome}</h1>
          <p className="lema">{LEMA[a.id] ?? a.funcao}</p>
        </div>
      </div>
      {a.descricao && <p className="sub">{a.descricao}</p>}

      <div className="ficha-agente">
        <div><small>Situação</small><b className={`situacao ${estado}`}>{a.parado ? 'Parado pelo botão' : a.status === 'no_ar' ? 'No ar' : 'Em construção'}</b></div>
        <div><small>Dono</small><b>{a.dono}</b></div>
        <div><small>Prazo</small><b>{a.prazo ?? '—'}</b></div>
        <div><small>Última rodada</small><b>{a.ultima_execucao ? horaBR(a.ultima_execucao) : '—'}</b></div>
        <div><small>Na semana</small><b>{a.aprovados_semana ?? 0} aprovados · {a.ajustados_semana ?? 0} ajustados · {a.descartados_semana ?? 0} descartados</b></div>
        {(a.erros_semana ?? 0) > 0 && <div><small>Erros na semana</small><b className="situacao parado">{a.erros_semana}</b></div>}
      </div>

      <div className="acoes-agente">
        {pode(u.papel, 'parar_agente') && a.status !== 'em_construcao' && (
          <form action={pararOuRetomar}>
            <input type="hidden" name="id" value={a.id} />
            <button className={`botao ${a.parado ? 'leve' : 'perigo'}`} type="submit">{a.parado ? 'Retomar' : 'Parar execução'}</button>
          </form>
        )}
        {id === 'contratos' && contratosConfigurado() && (
          <form action={conferirContratos}>
            <input type="hidden" name="volta" value={`/agentes/${id}`} />
            <button className="botao leve" type="submit" disabled={a.parado}>Conferir a pasta agora</button>
          </form>
        )}
        {id === 'sdr' && <Link className="botao leve" href="/leads">Ver conversas</Link>}
        {aviso && <span className="mudo">{aviso}</span>}
      </div>

      <section className="area">
        <div className="area-cabeca">
          <h2>O que ele precisa pra funcionar</h2>
          <span className="pilula">{faltam ? `${faltam} ${faltam === 1 ? 'pendência' : 'pendências'}` : 'Tudo certo'}</span>
        </div>
        <ul className="requisitos">
          {requisitos.map((r) => (
            <li key={r.nome} className={r.ok ? 'ok' : 'falta'}>
              <span className="marca-req" aria-hidden>{r.ok ? '✓' : '!'}</span>
              <div>
                <b>{r.href ? <Link href={r.href}>{r.nome}</Link> : r.nome}</b>
                <span className="mudo">{r.nota}</span>
              </div>
              {!r.ok && r.dono && <span className="pilula">{r.dono}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="area">
        <div className="area-cabeca">
          <h2>Esperando aprovação</h2>
          <span className="pilula">{pendentes.length}</span>
        </div>
        {pendentes.length === 0
          ? <div className="vazio">Nada desse agente esperando decisão.</div>
          : pendentes.map((i) => <Item key={i.id} item={i} podeAprovar={podeAprovar} destinos={destinos} />)}
      </section>

      {id === 'contratos' && (
        <section className="area">
          <div className="area-cabeca"><h2>Contratos conferidos</h2><span className="pilula">{contratos.length}</span></div>
          {contratos.length === 0 ? <div className="vazio">Nenhum contrato novo na pasta desde 17/11.</div> : (
            <div className="rolar"><table>
              <thead><tr><th>Documento</th><th>Situação</th><th>O que falta</th><th>Conferido</th></tr></thead>
              <tbody>{contratos.map((c) => (
                <tr key={c.drive_id}>
                  <td><a href={`https://docs.google.com/document/d/${c.drive_id}`} target="_blank" rel="noreferrer">{c.nome_arquivo}</a></td>
                  <td><span className={`etiqueta ${SITUACAO_CONTRATO[c.situacao]?.cor ?? ''}`}>{SITUACAO_CONTRATO[c.situacao]?.nome ?? c.situacao}</span></td>
                  <td className="mudo">{c.falta?.length ? c.falta.join('; ') : '—'}</td>
                  <td className="mudo">{horaBR(c.conferido_em)}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </section>
      )}

      {id === 'sdr' && (
        <>
          <section className="area">
            <div className="area-cabeca"><h2>Leads</h2><span className="pilula">{leads.length}</span></div>
            <div className="ficha-agente">
              {Object.entries(SITUACAO_LEAD).map(([k, nome]) => <div key={k}><small>{nome}</small><b>{porSituacao[k] ?? 0}</b></div>)}
              <div><small>Esperando a rodada /sdr</small><b>{esperandoRodada}</b></div>
            </div>
            <p className="mudo">A rodada é feita pelo Claude (modo de teste): ele escreve as respostas e elas caem na fila acima.</p>
          </section>
          <section className="area">
            <details className="instrucoes">
              <summary><h2>Como ele conversa (instruções)</h2></summary>
              <pre>{INSTRUCOES_SDR}</pre>
              <p className="mudo">Método SPIN do Thales Leray, adaptado pra Pataro. Mudar o jeito de conversar = mudar este texto (lib/sdr-instrucoes.ts).</p>
            </details>
          </section>
        </>
      )}

      {id === 'cs' && (
        <>
          <section className="area">
            <div className="area-cabeca"><h2>Grupos que ele lê</h2><span className="pilula">{grupos.length}</span></div>
            {grupos.length === 0 ? (
              <div className="vazio">Nenhum grupo liberado. Ponha o chip do agente nos grupos de alunos e marque "Ler" em <Link href="/integracoes/whatsapp">Integrações → WhatsApp</Link>.</div>
            ) : (
              <div className="rolar"><table>
                <thead><tr><th>Grupo</th><th>Mensagens lidas</th><th>Última</th><th>Responde no grupo</th></tr></thead>
                <tbody>{grupos.map((g) => (
                  <tr key={g.id}>
                    <td><b>{g.nome}</b></td>
                    <td>{g.mensagens}</td>
                    <td className="mudo">{g.ultima ? horaBR(g.ultima) : '—'}</td>
                    <td>{g.enviar ? 'Sim' : <span className="mudo">Não (marcar "Enviar")</span>}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
            <div className="ficha-agente" style={{ marginTop: 12 }}>
              <div><small>Perguntas esperando a rodada /cs</small><b>{perguntasCs}</b></div>
            </div>
            <p className="mudo">A rodada é feita pelo Claude (modo de teste): ele lê as perguntas sem resposta há mais de 30 minutos e escreve a resposta, que cai na fila acima. A ficha de cada aluno fica em <Link href="/alunos">Alunos</Link>.</p>
          </section>
          <section className="area">
            <details className="instrucoes">
              <summary><h2>Como ele responde (instruções)</h2></summary>
              <pre>{INSTRUCOES_CS}</pre>
              <p className="mudo">Mudar o jeito de responder = mudar este texto (lib/cs-instrucoes.ts).</p>
            </details>
          </section>
        </>
      )}

      <section className="area">
        <div className="area-cabeca"><h2>Atividade recente</h2></div>
        {atividade.length === 0 ? <div className="vazio">Nada registrado ainda.</div> : (
          <ul className="atividade">
            {atividade.map((x, i) => (
              <li key={i}>
                <span className="mudo">{horaBR(x.quando)}</span>
                <span><b>{x.quem.startsWith('agente:') ? 'Agente' : x.quem.split('@')[0]}</b> {nomeAcao(x.acao)}</span>
              </li>
            ))}
          </ul>
        )}
        {pode(u.papel, 'ver_auditoria') && <p className="mudo"><Link href="/auditoria">Ver a auditoria completa →</Link></p>}
      </section>
    </>
  )
}
