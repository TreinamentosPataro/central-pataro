/**
 * Rodada do agente SDR no modo semiautomático (o Claude escreve; uma pessoa aprova na fila da Central).
 *
 *   npx tsx --env-file=.env.producao scripts/sdr.ts pendentes        → .tmp/sdr-pendentes.json
 *   npx tsx --env-file=.env.producao scripts/sdr.ts propor <arquivo> → cada ação vira item na fila
 *   npm run sdr -- simular "<nome>" "<mensagem>"                      → só no banco do PC: finge um lead (teste)
 *
 * O arquivo de pendentes tem nome e mensagem de lead: fica em .tmp/ (fora do git) e não vai pro chat inteiro.
 * Ver .claude/skills/sdr/SKILL.md.
 */
import fs from 'node:fs'
import path from 'node:path'
import { getBanco } from '../lib/db'
import { buscarNoCerebro } from '../lib/cerebro'
import { conversasPendentes, proporAcao, registrarEntrada, type AcaoSdr } from '../lib/sdr'
import { FORMATO_RESPOSTA_SDR, INSTRUCOES_SDR } from '../lib/sdr-instrucoes'

const [comando, ...resto] = process.argv.slice(2)
const db = await getBanco()

if (comando === 'pendentes') {
  const [agente] = await db.query<{ parado: boolean }>(`SELECT parado FROM agentes WHERE id = 'sdr'`)
  if (agente?.parado) {
    console.log('Agente SDR parado pelo botão. Nada a fazer.')
    process.exit(0)
  }
  const conversas = await conversasPendentes(db)
  // o que o agente precisa saber da Pataro, tirado do Cérebro (nunca de memória)
  const verbetes = new Map<string, { titulo: string; conteudo: string }>()
  for (const q of ['Trilha', 'Advocacia Previdenciária de Elite', 'catálogo', 'OAB', 'CMJ', 'Mentoria Ação', 'processo comercial']) {
    for (const v of await buscarNoCerebro(db, q)) if (v.conteudo?.trim()) verbetes.set(v.id, { titulo: v.titulo, conteudo: v.conteudo })
  }
  const saida = {
    instrucoes: INSTRUCOES_SDR,
    formato: FORMATO_RESPOSTA_SDR,
    cerebro: [...verbetes.values()],
    conversas: conversas.map((c) => ({
      lead_id: c.lead.id,
      motivo: c.motivo,
      nome: c.lead.nome,
      situacao: c.lead.situacao,
      etapa: c.lead.etapa,
      faixa: c.lead.faixa,
      pessoas: c.lead.pessoas,
      resumo: c.lead.resumo,
      retomadas: c.lead.retomadas,
      mensagens: c.mensagens.map((m) => ({ de: m.de, texto: m.texto, quando: m.quando })),
    })),
  }
  fs.mkdirSync('.tmp', { recursive: true })
  const arquivo = path.join('.tmp', 'sdr-pendentes.json')
  fs.writeFileSync(arquivo, JSON.stringify(saida, null, 2))
  const n = (m: string) => conversas.filter((c) => c.motivo === m).length
  console.log(`${conversas.length} conversas (${n('responder')} pra responder, ${n('retomar')} pra puxar de volta) → ${arquivo}`)
} else if (comando === 'propor') {
  const arquivo = resto[0]
  if (!arquivo) throw new Error('Diga o arquivo com as ações: scripts/sdr.ts propor .tmp/sdr-acoes.json')
  const acoes = JSON.parse(fs.readFileSync(arquivo, 'utf8')) as AcaoSdr[]
  let ok = 0
  for (const a of acoes) {
    try {
      const r = await proporAcao(db, a)
      ok++
      console.log(`✓ ${a.acao} (${r.itens.length} ${r.itens.length === 1 ? 'item' : 'itens'} na fila)`)
    } catch (e) {
      console.log(`✗ ${a.acao} lead ${a.lead_id.slice(0, 8)}: ${(e as Error).message}`)
    }
  }
  console.log(`${ok} de ${acoes.length} na fila. Aprovação em /fila.`)
} else if (comando === 'simular') {
  if (process.env.DATABASE_URL) throw new Error('simular só roda no banco do PC (sem DATABASE_URL), nunca no Neon.')
  const [nome, texto] = resto
  if (!nome || !texto) throw new Error('Uso: npm run sdr -- simular "<nome>" "<mensagem>"')
  const jid = `55319${String(Math.abs([...nome].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))).padStart(8, '0').slice(0, 8)}@s.whatsapp.net`
  const r = await registrarEntrada(db, { jid, nome, texto, waId: `sim-${Date.now()}`, quando: new Date() })
  console.log(`Mensagem de "${nome}" registrada (lead ${r.leadId.slice(0, 8)}).`)
} else {
  console.log('Comandos: pendentes | propor <arquivo> | simular "<nome>" "<mensagem>"')
}
process.exit(0)
