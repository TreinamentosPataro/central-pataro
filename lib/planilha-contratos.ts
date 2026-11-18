/**
 * Registro na planilha Gestão Contratos Trilha (aba Contratos), passo 2 e 8 do fluxo (contratos.md).
 *
 * A linha do cliente costuma nascer antes do contrato (venda na Hotmart). Então o agente procura a linha pelo
 * CPF/CNPJ ou pelo nome e só completa célula em branco: o que alguém escreveu à mão nunca é trocado. Caixinha
 * "Contrato pronto" só vai de desmarcada pra marcada, nunca o contrário. Sem linha do cliente, cria uma no fim.
 * Nada daqui vai pra log ou auditoria além do número da linha e das colunas preenchidas.
 */
import type { Contratante, Conferencia, Pagamento } from './contratos'
import { lerReais } from './contratos'
import { chaveNome } from './normalizar'

/** Cabeçalho esperado (linha 1). Se alguém mudar a ordem das colunas, o agente não escreve nada. */
export const CABECALHO = [
  'Nº', 'Data da venda', 'Comprador (Hotmart)', 'Contratante no contrato', 'CPF/CNPJ do contratante', 'E-mail',
  'WhatsApp', 'Forma de pagamento', 'Valor total (R$)', 'Detalhe do pagamento', 'Transação Hotmart',
  'Dados a solicitar', 'Enviar mensagem', 'Enviar (2ª contratante)', 'Mensagem enviada', 'Dados recebidos',
  'Contrato pronto', 'Enviado no AppSing', 'Assinado', 'Observações',
]
const COL = Object.fromEntries(CABECALHO.map((n, i) => [n, i])) as Record<string, number>
const letra = (i: number) => String.fromCharCode(65 + i)

export type Valor = string | number | boolean

/** A planilha vista pelo agente. No servidor é o Google Sheets; nos testes, uma matriz em memória. */
export interface PlanilhaContratos {
  /** valores da aba como aparecem na tela, linha 1 = cabeçalho */
  ler(): Promise<string[][]>
  /** escreve célula a célula (ref no formato "Q5") */
  escrever(celulas: { ref: string; valor: Valor }[]): Promise<void>
}

export interface DadosContrato {
  contratantes: Contratante[]
  pagamento: Pagamento | null
  conferencia: Conferencia
  hoje?: string // dd/mm/aaaa, só pra nota da linha nova
}

export interface Registro {
  linha: number
  nova: boolean
  colunas: string[] // letras preenchidas agora
}

const digitos = (t: string | undefined) => (t ?? '').replace(/\D/g, '')
const vazio = (t: string | undefined) => !t || !t.trim()
const CAIXINHAS = ['Mensagem enviada', 'Dados recebidos', 'Contrato pronto', 'Enviado no AppSing', 'Assinado'].map((n) => COL[n])
/** Linha sem cliente: tudo em branco, ou só caixinhas desmarcadas (a planilha já vem com elas prontas embaixo). */
const linhaVazia = (l: string[]) => l.every((v, i) => vazio(v) || (CAIXINHAS.includes(i) && v.toUpperCase() === 'FALSE'))

/** O que o agente sabe escrever, coluna por coluna (só o que veio do contrato). */
function valoresDoContrato(d: DadosContrato): Record<string, Valor> {
  const [c1] = d.contratantes
  const p = d.pagamento
  const v: Record<string, Valor> = {}
  const nomes = d.contratantes.map((c) => c.nome).filter(Boolean)
  if (nomes.length) v['Contratante no contrato'] = nomes.join(' e ')
  if (c1?.documento) v['CPF/CNPJ do contratante'] = c1.documento.trim()
  if (c1?.email) v['E-mail'] = c1.email.trim()
  if (c1?.telefone) v['WhatsApp'] = c1.telefone.trim()
  if (p?.forma) v['Forma de pagamento'] = p.forma.replace(/[[\]]/g, '').trim()
  const total = p ? lerReais(p.valor) : null
  if (total) v['Valor total (R$)'] = total
  const detalhe = [p?.vencimentos, p?.observacoes].map((x) => x?.trim()).filter(Boolean).join(' · ')
  if (detalhe) v['Detalhe do pagamento'] = detalhe
  if (!d.conferencia.pronto && d.conferencia.falta.length) v['Dados a solicitar'] = d.conferencia.falta.join('; ')
  return v
}

