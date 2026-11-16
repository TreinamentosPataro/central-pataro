import { NextResponse } from 'next/server'
import { getBanco } from '@/lib/db'
import { agentePelaChave } from '@/lib/agentes'
import { aprovadosParaExecutar } from '@/lib/fila'

/**
 * GET /api/agente/aprovados   Authorization: Bearer <chave do agente>
 * O que já foi aprovado e o agente pode executar. Agente parado pelo botão recebe lista vazia.
 * Use sempre "texto_final" (é o que a pessoa aprovou, com ou sem ajuste).
 */
export async function GET(req: Request) {
  const db = await getBanco()
  const agente = await agentePelaChave(db, req.headers.get('authorization'))
  if (!agente) return NextResponse.json({ erro: 'chave inválida' }, { status: 401 })
  const itens = await aprovadosParaExecutar(db, agente.id)
  return NextResponse.json({
    parado: agente.parado,
    itens: itens.map((i) => ({
      id: i.id, tipo: i.tipo, titulo: i.titulo, texto_final: i.texto_final,
      destino: i.destino, escritorio_id: i.escritorio_id,
    })),
  })
}
