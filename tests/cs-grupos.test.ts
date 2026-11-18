/**
 * Agente de CS nos grupos: só lê grupo liberado, acha pergunta sem resposta, a resposta vai pra fila e, aprovada,
 * sai no MESMO grupo. Grupos, nomes e números INVENTADOS.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { bancoLocal, type Banco } from '@/lib/db'
import { decidir } from '@/lib/fila'
import { enviarAprovados } from '@/lib/enviador'
import { salvarDestino } from '@/lib/destinos'
import { lerMensagemGrupo, parecePergunta, perguntasSemResposta, proporRespostaGrupo, registrarMensagemGrupo } from '@/lib/cs-grupos'
import { lerEntradaEvolution } from '@/lib/sdr'
import type { ClienteWhatsapp } from '@/lib/whatsapp'
import type { Usuario } from '@/lib/sessao'

const HOKLO: Usuario = { email: 'hoklo@teste', nome: 'Hoklo', papel: 'gerente' }
const TRILHA = '120363000000000011@g.us'
const CONFRARIA = '120363000000000022@g.us'
const FORA = '120363000000000099@g.us'
const AGORA = new Date('2026-11-19T15:00:00Z')
const haMin = (m: number) => Math.floor((AGORA.getTime() - m * 60_000) / 1000)

let n = 0
function aviso(o: { grupo?: string; texto: string; min: number; nome?: string; fromMe?: boolean; cita?: string; id?: string }) {
  return {
    event: 'messages.upsert',
    data: {
      key: { remoteJid: o.grupo ?? TRILHA, fromMe: o.fromMe ?? false, id: o.id ?? `G${++n}`, participant: '5531988887777@s.whatsapp.net' },
      pushName: o.nome ?? 'Maria',
      message: o.cita
        ? { extendedTextMessage: { text: o.texto, contextInfo: { stanzaId: o.cita } } }
        : { conversation: o.texto },
      messageTimestamp: haMin(o.min),
    },
  }
}
const guardar = async (o: Parameters<typeof aviso>[0]) => registrarMensagemGrupo(db, lerMensagemGrupo(aviso(o))!)

function whatsFalso() {
  const enviados: { para: string; texto: string }[] = []
  const wa: ClienteWhatsapp = {
    estado: async () => 'conectado', qr: async () => null, grupos: async () => [], desconectar: async () => {},
    enviarTexto: async (para, texto) => { enviados.push({ para, texto }); return { id: `out-${enviados.length}` } },
  }
  return { wa, enviados }
}

let db: Banco
beforeEach(async () => {
  db = await bancoLocal()
  await db.query(`INSERT INTO agentes (id, nome, dono) VALUES ('cs', 'Agente de CS', 'Norman')`)
  await salvarDestino(db, 'hoklo@teste', { id: 'grupo:trilha-1', nome: 'Trilha turma 1', endereco: TRILHA, ler: true, enviar: true })
  await salvarDestino(db, 'hoklo@teste', { id: 'grupo:confraria', nome: 'Confraria', endereco: CONFRARIA, ler: true, enviar: true })
})

describe('CS nos grupos · o que entra', () => {
  it('mensagem de grupo não vira lead do SDR, e lead não vira mensagem de grupo', () => {
    expect(lerEntradaEvolution(aviso({ texto: 'Oi?', min: 5 }))).toBeNull()
    expect(lerMensagemGrupo(aviso({ texto: 'Oi?', min: 5 }))).toMatchObject({ grupoJid: TRILHA, autorNome: 'Maria' })
    const privado = aviso({ texto: 'Oi', min: 5 })
    privado.data.key.remoteJid = '5531999990000@s.whatsapp.net'
    expect(lerMensagemGrupo(privado)).toBeNull()
  })

  it('só guarda grupo liberado pra leitura', async () => {
    expect((await guardar({ texto: 'Alguém tem o modelo?', min: 60 })).guardada).toBe(true)
    expect((await guardar({ grupo: FORA, texto: 'Alguém tem o modelo?', min: 60 })).guardada).toBe(false)
    await salvarDestino(db, 'hoklo@teste', { id: 'grupo:trilha-1', ler: false })
    expect((await guardar({ texto: 'E agora?', min: 60 })).guardada).toBe(false)
  })

  it('reconhece jeito de pergunta', () => {
    expect(parecePergunta('Alguém sabe onde fica a aula de contratos')).toBe(true)
    expect(parecePergunta('Qual o prazo pra mandar o Raio-X?')).toBe(true)
    expect(parecePergunta('Obrigada, pessoal!')).toBe(false)
    expect(parecePergunta('ok?')).toBe(false)
  })
})

describe('CS nos grupos · pergunta sem resposta', () => {
  it('entra depois de 30 minutos (o time tem tempo de responder antes) e até 3 dias', async () => {
    await guardar({ texto: 'Alguém tem o modelo de contrato de honorários?', min: 10 })
    await guardar({ texto: 'Qual o link da gravação de ontem?', min: 90 })
    await guardar({ texto: 'Onde fica a planilha do mês passado?', min: 5 * 24 * 60 })
    const p = await perguntasSemResposta(db, AGORA)
    expect(p.map((x) => x.texto)).toEqual(['Qual o link da gravação de ontem?'])
  })

  it('pergunta respondida citando, ou mensagem do próprio chip, fica de fora', async () => {
    await guardar({ id: 'P1', texto: 'Qual o link da gravação de ontem?', min: 90 })
    await guardar({ texto: 'Tá no Curseduca, módulo 3', min: 80, nome: 'Hoklo', cita: 'P1' })
    await guardar({ texto: 'Alguém viu o recado do Fred?', min: 90, fromMe: true })
    expect(await perguntasSemResposta(db, AGORA)).toHaveLength(0)
  })

  it('vai junto o que se falou antes e depois, pro agente ver se já responderam sem citar', async () => {
    await guardar({ texto: 'Bom dia, turma', min: 120, nome: 'Fred' })
    await guardar({ texto: 'Qual o link da gravação de ontem?', min: 90 })
    await guardar({ texto: 'Tá no Curseduca, módulo 3', min: 85, nome: 'Hoklo' })
    const [p] = await perguntasSemResposta(db, AGORA)
    expect(p.antes.map((m) => m.texto)).toEqual(['Bom dia, turma'])
    expect(p.depois.map((m) => m.autor)).toEqual(['Hoklo'])
  })
})

describe('CS nos grupos · resposta aprovada sai no mesmo grupo', () => {
  it('resposta vai pra fila com destino no grupo da pergunta e, aprovada, sai lá (e só lá)', async () => {
    await guardar({ grupo: CONFRARIA, texto: 'Bom dia!', min: 200 })
    await guardar({ texto: 'Alguém tem o modelo de contrato de honorários?', min: 90 })
    const [p] = await perguntasSemResposta(db, AGORA)
    const { item } = await proporRespostaGrupo(db, {
      mensagem_id: p.id, acao: 'responder', texto: 'Oi, Maria! Tem sim: aula "Contratos de honorários", na Trilha.', aula: 'Contratos de honorários — link',
    })
    const [f] = await db.query<{ destino: string; tipo: string }>(`SELECT destino, tipo FROM fila`)
    expect(f).toEqual({ destino: 'grupo:trilha-1', tipo: 'pergunta_sem_resposta' })
    expect(await perguntasSemResposta(db, AGORA)).toHaveLength(0) // tratada: não volta

    const { wa, enviados } = whatsFalso()
    expect((await enviarAprovados(db, wa)).enviados).toBe(0)
    await decidir(db, HOKLO, item!, { tipo: 'aprovar' })
    await enviarAprovados(db, wa)
    expect(enviados.map((e) => e.para)).toEqual([TRILHA])
  })

  it('ignorar pede motivo e a pergunta não volta', async () => {
    await guardar({ texto: 'Qual o link da gravação de ontem?', min: 90 })
    const [p] = await perguntasSemResposta(db, AGORA)
    await expect(proporRespostaGrupo(db, { mensagem_id: p.id, acao: 'ignorar' })).rejects.toThrow('por que')
    await proporRespostaGrupo(db, { mensagem_id: p.id, acao: 'ignorar', motivo: 'já respondida pelo Hoklo' })
    expect(await perguntasSemResposta(db, AGORA)).toHaveLength(0)
    expect(await db.query(`SELECT 1 FROM fila`)).toHaveLength(0)
  })

  it('resposta com CPF é recusada; rodada repetida não duplica', async () => {
    await guardar({ texto: 'Qual o CPF que vai no contrato?', min: 90 })
    const [p] = await perguntasSemResposta(db, AGORA)
    await expect(proporRespostaGrupo(db, { mensagem_id: p.id, acao: 'responder', texto: 'Usa o 529.982.247-25' })).rejects.toThrow('CPF')
    await proporRespostaGrupo(db, { mensagem_id: p.id, acao: 'responder', texto: 'Vou pedir pro Hoklo te chamar no privado.' })
    await proporRespostaGrupo(db, { mensagem_id: p.id, acao: 'responder', texto: 'Outra versão' })
    expect(await db.query(`SELECT 1 FROM fila`)).toHaveLength(1)
  })
})
