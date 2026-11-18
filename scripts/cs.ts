/**
 * Rodada do agente de CS nos grupos de alunos, modo semiautomático (o Claude escreve; uma pessoa aprova na fila).
 *
 *   npx tsx --env-file=.env.producao scripts/cs.ts pendentes        → .tmp/cs-pendentes.json
 *   npx tsx --env-file=.env.producao scripts/cs.ts propor <arquivo> → cada resposta vira item na fila
 *   npm run cs -- simular "<grupo:chave>" "<nome>" "<mensagem>"      → só no banco do PC (teste)
 *
 * Aulas: catálogo da Pataro I.A (fred-ia/conteudo/aulas.json + fontes.csv, no repositório normanOS). Pra cada
 * pergunta vão as 5 aulas mais parecidas; o agente só indica aula dessa lista. Outro caminho: CS_AULAS_DIR.
 * O arquivo de pendentes tem mensagem de aluno: fica em .tmp/ (fora do git). Ver .claude/skills/cs/SKILL.md.
 */
import fs from 'node:fs'
import path from 'node:path'
import { getBanco } from '../lib/db'
import { buscarNoCerebro } from '../lib/cerebro'
import { perguntasSemResposta, proporRespostaGrupo, registrarMensagemGrupo, type AcaoCs } from '../lib/cs-grupos'
import { FORMATO_RESPOSTA_CS, INSTRUCOES_CS } from '../lib/cs-instrucoes'
import { chaveNome } from '../lib/normalizar'

interface Aula { curso: string; modulo: string; aula: string; resumo: string; temas: string[]; link: string | null; forte: Set<string>; fraca: Set<string> }

const PARADAS = new Set('a o e de da do das dos em no na nos nas um uma para pra por com que se como qual quais tem ter ser sobre mais meu minha eu voce alguem sabe isso esse essa aula'.split(' '))
const palavras = (t: string) => new Set(chaveNome(t).split(' ').filter((p) => p.length > 2 && !PARADAS.has(p)))

function carregarAulas(): Aula[] {
  const dir = process.env.CS_AULAS_DIR ?? path.join('..', 'fred-ia', 'conteudo')
  const arq = path.join(dir, 'aulas.json')
  if (!fs.existsSync(arq)) {
    console.log(`Aviso: catálogo de aulas não encontrado em ${arq}. O agente responde só com o Cérebro.`)
    return []
  }
  const links = new Map<string, string>()
  const csv = path.join(dir, 'fontes.csv')
  if (fs.existsSync(csv)) {
    for (const linha of fs.readFileSync(csv, 'utf8').split(/\r?\n/).slice(1)) {
      const [arquivo, , url] = linha.split(';')
      if (arquivo && url?.startsWith('http')) links.set(arquivo, url.trim())
    }
  }
  const bruto = JSON.parse(fs.readFileSync(arq, 'utf8')) as { fonte: string; curso: string; modulo: string; aula: string; resumo: string; temas: string[] }[]
  return bruto.map((a) => ({
    curso: a.curso, modulo: a.modulo, aula: a.aula, resumo: (a.resumo ?? '').slice(0, 280), temas: a.temas ?? [],
    link: links.get(a.fonte) ?? null,
    forte: palavras(`${a.aula} ${(a.temas ?? []).join(' ')}`),   // título e temas
    fraca: palavras(a.resumo ?? ''),
  }))
}

/** Palavra rara no catálogo pesa mais (equipe, cliente aparecem em quase tudo); título e temas valem 3x o resumo. */
function aulasParecidas(aulas: Aula[], texto: string, n = 5) {
  const q = palavras(texto)
  const peso = (p: string) => Math.log((aulas.length + 1) / (1 + aulas.filter((a) => a.forte.has(p) || a.fraca.has(p)).length))
  return aulas
    .map((a) => ({ a, nota: [...q].reduce((t, p) => t + (a.forte.has(p) ? 3 : a.fraca.has(p) ? 1 : 0) * peso(p), 0) }))
    .filter((x) => x.nota > 0.5)
    .sort((x, y) => y.nota - x.nota)
    .slice(0, n)
    .map(({ a }) => ({ curso: a.curso, modulo: a.modulo, aula: a.aula, resumo: a.resumo, temas: a.temas.slice(0, 8), link: a.link }))
}

