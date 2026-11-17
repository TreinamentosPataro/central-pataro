/**
 * Rodada do agente de contratos: lê a pasta Contratos Trilha no Drive, confere cada contrato e põe na fila.
 *   npm run agente:contratos
 *
 * .env: GOOGLE_SERVICO_JSON (chave do robô) e CONTRATOS_PASTA_ID (id da pasta Contratos Trilha).
 * A "Minuta do Contrato" e cópias de modelo ficam de fora. Só entra contrato criado a partir de CONTRATOS_DESDE
 * (padrão 17/11/2026): os de antes já foram pra assinatura à mão e não podem voltar pra fila.
 */
import { getBanco } from '../lib/db'
import { rodadaContratos } from '../lib/agente-contratos'
import { exportarHtml, listarDocsDaPasta } from '../lib/google-servico'

const pasta = process.env.CONTRATOS_PASTA_ID
if (!pasta) throw new Error('CONTRATOS_PASTA_ID ausente: falta o id da pasta Contratos Trilha no .env.')

const db = await getBanco()
const [agente] = await db.query<{ parado: boolean }>(`SELECT parado FROM agentes WHERE id = 'contratos'`)
if (agente?.parado) {
  console.log('Agente de contratos parado pelo botão. Nada a fazer.')
  process.exit(0)
}

const desde = process.env.CONTRATOS_DESDE ?? '2026-11-17'
const modelo = /minuta|modelo|c[oó]pia de/i
const docs = (await listarDocsDaPasta(pasta)).filter((d) => !modelo.test(d.name) && d.createdTime >= desde)
const arquivos = []
for (const d of docs) {
  arquivos.push({ id: d.id, nome: d.name, versao: d.modifiedTime, link: d.webViewLink, html: await exportarHtml(d.id) })
}
const r = await rodadaContratos(db, arquivos)
console.log(`${r.vistos} contratos na pasta · ${r.novos} conferidos agora · ${r.prontos} prontos · ${r.travados} travados`)
