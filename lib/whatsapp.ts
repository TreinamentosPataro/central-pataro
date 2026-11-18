/**
 * WhatsApp do agente: Evolution API rodando na VPS, ao lado da Central (compose.yml), com um chip só do agente.
 * Nunca o número da empresa: a API não oficial pode banir o número.
 *
 * A Central só fala com o Evolution pela rede interna do Docker. O endereço e a chave vêm do .env
 * (WHATSAPP_URL, WHATSAPP_CHAVE, WHATSAPP_INSTANCIA). Pra onde a mensagem vai NUNCA vem daqui: vem da
 * tabela `destinos` (lib/destinos.ts).
 */

import crypto from 'node:crypto'

export type EstadoConexao = 'conectado' | 'conectando' | 'desconectado' | 'sem_servidor'

export interface GrupoWhatsapp {
  id: string       // JID do grupo, ex.: 120363000000000000@g.us
  nome: string
  membros: number | null
}

export interface ClienteWhatsapp {
  estado(): Promise<EstadoConexao>
  /** QR pra ler no celular do chip do agente (imagem em data URL). null = já conectado. */
  qr(): Promise<string | null>
  enviarTexto(para: string, texto: string): Promise<{ id: string | null }>
  grupos(): Promise<GrupoWhatsapp[]>
  desconectar(): Promise<void>
  /** Pede pro WhatsApp avisar a Central a cada mensagem que chega (agente SDR). */
  ligarAvisos?(url: string): Promise<void>
}

/**
 * Chave da porta de entrada (/api/whatsapp/entrada). Sai da WHATSAPP_CHAVE que já está no .env, então não precisa
 * de segredo novo; quem não tem a chave do WhatsApp não consegue fingir que é ele.
 */
export function chaveEntrada(chave = process.env.WHATSAPP_CHAVE ?? ''): string {
  return crypto.createHash('sha256').update(`${chave}:entrada-central`).digest('hex').slice(0, 40)
}

export function conferirChaveEntrada(recebida: string | null): boolean {
  if (!process.env.WHATSAPP_CHAVE || !recebida) return false
  const a = Buffer.from(chaveEntrada())
  const b = Buffer.from(recebida)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function whatsappConfigurado(): boolean {
  return Boolean(process.env.WHATSAPP_URL && process.env.WHATSAPP_CHAVE)
}

/** Cliente do Evolution API v2. Cria a instância na primeira vez que alguém pede o QR. */
export function clienteEvolution(
  url = process.env.WHATSAPP_URL ?? '',
  chave = process.env.WHATSAPP_CHAVE ?? '',
  instancia = process.env.WHATSAPP_INSTANCIA ?? 'agente',
): ClienteWhatsapp {
  const base = url.replace(/\/+$/, '')
  const nome = encodeURIComponent(instancia)

  async function chamar<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
    const r = await fetch(`${base}${caminho}`, {
      method: metodo,
      headers: { apikey: chave, 'content-type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    })
    const texto = await r.text()
    if (!r.ok) {
      const erro = new Error(`WhatsApp respondeu ${r.status} em ${caminho}: ${texto.slice(0, 300)}`) as Error & { status: number }
      erro.status = r.status
      throw erro
    }
    return (texto ? JSON.parse(texto) : null) as T
  }

  async function garantirInstancia(): Promise<void> {
    try {
      await chamar('GET', `/instance/connectionState/${nome}`)
    } catch (e) {
      if ((e as { status?: number }).status !== 404) throw e
      await chamar('POST', '/instance/create', { instanceName: instancia, integration: 'WHATSAPP-BAILEYS', qrcode: true })
    }
  }

  return {
    async estado() {
      if (!base || !chave) return 'sem_servidor'
      try {
        const r = await chamar<{ instance?: { state?: string } }>('GET', `/instance/connectionState/${nome}`)
        const s = r?.instance?.state
        return s === 'open' ? 'conectado' : s === 'connecting' ? 'conectando' : 'desconectado'
      } catch (e) {
        return (e as { status?: number }).status === 404 ? 'desconectado' : 'sem_servidor'
      }
    },

    async qr() {
      await garantirInstancia()
      const r = await chamar<{ base64?: string; instance?: { state?: string } }>('GET', `/instance/connect/${nome}`)
      if (r?.instance?.state === 'open') return null
      return r?.base64 ?? null
    },

    async enviarTexto(para, texto) {
      const r = await chamar<{ key?: { id?: string } }>('POST', `/message/sendText/${nome}`, { number: para, text: texto })
      return { id: r?.key?.id ?? null }
    },

    async grupos() {
      const r = await chamar<{ id: string; subject?: string; size?: number }[]>(
        'GET', `/group/fetchAllGroups/${nome}?getParticipants=false`,
      )
      return (r ?? [])
        .map((g) => ({ id: g.id, nome: g.subject?.trim() || g.id, membros: g.size ?? null }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    },

    async desconectar() {
      await chamar('DELETE', `/instance/logout/${nome}`)
    },

    async ligarAvisos(url) {
      await garantirInstancia()
      await chamar('POST', `/webhook/set/${nome}`, {
        webhook: { enabled: true, url, byEvents: false, base64: false, events: ['MESSAGES_UPSERT'] },
      })
    },
  }
}
