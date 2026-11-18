/**
 * Agente SDR: mensagem do lead entra, o agente propõe, uma pessoa aprova, a resposta sai pro número de onde o lead
 * escreveu. Lead qualificado vira resumo pro grupo do comercial. Nomes e números INVENTADOS.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { bancoLocal, type Banco } from '@/lib/db'
import { decidir } from '@/lib/fila'
import { enviarAprovados } from '@/lib/enviador'
import { salvarDestino } from '@/lib/destinos'
import {
  bloquearLead, conversasPendentes, falaDePreco, lerEntradaEvolution, proporAcao, registrarEntrada, telefoneDoJid,
} from '@/lib/sdr'
import { chaveEntrada, conferirChaveEntrada, type ClienteWhatsapp } from '@/lib/whatsapp'
import type { Usuario } from '@/lib/sessao'

const HOKLO: Usuario = { email: 'hoklo@teste', nome: 'Hoklo', papel: 'gerente' }
const NORMAN: Usuario = { email: 'norman@teste', nome: 'Norman', papel: 'executor' }
const MARIA = '5531999990000@s.whatsapp.net'
const GRUPO = '120363000000000001@g.us'

/** Aviso do Evolution como chega de verdade (messages.upsert). */
function aviso(o: { jid?: string; texto?: string; id?: string; fromMe?: boolean; nome?: string; ts?: number; extra?: object } = {}) {
  return {
    event: 'messages.upsert',
    instance: 'agente',
    data: {
      key: { remoteJid: o.jid ?? MARIA, fromMe: o.fromMe ?? false, id: o.id ?? 'WA1', ...o.extra },
      pushName: o.nome ?? 'Maria Exemplo',
      message: { conversation: o.texto ?? 'Oi, vi o anúncio da Trilha' },
      messageTimestamp: o.ts ?? 1_795_000_000,
    },
  }
}

function whatsFalso() {
  const enviados: { para: string; texto: string }[] = []
  const wa: ClienteWhatsapp = {
    estado: async () => 'conectado',
    qr: async () => null,
    enviarTexto: async (para, texto) => { enviados.push({ para, texto }); return { id: `out-${enviados.length}` } },
    grupos: async () => [],
    desconectar: async () => {},
  }
  return { wa, enviados }
}

let db: Banco
beforeEach(async () => {
  db = await bancoLocal()
  await db.query(`INSERT INTO agentes (id, nome, dono) VALUES ('sdr', 'Agente SDR', 'Norman')`)
})

async function leadComMensagem(texto = 'Oi, vi o anúncio da Trilha') {
  const e = lerEntradaEvolution(aviso({ texto }))!
  return (await registrarEntrada(db, e)).leadId
}

describe('SDR · o que entra', () => {
  it('só conversa privada de outra pessoa vira lead: grupo, status e mensagem nossa ficam de fora', () => {
    expect(lerEntradaEvolution(aviso())).toMatchObject({ jid: MARIA, nome: 'Maria Exemplo', texto: 'Oi, vi o anúncio da Trilha' })
    expect(lerEntradaEvolution(aviso({ jid: GRUPO }))).toBeNull()
    expect(lerEntradaEvolution(aviso({ jid: 'status@broadcast' }))).toBeNull()
    expect(lerEntradaEvolution(aviso({ fromMe: true }))).toBeNull()
    expect(lerEntradaEvolution({ event: 'connection.update', data: {} })).toBeNull()
  })

  it('endereço novo do WhatsApp (@lid): usa o número de verdade quando ele vem junto', () => {
    const e = lerEntradaEvolution(aviso({ jid: '123456789@lid', extra: { remoteJidAlt: MARIA } }))
    expect(e?.jid).toBe(MARIA)
    expect(lerEntradaEvolution(aviso({ jid: '123456789@lid' }))?.jid).toBe('123456789@lid')
  })

  it('áudio vira aviso pra ouvir no celular; figurinha é ignorada', () => {
    const audio = aviso()
    ;(audio.data as any).message = { audioMessage: {} }
    expect(lerEntradaEvolution(audio)?.texto).toContain('áudio')
    const fig = aviso()
    ;(fig.data as any).message = { stickerMessage: {} }
    expect(lerEntradaEvolution(fig)).toBeNull()
  })

  it('o mesmo aviso duas vezes entra uma vez só', async () => {
    const e = lerEntradaEvolution(aviso())!
    await registrarEntrada(db, e)
    expect((await registrarEntrada(db, e)).nova).toBe(false)
    expect(await db.query(`SELECT 1 FROM lead_mensagens`)).toHaveLength(1)
  })

  it('a porta de entrada só aceita quem tem a chave do WhatsApp', () => {
    process.env.WHATSAPP_CHAVE = 'chave-de-teste'
    expect(conferirChaveEntrada(chaveEntrada())).toBe(true)
    expect(conferirChaveEntrada('qualquer-coisa')).toBe(false)
    expect(conferirChaveEntrada(null)).toBe(false)
    delete process.env.WHATSAPP_CHAVE
    expect(conferirChaveEntrada(chaveEntrada('chave-de-teste'))).toBe(false)
  })
})

