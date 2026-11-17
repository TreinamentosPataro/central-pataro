import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { COOKIE_ESTADO, endereco, googleConfigurado, urlRetorno } from '@/lib/google'

/** 1. Manda pro Google com um "estado" aleatório guardado em cookie (impede login forjado). */
export async function GET() {
  if (!googleConfigurado()) {
    return NextResponse.redirect(`${endereco()}/entrar?erro=${encodeURIComponent('O login com Google ainda não foi configurado.')}`)
  }
  const estado = crypto.randomBytes(24).toString('base64url')
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: urlRetorno(),
    response_type: 'code',
    scope: 'openid email profile',
    state: estado,
    prompt: 'select_account',
  })
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${q}`)
  res.cookies.set(COOKIE_ESTADO, estado, {
    httpOnly: true,
    sameSite: 'lax',
    secure: endereco().startsWith('https:'),
    path: '/auth',
    maxAge: 600,
  })
  return res
}
