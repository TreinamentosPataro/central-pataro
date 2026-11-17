/**
 * Quem manda pelo WhatsApp o que uma pessoa aprovou na fila. Só sai:
 *  - item aprovado ou ajustado (usa texto_final, o que a pessoa aprovou);
 *  - de agente que não está parado pelo botão;
 *  - pra destino da tabela `destinos` com endereço e envio ligado.
 * Destino ainda sem grupo ligado: o item espera (não falha). WhatsApp fora do ar: ninguém é tocado.
 *
 * Antes de enviar, o item é "reservado" (resultado = 'enviando'): se a Central cair no meio, ele não é mandado
 * de novo sozinho. Mensagem repetida no grupo do aluno é pior que uma que precisou de reenvio manual.
 */
import type { Banco } from './db'
import { marcarExecutado, type ItemFila } from './fila'
import { registrarExecucao } from './agentes'
import type { ClienteWhatsapp } from './whatsapp'

export const RESERVADO = 'enviando'

export interface ResultadoEnvio {
  enviados: number
  falharam: number
  esperandoDestino: number
  semConexao: boolean
}

export async function enviarAprovados(db: Banco, wa: ClienteWhatsapp): Promise<ResultadoEnvio> {
  const r: ResultadoEnvio = { enviados: 0, falharam: 0, esperandoDestino: 0, semConexao: false }

  const itens = await db.query<ItemFila & { endereco: string | null; enviar: boolean }>(
    `SELECT f.*, d.endereco, d.enviar FROM fila f
     JOIN agentes a ON a.id = f.agente_id
     JOIN destinos d ON d.id = f.destino AND d.canal = 'whatsapp'
     WHERE f.estado IN ('aprovado', 'ajustado') AND f.resultado IS NULL AND NOT a.parado
     ORDER BY f.decidido_em`,
  )
  if (!itens.length) return r

  const prontos = itens.filter((i) => i.endereco && i.enviar && i.texto_final?.trim())
  r.esperandoDestino = itens.length - prontos.length
  if (!prontos.length) return r

  if ((await wa.estado()) !== 'conectado') {
    r.semConexao = true
    return r
  }

  for (const item of prontos) {
    const [reservado] = await db.query<{ id: string }>(
      `UPDATE fila SET resultado = $2 WHERE id = $1 AND estado IN ('aprovado', 'ajustado') AND resultado IS NULL RETURNING id`,
      [item.id, RESERVADO],
    )
    if (!reservado) continue // outro processo pegou
    try {
      const { id } = await wa.enviarTexto(item.endereco!, item.texto_final!)
      await marcarExecutado(db, item.agente_id, item.id, true, `enviado no WhatsApp${id ? ` (${id})` : ''}`)
      r.enviados++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      await marcarExecutado(db, item.agente_id, item.id, false, `WhatsApp não enviou: ${msg.slice(0, 200)}`)
      await registrarExecucao(db, item.agente_id, 'erro', `Envio pelo WhatsApp falhou (fila:${item.id})`)
      r.falharam++
    }
  }
  return r
}
