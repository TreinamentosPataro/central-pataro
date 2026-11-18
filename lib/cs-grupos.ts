/**
 * Agente de CS · acompanhamento nos grupos de alunos (desenho da Fase 1, etapa "Acompanhamento").
 *
 * O chip do agente está nos grupos; a Central só GUARDA mensagem de grupo que uma pessoa liberou pra leitura
 * (tabela `destinos`, coluna `ler`). O agente procura pergunta que ficou sem resposta, escreve a resposta com o
 * Cérebro e o catálogo de aulas, e ela vai pra fila. Aprovada, sai no MESMO grupo de onde veio a pergunta
 * (destino tirado da mensagem, nunca da IA). Mensagem de um grupo nunca vai pra outro.
 */
import type { Banco } from './db'
import { auditar } from './auditoria'
import { proporItem } from './fila'
import { textoDa } from './sdr'

export interface MensagemGrupo {
  grupoJid: string
  autorJid: string | null
  autorNome: string | null
  texto: string
  waId: string
  respondeA: string | null
  deNos: boolean
  quando: Date
}

/** Lê o aviso "messages.upsert" do Evolution quando é mensagem de grupo. Qualquer outra coisa: null. */
export function lerMensagemGrupo(corpo: unknown): MensagemGrupo | null {
  const c = corpo as Record<string, any> | null
  if (!c || String(c.event ?? '').toLowerCase().replace('_', '.') !== 'messages.upsert') return null
  const d = Array.isArray(c.data) ? c.data[0] : c.data
  const k = d?.key
  if (!k || typeof k.id !== 'string' || !String(k.remoteJid ?? '').endsWith('@g.us')) return null
  const texto = textoDa(d.message)
  if (!texto) return null
  const ctx = d.message?.extendedTextMessage?.contextInfo ?? d.contextInfo
  const ts = Number(d.messageTimestamp)
  const autor = [k.participantAlt, k.participant].find((x) => typeof x === 'string' && x.endsWith('@s.whatsapp.net')) ?? k.participant ?? null
  return {
    grupoJid: k.remoteJid,
    autorJid: typeof autor === 'string' ? autor : null,
    autorNome: typeof d.pushName === 'string' && d.pushName.trim() ? d.pushName.trim().slice(0, 80) : null,
    texto: texto.slice(0, 4000),
    waId: k.id,
    respondeA: typeof ctx?.stanzaId === 'string' ? ctx.stanzaId : null,
    deNos: Boolean(k.fromMe),
    quando: Number.isFinite(ts) && ts > 0 ? new Date(ts * 1000) : new Date(),
  }
}

/** Guarda a mensagem só se o grupo estiver liberado pra leitura. Repetida entra uma vez. */
export async function registrarMensagemGrupo(db: Banco, m: MensagemGrupo): Promise<{ guardada: boolean }> {
  const [d] = await db.query<{ id: string }>(`SELECT id FROM destinos WHERE endereco = $1 AND ler`, [m.grupoJid])
  if (!d) return { guardada: false }
  const r = await db.query(
    `INSERT INTO grupo_mensagens (destino_id, autor_jid, autor_nome, texto, wa_id, responde_a, de_nos, quando)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (wa_id) DO NOTHING RETURNING id`,
    [d.id, m.autorJid, m.autorNome, m.texto, m.waId, m.respondeA, m.deNos, m.quando.toISOString()],
  )
  return { guardada: r.length > 0 }
}

/** Jeito de pergunta: tem "?" ou começa como pergunta ("alguém sabe", "como faço", "onde fica"…). */
export function parecePergunta(texto: string): boolean {
  const t = texto.trim().toLowerCase()
  if (t.length < 8) return false
  return t.includes('?') || /^(algu[eé]m (sabe|tem|j[aá])|como (eu )?(fa[cç]o|faz|fica|funciona)|onde (fica|est[aá]|acho)|qual (a|o)|quando (sai|vai|come[cç]a)|tem (aula|modelo|material)|d[uú]vida)/.test(t)
}

export interface PerguntaPendente {
  id: string
  grupo: string        // id do destino (grupo:…)
  grupo_nome: string
  autor: string | null
  texto: string
  quando: string
  antes: { autor: string | null; texto: string; de_nos: boolean }[]
  depois: { autor: string | null; texto: string; de_nos: boolean }[]
}

/**
 * Perguntas pra o agente olhar: com jeito de pergunta, de aluno (não do chip), com mais de 30 minutos (o time
 * tem tempo de responder antes) e menos de 3 dias, que ninguém respondeu citando e que o agente ainda não tratou.
 * Vai junto o que veio antes e depois no grupo: quem decide se já foi respondida é o agente, lendo a conversa.
 */
