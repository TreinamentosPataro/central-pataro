/**
 * Lista permitida de grupos e números (tabela `destinos`). A fila guarda só a chave (grupo:comercial);
 * quem liga a chave ao grupo de verdade é uma pessoa, na tela /integracoes/whatsapp. Toda mudança vai pra auditoria.
 */
import type { Banco } from './db'
import { auditar } from './auditoria'

export interface Destino {
  id: string
  nome: string
  canal: 'whatsapp'
  endereco: string | null
  enviar: boolean
  ler: boolean
  atualizado_por: string | null
  atualizado_em: string
}

/** Destinos que os agentes já usam. Entram sem endereço e com envio desligado: alguém liga na tela. */
export const DESTINOS_INICIAIS: [string, string][] = [
  ['grupo:comercial', 'Grupo do comercial (avisos de contrato travado)'],
  ['grupo:vendas', 'Grupo Vendas (confirmação de venda)'],
  ['grupo:mentores', 'Grupo Mentores (agenda da semana)'],
]

export async function semearDestinos(db: Banco): Promise<void> {
  for (const [id, nome] of DESTINOS_INICIAIS) {
    await db.query(`INSERT INTO destinos (id, nome) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [id, nome])
  }
}

export async function listarDestinos(db: Banco): Promise<Destino[]> {
  return db.query<Destino>(`SELECT * FROM destinos ORDER BY id`)
}

export function enderecoValido(endereco: string): boolean {
  return /^\d{10,20}(-\d+)?@g\.us$/.test(endereco) || /^\d{10,15}@s\.whatsapp\.net$/.test(endereco)
}

export interface MudancaDestino {
  id: string
  nome?: string
  endereco?: string | null
  enviar?: boolean
  ler?: boolean
}

/** Liga, desliga ou cadastra um destino. Chave nova precisa começar com grupo: ou numero:. */
export async function salvarDestino(db: Banco, quem: string, m: MudancaDestino): Promise<Destino> {
  const id = m.id.trim().toLowerCase()
  if (!/^(grupo|numero):[a-z0-9-]{2,40}$/.test(id)) throw new Error('Chave inválida: use grupo:nome-curto (letras, números e hífen).')
  const endereco = m.endereco?.trim() || null
  if (endereco && !enderecoValido(endereco)) throw new Error('Endereço não parece um grupo ou número do WhatsApp.')
  const [antes] = await db.query<Destino>(`SELECT * FROM destinos WHERE id = $1`, [id])
  if (!antes && !m.nome?.trim()) throw new Error('Destino novo precisa de nome.')
  const enderecoFinal = m.endereco === undefined ? antes?.endereco ?? null : endereco
  // sem endereço não tem como enviar nem ler
  const enviar = Boolean(enderecoFinal) && (m.enviar ?? antes?.enviar ?? false)
  const ler = Boolean(enderecoFinal) && (m.ler ?? antes?.ler ?? false)

  const [depois] = await db.query<Destino>(
    `INSERT INTO destinos (id, nome, endereco, enviar, ler, atualizado_por, atualizado_em)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (id) DO UPDATE SET nome = $2, endereco = $3, enviar = $4, ler = $5, atualizado_por = $6, atualizado_em = now()
     RETURNING *`,
    [id, m.nome?.trim() || antes?.nome, enderecoFinal, enviar, ler, quem],
  )
  await auditar(db, {
    quem,
    acao: antes ? 'destino.alterar' : 'destino.criar',
    alvo: `destino:${id}`,
    antes: antes ? { nome: antes.nome, endereco: antes.endereco, enviar: antes.enviar, ler: antes.ler } : undefined,
    depois: { nome: depois.nome, endereco: depois.endereco, enviar: depois.enviar, ler: depois.ler },
  })
  return depois
}
