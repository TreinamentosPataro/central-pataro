/**
 * Quem manda pelo WhatsApp o que uma pessoa aprovou na fila. Só sai:
 *  - item aprovado ou ajustado (usa texto_final, o que a pessoa aprovou);
 *  - de agente que não está parado pelo botão;
 *  - pra destino da tabela `destinos` com endereço e envio ligado, ou pro lead do SDR (`lead:<id>`), no número de onde
 *    a mensagem dele chegou (tabela `leads`), se ninguém mandou parar de falar com ele.
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

  const itens = await db.query<ItemFila & { endereco: string | null; enviar: boolean; lead_id: string | null }>(
    `SELECT f.*, COALESCE(d.endereco, l.jid) AS endereco, COALESCE(d.enviar, NOT l.bloqueado) AS enviar, l.id AS lead_id
     FROM fila f
     JOIN agentes a ON a.id = f.agente_id
     LEFT JOIN destinos d ON d.id = f.destino AND d.canal = 'whatsapp'
     LEFT JOIN leads l ON f.destino = 'lead:' || l.id::text
     WHERE f.estado IN ('aprovado', 'ajustado') AND f.resultado IS NULL AND NOT a.parado
       AND (d.id IS NOT NULL OR l.id IS NOT NULL)
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
      if (item.lead_id) {
        // a conversa do lead guarda o que saiu de verdade (texto aprovado)
        await db.query(
          `INSERT INTO lead_mensagens (lead_id, de, texto, wa_id, fila_id) VALUES ($1, 'agente', $2, $3, $4) ON CONFLICT (wa_id) DO NOTHING`,
          [item.lead_id, item.texto_final, id, item.id],
        )
        await db.query(`UPDATE leads SET ultima_nossa = now() WHERE id = $1`, [item.lead_id])
      }
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
