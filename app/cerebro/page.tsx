import Link from 'next/link'
import { getBanco } from '@/lib/db'
import { exigirUsuario } from '@/lib/sessao'
import { pode } from '@/lib/papeis'
import {
  buscarNoCerebro, listarVerbetes, NOME_SITUACAO, resumoPorTema, situacao, TEMAS,
} from '@/lib/cerebro'
import { MapaCerebro } from './mapa'
import { PainelMapa } from './painel-mapa'

/** Trecho da busca vem com <<palavra>>: vira destaque sem usar HTML cru. */
function Trecho({ texto }: { texto: string }) {
  const partes = texto.split(/(<<.*?>>)/g)
  return (
    <>
      {partes.map((p, i) => p.startsWith('<<') ? <mark key={i}>{p.slice(2, -2)}</mark> : <span key={i}>{p}</span>)}
    </>
  )
}

export default async function Cerebro({ searchParams }: { searchParams: Promise<{ q?: string; tema?: string }> }) {
  const u = await exigirUsuario()
  const { q = '', tema } = await searchParams
  const db = await getBanco()
  const verbetes = await listarVerbetes(db)
  const temas = resumoPorTema(verbetes)
  const achados = q.trim() ? await buscarNoCerebro(db, q) : []
  const emDia = verbetes.filter((v) => situacao(v) === 'ok').length
  const temaAtivo = TEMAS.find((t) => t.id === tema)
  const podeEditar = pode(u.papel, 'editar_cerebro')

  return (
    <>
      <span className="sobrancelha">Cérebro</span>
      <div className="cabeca">
        <h1>O que a Pataro sabe</h1>
        <span className="mudo">Toda edição fica na <Link href="/auditoria">auditoria</Link>, com o antes e o depois.</span>
      </div>
      <p className="sub">
        Cada verbete mostra quem é o dono e quando revisar. Todo agente consulta aqui antes de agir:
        verbete vazio ou vencido, o agente não responde sozinho.
      </p>

      {podeEditar && (
        <Link className="ensinar" href={`/cerebro/novo${tema ? `?tema=${tema}` : ''}`}>
          <span className="atalho-icone ouro" aria-hidden>+</span>
          <span className="atalho-texto">
            <b>Ensinar algo novo ao Cérebro</b>
            <span>Traga um texto ou documento: ele vira um verbete com dono e data de revisão.</span>
          </span>
          <span className="seta" aria-hidden>→</span>
        </Link>
      )}

      <form className="busca-larga" action="/cerebro" role="search">
        <input type="search" name="q" defaultValue={q} placeholder="Buscar no Cérebro: título ou trecho (reembolso, contrato, Trilha…)" aria-label="Buscar no Cérebro" />
      </form>
      <p className="contagem-cerebro">
        <b>{verbetes.length}</b> verbetes no Cérebro · <b>{emDia}</b> em dia · <b>{verbetes.length - emDia}</b> a preencher ou revisar
      </p>

      {q.trim() && (
        <section className="resultados" aria-live="polite">
          <h2>{achados.length ? `${achados.length} ${achados.length === 1 ? 'resposta' : 'respostas'} pra "${q}"` : `Nada sobre "${q}" ainda`}</h2>
          {achados.length === 0 && (
            <div className="vazio">
              É uma lacuna: o agente não teria o que responder.{' '}
              {podeEditar && <Link href="/cerebro/novo">Ensinar isso ao Cérebro</Link>}
            </div>
          )}
          {achados.map((a) => {
            const s = situacao({ conteudo: a.conteudo, revisar_em: a.revisar_em })
            return (
              <Link key={a.id} href={`/cerebro/${a.id}`} className="achado">
                <div className="item-topo">
                  <span className={`etiqueta s-${s}`}>{NOME_SITUACAO[s]}</span>
                  <span className="mudo">{TEMAS.find((t) => t.id === a.tema)?.nome}{a.dono && <> · dono: {a.dono}</>}</span>
                </div>
                <b>{a.titulo}</b>
                <p><Trecho texto={a.trecho || 'Sem texto ainda.'} /></p>
              </Link>
            )
          })}
        </section>
      )}

      <div className="painel-mapa">
        <PainelMapa>
          <MapaCerebro temas={temas} ativo={temaAtivo?.id} />
        </PainelMapa>
        <div className="legenda">
          <span><i className="ponto ok" /> Em dia</span>
          <span><i className="ponto a_preencher" /> A preencher</span>
          <span><i className="ponto revisar" /> Revisar</span>
          <span className="mudo-escuro">Clique num tema ou num ponto pra abrir.</span>
        </div>
      </div>

      <section id="lista">
        <div className="filtros">
          <Link href="/cerebro#lista" className={`chip ${!temaAtivo ? 'ativo' : ''}`}>Todos</Link>
          {temas.map((t) => (
            <Link key={t.id} href={`/cerebro?tema=${t.id}#lista`} className={`chip ${temaAtivo?.id === t.id ? 'ativo' : ''}`}>
              {t.nome} <span>{t.verbetes.length}</span>
            </Link>
          ))}
        </div>
        {temas.filter((t) => !temaAtivo || t.id === temaAtivo.id).map((t) => (
          <div key={t.id} className="bloco-tema">
            <h2>{t.nome} <span className="mudo">· {t.descricao}</span></h2>
            {t.verbetes.length === 0 && <div className="vazio">Nada neste tema ainda.</div>}
            <div className="cartoes">
              {t.verbetes.map((v) => {
                const s = situacao(v)
                return (
                  <Link key={v.id} href={`/cerebro/${v.id}`} className={`cartao verbete s-${s}`}>
                    <div className="item-topo">
                      <span className={`etiqueta s-${s}`}>{NOME_SITUACAO[s]}</span>
                      {v.dono && <span className="mudo">dono: {v.dono}</span>}
                    </div>
                    <h3>{v.titulo}</h3>
                    <p className="previa">{v.conteudo ? v.conteudo.slice(0, 140) + (v.conteudo.length > 140 ? '…' : '') : 'Ninguém escreveu ainda. Enquanto estiver vazio, o agente não responde sozinho sobre isso.'}</p>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </section>

      <p className="mudo" style={{ marginTop: 28 }}>
        Dado de aluno (CPF, contrato, conversa) não entra no Cérebro: fica na ficha, na área restrita.
        Toda edição fica na <Link href="/auditoria">auditoria</Link>, com o antes e o depois.
      </p>
    </>
  )
}