/** Acha a linha do cliente: primeiro pelo CPF/CNPJ, depois pelo nome (contratante ou comprador da Hotmart). */
export function acharLinha(linhas: string[][], d: DadosContrato): number | null {
  const docs = d.contratantes.map((c) => digitos(c.documento)).filter((x) => x.length >= 11)
  const nomes = d.contratantes.map((c) => chaveNome(c.nome)).filter(Boolean)
  for (let i = 1; i < linhas.length; i++) {
    const doc = digitos(linhas[i][COL['CPF/CNPJ do contratante']])
    if (doc && docs.includes(doc)) return i + 1
  }
  for (let i = 1; i < linhas.length; i++) {
    const l = linhas[i]
    if ([l[COL['Contratante no contrato']], l[COL['Comprador (Hotmart)']]].some((n) => n && nomes.includes(chaveNome(n)))) return i + 1
  }
  return null
}

/** Calcula o que escrever. Não toca na planilha: devolve as células (ou null se não há o que fazer). */
export function planejarRegistro(linhas: string[][], d: DadosContrato): { registro: Registro; celulas: { ref: string; valor: Valor }[] } | null {
  const cab = (linhas[0] ?? []).map((x) => x?.trim())
  if (CABECALHO.some((n, i) => cab[i] !== n)) {
    throw new Error('O cabeçalho da aba Contratos mudou (colunas fora da ordem esperada). O agente não escreveu nada.')
  }
  const novos = valoresDoContrato(d)
  // sem nome e sem CPF não dá pra achar a linha depois: melhor não criar linha que vai se repetir
  if (!novos['Contratante no contrato'] && !novos['CPF/CNPJ do contratante']) return null

  const achada = acharLinha(linhas, d)
  if (achada) {
    const atual = linhas[achada - 1] ?? []
    const celulas: { ref: string; valor: Valor }[] = []
    for (const [nome, valor] of Object.entries(novos)) {
      if (vazio(atual[COL[nome]])) celulas.push({ ref: `${letra(COL[nome])}${achada}`, valor })
    }
    const pronto = COL['Contrato pronto']
    if (d.conferencia.pronto && atual[pronto]?.toUpperCase() !== 'TRUE') celulas.push({ ref: `${letra(pronto)}${achada}`, valor: true })
    if (!celulas.length) return null
    return { registro: { linha: achada, nova: false, colunas: celulas.map((c) => c.ref.replace(/\d+/g, '')) }, celulas }
  }

  let ultima = linhas.length
  while (ultima > 1 && linhaVazia(linhas[ultima - 1] ?? [])) ultima--
  const linha = ultima + 1
  const ultimoNumero = Math.max(0, ...linhas.slice(1).map((l) => Number(l[COL['Nº']]) || 0))
  const valores: Record<string, Valor> = {
    'Nº': ultimoNumero + 1,
    ...novos,
    'Mensagem enviada': false,
    'Dados recebidos': false,
    'Contrato pronto': d.conferencia.pronto,
    'Enviado no AppSing': false,
    'Assinado': false,
    'Observações': `Linha criada pelo agente de contratos${d.hoje ? ` em ${d.hoje}` : ''}, a partir do documento no Drive. Completar data da venda, comprador e transação Hotmart.`,
  }
  const celulas = Object.entries(valores).map(([nome, valor]) => ({ ref: `${letra(COL[nome])}${linha}`, valor }))
  return { registro: { linha, nova: true, colunas: celulas.map((c) => c.ref.replace(/\d+/g, '')) }, celulas }
}

export async function registrarNaPlanilha(p: PlanilhaContratos, d: DadosContrato): Promise<Registro | null> {
  const plano = planejarRegistro(await p.ler(), d)
  if (!plano) return null
  await p.escrever(plano.celulas)
  return plano.registro
}
