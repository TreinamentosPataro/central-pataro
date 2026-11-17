/**
 * Acesso do robô da Central ao Google (conta de serviço do projeto CentralPataro), sem biblioteca.
 * Ele só enxerga o que alguém compartilhou com o e-mail dele: a pasta Contratos Trilha (leitor) e a
 * planilha Gestão Contratos Trilha (editor).
 *
 * .env: GOOGLE_SERVICO_JSON = caminho do arquivo da chave (fora do git) ou o próprio JSON.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'

interface Chave {
  client_email: string
  private_key: string
}

function chave(): Chave {
  const bruto = process.env.GOOGLE_SERVICO_JSON
  if (!bruto) throw new Error('GOOGLE_SERVICO_JSON ausente: falta a chave do robô (conta de serviço) no .env.')
  const texto = bruto.trim().startsWith('{') ? bruto : fs.readFileSync(bruto, 'utf8')
  const k = JSON.parse(texto) as Chave
  if (!k.client_email || !k.private_key) throw new Error('A chave do robô não tem client_email ou private_key.')
  return k
}

const b64 = (o: object | Buffer) => (Buffer.isBuffer(o) ? o : Buffer.from(JSON.stringify(o))).toString('base64url')

let cache: { token: string; expira: number; escopos: string } | null = null

/** Token de acesso (vale 1 hora; reaproveitado até faltar 1 minuto). */
export async function tokenGoogle(escopos: string[]): Promise<string> {
  const esc = escopos.join(' ')
  if (cache && cache.escopos === esc && cache.expira > Date.now() + 60_000) return cache.token
  const k = chave()
  const agora = Math.floor(Date.now() / 1000)
  const corpo = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: k.client_email, scope: esc, aud: 'https://oauth2.googleapis.com/token', iat: agora, exp: agora + 3600 })}`
  const assinatura = crypto.createSign('RSA-SHA256').update(corpo).sign(k.private_key)
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${corpo}.${b64(assinatura)}` }),
  })
  if (!r.ok) throw new Error(`O Google recusou a chave do robô (${r.status}).`)
  const j = (await r.json()) as { access_token: string; expires_in: number }
  cache = { token: j.access_token, expira: Date.now() + j.expires_in * 1000, escopos: esc }
  return j.access_token
}

const LEITURA_DRIVE = ['https://www.googleapis.com/auth/drive.readonly']

export interface ArquivoDrive {
  id: string
  name: string
  createdTime: string
  modifiedTime: string
  webViewLink: string
}

/** Documentos do Google Docs dentro de uma pasta (só o primeiro nível). */
export async function listarDocsDaPasta(pastaId: string): Promise<ArquivoDrive[]> {
  const token = await tokenGoogle(LEITURA_DRIVE)
  const arquivos: ArquivoDrive[] = []
  let pagina: string | undefined
  do {
    const q = new URLSearchParams({
      q: `'${pastaId}' in parents and mimeType = 'application/vnd.google-apps.document' and trashed = false`,
      fields: 'nextPageToken, files(id, name, createdTime, modifiedTime, webViewLink)',
      pageSize: '100',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
      ...(pagina ? { pageToken: pagina } : {}),
    })
    const r = await fetch(`https://www.googleapis.com/drive/v3/files?${q}`, { headers: { authorization: `Bearer ${token}` } })
    if (!r.ok) throw new Error(`Não deu pra listar a pasta do Drive (${r.status}). Ela foi compartilhada com o robô?`)
    const j = (await r.json()) as { files: ArquivoDrive[]; nextPageToken?: string }
    arquivos.push(...j.files)
    pagina = j.nextPageToken
  } while (pagina)
  return arquivos
}

/** O documento em HTML (é o formato que mostra as tabelas e a marcação amarela). */
export async function exportarHtml(arquivoId: string): Promise<string> {
  const token = await tokenGoogle(LEITURA_DRIVE)
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${arquivoId}/export?mimeType=text/html`, {
    headers: { authorization: `Bearer ${token}` },
  })
  if (!r.ok) throw new Error(`Não deu pra ler o documento ${arquivoId} (${r.status}).`)
  return r.text()
}
