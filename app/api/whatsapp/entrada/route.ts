import { NextResponse } from 'next/server'
import { getBanco } from '@/lib/db'
import { conferirChaveEntrada } from '@/lib/whatsapp'
import { lerEntradaEvolution, registrarEntrada } from '@/lib/sdr'

/**
 * POST /api/whatsapp/entrada?chave=…   (quem chama é o WhatsApp do agente, pela rede interna do servidor)
 * Mensagem privada que chegou no chip do agente vira conversa de lead (agente SDR). Grupo, status e mensagem nossa
 * são ignorados. Responde 200 mesmo quando ignora, pro WhatsApp não ficar reenviando.
 */
export async function POST(req: Request) {
  if (!conferirChaveEntrada(new URL(req.url).searchParams.get('chave'))) {
    return NextResponse.json({ erro: 'chave inválida' }, { status: 401 })
  }
  const corpo = await req.json().catch(() => null)
  const entrada = lerEntradaEvolution(corpo)
  if (!entrada) return NextResponse.json({ ok: true, ignorada: true })
  const db = await getBanco()
  const r = await registrarEntrada(db, entrada)
  return NextResponse.json({ ok: true, nova: r.nova })
}
