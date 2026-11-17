/**
 * Manda pelo WhatsApp do agente o que já foi aprovado na fila (a Central também faz isso sozinha a cada minuto
 * e logo depois de cada aprovação; este comando é pra rodar na mão).
 *   npm run whatsapp:enviar
 *
 * .env: WHATSAPP_URL, WHATSAPP_CHAVE (e WHATSAPP_INSTANCIA, padrão "agente").
 */
import { getBanco } from '../lib/db'
import { enviarAprovados } from '../lib/enviador'
import { clienteEvolution, whatsappConfigurado } from '../lib/whatsapp'

if (!whatsappConfigurado()) throw new Error('WHATSAPP_URL ou WHATSAPP_CHAVE ausente no .env.')
const db = await getBanco()
const r = await enviarAprovados(db, clienteEvolution())
if (r.semConexao) console.log('WhatsApp do agente desconectado: leia o QR em /integracoes/whatsapp. Nada foi enviado.')
console.log(`${r.enviados} enviados · ${r.falharam} falharam · ${r.esperandoDestino} esperando o grupo ser ligado`)
process.exit(0)
