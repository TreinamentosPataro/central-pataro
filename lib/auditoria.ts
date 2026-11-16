import type { Banco } from './db'

export interface RegistroAuditoria {
  quem: string        // e-mail da pessoa ou "agente:<id>" ou "sistema"
  acao: string        // ex.: fila.aprovar, ficha.ver_restrito, importacao.corrigiu
  alvo?: string | null
  antes?: unknown
  depois?: unknown
  evidencia?: string | null
}

/** US-03: toda leitura de fonte, sugestão, aprovação ou execução deixa rastro. */
export async function auditar(db: Banco, r: RegistroAuditoria): Promise<void> {
  await db.query(
    `INSERT INTO auditoria (quem, acao, alvo, antes, depois, evidencia)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      r.quem,
      r.acao,
      r.alvo ?? null,
      r.antes === undefined ? null : JSON.stringify(r.antes),
      r.depois === undefined ? null : JSON.stringify(r.depois),
      r.evidencia ?? null,
    ],
  )
}

export interface LinhaAuditoria {
  id: number
  quem: string
  acao: string
  alvo: string | null
  antes: unknown
  depois: unknown
  evidencia: string | null
  quando: string
}

export async function ultimasAuditorias(db: Banco, limite = 200): Promise<LinhaAuditoria[]> {
  return db.query<LinhaAuditoria>(
    `SELECT * FROM auditoria ORDER BY quando DESC, id DESC LIMIT $1`,
    [limite],
  )
}
