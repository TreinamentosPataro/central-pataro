/**
 * Agente SDR: o lead manda mensagem pro chip do agente, a Central guarda a conversa, o agente escreve a próxima
 * mensagem (método SPIN, lib/sdr-instrucoes.ts) e ela vai pra fila. Só sai depois que uma pessoa aprova.
 * Lead qualificado vira resumo pro grupo do comercial (o Bruno fecha), também aprovado antes.
 *
 * Regras que o código garante (não dependem da IA):
 *  - só conversa privada entra; mensagem de grupo e status ficam de fora (grupo é assunto do CS);
 *  - pra onde a resposta vai sai do jid que chegou do WhatsApp, nunca do que a IA escreveu;
 *  - resposta com preço (R$) é recusada: preço é com o Bruno;
 *  - quem sumiu é puxado de volta no máximo 2 vezes, depois de 24 horas, e só se ninguém mandou parar.
 */
import type { Banco } from './db'
import { auditar } from './auditoria'
import { proporItem } from './fila'

export type Etapa = 'situacao' | 'problema' | 'implicacao' | 'necessidade'
export type SituacaoLead = 'novo' | 'conversando' | 'qualificado' | 'passado' | 'fora_do_perfil' | 'encerrado'

export interface EntradaLead {
  jid: string
  nome: string | null
  texto: string
  waId: string
  quando: Date
}

export interface Lead {
  id: string
  jid: string
  nome: string | null
  situacao: SituacaoLead
  etapa: Etapa | null
  faixa: string | null
  pessoas: number | null
  resumo: string | null
  retomadas: number
  bloqueado: boolean
  ultima_do_lead: string | null
  ultima_nossa: string | null
  criado_em: string
}

export interface MensagemLead {
  de: 'lead' | 'agente'
  texto: string
  quando: string
}

export const MAX_RETOMADAS = 2
export const HORAS_PRA_RETOMAR = 24

const PRIVADO = /@(s\.whatsapp\.net|lid)$/

/** Texto da mensagem, seja qual for o tipo. Mídia vira um aviso pra pessoa olhar no celular. */
export function textoDa(m: Record<string, any> | undefined): string | null {
  if (!m) return null
  const t = m.conversation ?? m.extendedTextMessage?.text ?? m.imageMessage?.caption ?? m.videoMessage?.caption
  if (typeof t === 'string' && t.trim()) return t.trim()
  if (m.audioMessage) return '[áudio: ouvir no celular do agente]'
  if (m.imageMessage) return '[imagem sem legenda]'
  if (m.documentMessage) return `[documento${m.documentMessage.fileName ? `: ${m.documentMessage.fileName}` : ''}]`
  if (m.stickerMessage || m.reactionMessage || m.protocolMessage) return null
  return null
}

/**
 * Lê o aviso "messages.upsert" do Evolution. Devolve null pro que não é mensagem de lead:
 * grupo, status, mensagem nossa (fromMe), figurinha, reação, apagada.
 */
export function lerEntradaEvolution(corpo: unknown): EntradaLead | null {
  const c = corpo as Record<string, any> | null
  if (!c || String(c.event ?? '').toLowerCase().replace('_', '.') !== 'messages.upsert') return null
  const d = Array.isArray(c.data) ? c.data[0] : c.data
  const k = d?.key
  if (!k || k.fromMe || typeof k.id !== 'string') return null
  // número de verdade quando o WhatsApp manda o endereço novo (@lid) junto com o antigo
  const candidatos = [k.remoteJid, k.remoteJidAlt, k.senderPn].filter((x): x is string => typeof x === 'string')
  const jid = candidatos.find((j) => j.endsWith('@s.whatsapp.net')) ?? candidatos.find((j) => PRIVADO.test(j))
  if (!jid || !PRIVADO.test(String(k.remoteJid))) return null
  const texto = textoDa(d.message)
  if (!texto) return null
  const ts = Number(d.messageTimestamp)
  return {
    jid,
    nome: typeof d.pushName === 'string' && d.pushName.trim() ? d.pushName.trim().slice(0, 80) : null,
    texto: texto.slice(0, 4000),
    waId: k.id,
    quando: Number.isFinite(ts) && ts > 0 ? new Date(ts * 1000) : new Date(),
  }
}

