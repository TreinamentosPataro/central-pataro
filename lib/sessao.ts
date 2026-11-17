import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getBanco } from './db'
import type { Papel, Permissao } from './papeis'
import { pode } from './papeis'

export interface Usuario {
  email: string
  nome: string
  papel: Papel
}

const COOKIE = 'central_sessao'
const DURACAO_S = 60 * 60 * 12 // 12 horas

function segredo(): string {
  const s = process.env.SESSAO_SEGREDO
  if (!s || s.length < 32) throw new Error('SESSAO_SEGREDO ausente ou curto (ver .env.example)')
  return s
}

function assinar(corpo: string): string {
  return crypto.createHmac('sha256', segredo()).update(corpo).digest('base64url')
}

export function criarToken(email: string, agora = Date.now()): string {
  const corpo = Buffer.from(JSON.stringify({ e: email, x: agora + DURACAO_S * 1000 })).toString('base64url')
  return `${corpo}.${assinar(corpo)}`
}

export function lerToken(token: string | undefined, agora = Date.now()): string | null {
  if (!token) return null
  const [corpo, assinatura] = token.split('.')
  if (!corpo || !assinatura) return null
  const esperada = assinar(corpo)
  const a = Buffer.from(assinatura)
  const b = Buffer.from(esperada)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const { e, x } = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8'))
    if (typeof e !== 'string' || typeof x !== 'number' || x < agora) return null
    return e
  } catch {
    return null
  }
}

/** Nome, valor e opções do cookie de sessão (rotas que devolvem um redirect gravam direto na resposta). */
export function cookieDeSessao(email: string) {
  return {
    name: COOKIE,
    value: criarToken(email),
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DURACAO_S,
  }
}

export async function iniciarSessao(email: string): Promise<void> {
  const jar = await cookies()
  jar.set(cookieDeSessao(email))
}

export async function encerrarSessao(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE)
}

export async function usuarioAtual(): Promise<Usuario | null> {
  const jar = await cookies()
  const email = lerToken(jar.get(COOKIE)?.value)
  if (!email) return null
  const db = await getBanco()
  const [u] = await db.query<Usuario>(
    `SELECT email, nome, papel FROM usuarios WHERE email = $1 AND ativo`,
    [email],
  )
  return u ?? null
}

/** Pra páginas e ações: sem login → tela de entrar; sem permissão → erro. */
export async function exigirUsuario(permissao: Permissao = 'ver_painel'): Promise<Usuario> {
  const u = await usuarioAtual()
  if (!u) redirect('/entrar')
  if (!pode(u.papel, permissao)) throw new Error('Sem permissão pra isso.')
  return u
}
