/**
 * Cérebro: o conhecimento da Pataro num lugar só. Todo agente consulta antes de agir
 * ("Buscar no Cérebro"), em vez de cada um ter o próprio contexto.
 *
 * Regras (plano-central.md):
 * - Só conhecimento da empresa. Dado de aluno (CPF, contrato, conversa) fica nas fichas.
 * - Cada verbete tem dono e data de revisão: Cérebro desatualizado faz o agente errar com confiança.
 * - Toda edição vai pra auditoria com antes e depois.
 * - Busca pelo texto do próprio Postgres (sem custo). Busca por significado só se essa não der conta.
 */
import type { Banco } from './db'
import { auditar } from './auditoria'
import { pode } from './papeis'
import type { Usuario } from './sessao'
import { VERBETES_INICIAIS } from './cerebro-inicial'

export const TEMAS = [
  { id: 'oferta', nome: 'Oferta e produtos', descricao: 'O que cada produto entrega, pra quem, preço e condições.' },
  { id: 'politicas', nome: 'Políticas', descricao: 'Reembolso, prazos, contratos, o que o agente faz sozinho e o que vai pra uma pessoa.' },
  { id: 'processo', nome: 'Processo comercial', descricao: 'Do primeiro contato até o contrato assinado.' },
  { id: 'numeros', nome: 'Números', descricao: 'Metas, vendas, alunos ativos.' },
  { id: 'tom', nome: 'Tom e OAB', descricao: 'Como a Pataro fala e o que não pode ser dito.' },
  { id: 'aulas', nome: 'Aulas', descricao: 'Onde está cada conteúdo. A busca da Pataro I.A entra aqui.' },
  { id: 'empresa', nome: 'A empresa', descricao: 'Quem é o Fred, o escritório, o time.' },
] as const

export type TemaId = (typeof TEMAS)[number]['id']

export interface Verbete {
  id: string
  tema: TemaId
  titulo: string
  conteudo: string
  dono: string | null
  revisar_em: string | null
  fonte: string | null
  atualizado_por: string | null
  atualizado_em: string
}

export type Situacao = 'ok' | 'a_preencher' | 'revisar'

export function situacao(v: Pick<Verbete, 'conteudo' | 'revisar_em'>, hoje = new Date()): Situacao {
  if (!v.conteudo.trim()) return 'a_preencher'
  if (v.revisar_em && v.revisar_em < hoje.toISOString().slice(0, 10)) return 'revisar'
  return 'ok'
}

export const NOME_SITUACAO: Record<Situacao, string> = { ok: 'Em dia', a_preencher: 'A preencher', revisar: 'Revisar' }

const COLUNAS = `id, tema, titulo, conteudo, dono, to_char(revisar_em, 'YYYY-MM-DD') AS revisar_em, fonte,
  atualizado_por, atualizado_em`

export async function listarVerbetes(db: Banco): Promise<Verbete[]> {
  return db.query<Verbete>(`SELECT ${COLUNAS} FROM cerebro ORDER BY tema, titulo`)
}

export async function lerVerbete(db: Banco, id: string): Promise<Verbete | null> {
  const [v] = await db.query<Verbete>(`SELECT ${COLUNAS} FROM cerebro WHERE id = $1`, [id])
  return v ?? null
}

export interface Achado {
  id: string
  tema: TemaId
  titulo: string
  trecho: string
  conteudo: string
  dono: string | null
  revisar_em: string | null
}

/**
 * "Buscar no Cérebro": por palavra, em português (reembolsos acha reembolso).
 * Se a busca de texto não achar nada, tenta pedaço da palavra (bom pra sigla e nome próprio).
 */
export async function buscarNoCerebro(db: Banco, pergunta: string, limite = 8): Promise<Achado[]> {
  const q = pergunta.trim().slice(0, 200)
  if (!q) return []
  // Agente pergunta em frase ("quem assina o contrato?"): basta uma palavra bater,
  // e quem tem mais palavras em comum (e no título) vem primeiro.
  const doc = `setweight(to_tsvector('portuguese', titulo), 'A') || to_tsvector('portuguese', conteudo)`
  const consulta = `NULLIF(replace(plainto_tsquery('portuguese', $1)::text, ' & ', ' | '), '')::tsquery`
  const achados = await db.query<Achado>(
    `SELECT id, tema, titulo, conteudo, dono, to_char(revisar_em, 'YYYY-MM-DD') AS revisar_em,
            ts_headline('portuguese', conteudo, ${consulta},
              'MaxWords=28, MinWords=12, StartSel=<<, StopSel=>>') AS trecho
     FROM cerebro
     WHERE ${doc} @@ ${consulta}
     ORDER BY ts_rank_cd(${doc}, ${consulta}) DESC, titulo
     LIMIT $2`,
    [q, limite],
  )
  if (achados.length) return achados
  return db.query<Achado>(
    `SELECT id, tema, titulo, conteudo, dono, to_char(revisar_em, 'YYYY-MM-DD') AS revisar_em,
            left(conteudo, 180) AS trecho
     FROM cerebro
     WHERE titulo ILIKE '%' || $1 || '%' OR conteudo ILIKE '%' || $1 || '%'
     ORDER BY titulo LIMIT $2`,
    [q.replace(/[%_]/g, ''), limite],
  )
}