const [comando, ...resto] = process.argv.slice(2)
const db = await getBanco()

if (comando === 'pendentes') {
  const [agente] = await db.query<{ parado: boolean }>(`SELECT parado FROM agentes WHERE id = 'cs'`)
  if (agente?.parado) {
    console.log('Agente de CS parado pelo botão. Nada a fazer.')
    process.exit(0)
  }
  const perguntas = await perguntasSemResposta(db)
  const aulas = carregarAulas()
  const verbetes = new Map<string, { titulo: string; conteudo: string }>()
  for (const p of perguntas) {
    for (const v of await buscarNoCerebro(db, p.texto, 4)) if (v.conteudo?.trim()) verbetes.set(v.id, { titulo: v.titulo, conteudo: v.conteudo })
  }
  const saida = {
    instrucoes: INSTRUCOES_CS,
    formato: FORMATO_RESPOSTA_CS,
    cerebro: [...verbetes.values()],
    perguntas: perguntas.map((p) => ({ ...p, aulas_sugeridas: aulasParecidas(aulas, p.texto) })),
  }
  fs.mkdirSync('.tmp', { recursive: true })
  const arquivo = path.join('.tmp', 'cs-pendentes.json')
  fs.writeFileSync(arquivo, JSON.stringify(saida, null, 2))
  console.log(`${perguntas.length} ${perguntas.length === 1 ? 'pergunta' : 'perguntas'} pra olhar · ${aulas.length} aulas no catálogo → ${arquivo}`)
} else if (comando === 'propor') {
  const arquivo = resto[0]
  if (!arquivo) throw new Error('Diga o arquivo com as ações: scripts/cs.ts propor .tmp/cs-acoes.json')
  const acoes = JSON.parse(fs.readFileSync(arquivo, 'utf8')) as AcaoCs[]
  let fila = 0
  let ignoradas = 0
  for (const a of acoes) {
    try {
      const r = await proporRespostaGrupo(db, a)
      if (r.item) fila++
      else if (a.acao === 'ignorar') ignoradas++
    } catch (e) {
      console.log(`✗ ${a.acao} ${a.mensagem_id.slice(0, 8)}: ${(e as Error).message}`)
    }
  }
  console.log(`${fila} respostas na fila · ${ignoradas} ignoradas. Aprovação em /fila.`)
} else if (comando === 'simular') {
  if (process.env.DATABASE_URL) throw new Error('simular só roda no banco do PC (sem DATABASE_URL), nunca no Neon.')
  const [grupo, nome, texto, minutosAtras = '60'] = resto
  if (!grupo || !nome || !texto) throw new Error('Uso: npm run cs -- simular "grupo:chave" "<nome>" "<mensagem>" [minutos atrás]')
  const jid = `1203630000${String(Math.abs([...grupo].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))).padStart(8, '0').slice(0, 8)}@g.us`
  await db.query(
    `INSERT INTO destinos (id, nome, endereco, ler) VALUES ($1, $2, $3, true)
     ON CONFLICT (id) DO UPDATE SET endereco = COALESCE(destinos.endereco, EXCLUDED.endereco), ler = true`,
    [grupo, `Grupo de teste ${grupo}`, jid],
  )
  const [d] = await db.query<{ endereco: string }>(`SELECT endereco FROM destinos WHERE id = $1`, [grupo])
  const r = await registrarMensagemGrupo(db, {
    grupoJid: d.endereco, autorJid: '5531900000000@s.whatsapp.net', autorNome: nome, texto, waId: `sim-${Date.now()}`,
    respondeA: null, deNos: false, quando: new Date(Date.now() - Number(minutosAtras) * 60_000),
  })
  console.log(r.guardada ? `Mensagem de "${nome}" guardada em ${grupo}.` : 'Grupo não liberado pra leitura.')
} else {
  console.log('Comandos: pendentes | propor <arquivo> | simular "grupo:chave" "<nome>" "<mensagem>" [minutos atrás]')
}
process.exit(0)
