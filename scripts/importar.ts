/**
 * US-01 — importa uma aba da planilha de alunos (exportada como CSV).
 *   npm run importar -- importacoes/alunos-aba1.csv
 * Guarde os CSVs em importacoes/ (fora do git). Pode rodar de novo: não duplica.
 * No banco local, pare o `npm run dev` antes (o PGlite só aceita um processo por vez).
 */
import fs from 'node:fs'
import path from 'node:path'
import { getBanco } from '../lib/db'
import { importarLinhas } from '../lib/importar'
import { lerCsv } from '../lib/normalizar'

const arquivo = process.argv[2]
if (!arquivo) {
  console.error('Uso: npm run importar -- caminho/da/aba.csv')
  process.exit(1)
}
const linhas = lerCsv(fs.readFileSync(arquivo, 'utf8'))
const db = await getBanco()
const r = await importarLinhas(db, linhas, path.basename(arquivo), 'importacao:cli')
console.log(`
${r.linhas} linhas lidas
${r.escritoriosNovos} escritórios novos · ${r.pessoasNovas} pessoas novas · ${r.pessoasMescladas} juntadas com registro que já existia
${r.correcoes} textos corrigidos (ex.: "NÃ£o" → "Não"), todos registrados na auditoria
${r.revisoes} itens pra revisar (aparecem em /alunos) · ${r.ignoradas} linhas sem nome ignoradas`)
process.exit(0)
