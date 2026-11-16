import crypto from 'node:crypto'

/**
 * Cifra os dados da área restrita (CPF, RG, endereço) com AES-256-GCM.
 * A chave vem de COFRE_CHAVE e nunca entra no banco, no git nem em log.
 */
function chave(): Buffer {
  const k = process.env.COFRE_CHAVE
  if (!k || k.length < 32) throw new Error('COFRE_CHAVE ausente ou curta (ver .env.example)')
  return crypto.createHash('sha256').update(k).digest()
}

export function cifrar(texto: string | null | undefined): string | null {
  if (!texto) return null
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', chave(), iv)
  const dados = Buffer.concat([c.update(texto, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), dados].map((b) => b.toString('base64url')).join('.')
}

export function decifrar(guardado: string | null | undefined): string | null {
  if (!guardado) return null
  const [iv, tag, dados] = guardado.split('.').map((p) => Buffer.from(p, 'base64url'))
  const d = crypto.createDecipheriv('aes-256-gcm', chave(), iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(dados), d.final()]).toString('utf8')
}

/** Impressão do CPF pra achar duplicidade sem decifrar. */
export function hashCpf(cpf: string | null | undefined): string | null {
  const so = (cpf ?? '').replace(/\D/g, '')
  if (!so) return null
  return crypto.createHmac('sha256', chave()).update(so).digest('hex')
}

export function sha256(texto: string): string {
  return crypto.createHash('sha256').update(texto).digest('hex')
}
