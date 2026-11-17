/**
 * Envio pelo WhatsApp a cada minuto (ligado pelo instrumentation.ts quando a Central sobe): o que foi aprovado
 * enquanto o chip estava desconectado, ou antes de o grupo ser ligado, sai assim que der.
 */
import { getBanco } from './db'
import { enviarAprovados } from './enviador'
import { clienteEvolution, whatsappConfigurado } from './whatsapp'

export function ligarRodadaWhatsapp(intervaloMs = 60_000): void {
  if (!whatsappConfigurado()) return
  let rodando = false
  setInterval(async () => {
    if (rodando) return
    rodando = true
    try {
      const r = await enviarAprovados(await getBanco(), clienteEvolution())
      if (r.enviados || r.falharam) console.log(`[whatsapp] ${r.enviados} enviados, ${r.falharam} falharam`)
    } catch (e) {
      console.error('[whatsapp] rodada falhou:', e instanceof Error ? e.message : e)
    } finally {
      rodando = false
    }
  }, intervaloMs)
}
