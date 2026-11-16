import { NextResponse } from 'next/server'
import { getBanco } from '@/lib/db'
import { agentePelaChave } from '@/lib/agentes'
import { auditar } from '@/lib/auditoria'
import { buscarNoCerebro, situacao } from '@/lib/cerebro'

/**
 * GET /api/agente/cerebro?q=reembolso   Authorization: Bearer <chave do agente>
 * "Buscar no Cérebro": o agente pergunta e recebe os verbetes que respondem, com dono e situação.
 * Verbete "a preencher" ou "revisar" é sinal pro agente não responder sozinho: manda pra uma pessoa.
 */
export async function GET(req: Request) {
  const db = await getBanco()
  const agente = await agentePelaChave(db, req.headers.get('authorization'))
  if (!agente) return NextResponse.json({ erro: 'chave inválida' }, { status: 401 })
  const q = new URL(req.url).searchParams.get('q') ?? ''
  if (!q.trim()) return NextResponse.json({ erro: 'falta a pergunta (?q=)' }, { status: 400 })

  const achados = await buscarNoCerebro(db, q)
  await auditar(db, {
    quem: `agente:${agente.id}`,
    acao: 'cerebro.buscar',
    evidencia: q.slice(0, 200),
    depois: { achados: achados.map((a) => a.id) },
  })
  return NextResponse.json({
    pergunta: q,
    achados: achados.map((a) => ({
      id: a.id, tema: a.tema, titulo: a.titulo, conteudo: a.conteudo, dono: a.dono,
      situacao: situacao({ conteudo: a.conteudo, revisar_em: a.revisar_em }),
    })),
  })
}
