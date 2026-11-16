import { NextResponse } from 'next/server'
import { getBanco } from '@/lib/db'
import { agentePelaChave, registrarExecucao } from '@/lib/agentes'
import { proporItem } from '@/lib/fila'

/**
 * Porta de entrada dos agentes. Todo agente (código, n8n, Claude) fala com a Central por aqui.
 *
 * POST /api/eventos   Authorization: Bearer <chave do agente>
 *   { "tipo": "rodou",    "resumo": "conferi 12 contratos, 2 novos" }
 *   { "tipo": "erro",     "resumo": "ZapSign respondeu 401" }
 *   { "tipo": "proposta", "titulo": "...", "evidencia": "...", "rascunho": "...",
 *     "tipo_item": "contrato_novo", "destino": "...", "escritorio_id": "...", "chave_idem": "..." }
 */
export async function POST(req: Request) {
  const db = await getBanco()
  const agente = await agentePelaChave(db, req.headers.get('authorization'))
  if (!agente) return NextResponse.json({ erro: 'chave inválida' }, { status: 401 })

  let corpo: Record<string, unknown>
  try {
    corpo = await req.json()
  } catch {
    return NextResponse.json({ erro: 'corpo não é JSON' }, { status: 400 })
  }
  const tipo = corpo.tipo
  const texto = (k: string) => (typeof corpo[k] === 'string' ? (corpo[k] as string) : null)

  if (tipo === 'rodou' || tipo === 'erro') {
    const resumo = texto('resumo')
    if (!resumo) return NextResponse.json({ erro: 'falta "resumo"' }, { status: 400 })
    await registrarExecucao(db, agente.id, tipo, resumo, corpo.dados)
    return NextResponse.json({ ok: true })
  }

  if (tipo === 'proposta') {
    const titulo = texto('titulo')
    if (!titulo) return NextResponse.json({ erro: 'falta "titulo"' }, { status: 400 })
    const r = await proporItem(db, {
      agente_id: agente.id,
      tipo: texto('tipo_item') ?? 'proposta',
      titulo,
      evidencia: texto('evidencia'),
      rascunho: texto('rascunho'),
      destino: texto('destino'),
      escritorio_id: texto('escritorio_id'),
      chave_idem: texto('chave_idem'),
    })
    await registrarExecucao(db, agente.id, 'rodou', `propôs: ${titulo}`)
    return NextResponse.json({ ok: true, ...r }, { status: r.novo ? 201 : 200 })
  }

  return NextResponse.json({ erro: 'tipo deve ser "rodou", "erro" ou "proposta"' }, { status: 400 })
}
