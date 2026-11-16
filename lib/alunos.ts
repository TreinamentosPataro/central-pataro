import type { Banco } from './db'
import { auditar } from './auditoria'
import { decifrar } from './cofre'
import { pode } from './papeis'
import type { Usuario } from './sessao'

export interface PessoaFicha {
  id: string
  nome: string
  papel: string | null
  telefone: string | null
  email: string | null
  restrito?: { cpf: string | null; rg: string | null; endereco: string | null }
}

export interface Ficha {
  escritorio: { id: string; nome: string; cidade: string | null; uf: string | null; responsavel_cs: string | null }
  pessoas: PessoaFicha[]
  matriculas: { produto: string; inicio: string | null; vencimento: string | null; status: string }[]
  jornada: { etapa: string; bloqueio: string | null; marcos: Record<string, string> } | null
  objetivos: { texto: string; origem: string; trecho: string | null; revisado: boolean }[]
  sinais: { tipo: string; valor: string | null; data: string }[]
  saude: { cor: string; motivo: string; data: string } | null
  fila: { id: string; titulo: string; estado: string; criado_em: string }[]
  mostrouRestrito: boolean
}

export interface LinhaLista {
  id: string
  nome: string
  cidade: string | null
  uf: string | null
  pessoas: number
  produto: string | null
  vencimento: string | null
  etapa: string | null
  cor: string | null
}

export async function listarEscritorios(db: Banco, busca = ''): Promise<LinhaLista[]> {
  return db.query<LinhaLista>(
    `SELECT e.id, e.nome, e.cidade, e.uf,
            (SELECT count(*)::int FROM pessoas p WHERE p.escritorio_id = e.id) AS pessoas,
            m.produto, to_char(m.vencimento, 'DD/MM/YYYY') AS vencimento,
            j.etapa,
            (SELECT s.cor FROM saude s WHERE s.escritorio_id = e.id ORDER BY s.data DESC LIMIT 1) AS cor
     FROM escritorios e
     LEFT JOIN LATERAL (SELECT produto, vencimento FROM matriculas WHERE escritorio_id = e.id
                        ORDER BY vencimento DESC NULLS LAST LIMIT 1) m ON true
     LEFT JOIN jornadas j ON j.escritorio_id = e.id
     WHERE $1 = '' OR e.nome ILIKE '%' || $1 || '%'
        OR EXISTS (SELECT 1 FROM pessoas p WHERE p.escritorio_id = e.id AND p.nome ILIKE '%' || $1 || '%')
     ORDER BY e.nome`,
    [busca.trim()],
  )
}

/**
 * Ficha 360. US-02: CPF, RG e endereço só aparecem pra papel com permissão,
 * e quem vê fica registrado na auditoria.
 */
export async function fichaDoEscritorio(db: Banco, usuario: Usuario, id: string): Promise<Ficha | null> {
  const [escritorio] = await db.query<Ficha['escritorio']>(
    `SELECT id, nome, cidade, uf, responsavel_cs FROM escritorios WHERE id = $1`, [id],
  )
  if (!escritorio) return null

  const verRestrito = pode(usuario.papel, 'ver_restrito')
  const pessoas = await db.query<PessoaFicha & { cpf_cifrado: string | null; rg_cifrado: string | null; endereco_cifrado: string | null }>(
    `SELECT p.id, p.nome, p.papel, p.telefone, p.email,
            r.cpf_cifrado, r.rg_cifrado, r.endereco_cifrado
     FROM pessoas p LEFT JOIN dados_restritos r ON r.pessoa_id = p.id
     WHERE p.escritorio_id = $1 ORDER BY p.papel, p.nome`,
    [id],
  )
  const temRestrito = pessoas.some((p) => p.cpf_cifrado || p.rg_cifrado || p.endereco_cifrado)
  const pessoasFicha: PessoaFicha[] = pessoas.map((p) => {
    const base: PessoaFicha = { id: p.id, nome: p.nome, papel: p.papel, telefone: p.telefone, email: p.email }
    if (verRestrito) {
      base.restrito = {
        cpf: decifrar(p.cpf_cifrado),
        rg: decifrar(p.rg_cifrado),
        endereco: decifrar(p.endereco_cifrado),
      }
    }
    return base
  })
  if (verRestrito && temRestrito) {
    await auditar(db, { quem: usuario.email, acao: 'ficha.ver_restrito', alvo: `escritorio:${id}` })
  }

  const matriculas = await db.query<Ficha['matriculas'][number]>(
    `SELECT produto, to_char(inicio, 'DD/MM/YYYY') AS inicio, to_char(vencimento, 'DD/MM/YYYY') AS vencimento, status
     FROM matriculas WHERE escritorio_id = $1 ORDER BY inicio DESC NULLS LAST`, [id],
  )
  const [jornada] = await db.query<NonNullable<Ficha['jornada']>>(
    `SELECT etapa, bloqueio, marcos FROM jornadas WHERE escritorio_id = $1`, [id],
  )
  const objetivos = await db.query<Ficha['objetivos'][number]>(
    `SELECT texto, origem, trecho, revisado FROM objetivos WHERE escritorio_id = $1 ORDER BY data DESC`, [id],
  )
  const sinais = await db.query<Ficha['sinais'][number]>(
    `SELECT tipo, valor, to_char(data, 'DD/MM/YYYY') AS data FROM sinais WHERE escritorio_id = $1
     ORDER BY sinais.data DESC LIMIT 30`, [id],
  )
  const [saude] = await db.query<NonNullable<Ficha['saude']>>(
    `SELECT cor, motivo, to_char(data, 'DD/MM/YYYY') AS data FROM saude WHERE escritorio_id = $1
     ORDER BY saude.data DESC LIMIT 1`, [id],
  )
  const fila = await db.query<Ficha['fila'][number]>(
    `SELECT id, titulo, estado, to_char(criado_em, 'DD/MM HH24:MI') AS criado_em FROM fila
     WHERE escritorio_id = $1 ORDER BY fila.criado_em DESC LIMIT 20`, [id],
  )

  return {
    escritorio,
    pessoas: pessoasFicha,
    matriculas,
    jornada: jornada ?? null,
    objetivos,
    sinais,
    saude: saude ?? null,
    fila,
    mostrouRestrito: verRestrito,
  }
}
