/**
 * WhatsApp do agente: só sai o que uma pessoa aprovou, pro grupo que uma pessoa ligou na tabela de destinos.
 * O WhatsApp aqui é de mentira (registra o que seria enviado). Grupos e números INVENTADOS.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { bancoLocal, type Banco } from '@/lib/db'
import { decidir, proporItem } from '@/lib/fila'
import { alternarParada } from '@/lib/agentes'
import { enviarAprovados } from '@/lib/enviador'
import { enderecoValido, salvarDestino, semearDestinos } from '@/lib/destinos'
import type { ClienteWhatsapp, EstadoConexao } from '@/lib/whatsapp'
import type { Usuario } from '@/lib/sessao'

const HOKLO: Usuario = { email: 'hoklo@teste', nome: 'Hoklo', papel: 'gerente' }
const GRUPO = '120363000000000001@g.us'

function whatsFalso(estado: EstadoConexao = 'conectado', falhar = false) {
  const enviados: { para: string; texto: string }[] = []
  const wa: ClienteWhatsapp = {
    estado: async () => estado,
    qr: async () => null,
    enviarTexto: async (para, texto) => {
      if (falhar) throw new Error('timeout')
      enviados.push({ para, texto })
      return { id: `msg-${enviados.length}` }
    },
    grupos: async () => [],
    desconectar: async () => {},
  }
  return { wa, enviados }
}

let db: Banco

async function aprovado(texto = 'Oi, comercial! Falta o CPF no contrato da Maria.', destino = 'grupo:comercial', chave = 'a') {
  const { id } = await proporItem(db, { agente_id: 'contratos', tipo: 'contrato_travado', titulo: 'Travado', rascunho: texto, destino, chave_idem: chave })
  await decidir(db, HOKLO, id, { tipo: 'aprovar' })
  return id
}

async function estado(id: string) {
  const [i] = await db.query<{ estado: string; resultado: string | null }>(`SELECT estado, resultado FROM fila WHERE id = $1`, [id])
  return i
}

beforeEach(async () => {
  db = await bancoLocal()
  await db.query(`INSERT INTO agentes (id, nome, dono) VALUES ('contratos', 'Agente de contratos', 'Norman')`)
  await semearDestinos(db)
})

describe('destinos (lista permitida)', () => {
  it('nasce sem grupo e com envio desligado', async () => {
    const [d] = await db.query<{ endereco: string | null; enviar: boolean }>(`SELECT * FROM destinos WHERE id = 'grupo:comercial'`)
    expect(d).toMatchObject({ endereco: null, enviar: false })
  })
  it('só aceita endereço de grupo ou número do WhatsApp', async () => {
    expect(enderecoValido(GRUPO)).toBe(true)
    expect(enderecoValido('5531999998888@s.whatsapp.net')).toBe(true)
    expect(enderecoValido('qualquer coisa')).toBe(false)
    await expect(salvarDestino(db, HOKLO.email, { id: 'grupo:comercial', endereco: 'grupo do comercial' })).rejects.toThrow(/não parece/)
  })
  it('sem endereço não liga o envio, e a mudança vai pra auditoria', async () => {
    const d = await salvarDestino(db, HOKLO.email, { id: 'grupo:comercial', enviar: true })
    expect(d.enviar).toBe(false)
    const ligado = await salvarDestino(db, HOKLO.email, { id: 'grupo:comercial', endereco: GRUPO, enviar: true })
    expect(ligado).toMatchObject({ endereco: GRUPO, enviar: true })
    const [a] = await db.query<{ quem: string }>(`SELECT quem FROM auditoria WHERE acao = 'destino.alterar' ORDER BY id DESC`)
    expect(a.quem).toBe(HOKLO.email)
  })
})

describe('envio do que foi aprovado', () => {
  beforeEach(async () => {
    await salvarDestino(db, HOKLO.email, { id: 'grupo:comercial', endereco: GRUPO, enviar: true })
  })

  it('manda o texto aprovado pro grupo da tabela e marca executado', async () => {
    const id = await aprovado()
    const { wa, enviados } = whatsFalso()
    const r = await enviarAprovados(db, wa)
    expect(r.enviados).toBe(1)
    expect(enviados).toEqual([{ para: GRUPO, texto: 'Oi, comercial! Falta o CPF no contrato da Maria.' }])
    expect((await estado(id)).estado).toBe('executado')
  })

  it('manda a versão ajustada, não o rascunho', async () => {
    const { id } = await proporItem(db, { agente_id: 'contratos', tipo: 'x', titulo: 'x', rascunho: 'rascunho', destino: 'grupo:comercial' })
    await decidir(db, HOKLO, id, { tipo: 'ajustar', texto: 'versão do Hoklo' })
    const { wa, enviados } = whatsFalso()
    await enviarAprovados(db, wa)
    expect(enviados[0].texto).toBe('versão do Hoklo')
  })

  it('não manda o que está pendente ou descartado', async () => {
    await proporItem(db, { agente_id: 'contratos', tipo: 'x', titulo: 'x', rascunho: 'pendente', destino: 'grupo:comercial' })
    const { id } = await proporItem(db, { agente_id: 'contratos', tipo: 'x', titulo: 'x', rascunho: 'fora', destino: 'grupo:comercial' })
    await decidir(db, HOKLO, id, { tipo: 'descartar', motivo: 'não precisa' })
    const { wa, enviados } = whatsFalso()
    await enviarAprovados(db, wa)
    expect(enviados).toEqual([])
  })

  it('rodar duas vezes não manda duas vezes', async () => {
    await aprovado()
    const { wa, enviados } = whatsFalso()
    await enviarAprovados(db, wa)
    await enviarAprovados(db, wa)
    expect(enviados).toHaveLength(1)
  })

  it('destino fora da tabela ou sem grupo ligado: espera, não envia', async () => {
    const semTabela = await aprovado('x', 'grupo-inventado-pela-ia', 'b')
    const semGrupo = await aprovado('y', 'grupo:vendas', 'c')
    const { wa, enviados } = whatsFalso()
    const r = await enviarAprovados(db, wa)
    expect(enviados).toEqual([])
    expect(r.esperandoDestino).toBe(1) // grupo:vendas; o inventado nem entra na conta
    expect((await estado(semTabela)).estado).toBe('aprovado')
    expect((await estado(semGrupo)).estado).toBe('aprovado')
  })

  it('agente parado pelo botão não envia', async () => {
    await aprovado()
    await alternarParada(db, HOKLO, 'contratos')
    const { wa, enviados } = whatsFalso()
    await enviarAprovados(db, wa)
    expect(enviados).toEqual([])
  })

  it('WhatsApp desconectado: nada é tocado, sai quando voltar', async () => {
    const id = await aprovado()
    const r = await enviarAprovados(db, whatsFalso('desconectado').wa)
    expect(r.semConexao).toBe(true)
    expect(await estado(id)).toMatchObject({ estado: 'aprovado', resultado: null })
    const { wa, enviados } = whatsFalso()
    await enviarAprovados(db, wa)
    expect(enviados).toHaveLength(1)
  })

  it('erro no envio marca falhou com o motivo e registra erro do agente', async () => {
    const id = await aprovado()
    const r = await enviarAprovados(db, whatsFalso('conectado', true).wa)
    expect(r.falharam).toBe(1)
    const i = await estado(id)
    expect(i.estado).toBe('falhou')
    expect(i.resultado).toMatch(/timeout/)
    const [erro] = await db.query(`SELECT * FROM auditoria WHERE acao = 'agente.erro'`)
    expect(erro).toBeTruthy()
  })

  it('item reservado (Central caiu no meio do envio) não é reenviado sozinho', async () => {
    const id = await aprovado()
    await db.query(`UPDATE fila SET resultado = 'enviando' WHERE id = $1`, [id])
    const { wa, enviados } = whatsFalso()
    await enviarAprovados(db, wa)
    expect(enviados).toEqual([])
  })
})
