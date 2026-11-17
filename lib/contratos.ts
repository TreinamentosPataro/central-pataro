/**
 * Agente de contratos: lê o contrato que o Bruno preencheu (Google Docs exportado em HTML) e confere se dá pra
 * mandar pra assinatura. Fluxo em contratos.md; modelo em "Minuta do Contrato" (pasta Contratos Trilha).
 *
 * O que sai daqui NÃO leva dado de cliente: só o primeiro nome, o que falta e o que foi conferido.
 * CPF, endereço e valores ficam no Drive e no ZapSign.
 */
import { cpfValido, normalizarEmail } from './normalizar'

export interface DocContrato {
  /** tabelas → linhas → células (texto puro) */
  tabelas: string[][][]
  texto: string
  /** trechos com fundo amarelo (marcação que o Bruno esqueceu de tirar) */
  marcados: string[]
}

export interface Contratante {
  nome: string
  documento: string
  endereco: string
  bairro: string
  cidadeEstado: string
  cep: string
  estadoCivil: string
  rg: string
  email: string
  telefone: string
}

export interface Pagamento {
  valor: string
  forma: string
  parcelas: string
  vencimentos: string
  observacoes: string
}

export interface Conferencia {
  pronto: boolean
  /** o que impede de mandar pra assinatura (vai pro comercial) */
  falta: string[]
  /** o que vale olhar, mas não trava */
  avisos: string[]
  /** resumo sem dado sensível, pra fila e pro registro */
  resumo: {
    primeiroNome: string | null
    contratantes: number
    documento: 'CPF' | 'CNPJ' | null
    parcelas: number | null
    vigenciaMeses: number | null
  }
}

/** O quadro de pagamento que vem de exemplo na minuta. Se o contrato chegar igual, o Bruno esqueceu de trocar. */
export const EXEMPLO_MINUTA = { valor: 'R$ 35.000,00', vencimentos: 'Pago integral cartão no dia 08/09/2026' }

// ---------- leitura do HTML exportado pelo Google Docs ----------

