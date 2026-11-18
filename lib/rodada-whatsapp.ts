/**
 * Envio pelo WhatsApp a cada minuto (ligado pelo instrumentation.ts quando a Central sobe): o que foi aprovado
 * enquanto o chip estava desconectado, ou antes de o grupo ser ligado, sai assim que der.
 */
import { getBanco } from './db'
import { enviarAprovados } from './enviador'
import { chaveEntrada, clienteEvolution, whatsappConfigurado } from './whatsapp'

/** Endereço que o WhatsApp chama a cada mensagem nova: a Central pela rede interna do Docker. */
export const URL_ENTRADA = process.env.WHATSAPP_ENTRADA_URL ?? 'http://painel:3300/api/whatsapp/entrada'

export function ligarRodadaWhatsapp(intervaloMs = 60_000): void {
  if (!whatsappConfigurado()) return
  let rodando = false
  let avisosLigados = false
  setInterval(async () => {
    if (rodando) return
    rodando = true
    try {
      // liga os avisos de mensagem nova (SDR) assim que o chip estiver conectado; tenta de novo a cada minuto até dar
      if (!avisosLigados) {
        const wa = clienteEvolution()
        if ((await wa.estado()) === 'conectado') {
          await wa.ligarAvisos?.(`${URL_ENTRADA}?chave=${chaveEntrada()}`)
          avisosLigados = true
          console.log('[whatsapp] avisos de mensagem nova ligados')
        }
      }
      const r = await enviarAprovados(await getBanco(), clienteEvolution())
      if (r.enviados || r.falharam) console.log(`[whatsapp] ${r.enviados} enviados, ${r.falharam} falharam`)
    } catch (e) {
      console.error('[whatsapp] rodada falhou:', e instanceof Error ? e.message : e)
    } finally {
      rodando = false
    }
  }, intervaloMs)
}
