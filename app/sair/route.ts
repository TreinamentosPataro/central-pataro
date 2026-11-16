import { NextResponse } from 'next/server'
import { encerrarSessao } from '@/lib/sessao'

export async function POST(req: Request) {
  await encerrarSessao()
  return NextResponse.redirect(new URL('/entrar', req.url), 303)
}
