/**
 * US-02 · Acesso: entrada pela conta Google. Só o token emitido pelo Google, pra Central, válido e com
 * e-mail confirmado vira login. (A lista de e-mails liberados é conferida na rota, contra `usuarios`.)
 */
import { describe, expect, it } from 'vitest'
import { emailDoToken, lerIdToken } from '@/lib/google'

const CLIENTE = 'cliente-central.apps.googleusercontent.com'
const AGORA = 1_800_000_000_000
const bom = { aud: CLIENTE, iss: 'https://accounts.google.com', exp: AGORA / 1000 + 600, email: 'Hoklo@Pataro.com', email_verified: true }

describe('login com Google', () => {
  it('token certo vira o e-mail em minúsculo', () => {
    expect(emailDoToken(bom, CLIENTE, AGORA)).toBe('hoklo@pataro.com')
  })
  it('token emitido pra outro app não entra', () => {
    expect(emailDoToken({ ...bom, aud: 'outro-app' }, CLIENTE, AGORA)).toBeNull()
  })
  it('token que não veio do Google não entra', () => {
    expect(emailDoToken({ ...bom, iss: 'https://falso.example' }, CLIENTE, AGORA)).toBeNull()
  })
  it('token vencido não entra', () => {
    expect(emailDoToken({ ...bom, exp: AGORA / 1000 - 1 }, CLIENTE, AGORA)).toBeNull()
  })
  it('e-mail não confirmado no Google não entra', () => {
    expect(emailDoToken({ ...bom, email_verified: false }, CLIENTE, AGORA)).toBeNull()
  })
  it('token quebrado não derruba nada', () => {
    expect(lerIdToken('lixo')).toEqual({})
    expect(emailDoToken(lerIdToken('lixo'), CLIENTE, AGORA)).toBeNull()
  })
})