describe('SDR · o agente propõe, uma pessoa aprova', () => {
  it('mensagem nova aparece pra responder; com resposta na fila, some (não duplica)', async () => {
    const id = await leadComMensagem()
    expect((await conversasPendentes(db)).map((c) => [c.lead.id, c.motivo])).toEqual([[id, 'responder']])
    await proporAcao(db, { lead_id: id, acao: 'responder', texto: 'Oi, Maria! Quantas pessoas trabalham com você hoje?', etapa: 'situacao' })
    expect(await conversasPendentes(db)).toHaveLength(0)
    // a mesma ação de novo (rodada repetida) não cria outro item
    await proporAcao(db, { lead_id: id, acao: 'responder', texto: 'Oi, Maria! Quantas pessoas trabalham com você hoje?' })
    expect(await db.query(`SELECT 1 FROM fila`)).toHaveLength(1)
  })

  it('resposta com preço ou desconto é recusada: isso é com o Bruno', async () => {
    const id = await leadComMensagem('Quanto custa?')
    await expect(proporAcao(db, { lead_id: id, acao: 'responder', texto: 'A Trilha sai por R$ 20.000,00' })).rejects.toThrow('preço')
    await expect(proporAcao(db, { lead_id: id, acao: 'responder', texto: 'Hoje tem desconto especial!' })).rejects.toThrow('preço')
    expect(falaDePreco('Quem passa os valores é o Bruno')).toBe(false)
  })

  it('aprovada, a resposta sai pro número do lead e entra na conversa', async () => {
    const id = await leadComMensagem()
    const { itens: [item] } = await proporAcao(db, { lead_id: id, acao: 'responder', texto: 'Oi! Como funciona o escritório hoje?' })
    const { wa, enviados } = whatsFalso()
    expect((await enviarAprovados(db, wa)).enviados).toBe(0) // sem aprovação, nada sai
    await expect(decidir(db, NORMAN, item, { tipo: 'aprovar' })).rejects.toThrow()
    await decidir(db, HOKLO, item, { tipo: 'ajustar', texto: 'Oi, Maria! Como funciona o escritório hoje?' })
    expect((await enviarAprovados(db, wa)).enviados).toBe(1)
    expect(enviados).toEqual([{ para: MARIA, texto: 'Oi, Maria! Como funciona o escritório hoje?' }])
    const conversa = await db.query<{ de: string; texto: string }>(`SELECT de, texto FROM lead_mensagens ORDER BY quando`)
    expect(conversa.map((m) => m.de)).toEqual(['lead', 'agente'])
    expect(conversa[1].texto).toBe('Oi, Maria! Como funciona o escritório hoje?')
  })

  it('lead qualificado: aviso pro lead e resumo pro grupo do comercial, cada um aprovado', async () => {
    const id = await leadComMensagem('Somos 6 aqui, faturamos uns 300 mil. Quero entender a Trilha.')
    const { itens } = await proporAcao(db, {
      lead_id: id, acao: 'passar', texto: 'Perfeito, Maria! O Bruno, do nosso comercial, vai te chamar ainda hoje.',
      resumo: 'Escritório com 6 pessoas, 120 a 500 mil/ano. Dor: tudo depende dela. Indicado: Trilha.',
      pessoas: 6, faixa: '120 a 500 mil', etapa: 'necessidade',
    })
    expect(itens).toHaveLength(2)
    const fila = await db.query<{ tipo: string; destino: string; rascunho: string }>(`SELECT tipo, destino, rascunho FROM fila ORDER BY tipo`)
    expect(fila.map((f) => [f.tipo, f.destino])).toEqual([['sdr_qualificado', 'grupo:comercial'], ['sdr_resposta', `lead:${id}`]])
    expect(fila[0].rascunho).toContain('(31) 99999-0000')
    const [lead] = await db.query<{ situacao: string; pessoas: number }>(`SELECT situacao, pessoas FROM leads`)
    expect(lead).toEqual({ situacao: 'passado', pessoas: 6 })

    // o resumo só sai quando o grupo do comercial estiver ligado
    for (const i of itens) await decidir(db, HOKLO, i, { tipo: 'aprovar' })
    const { wa, enviados } = whatsFalso()
    await enviarAprovados(db, wa)
    expect(enviados.map((e) => e.para)).toEqual([MARIA])
    await salvarDestino(db, 'hoklo@teste', { id: 'grupo:comercial', nome: 'Comercial', endereco: GRUPO, enviar: true })
    await enviarAprovados(db, wa)
    expect(enviados.map((e) => e.para)).toEqual([MARIA, GRUPO])
  })

  it('quem sumiu é puxado de volta depois de 24 horas, no máximo 2 vezes; se responder, zera', async () => {
    const id = await leadComMensagem()
    const { itens: [item] } = await proporAcao(db, { lead_id: id, acao: 'responder', texto: 'Como funciona o escritório hoje?' })
    await decidir(db, HOKLO, item, { tipo: 'aprovar' })
    await enviarAprovados(db, whatsFalso().wa)
    const daqui = (h: number) => new Date(Date.now() + h * 3600_000)
    expect(await conversasPendentes(db, daqui(2))).toHaveLength(0)
    expect((await conversasPendentes(db, daqui(25)))[0]?.motivo).toBe('retomar')

    for (const vez of [1, 2]) {
      const { itens: [r] } = await proporAcao(db, { lead_id: id, acao: 'responder', texto: `Ainda por aí? (${vez})` })
      await decidir(db, HOKLO, r, { tipo: 'aprovar' })
      await enviarAprovados(db, whatsFalso().wa)
    }
    expect(await conversasPendentes(db, daqui(100))).toHaveLength(0) // já foram 2

    await registrarEntrada(db, lerEntradaEvolution(aviso({ id: 'WA2', texto: 'Voltei!', ts: Math.floor(daqui(101).getTime() / 1000) }))!)
    const [l] = await db.query<{ retomadas: number }>(`SELECT retomadas FROM leads`)
    expect(l.retomadas).toBe(0)
    expect((await conversasPendentes(db, daqui(101)))[0]?.motivo).toBe('responder')
  })

  it('número bloqueado: o que esperava aprovação é descartado e o agente não fala mais com ele', async () => {
    const id = await leadComMensagem()
    await proporAcao(db, { lead_id: id, acao: 'responder', texto: 'Como funciona o escritório hoje?' })
    await bloquearLead(db, 'hoklo@teste', id)
    const [f] = await db.query<{ estado: string }>(`SELECT estado FROM fila`)
    expect(f.estado).toBe('descartado')
    expect(await conversasPendentes(db)).toHaveLength(0)
    await expect(proporAcao(db, { lead_id: id, acao: 'responder', texto: 'Oi?' })).rejects.toThrow('parar')
  })

  it('fora do perfil: encerra e não volta pra lista de pendentes', async () => {
    const id = await leadComMensagem('Sou estudante, queria saber do curso')
    await proporAcao(db, { lead_id: id, acao: 'encerrar', texto: 'Pra quem está começando, o CMJ faz mais sentido. Fica o convite!' })
    await registrarEntrada(db, lerEntradaEvolution(aviso({ id: 'WA9', texto: 'Obrigado!', ts: 1_795_000_100 }))!)
    expect(await conversasPendentes(db)).toHaveLength(0)
  })

  it('telefone do lead pro Bruno só sai de número de verdade', () => {
    expect(telefoneDoJid(MARIA)).toBe('(31) 99999-0000')
    expect(telefoneDoJid('123456789@lid')).toBeNull()
  })
})
