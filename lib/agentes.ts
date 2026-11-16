import crypto from 'node:crypto'
import type { Banco } from './db'
import { auditar } from './auditoria'
import { sha256 } from './cofre'
import type { Usuario } from './sessao'
import { pode } from './papeis'

export interface Agente {
  id: string
  nome: string
  dono: string
  prazo: string | null
  status: 'no_ar' | 'em_construcao' | 'parado'
  descricao: string | null
  parado: boolean
  ultima_execucao: string | null
  pendentes?: number
  erros_semana?: number
  aprovados_semana?: number
  ajustados_semana?: number
  descartados_semana?: number
}

export async function listarAgentes(db: Banco): Promise<Agente[]> {
  return db.query<Agente>(
    `SELECT a.id, a.nome, a.dono, to_char(a.prazo, 'DD/MM') AS prazo, a.status, a.descricao, a.parado,
            a.ultima_execucao,
            (SELECT count(*)::int FROM fila f WHERE f.agente_id = a.id AND f.estado = 'pendente') AS pendentes,
            (SELECT count(*)::int FROM fila f WHERE f.agente_id = a.id AND f.estado = 'aprovado'
               AND f.decidido_em > now() - interval '7 days') AS aprovados_semana,
            (SELECT count(*)::int FROM fila f WHERE f.agente_id = a.id AND f.estado = 'ajustado'
               AND f.decidido_em > now() - interval '7 days') AS ajustados_semana,
            (SELECT count(*)::int FROM fila f WHERE f.agente_id = a.id AND f.estado = 'descartado'
               AND f.decidido_em > now() - interval '7 days') AS descartados_semana,
            (SELECT count(*)::int FROM auditoria au WHERE au.quem = 'agente:' || a.id AND au.acao = 'agente.erro'
               AND au.quando > now() - interval '7 days') AS erros_semana
     FROM agentes a ORDER BY a.ordem, a.nome`,
  )
}

/** Gera a chave de um agente. Ela aparece uma vez só; o banco guarda o hash. */
export async function novaChave(db: Banco, agenteId: string, quem: string): Promise<string> {
  const chave = `cp_${agenteId}_${crypto.randomBytes(24).toString('base64url')}`
  const r = await db.query(`UPDATE agentes SET chave_hash = $2 WHERE id = $1 RETURNING id`, [agenteId, sha256(chave)])
  if (!r.length) throw new Error(`Agente "${agenteId}" não existe.`)
  await auditar(db, { quem, acao: 'agente.nova_chave', alvo: `agente:${agenteId}` })
  return chave
}

/** Quem está chamando a API? Lê "Authorization: Bearer <chave>". */
export async function agentePelaChave(db: Banco, cabecalho: string | null): Promise<Agente | null> {
  const chave = cabecalho?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (!chave) return null
  const [a] = await db.query<Agente>(`SELECT * FROM agentes WHERE chave_hash = $1`, [sha256(chave)])
  return a ?? null
}

export async function alternarParada(db: Banco, usuario: Usuario, agenteId: string): Promise<boolean> {
  if (!pode(usuario.papel, 'parar_agente')) throw new Error('Seu papel não para agentes.')
  const [a] = await db.query<{ parado: boolean }>(
    `UPDATE agentes SET parado = NOT parado WHERE id = $1 RETURNING parado`, [agenteId],
  )
  if (!a) throw new Error('Agente não encontrado.')
  await auditar(db, {
    quem: usuario.email,
    acao: a.parado ? 'agente.parar' : 'agente.retomar',
    alvo: `agente:${agenteId}`,
    antes: { parado: !a.parado },
    depois: { parado: a.parado },
  })
  return a.parado
}

export async function registrarExecucao(
  db: Banco, agenteId: string, tipo: 'rodou' | 'erro', resumo: string, dados?: unknown,
): Promise<void> {
  await db.query(`UPDATE agentes SET ultima_execucao = now() WHERE id = $1`, [agenteId])
  await auditar(db, {
    quem: `agente:${agenteId}`,
    acao: tipo === 'erro' ? 'agente.erro' : 'agente.rodou',
    evidencia: resumo,
    depois: dados,
  })
}