/** Guarda a mensagem do lead. O mesmo aviso duas vezes (o Evolution repete) entra uma vez só. */
export async function registrarEntrada(db: Banco, e: EntradaLead): Promise<{ leadId: string; nova: boolean }> {
  const [lead] = await db.query<{ id: string }>(
    `INSERT INTO leads (jid, nome) VALUES ($1, $2)
     ON CONFLICT (jid) DO UPDATE SET nome = COALESCE(leads.nome, EXCLUDED.nome)
     RETURNING id`,
    [e.jid, e.nome],
  )
  const nova = await db.query(
    `INSERT INTO lead_mensagens (lead_id, de, texto, wa_id, quando) VALUES ($1, 'lead', $2, $3, $4)
     ON CONFLICT (wa_id) DO NOTHING RETURNING id`,
    [lead.id, e.texto, e.waId, e.quando.toISOString()],
  )
  if (nova.length) {
    // respondeu: zera a contagem de retomadas e volta pra conversa quem tinha sumido
    await db.query(
      `UPDATE leads SET ultima_do_lead = GREATEST(COALESCE(ultima_do_lead, $2), $2), retomadas = 0,
         situacao = CASE WHEN situacao = 'novo' THEN 'conversando' ELSE situacao END
       WHERE id = $1`,
      [lead.id, e.quando.toISOString()],
    )
  }
  return { leadId: lead.id, nova: nova.length > 0 }
}

export interface ConversaPendente {
  lead: Lead
  motivo: 'responder' | 'retomar'
  mensagens: MensagemLead[]
}

/**
 * O que o agente tem pra fazer agora: lead que mandou mensagem e ainda não teve resposta, ou lead que sumiu há
 * mais de 24 horas (até 2 vezes). Lead com resposta esperando aprovação fica de fora (não duplica).
 */
export async function conversasPendentes(db: Banco, agora = new Date()): Promise<ConversaPendente[]> {
  const limite = new Date(agora.getTime() - HORAS_PRA_RETOMAR * 3600_000).toISOString()
  const leads = await db.query<Lead & { motivo: 'responder' | 'retomar' }>(
    `SELECT l.*, CASE WHEN l.ultima_do_lead > COALESCE(l.ultima_nossa, 'epoch') THEN 'responder' ELSE 'retomar' END AS motivo
     FROM leads l
     WHERE NOT l.bloqueado AND l.situacao IN ('novo', 'conversando', 'qualificado')
       AND NOT EXISTS (SELECT 1 FROM fila f WHERE f.destino = 'lead:' || l.id AND f.estado IN ('pendente', 'aprovado', 'ajustado'))
       AND (
         l.ultima_do_lead > COALESCE(l.ultima_nossa, 'epoch')
         OR (l.ultima_nossa IS NOT NULL AND l.ultima_nossa < $1 AND l.retomadas < $2 AND l.situacao = 'conversando')
       )
     ORDER BY COALESCE(l.ultima_do_lead, l.criado_em)`,
    [limite, MAX_RETOMADAS],
  )
  const r: ConversaPendente[] = []
  for (const { motivo, ...lead } of leads) {
    const mensagens = await db.query<MensagemLead>(
      `SELECT de, texto, quando FROM (
         SELECT de, texto, quando FROM lead_mensagens WHERE lead_id = $1 ORDER BY quando DESC LIMIT 30
       ) m ORDER BY quando`,
      [lead.id],
    )
    r.push({ lead, motivo, mensagens })
  }
  return r
}

export interface AcaoSdr {
  lead_id: string
  acao: 'responder' | 'passar' | 'encerrar'
  texto?: string | null
  resumo?: string | null
  etapa?: Etapa | null
  faixa?: string | null
  pessoas?: number | null
}

