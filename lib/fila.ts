import type { Banco } from './db'
import { auditar } from './auditoria'
import type { Usuario } from './sessao'
import { pode } from './papeis'

export type EstadoFila = 'pendente' | 'aprovado' | 'ajustado' | 'descartado' | 'executado' | 'falhou'

export interface ItemFila {
  id: string
  agente_id: string
  agente_nome?: string
  escritorio_id: string | null
  escritorio_nome?: string | null
  tipo: string
  titulo: string
  evidencia: string | null
  rascunho: string | null
  destino: string | null
  estado: EstadoFila
  texto_final: string | null
  aprovador: string | null
  motivo: string | null
  decidido_em: string | null
  executado_em: string | null
  resultado: string | null
  criado_em: string
}

export interface NovaProposta {
  agente_id: string
  tipo: string
  titulo: string
  evidencia?: string | null
  rascunho?: string | null
  destino?: string | null
  escritorio_id?: string | null
  chave_idem?: string | null
}

/** O agente propõe. Mesma chave_idem duas vezes → um item só. */
export async function proporItem(db: Banco, p: NovaProposta): Promise<{ id: string; novo: boolean }> {
  if (p.chave_idem) {
    const [existe] = await db.query<{ id: string }>(`SELECT id FROM fila WHERE chave_idem = $1`, [p.chave_idem])
    if (existe) return { id: existe.id, novo: false }
  }
  const [item] = await db.query<{ id: string }>(
    `INSERT INTO fila (agente_id, tipo, titulo, evidencia, rascunho, destino, escritorio_id, chave_idem)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [p.agente_id, p.tipo, p.titulo, p.evidencia ?? null, p.rascunho ?? null, p.destino ?? null,
     p.escritorio_id ?? null, p.chave_idem ?? null],
  )
  await auditar(db, {
    quem: `agente:${p.agente_id}`,
    acao: 'fila.propor',
    alvo: `fila:${item.id}`,
    depois: p,
    evidencia: p.evidencia ?? null,
  })
  return { id: item.id, novo: true }
}

export type Decisao =
  | { tipo: 'aprovar' }
  | { tipo: 'ajustar'; texto: string }
  | { tipo: 'descartar'; motivo: string }

/**
 * Uma pessoa decide. "aprovado" = sem mexer, "ajustado" = aprovado com texto editado.
 * Essa diferença é a métrica do modo sombra.
 */
export async function decidir(db: Banco, usuario: Usuario, id: string, d: Decisao): Promise<ItemFila> {
  if (!pode(usuario.papel, 'aprovar')) throw new Error('Seu papel não aprova itens da fila.')
  const [antes] = await db.query<ItemFila>(`SELECT * FROM fila WHERE id = $1`, [id])
  if (!antes) throw new Error('Item não encontrado.')
  if (antes.estado !== 'pendente') throw new Error(`Item já foi decidido (${antes.estado}).`)

  let estado: EstadoFila
  let textoFinal: string | null = null
  let motivo: string | null = null
  if (d.tipo === 'aprovar') {
    estado = 'aprovado'
    textoFinal = antes.rascunho
  } else if (d.tipo === 'ajustar') {
    if (!d.texto.trim()) throw new Error('Texto ajustado vazio.')
    estado = 'ajustado'
    textoFinal = d.texto
  } else {
    if (!d.motivo.trim()) throw new Error('Diga o motivo do descarte.')
    estado = 'descartado'
    motivo = d.motivo
  }

  const [depois] = await db.query<ItemFila>(
    `UPDATE fila SET estado = $2, texto_final = $3, motivo = $4, aprovador = $5, decidido_em = now()
     WHERE id = $1 AND estado = 'pendente' RETURNING *`,
    [id, estado, textoFinal, motivo, usuario.email],
  )
  if (!depois) throw new Error('Outra pessoa decidiu esse item agora há pouco.')
  await auditar(db, {
    quem: usuario.email,
    acao: `fila.${d.tipo}`,
    alvo: `fila:${id}`,
    antes: { estado: antes.estado, rascunho: antes.rascunho },
    depois: { estado, texto_final: textoFinal, motivo },
  })
  return depois
}

/** O que o agente pode executar agora: aprovado/ajustado e agente não parado. */
export async function aprovadosParaExecutar(db: Banco, agenteId: string): Promise<ItemFila[]> {
  return db.query<ItemFila>(
    `SELECT f.* FROM fila f JOIN agentes a ON a.id = f.agente_id
     WHERE f.agente_id = $1 AND f.estado IN ('aprovado', 'ajustado') AND NOT a.parado
     ORDER BY f.decidido_em`,
    [agenteId],
  )
}

/** O agente avisa que executou. Repetir o aviso não muda nada (idempotente). */
export async function marcarExecutado(
  db: Banco, agenteId: string, id: string, ok: boolean, resultado: string,
): Promise<ItemFila> {
  const [item] = await db.query<ItemFila>(`SELECT * FROM fila WHERE id = $1 AND agente_id = $2`, [id, agenteId])
  if (!item) throw new Error('Item não encontrado pra esse agente.')
  if (item.estado === 'executado' || item.estado === 'falhou') return item
  if (item.estado !== 'aprovado' && item.estado !== 'ajustado') {
    throw new Error(`Item não está aprovado (${item.estado}).`)
  }
  const estado: EstadoFila = ok ? 'executado' : 'falhou'
  const [depois] = await db.query<ItemFila>(
    `UPDATE fila SET estado = $2, resultado = $3, executado_em = now() WHERE id = $1 RETURNING *`,
    [id, estado, resultado],
  )
  await auditar(db, {
    quem: `agente:${agenteId}`,
    acao: ok ? 'fila.executou' : 'fila.falhou',
    alvo: `fila:${id}`,
    antes: { estado: item.estado },
    depois: { estado, resultado, texto_enviado: item.texto_final },
  })
  return depois
}

export async function listarFila(db: Banco, estados: EstadoFila[] = ['pendente']): Promise<ItemFila[]> {
  return db.query<ItemFila>(
    `SELECT f.*, a.nome AS agente_nome, e.nome AS escritorio_nome
     FROM fila f JOIN agentes a ON a.id = f.agente_id
     LEFT JOIN escritorios e ON e.id = f.escritorio_id
     WHERE f.estado = ANY($1::text[])
     ORDER BY f.criado_em DESC LIMIT 200`,
    [estados],
  )
}