export async function perguntasSemResposta(db: Banco, agora = new Date(), minutos = 30, dias = 3): Promise<PerguntaPendente[]> {
  const ate = new Date(agora.getTime() - minutos * 60_000).toISOString()
  const desde = new Date(agora.getTime() - dias * 86_400_000).toISOString()
  const candidatas = await db.query<{ id: string; destino_id: string; grupo_nome: string; autor_nome: string | null; texto: string; quando: string }>(
    `SELECT m.id, m.destino_id, d.nome AS grupo_nome, m.autor_nome, m.texto, m.quando
     FROM grupo_mensagens m JOIN destinos d ON d.id = m.destino_id
     WHERE NOT m.de_nos AND m.tratada IS NULL AND d.ler AND m.quando <= $1 AND m.quando >= $2
       AND NOT EXISTS (SELECT 1 FROM grupo_mensagens r WHERE r.responde_a = m.wa_id)
     ORDER BY m.quando`,
    [ate, desde],
  )
  const r: PerguntaPendente[] = []
  for (const c of candidatas.filter((x) => parecePergunta(x.texto))) {
    const viz = (sinal: '<' | '>', ordem: 'DESC' | 'ASC', n: number) => db.query<{ autor: string | null; texto: string; de_nos: boolean; quando: string }>(
      `SELECT autor_nome AS autor, texto, de_nos, quando FROM grupo_mensagens
       WHERE destino_id = $1 AND quando ${sinal} $2 ORDER BY quando ${ordem} LIMIT ${n}`,
      [c.destino_id, c.quando],
    )
    const antes = (await viz('<', 'DESC', 5)).reverse()
    const depois = await viz('>', 'ASC', 10)
    r.push({
      id: c.id, grupo: c.destino_id, grupo_nome: c.grupo_nome, autor: c.autor_nome, texto: c.texto, quando: c.quando,
      antes: antes.map(({ autor, texto, de_nos }) => ({ autor, texto, de_nos })),
      depois: depois.map(({ autor, texto, de_nos }) => ({ autor, texto, de_nos })),
    })
  }
  return r
}

export interface AcaoCs {
  mensagem_id: string
  acao: 'responder' | 'ignorar'
  texto?: string | null
  motivo?: string | null
  aula?: string | null   // aula indicada (nome e link), vai na evidência pra quem aprova conferir
}

const CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/

/** O agente decide sobre uma pergunta. Responder = item na fila pro mesmo grupo. Ignorar = não volta mais. */
export async function proporRespostaGrupo(db: Banco, a: AcaoCs): Promise<{ item: string | null }> {
  const [m] = await db.query<{ id: string; destino_id: string; autor_nome: string | null; texto: string; tratada: string | null; grupo_nome: string }>(
    `SELECT m.id, m.destino_id, m.autor_nome, m.texto, m.tratada, d.nome AS grupo_nome
     FROM grupo_mensagens m JOIN destinos d ON d.id = m.destino_id WHERE m.id = $1`,
    [a.mensagem_id],
  )
  if (!m) throw new Error('Mensagem não encontrada.')
  if (m.tratada) return { item: null } // rodada repetida: já foi tratada

  if (a.acao === 'ignorar') {
    if (!a.motivo?.trim()) throw new Error('Diga por que ignorou (ex.: já respondida pelo Hoklo).')
    await db.query(`UPDATE grupo_mensagens SET tratada = 'ignorada', motivo = $2 WHERE id = $1`, [m.id, a.motivo.trim().slice(0, 300)])
    await auditar(db, { quem: 'agente:cs', acao: 'cs.ignorar', alvo: `grupo_msg:${m.id}`, evidencia: a.motivo.trim().slice(0, 300) })
    return { item: null }
  }
  if (a.acao !== 'responder') throw new Error(`Ação desconhecida: ${a.acao}.`)
  const texto = a.texto?.trim()
  if (!texto) throw new Error('Falta o texto da resposta.')
  if (texto.length > 1500) throw new Error('Resposta longa demais pro grupo (máximo 1.500 caracteres).')
  if (CPF.test(texto)) throw new Error('A resposta tem um número com cara de CPF: dado pessoal não vai pro grupo.')

  const { id } = await proporItem(db, {
    agente_id: 'cs',
    tipo: 'pergunta_sem_resposta',
    titulo: `Pergunta sem resposta em ${m.grupo_nome}${m.autor_nome ? ` (${m.autor_nome})` : ''}`,
    evidencia: [`${m.autor_nome ?? 'Aluno'}: ${m.texto}`, a.aula ? `Aula indicada: ${a.aula}` : null].filter(Boolean).join('\n\n'),
    rascunho: texto,
    destino: m.destino_id,       // o grupo de onde veio a pergunta
    chave_idem: `cs:grupo:${m.id}`,
  })
  await db.query(`UPDATE grupo_mensagens SET tratada = 'na_fila' WHERE id = $1`, [m.id])
  await db.query(`UPDATE agentes SET ultima_execucao = now() WHERE id = 'cs'`)
  return { item: id }
}

/** Grupos liberados e quanto o agente leu de cada um (pra página do agente). */
export async function resumoGrupos(db: Banco): Promise<{ id: string; nome: string; mensagens: number; ultima: string | null; enviar: boolean }[]> {
  return db.query(
    `SELECT d.id, d.nome, d.enviar, count(m.id)::int AS mensagens, max(m.quando) AS ultima
     FROM destinos d LEFT JOIN grupo_mensagens m ON m.destino_id = d.id
     WHERE d.ler AND d.endereco IS NOT NULL GROUP BY d.id, d.nome, d.enviar ORDER BY d.nome`,
  )
}
