import fs from 'node:fs'
import path from 'node:path'

/** O mínimo que o resto do código precisa de um banco. Neon e PGlite cabem aqui. */
export interface Banco {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>
  /** Vários comandos de uma vez, sem parâmetros (usado pra aplicar o schema). */
  exec(sql: string): Promise<void>
}

const SCHEMA = path.join(process.cwd(), 'db', 'schema.sql')

export function lerSchema(): string {
  return fs.readFileSync(SCHEMA, 'utf8')
}

async function bancoNeon(url: string): Promise<Banco> {
  const { Pool } = await import('@neondatabase/serverless')
  const pool = new Pool({ connectionString: url })
  return {
    async query(sql, params) {
      const r = await pool.query(sql, params as unknown[] | undefined)
      return r.rows
    },
    async exec(sql) {
      await pool.query(sql)
    },
  }
}

/** Postgres de verdade rodando em WASM. Sem pasta = só na memória (testes). */
export async function bancoLocal(pasta?: string): Promise<Banco> {
  const { PGlite } = await import('@electric-sql/pglite')
  if (pasta) fs.mkdirSync(pasta, { recursive: true })
  const pg = new PGlite(pasta)
  const banco: Banco = {
    async query(sql, params) {
      const r = await pg.query(sql, params as unknown[] | undefined)
      return r.rows as never[]
    },
    async exec(sql) {
      await pg.exec(sql)
    },
  }
  await banco.exec(lerSchema())
  return banco
}

const g = globalThis as unknown as { __banco?: Promise<Banco> }

/** O banco da aplicação: Neon se houver DATABASE_URL, senão PGlite em .dados/. */
export function getBanco(): Promise<Banco> {
  if (!g.__banco) {
    const url = process.env.DATABASE_URL
    g.__banco = url ? bancoNeon(url) : bancoLocal(path.join(process.cwd(), '.dados', 'pglite'))
  }
  return g.__banco
}
