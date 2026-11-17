/**
 * Entrar com Google (OAuth 2.0, fluxo de código no servidor, sem biblioteca). Mesmo modelo do vitrine.
 * /auth/google → Google → /auth/google/volta. Só entra quem está em `usuarios` e ativo: conta Google fora da
 * lista volta pra tela de entrar.
 * .env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ENDERECO (ex.: https://central.patarotreinamentos.com.br).
 */
export const COOKIE_ESTADO = 'central_google'

export const googleConfigurado = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

export function endereco(): string {
  return (process.env.ENDERECO || 'http://localhost:3000').replace(/\/$/, '')
}

export const urlRetorno = () => `${endereco()}/auth/google/volta`

export interface DadosGoogle {
  aud?: string
  iss?: string
  exp?: number
  email?: string
  email_verified?: boolean
  name?: string
  sub?: string
}

/** Lê o id_token. Ele veio direto do Google por https com o nosso segredo, então dá pra ler sem conferir a
 *  assinatura (a documentação do Google permite); ainda assim conferimos pra quem foi emitido e a validade. */
export function lerIdToken(idToken: string): DadosGoogle {
  try {
    return JSON.parse(Buffer.from(String(idToken).split('.')[1], 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}

/** Devolve o e-mail (minúsculo) se o token é nosso, do Google, válido e com e-mail confirmado. */
export function emailDoToken(dados: DadosGoogle, clientId: string, agora = Date.now()): string | null {
  const valido =
    dados.aud === clientId &&
    ['accounts.google.com', 'https://accounts.google.com'].includes(String(dados.iss)) &&
    typeof dados.exp === 'number' && dados.exp * 1000 > agora &&
    dados.email_verified === true &&
    typeof dados.email === 'string' && dados.email.length > 0
  return valido ? dados.email!.toLowerCase() : null
}
