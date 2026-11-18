import { NextResponse } from 'next/server'
import { getBanco } from '@/lib/db'
import { conferirChaveEntrada } from '@/lib/whatsapp'
import { lerEntradaEvolution, registrarEntrada } from '@/lib/sdr'
import { lerMensagemGrupo, registrarMensagemGrupo } from '@/lib/cs-grupos'

/**
 * POST /api/whatsapp/entrada?chave=…   (quem chama é o WhatsApp do agente, pela rede interna do servidor)
 * - mensagem privada no chip do agente → conversa de lead (agente SDR)
 * - mensagem de grupo LIBERADO pra leitura → acompanhamento do agente de CS (grupo fora da lista: descartada)
 * Status e o resto são ignorados. Responde 200 mesmo quando ignora, pro WhatsApp não ficar reenviando.
 */
export async function POST(req: Request) {
  if (!conferirChaveEntrada(new URL(req.url).searchParams.get('chave'))) {
    return NextResponse.json({ erro: 'chave inválida' }, { status: 401 })
  }
  const corpo = await req.json().catch(() => null)
  const lead = lerEntradaEvolution(corpo)
  if (lead) {
    const r = await registrarEntrada(await getBanco(), lead)
    return NextResponse.json({ ok: true, nova: r.nova })
  }
  const grupo = lerMensagemGrupo(corpo)
  if (grupo) {
    const r = await registrarMensagemGrupo(await getBanco(), grupo)
    return NextResponse.json({ ok: true, guardada: r.guardada })
  }
  return NextResponse.json({ ok: true, ignorada: true })
}
