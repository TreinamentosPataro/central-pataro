/**
 * Gera a chave de um agente pra ele falar com a Central.
 *   npm run agente:chave -- contratos
 * A chave aparece UMA vez, aqui no terminal. Guarde direto na configuração do agente
 * (variável de ambiente). Nunca em chat, e-mail ou git. Gerar de novo invalida a anterior.
 */
import { getBanco } from '../lib/db'
import { novaChave } from '../lib/agentes'

const id = process.argv[2]
if (!id) {
  console.error('Uso: npm run agente:chave -- <id do agente>  (cs, contratos, sdr, trafego, social, financeiro)')
  process.exit(1)
}
const db = await getBanco()
const chave = await novaChave(db, id, 'cli')
console.log(`\nChave do agente "${id}" (aparece só agora):\n\n  ${chave}\n`)
process.exit(0)
