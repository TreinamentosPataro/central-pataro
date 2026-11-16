import { NextResponse } from 'next/server'
import { getBanco } from '@/lib/db'
import { agentePelaChave } from '@/lib/agentes'
import { marcarExecutado } from '@/lib/fila'

/**
 * POST /api/agente/executado   Authorization: Bearer <chave do agente>
 * { "id": "<item da fila>", "ok": true, "resultado": "enviado ao ZapSign, doc 123" }
 * Pode repetir sem medo: o segundo aviso não muda nada.
 */
export async function POST(req: Request) {
  const db = await getBanco()
  const agente = await agentePelaChave(db, req.headers.get('authorization'))
  if (!agente) return NextResponse.json({ erro: 'chave inválida' }, { status: 401 })
  const corpo = await req.json().catch(() => null)
  if (!corpo || typeof corpo.id !== 'string') return NextResponse.json({ erro: 'falta "id"' }, { status: 400 })
  try {
    const item = await marcarExecutado(db, agente.id, corpo.id, corpo.ok !== false, String(corpo.resultado ?? ''))
    return NextResponse.json({ ok: true, estado: item.estado })
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 409 })
  }
}