const ETAPAS: Etapa[] = ['situacao', 'problema', 'implicacao', 'necessidade']
const NOME_ETAPA: Record<Etapa, string> = { situacao: 'situação', problema: 'problema', implicacao: 'implicação', necessidade: 'necessidade' }

/** Preço é com o Bruno. Valor em reais na mensagem pro lead = recusa. */
export function falaDePreco(texto: string): boolean {
  return /R\$\s*\d|\b\d{1,3}(\.\d{3})+(,\d{2})?\s*reais\b|\bdesconto\b/i.test(texto)
}

export function telefoneDoJid(jid: string): string | null {
  const d = jid.endsWith('@s.whatsapp.net') ? jid.split('@')[0] : ''
  if (!/^\d{12,13}$/.test(d)) return null
  const n = d.replace(/^55/, '')
  return `(${n.slice(0, 2)}) ${n.slice(2, -4)}-${n.slice(-4)}`
}

function trecho(mensagens: MensagemLead[], n = 6): string {
  return mensagens.slice(-n).map((m) => `${m.de === 'lead' ? 'Lead' : 'Nós'}: ${m.texto}`).join('\n')
}

/**
 * O agente decide o que fazer com uma conversa. Vira item na fila (nada sai sem aprovação).
 * Chamar duas vezes pra mesma mensagem do lead não cria item repetido.
 */
export async function proporAcao(db: Banco, a: AcaoSdr): Promise<{ itens: string[] }> {
  const [lead] = await db.query<Lead>(`SELECT * FROM leads WHERE id = $1`, [a.lead_id])
  if (!lead) throw new Error('Lead não encontrado.')
  if (lead.bloqueado) throw new Error('Uma pessoa mandou parar de falar com esse lead.')
  if (!['responder', 'passar', 'encerrar'].includes(a.acao)) throw new Error(`Ação desconhecida: ${a.acao}.`)
  if (a.etapa && !ETAPAS.includes(a.etapa)) throw new Error(`Etapa desconhecida: ${a.etapa}.`)
  const texto = a.texto?.trim() || null
  if (a.acao === 'responder' && !texto) throw new Error('Falta o texto da resposta.')
  if (a.acao === 'passar' && !a.resumo?.trim()) throw new Error('Falta o resumo pro Bruno.')
  if (texto && texto.length > 1200) throw new Error('Mensagem longa demais pro WhatsApp (máximo 1.200 caracteres).')
  if (texto && falaDePreco(texto)) throw new Error('A mensagem fala de preço ou desconto: isso é com o Bruno.')

  const mensagens = await db.query<MensagemLead & { id: string }>(
    `SELECT id, de, texto, quando FROM lead_mensagens WHERE lead_id = $1 ORDER BY quando DESC LIMIT 30`, [lead.id],
  )
  mensagens.reverse()
  const ultima = mensagens.at(-1)
  const retomada = ultima?.de === 'agente'
  // mesma mensagem do lead + mesma ação = mesmo item; na retomada, conta a vez
  const base = `sdr:${lead.id}:${ultima?.id ?? 'nenhuma'}${retomada ? `:retomada${lead.retomadas + 1}` : ''}`
  const quem = lead.nome ?? 'lead sem nome'
  const etapa = a.etapa ?? lead.etapa
  const evidencia = [
    trecho(mensagens),
    [etapa && `Etapa do SPIN: ${NOME_ETAPA[etapa]}`, (a.pessoas ?? lead.pessoas) && `${a.pessoas ?? lead.pessoas} pessoas no escritório`, (a.faixa ?? lead.faixa) && `faturamento: ${a.faixa ?? lead.faixa}`]
      .filter(Boolean).join(' · '),
  ].filter(Boolean).join('\n\n')

  const itens: string[] = []
  if (texto) {
    const titulo = a.acao === 'passar' ? `Avisar ${quem} que o Bruno vai chamar`
      : a.acao === 'encerrar' ? `Última mensagem pra ${quem}`
      : retomada ? `Puxar de volta ${quem} (${lead.retomadas + 1}ª vez)`
      : `Resposta pra ${quem}${etapa ? ` · ${NOME_ETAPA[etapa]}` : ''}`
    const i = await proporItem(db, {
      agente_id: 'sdr', tipo: 'sdr_resposta', titulo, evidencia, rascunho: texto,
      destino: `lead:${lead.id}`, chave_idem: `${base}:${a.acao}`,
    })
    itens.push(i.id)
  }
  if (a.acao === 'passar') {
    const tel = telefoneDoJid(lead.jid)
    const i = await proporItem(db, {
      agente_id: 'sdr', tipo: 'sdr_qualificado', titulo: `Lead qualificado pro Bruno: ${quem}`,
      evidencia,
      rascunho: [`Lead pro Bruno: ${quem}${tel ? ` · WhatsApp ${tel}` : ''}`, '', a.resumo!.trim()].join('\n'),
      destino: 'grupo:comercial', chave_idem: `${base}:passar:comercial`,
    })
    itens.push(i.id)
  }

  const situacao: SituacaoLead = a.acao === 'passar' ? 'passado' : a.acao === 'encerrar' ? 'fora_do_perfil'
    : lead.situacao === 'novo' ? 'conversando' : lead.situacao
  await db.query(
    `UPDATE leads SET situacao = $2, etapa = COALESCE($3, etapa), faixa = COALESCE($4, faixa), pessoas = COALESCE($5, pessoas),
       resumo = COALESCE($6, resumo), retomadas = retomadas + $7 WHERE id = $1`,
    [lead.id, situacao, a.etapa ?? null, a.faixa?.trim() || null, a.pessoas ?? null, a.resumo?.trim() || null, retomada && texto ? 1 : 0],
  )
  await auditar(db, {
    quem: 'agente:sdr', acao: `sdr.${a.acao}`, alvo: `lead:${lead.id}`,
    antes: { situacao: lead.situacao, etapa: lead.etapa }, depois: { situacao, etapa, itens },
  })
  await db.query(`UPDATE agentes SET ultima_execucao = now() WHERE id = 'sdr'`)
  return { itens }
}

