import crypto from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { getBanco } from '@/lib/db'
import { auditar } from '@/lib/auditoria'
import { cookieDeSessao } from '@/lib/sessao'
import { COOKIE_ESTADO, emailDoToken, endereco, googleConfigurado, lerIdToken, urlRetorno } from '@/lib/google'

function falhou(motivo: string) {
  const res = NextResponse.redirect(`${endereco()}/entrar?erro=${encodeURIComponent(motivo)}`)
  res.cookies.set(COOKIE_ESTADO, '', { path: '/auth', maxAge: 0 })
  return res
}

/** 2. Volta do Google: confere o estado, troca o código pelo id_token e entra se o e-mail estiver liberado. */
export async function GET(req: NextRequest) {
  if (!googleConfigurado()) return falhou('O login com Google ainda não foi configurado.')
  const p = req.nextUrl.searchParams
  if (p.get('error')) return falhou('Login com Google cancelado.')

  const estado = req.cookies.get(COOKIE_ESTADO)?.value ?? ''
  const recebido = p.get('state') ?? ''
  if (!estado || estado.length !== recebido.length || !crypto.timingSafeEqual(Buffer.from(estado), Buffer.from(recebido))) {
    return falhou('O login expirou. Tente de novo.')
  }

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: p.get('code') ?? '',
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: urlRetorno(),
      grant_type: 'authorization_code',
    }),
  })
  if (!r.ok) return falhou('O Google não confirmou o login. Tente de novo.')
  const { id_token } = (await r.json()) as { id_token?: string }
  const email = emailDoToken(lerIdToken(id_token ?? ''), process.env.GOOGLE_CLIENT_ID!)
  if (!email) return falhou('Não deu pra confirmar a conta Google.')

  const db = await getBanco()
  const [u] = await db.query(`SELECT 1 FROM usuarios WHERE email = $1 AND ativo`, [email])
  if (!u) {
    await auditar(db, { quem: email, acao: 'sessao.recusada', evidencia: 'google: e-mail fora da lista' })
    return falhou(`A conta ${email} não está liberada na Central. Fale com o Norman.`)
  }
  await auditar(db, { quem: email, acao: 'sessao.entrar', evidencia: 'google' })
  const res = NextResponse.redirect(`${endereco()}/`)
  res.cookies.set(cookieDeSessao(email))
  res.cookies.set(COOKIE_ESTADO, '', { path: '/auth', maxAge: 0 })
  return res
}