/** CPF no texto = dado de aluno. Não entra no Cérebro. */
const PARECE_CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/

export function slug(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

export interface DadosVerbete {
  id?: string
  tema: string
  titulo: string
  conteudo: string
  dono?: string | null
  revisar_em?: string | null
  fonte?: string | null
}

export async function salvarVerbete(db: Banco, usuario: Usuario, d: DadosVerbete): Promise<Verbete> {
  if (!pode(usuario.papel, 'editar_cerebro')) throw new Error('Seu papel não edita o Cérebro.')
  const titulo = d.titulo.trim()
  const conteudo = d.conteudo.replace(/\r\n/g, '\n').trim()
  if (!titulo) throw new Error('Falta o título.')
  if (!TEMAS.some((t) => t.id === d.tema)) throw new Error('Tema inválido.')
  if (PARECE_CPF.test(conteudo) || PARECE_CPF.test(titulo)) {
    throw new Error('Parece ter CPF no texto. Dado de aluno não entra no Cérebro: fica na ficha, na área restrita.')
  }
  const revisar = d.revisar_em && /^\d{4}-\d{2}-\d{2}$/.test(d.revisar_em) ? d.revisar_em : null
  const id = d.id?.trim() || slug(titulo)
  if (!id) throw new Error('Título sem letras ou números.')

  const antes = await lerVerbete(db, id)
  if (!d.id && antes) throw new Error(`Já existe um verbete com esse nome ("${antes.titulo}"). Edite ele.`)
  await db.query(
    `INSERT INTO cerebro (id, tema, titulo, conteudo, dono, revisar_em, fonte, atualizado_por, atualizado_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
     ON CONFLICT (id) DO UPDATE SET tema = EXCLUDED.tema, titulo = EXCLUDED.titulo, conteudo = EXCLUDED.conteudo,
       dono = EXCLUDED.dono, revisar_em = EXCLUDED.revisar_em, fonte = EXCLUDED.fonte,
       atualizado_por = EXCLUDED.atualizado_por, atualizado_em = now()`,
    [id, d.tema, titulo, conteudo, d.dono?.trim() || null, revisar, d.fonte?.trim() || null, usuario.email],
  )
  const depois = (await lerVerbete(db, id))!
  await auditar(db, {
    quem: usuario.email,
    acao: antes ? 'cerebro.editar' : 'cerebro.criar',
    alvo: `cerebro:${id}`,
    antes: antes ? { titulo: antes.titulo, conteudo: antes.conteudo, dono: antes.dono, revisar_em: antes.revisar_em } : undefined,
    depois: { titulo: depois.titulo, conteudo: depois.conteudo, dono: depois.dono, revisar_em: depois.revisar_em },
  })
  return depois
}

/** Carrega o que já se sabe (contexto.md, reuniões). Não sobrescreve o que alguém editou. */
export async function semearCerebro(db: Banco): Promise<number> {
  let novos = 0
  for (const v of VERBETES_INICIAIS) {
    const r = await db.query(
      `INSERT INTO cerebro (id, tema, titulo, conteudo, dono, revisar_em, fonte, atualizado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'sistema') ON CONFLICT (id) DO NOTHING RETURNING id`,
      [v.id, v.tema, v.titulo, v.conteudo, v.dono, v.revisar_em, v.fonte],
    )
    novos += r.length
  }
  if (novos) await auditar(db, { quem: 'sistema', acao: 'cerebro.semear', depois: { novos } })
  return novos
}

/** Resumo por tema pro mapa e pra tela inicial. */
export function resumoPorTema(verbetes: Verbete[]) {
  return TEMAS.map((t) => {
    const vs = verbetes.filter((v) => v.tema === t.id)
    return {
      ...t,
      verbetes: vs,
      ok: vs.filter((v) => situacao(v) === 'ok').length,
      faltam: vs.filter((v) => situacao(v) !== 'ok').length,
    }
  })
}