/** Uma pessoa manda parar de falar com o número (pediu pra sair, é aluno, é engano). */
export async function bloquearLead(db: Banco, quem: string, leadId: string, bloquear = true): Promise<void> {
  const [l] = await db.query<{ id: string }>(`UPDATE leads SET bloqueado = $2 WHERE id = $1 RETURNING id`, [leadId, bloquear])
  if (!l) throw new Error('Lead não encontrado.')
  // o que estava esperando aprovação pra esse número não sai mais
  if (bloquear) {
    await db.query(
      `UPDATE fila SET estado = 'descartado', motivo = 'número bloqueado', aprovador = $2, decidido_em = now()
       WHERE destino = 'lead:' || $1 AND estado = 'pendente'`,
      [leadId, quem],
    )
  }
  await auditar(db, { quem, acao: bloquear ? 'sdr.bloquear' : 'sdr.desbloquear', alvo: `lead:${leadId}` })
}

export async function listarLeads(db: Banco): Promise<(Lead & { mensagens: number; ultima: string | null })[]> {
  return db.query(
    `SELECT l.*, (SELECT count(*)::int FROM lead_mensagens m WHERE m.lead_id = l.id) AS mensagens,
            (SELECT texto FROM lead_mensagens m WHERE m.lead_id = l.id ORDER BY quando DESC LIMIT 1) AS ultima
     FROM leads l ORDER BY GREATEST(COALESCE(l.ultima_do_lead, l.criado_em), COALESCE(l.ultima_nossa, l.criado_em)) DESC LIMIT 200`,
  )
}

export async function conversaDoLead(db: Banco, leadId: string): Promise<{ lead: Lead; mensagens: MensagemLead[] } | null> {
  const [lead] = await db.query<Lead>(`SELECT * FROM leads WHERE id = $1`, [leadId])
  if (!lead) return null
  const mensagens = await db.query<MensagemLead>(`SELECT de, texto, quando FROM lead_mensagens WHERE lead_id = $1 ORDER BY quando`, [leadId])
  return { lead, mensagens }
}