/** Acentos que o Google Docs escreve por nome (&Ccedil;, &ecirc;, &ordm;…). */
const MARCAS: Record<string, string> = { acute: '́', grave: '̀', circ: '̂', tilde: '̃', uml: '̈', cedil: '̧' }
const SIMBOLOS: Record<string, string> = { ordm: 'º', ordf: 'ª', ndash: '–', mdash: '—', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', hellip: '…', deg: '°' }

function decodificar(t: string): string {
  return t
    .replace(/&([a-zA-Z])(acute|grave|circ|tilde|uml|cedil);/g, (_, l: string, m: string) => (l + MARCAS[m]).normalize('NFC'))
    .replace(/&(ordm|ordf|ndash|mdash|ldquo|rdquo|lsquo|rsquo|hellip|deg);/g, (_, n: string) => SIMBOLOS[n])
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
}

function textoDe(html: string): string {
  return decodificar(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()
}

/** Amarelos que o Google Docs usa no realce (o padrão e os tons claros). */
const AMARELO = /background-color:\s*#(ffff00|ffe599|fff2cc|ffd966|fce5cd|ffff99)/i

export function lerHtmlDoGoogle(html: string): DocContrato {
  // classes de estilo com fundo amarelo, definidas no <style> do export
  const classesAmarelas = new Set<string>()
  for (const m of html.matchAll(/\.([a-z0-9_-]+)\s*\{([^}]*)\}/gi)) if (AMARELO.test(m[2])) classesAmarelas.add(m[1])

  const marcados: string[] = []
  for (const m of html.matchAll(/<span([^>]*)>([\s\S]*?)<\/span>/gi)) {
    const attrs = m[1]
    const classes = (attrs.match(/class="([^"]*)"/i)?.[1] ?? '').split(/\s+/)
    const amarelo = AMARELO.test(attrs) || classes.some((c) => classesAmarelas.has(c))
    const t = textoDe(m[2])
    if (amarelo && t) marcados.push(t)
  }

  const tabelas: string[][][] = []
  for (const tb of html.matchAll(/<table[\s\S]*?<\/table>/gi)) {
    const linhas: string[][] = []
    for (const tr of tb[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
      linhas.push([...tr[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => textoDe(c[1])))
    }
    tabelas.push(linhas)
  }

  const corpo = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html
  return { tabelas, texto: textoDe(corpo), marcados }
}

// ---------- extração ----------

const sem = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()

/** Rótulos da tabela do contratante, na ordem da minuta. O valor vem na mesma célula, depois do rótulo. */
const ROTULOS: [keyof Contratante, string[]][] = [
  ['nome', ['NOME COMPLETO']],
  ['documento', ['CPF/CNPJ', 'CPF', 'CNPJ']],
  ['endereco', ['ENDERECO (RUA, AV., ESTRADA E Nº)', 'ENDERECO (RUA, AV., ESTRADA E N)', 'ENDERECO']],
  ['bairro', ['BAIRRO']],
  ['cidadeEstado', ['CIDADE/ESTADO', 'CIDADE / ESTADO']],
  ['cep', ['CEP']],
  ['estadoCivil', ['ESTADO CIVIL']],
  ['rg', ['Nº RG', 'N RG', 'RG']],
  ['email', ['E-MAIL', 'EMAIL']],
  ['telefone', ['Nº TELEFONE', 'N TELEFONE', 'TELEFONE']],
]

function rotuloDaCelula(celula: string): { campo: keyof Contratante; valor: string } | null {
  const linhas = celula.split('\n')
  const s = sem(linhas[0])
  for (const [campo, nomes] of ROTULOS) {
    for (const n of nomes) {
      const alvo = sem(n)
      if (s.startsWith(alvo)) {
        // valor: resto da 1ª linha (quando vem colado) + linhas de baixo
        const resto = linhas[0].trim().slice(n.length).replace(/^[\s:]+/, '')
        const valor = [resto, ...linhas.slice(1)].join(' ').replace(/\s+/g, ' ').trim()
        return { campo, valor }
      }
    }
  }
  return null
}

export function contratantesDo(doc: DocContrato): Contratante[] {
  const lista: Contratante[] = []
  for (const tabela of doc.tabelas) {
    for (const linha of tabela) {
      for (const celula of linha) {
        const r = rotuloDaCelula(celula)
        if (!r) continue
        if (r.campo === 'nome') {
          // a tabela da contratada usa "RAZÃO SOCIAL", então "NOME COMPLETO" é sempre de um contratante
          lista.push({ nome: '', documento: '', endereco: '', bairro: '', cidadeEstado: '', cep: '', estadoCivil: '', rg: '', email: '', telefone: '' })
        }
        const atual = lista[lista.length - 1]
        if (atual && !atual[r.campo]) atual[r.campo] = r.valor
      }
    }
  }
  return lista
}

export function pagamentoDo(doc: DocContrato): Pagamento | null {
  for (const tabela of doc.tabelas) {
    const mapa = new Map<string, string>()
    for (const linha of tabela) if (linha.length >= 2) mapa.set(sem(linha[0]).replace(/:$/, ''), linha.slice(1).join(' ').trim())
    if (mapa.has('VALOR') && mapa.has('FORMA DE PAGAMENTO')) {
      return {
        valor: mapa.get('VALOR') ?? '',
        forma: mapa.get('FORMA DE PAGAMENTO') ?? '',
        parcelas: mapa.get('QUANTIDADE DE PARCELAS') ?? '',
        vencimentos: mapa.get('VENCIMENTOS') ?? '',
        observacoes: mapa.get('OBSERVACOES') ?? '',
      }
    }
  }
  return null
}

// ---------- validações ----------

const digitos = (t: string) => t.replace(/\D/g, '')

export function cnpjValido(bruto: string): boolean {
  const c = digitos(bruto)
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false
  const dv = (base: string, pesos: number[]) => {
    const s = base.split('').reduce((acc, d, i) => acc + Number(d) * pesos[i], 0)
    const r = s % 11
    return r < 2 ? 0 : 11 - r
  }
  const d1 = dv(c.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = dv(c.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return c.endsWith(`${d1}${d2}`)
}

/** "R$ 35.000,00" → 35000 */
export function lerReais(t: string): number | null {
  const m = t.match(/(\d{1,3}(?:\.\d{3})+|\d+)(,\d{1,2})?/)
  if (!m) return null
  return Number(m[1].replace(/\./g, '') + (m[2] ? '.' + m[2].slice(1) : ''))
}

const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')

function vigencias(texto: string): { clausula: string; meses: number }[] {
  const achar = (rotulo: string, re: RegExp) => {
    const m = texto.match(re)
    return m ? [{ clausula: rotulo, meses: Number(m[1]) }] : []
  }
  return [
    ...achar('1.1', /acompanhamento por (\d+)\s*\(/i),
    ...achar('2.3', /durante o per[ií]odo de (\d+)\s*\(/i),
    ...achar('2.6', /ao longo de (\d+)\s*\(/i),
    ...achar('6.1', /vig[eê]ncia pelo prazo de (\d+)\s*\(/i),
  ]
}

export function conferirContrato(doc: DocContrato): Conferencia {
  const falta: string[] = []
  const avisos: string[] = []
  const contratantes = contratantesDo(doc)
  const pag = pagamentoDo(doc)

  if (contratantes.length === 0) falta.push('a tabela do contratante não foi encontrada')
  contratantes.forEach((c, i) => {
    const quem = contratantes.length > 1 ? ` do ${i + 1}º contratante` : ''
    if (!c.nome) falta.push(`nome completo${quem}`)
    const d = digitos(c.documento)
    if (!d) falta.push(`CPF ou CNPJ${quem}`)
    else if (d.length === 11 ? !cpfValido(d) : d.length === 14 ? !cnpjValido(d) : true) falta.push(`CPF ou CNPJ${quem} com número inválido`)
    if (!c.endereco) falta.push(`endereço${quem}`)
    if (!c.bairro) falta.push(`bairro${quem}`)
    if (!c.cidadeEstado) falta.push(`cidade e estado${quem}`)
    else if (!UFS.some((uf) => new RegExp(`\\b${uf}\\b`).test(sem(c.cidadeEstado)))) falta.push(`estado (UF) na cidade${quem}`)
    if (!c.cep) falta.push(`CEP${quem}`)
    else if (digitos(c.cep).length !== 8) falta.push(`CEP${quem} incompleto`)
    if (!c.email) falta.push(`e-mail${quem}`)
    else if (!normalizarEmail(c.email) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email.trim())) falta.push(`e-mail${quem} inválido`)
    const tel = digitos(c.telefone).replace(/^55(?=\d{10,11}$)/, '')
    if (!c.telefone) falta.push(`telefone${quem}`)
    else if (tel.length < 10 || tel.length > 11) falta.push(`telefone${quem} sem DDD ou incompleto`)
    if (d.length === 11 && (!c.estadoCivil || !c.rg)) avisos.push(`estado civil ou RG${quem} em branco`)
  })

  if (!pag) falta.push('o quadro de pagamento (cláusula 7) não foi encontrado')
  let parcelas: number | null = null
  if (pag) {
    const valor = lerReais(pag.valor)
    if (!valor) falta.push('valor do contrato')
    if (!pag.forma) falta.push('forma de pagamento')
    parcelas = Number(digitos(pag.parcelas)) || null
    if (!parcelas) falta.push('quantidade de parcelas')
    if (!pag.vencimentos) falta.push('vencimentos')
    const quadro = [pag.valor, pag.forma, pag.parcelas, pag.vencimentos, pag.observacoes].join(' ')
    if (/[[\]]/.test(quadro)) falta.push('o quadro de pagamento ainda tem opção entre colchetes da minuta (ex.: [Cartão de crédito])')
    if (lerReais(pag.valor) === lerReais(EXEMPLO_MINUTA.valor) && sem(pag.vencimentos).includes(sem(EXEMPLO_MINUTA.vencimentos).slice(0, 30))) {
      falta.push('o quadro de pagamento está igual ao exemplo da minuta (R$ 35.000, pago em 08/09/2026)')
    }
    // vencimentos com valores: a soma precisa fechar com o total
    const valores = [...`${pag.vencimentos} ${pag.observacoes}`.matchAll(/R\$\s*[\d.,]+/g)].map((m) => lerReais(m[0]) ?? 0)
    if (valor && valores.length >= 2) {
      const soma = valores.reduce((a, b) => a + b, 0)
      if (Math.abs(soma - valor) > 1) falta.push(`as parcelas descritas não fecham com o valor total (somam ${soma.toLocaleString('pt-BR')})`)
    }
  }

  const vig = vigencias(doc.texto)
  const meses = vig.find((v) => v.clausula === '6.1')?.meses ?? vig[0]?.meses ?? null
  if (!meses) avisos.push('não achei a vigência na cláusula 6.1')
  const diferentes = vig.filter((v) => v.meses !== meses)
  if (meses && diferentes.length) {
    falta.push(`a vigência não bate entre as cláusulas (6.1 diz ${meses} meses; ${diferentes.map((d) => `${d.clausula} diz ${d.meses}`).join(', ')})`)
  }
  if (meses && meses !== 12) avisos.push(`vigência de ${meses} meses (diferente do padrão de 12): confirmar que foi combinado`)

  if (doc.marcados.length) falta.push(`sobrou marcação amarela no documento (${doc.marcados.length} ${doc.marcados.length === 1 ? 'trecho' : 'trechos'})`)
  if (/_{4,}\s*de\s*_{4,}/.test(doc.texto)) avisos.push('a data do fim do contrato está em branco (___ de ___)')

  const nome = contratantes[0]?.nome?.split(/\s+/)[0] || null
  const d0 = digitos(contratantes[0]?.documento ?? '')
  return {
    pronto: falta.length === 0,
    falta,
    avisos,
    resumo: {
      primeiroNome: nome ? nome[0].toUpperCase() + nome.slice(1).toLowerCase() : null,
      contratantes: contratantes.length,
      documento: d0.length === 14 ? 'CNPJ' : d0.length === 11 ? 'CPF' : null,
      parcelas,
      vigenciaMeses: meses,
    },
  }
}

/** Mensagem pro grupo do comercial quando trava. Só primeiro nome e o que falta. */
export function avisoComercial(nomeArquivo: string, c: Conferencia): string {
  const quem = c.resumo.primeiroNome ? `de ${c.resumo.primeiroNome}` : `"${nomeArquivo}"`
  return [`Contrato ${quem} travado antes da assinatura. Falta:`, ...c.falta.map((f) => `• ${f}`), '', 'Assim que ajustar no Drive, eu confiro de novo.'].join('\n')
}
