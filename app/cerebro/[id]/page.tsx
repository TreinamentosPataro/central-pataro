import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getBanco } from '@/lib/db'
import { exigirUsuario } from '@/lib/sessao'
import { pode } from '@/lib/papeis'
import { lerVerbete, NOME_SITUACAO, salvarVerbete, situacao, TEMAS } from '@/lib/cerebro'

async function salvar(formData: FormData) {
  'use server'
  const u = await exigirUsuario('editar_cerebro')
  const db = await getBanco()
  const idAtual = String(formData.get('id') ?? '')
  let destino: string
  try {
    const v = await salvarVerbete(db, u, {
      id: idAtual || undefined,
      tema: String(formData.get('tema') ?? ''),
      titulo: String(formData.get('titulo') ?? ''),
      conteudo: String(formData.get('conteudo') ?? ''),
      dono: String(formData.get('dono') ?? ''),
      revisar_em: String(formData.get('revisar_em') ?? ''),
      fonte: String(formData.get('fonte') ?? ''),
    })
    revalidatePath('/cerebro')
    revalidatePath('/')
    destino = `/cerebro/${v.id}?salvo=1`
  } catch (e) {
    const msg = encodeURIComponent((e as Error).message)
    destino = idAtual ? `/cerebro/${idAtual}?erro=${msg}#editar` : `/cerebro/novo?erro=${msg}`
  }
  redirect(destino)
}

function data(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default async function Verbete({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ erro?: string; salvo?: string; tema?: string }>
}) {
  const u = await exigirUsuario()
  const { id } = await params
  const { erro, salvo, tema } = await searchParams
  const novo = id === 'novo'
  if (!novo && !/^[a-z0-9-]{1,60}$/.test(id)) notFound()
  const db = await getBanco()
  const v = novo ? null : await lerVerbete(db, id)
  if (!novo && !v) notFound()
  const podeEditar = pode(u.papel, 'editar_cerebro')
  const historico = v
    ? await db.query<{ quem: string; acao: string; quando: string }>(
        `SELECT quem, acao, quando FROM auditoria WHERE alvo = $1 ORDER BY quando DESC LIMIT 10`, [`cerebro:${v.id}`])
    : []
  const consultas = v
    ? (await db.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM auditoria WHERE acao = 'cerebro.buscar' AND depois->'achados' ? $1`, [v.id]))[0]?.n ?? 0
    : 0
  const s = v ? situacao(v) : 'a_preencher'
  const temaNome = TEMAS.find((t) => t.id === (v?.tema ?? tema))?.nome

  return (
    <>
      <p className="mudo"><Link href="/cerebro">← Cérebro</Link>{temaNome && <> · {temaNome}</>}</p>
      {salvo && <div className="aviso ok">Salvo. Os agentes já leem a versão nova.</div>}
      {erro && <div className="aviso erro">{erro}</div>}

      {v ? (
        <>
          <div className="cabeca">
            <div>
              <h1>{v.titulo}</h1>
              <p className="sub">
                <span className={`etiqueta s-${s}`}>{NOME_SITUACAO[s]}</span>
                {v.dono && <> · dono: <b>{v.dono}</b></>}
                {v.revisar_em && <> · revisar em {v.revisar_em.split('-').reverse().join('/')}</>}
                {' '}· consultado {consultas} {consultas === 1 ? 'vez' : 'vezes'} pelos agentes
              </p>
            </div>
          </div>
          <div className="texto-verbete">
            {v.conteudo
              ? v.conteudo.split('\n').map((l, i) => <p key={i}>{l}</p>)
              : <p className="mudo">Ninguém escreveu ainda. Enquanto estiver vazio, o agente não responde sozinho sobre isso: manda pra uma pessoa.</p>}
          </div>
          {v.fonte && <p className="mudo">Fonte: {v.fonte}</p>}
        </>
      ) : (
        <>
          <h1>Ensinar algo novo ao Cérebro</h1>
          <p className="sub">Escreva o que a empresa sabe sobre um assunto. Os agentes passam a consultar na hora. Dado de aluno não entra.</p>
        </>
      )}

      {podeEditar && (
        <details className="editar" id="editar" open={novo || !!erro || (v ? !v.conteudo : false)}>
          <summary>{novo ? 'Escrever' : 'Editar este verbete'}</summary>
          <form action={salvar} className="formulario">
            {v && <input type="hidden" name="id" value={v.id} />}
            <label>Título<input type="text" name="titulo" required maxLength={120} defaultValue={v?.titulo ?? ''} placeholder="Ex.: Política de reembolso da Trilha" /></label>
            <div className="duas">
              <label>Tema
                <select name="tema" defaultValue={v?.tema ?? tema ?? 'oferta'}>
                  {TEMAS.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </label>
              <label>Dono (quem responde por isso)<input type="text" name="dono" maxLength={60} defaultValue={v?.dono ?? ''} placeholder="Fred, Hoklo, Norman…" /></label>
            </div>
            <label>O que a empresa sabe
              <textarea name="conteudo" rows={10} defaultValue={v?.conteudo ?? ''} placeholder="Escreva como explicaria pra alguém novo no time. Uma ideia por linha." />
            </label>
            <div className="duas">
              <label>Revisar em<input type="date" name="revisar_em" defaultValue={v?.revisar_em ?? ''} /></label>
              <label>Fonte (de onde saiu)<input type="text" name="fonte" maxLength={160} defaultValue={v?.fonte ?? ''} placeholder="Reunião de 16/11, página de venda, PDF…" /></label>
            </div>
            <div className="acoes"><button className="botao ouro" type="submit">Salvar no Cérebro</button></div>
          </form>
        </details>
      )}

      {historico.length > 0 && (
        <>
          <h2>Histórico</h2>
          <ul className="lista-simples mudo">
            {historico.map((h, i) => (
              <li key={i}>{data(h.quando)} · {h.quem} · {h.acao === 'cerebro.criar' ? 'criou' : h.acao === 'cerebro.editar' ? 'editou' : h.acao}</li>
            ))}
          </ul>
          <p className="mudo">O texto antes e depois de cada mudança está na <Link href="/auditoria">auditoria</Link>.</p>
        </>
      )}
    </>
  )
}
