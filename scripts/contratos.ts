/**
 * Rodada do agente de contratos na mão (no servidor ela já roda sozinha a cada 10 minutos):
 *   npm run agente:contratos
 *
 * .env: GOOGLE_SERVICO_JSON (chave do robô) e CONTRATOS_PASTA_ID (id da pasta Contratos Trilha).
 */
import { getBanco } from '../lib/db'
import { conferirPasta, fonteDrive } from '../lib/rodada-contratos'

const r = await conferirPasta(await getBanco(), fonteDrive())
if (r.parado) console.log('Agente de contratos parado pelo botão. Nada a fazer.')
else console.log(`${r.vistos} contratos na pasta · ${r.novos} conferidos agora · ${r.prontos} prontos · ${r.travados} travados`)
