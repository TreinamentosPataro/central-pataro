/** Funções puras de limpeza de dado. Sem banco, fáceis de testar. */

// Caracteres que o Windows-1252 põe na faixa 0x80–0x9F (aparecem em "â€™", "â€œ"…)
const CP1252: Record<string, number> = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89,
  'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95,
  '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f,
}
const CONT = '[\\u0080-\\u00BF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]'
// um byte inicial de UTF-8 (Â–ô) seguido de 1 a 3 bytes de continuação, lidos como Latin-1/1252
const TRECHO = new RegExp(`[\\u00C2-\\u00F4]${CONT}{1,3}`, 'g')

function decodificarTrecho(trecho: string): string {
  const bytes = [...trecho].map((ch) => CP1252[ch] ?? ch.charCodeAt(0))
  const texto = Buffer.from(bytes).toString('utf8')
  return texto.includes('�') ? trecho : texto
}

/**
 * Conserta texto UTF-8 que foi lido como Latin-1 ("NÃ£o" → "Não").
 * Trabalha trecho a trecho, então texto misto ("Escritório SÃ£o JosÃ©") também funciona,
 * e só troca o trecho se ele virar UTF-8 válido.
 */
export function corrigirMojibake(texto: string): { valor: string; corrigiu: boolean } {
  if (!texto) return { valor: texto, corrigiu: false }
  let atual = texto
  for (let i = 0; i < 2; i++) {
    const proximo = atual.replace(TRECHO, decodificarTrecho)
    if (proximo === atual) break
    atual = proximo
  }
  return { valor: atual, corrigiu: atual !== texto }
}

/** Telefone no formato +55DDDNÚMERO. Devolve null se não der pra entender. */
export function normalizarTelefone(bruto: string | null | undefined): string | null {
  let d = (bruto ?? '').replace(/\D/g, '')
  if (!d) return null
  d = d.replace(/^0+/, '')
  if (d.length === 10 || d.length === 11) d = '55' + d
  if (d.length === 12 || d.length === 13) return '+' + d
  return null
}

export function normalizarEmail(bruto: string | null | undefined): string | null {
  const e = (bruto ?? '').trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null
}

/** Chave de comparação de nomes: sem acento, minúsculo, espaço único. */
export function chaveNome(nome: string | null | undefined): string {
  return (nome ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** 31/12/2026 ou 2026-12-31 → 2026-12-31. */
export function normalizarData(bruto: string | null | undefined): string | null {
  const s = (bruto ?? '').trim()
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m) {
    const ano = m[3].length === 2 ? '20' + m[3] : m[3]
    return `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

export function cpfValido(bruto: string | null | undefined): boolean {
  const c = (bruto ?? '').replace(/\D/g, '')
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false
  const dig = (n: number) => {
    let soma = 0
    for (let i = 0; i < n; i++) soma += Number(c[i]) * (n + 1 - i)
    const r = (soma * 10) % 11
    return r === 10 ? 0 : r
  }
  return dig(9) === Number(c[9]) && dig(10) === Number(c[10])
}

/** CSV simples com aspas (o que o Google Planilhas exporta). Detecta ; ou , */
export function lerCsv(texto: string): Record<string, string>[] {
  const t = texto.replace(/^﻿/, '')
  const primeira = t.split(/\r?\n/, 1)[0] ?? ''
  const sep = (primeira.match(/;/g)?.length ?? 0) > (primeira.match(/,/g)?.length ?? 0) ? ';' : ','
  const linhas: string[][] = []
  let campo = ''
  let linha: string[] = []
  let aspas = false
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    if (aspas) {
      if (ch === '"' && t[i + 1] === '"') { campo += '"'; i++ }
      else if (ch === '"') aspas = false
      else campo += ch
    } else if (ch === '"') aspas = true
    else if (ch === sep) { linha.push(campo); campo = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++
      linha.push(campo); campo = ''
      if (linha.some((c) => c.trim() !== '')) linhas.push(linha)
      linha = []
    } else campo += ch
  }
  linha.push(campo)
  if (linha.some((c) => c.trim() !== '')) linhas.push(linha)
  const [cab, ...resto] = linhas
  if (!cab) return []
  return resto.map((l) => Object.fromEntries(cab.map((h, i) => [h.trim(), (l[i] ?? '').trim()])))
}
