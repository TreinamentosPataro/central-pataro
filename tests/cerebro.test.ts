/**
 * Cérebro (plano-central.md, 16/11/2026): o conhecimento da Pataro que todo agente consulta.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { bancoLocal, type Banco } from '@/lib/db'
import { buscarNoCerebro, lerVerbete, resumoPorTema, salvarVerbete, semearCerebro, situacao, slug, listarVerbetes } from '@/lib/cerebro'
import { VERBETES_INICIAIS } from '@/lib/cerebro-inicial'
import type { Usuario } from '@/lib/sessao'

const HOKLO: Usuario = { email: 'hoklo@teste', nome: 'Hoklo', papel: 'gerente' }
const NORMAN: Usuario = { email: 'norman@teste', nome: 'Norman', papel: 'executor' }

let db: Banco

beforeEach(async () => {
  db = await bancoLocal()
})

describe('Cérebro · carga inicial', () => {
  it('carrega os verbetes e não sobrescreve o que alguém editou', async () => {
    expect(await semearCerebro(db)).toBe(VERBETES_INICIAIS.length)
    await salvarVerbete(db, HOKLO, { id: 'trilha', tema: 'oferta', titulo: 'Trilha Previdenciarista de Elite', conteudo: 'Texto do Hoklo' })
    expect(await semearCerebro(db)).toBe(0) // rodar de novo não duplica nem apaga
    expect((await lerVerbete(db, 'trilha'))!.conteudo).toBe('Texto do Hoklo')
  })

  it('a carga inicial não tem nada com cara de CPF', () => {
    for (const v of VERBETES_INICIAIS) expect(v.conteudo).not.toMatch(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/)
  })

  it('todo verbete inicial tem dono e um tema que existe', async () => {
    await semearCerebro(db)
    const temas = resumoPorTema(await listarVerbetes(db))
    expect(temas.reduce((s, t) => s + t.verbetes.length, 0)).toBe(VERBETES_INICIAIS.length)
    for (const v of VERBETES_INICIAIS) expect(v.dono).toBeTruthy()
  })
})

describe('Cérebro · Buscar no Cérebro', () => {
  beforeEach(async () => { await semearCerebro(db) })

  it('acha pela palavra em português, mesmo no plural', async () => {
    const r = await buscarNoCerebro(db, 'contratos assinatura')
    expect(r[0].id).toBe('contratos')
    expect(r[0].trecho).toContain('<<')
  })

  it('pergunta em frase natural acha o verbete certo entre os primeiros', async () => {
    const r = await buscarNoCerebro(db, 'quem assina o contrato?')
    expect(r.slice(0, 3).map((a) => a.id)).toContain('contratos')
    const p = await buscarNoCerebro(db, 'qual o público da Trilha')
    expect(p[0].id).toBe('trilha')
  })

  it('acha por pedaço de nome quando a busca por palavra não acha', async () => {
    const r = await buscarNoCerebro(db, 'Cursedu')
    expect(r.map((a) => a.id)).toContain('onde-estao-as-aulas')
  })

  it('pergunta vazia não busca nada', async () => {
    expect(await buscarNoCerebro(db, '   ')).toEqual([])
  })
})

describe('Cérebro · edição', () => {
  it('toda edição vai pra auditoria com o antes e o depois', async () => {
    await semearCerebro(db)
    await salvarVerbete(db, NORMAN, { id: 'reembolso', tema: 'politicas', titulo: 'Reembolso e cancelamento', conteudo: 'Garantia de 7 dias.', dono: 'Fred' })
    const [a] = await db.query<{ quem: string; acao: string; antes: { conteudo: string }; depois: { conteudo: string } }>(
      `SELECT quem, acao, antes, depois FROM auditoria WHERE alvo = 'cerebro:reembolso'`)
    expect(a.quem).toBe('norman@teste')
    expect(a.acao).toBe('cerebro.editar')
    expect(a.antes.conteudo).toBe('')
    expect(a.depois.conteudo).toBe('Garantia de 7 dias.')
  })

  it('recusa texto com CPF: dado de aluno não entra no Cérebro', async () => {
    await expect(salvarVerbete(db, HOKLO, { tema: 'politicas', titulo: 'Teste', conteudo: 'Aluno 529.982.247-25 pediu reembolso' }))
      .rejects.toThrow(/CPF/)
    expect(await lerVerbete(db, 'teste')).toBeNull()
  })

  it('verbete novo com nome repetido não apaga o que já existe', async () => {
    await salvarVerbete(db, HOKLO, { tema: 'oferta', titulo: 'Preço da Trilha', conteudo: 'A' })
    await expect(salvarVerbete(db, HOKLO, { tema: 'oferta', titulo: 'Preço da Trilha', conteudo: 'B' })).rejects.toThrow(/Já existe/)
    expect((await lerVerbete(db, 'preco-da-trilha'))!.conteudo).toBe('A')
  })

  it('tema que não existe é recusado', async () => {
    await expect(salvarVerbete(db, HOKLO, { tema: 'qualquer', titulo: 'X', conteudo: 'Y' })).rejects.toThrow(/Tema/)
  })

  it('slug tira acento e espaço', () => {
    expect(slug('Política de Reembolso da Trilha!')).toBe('politica-de-reembolso-da-trilha')
  })
})

describe('Cérebro · situação', () => {
  it('vazio é "a preencher", vencido é "revisar", o resto está em dia', () => {
    const hoje = new Date('2026-11-16T12:00:00Z')
    expect(situacao({ conteudo: '  ', revisar_em: null }, hoje)).toBe('a_preencher')
    expect(situacao({ conteudo: 'x', revisar_em: '2026-11-01' }, hoje)).toBe('revisar')
    expect(situacao({ conteudo: 'x', revisar_em: '2026-12-18' }, hoje)).toBe('ok')
    expect(situacao({ conteudo: 'x', revisar_em: null }, hoje)).toBe('ok')
  })
})
