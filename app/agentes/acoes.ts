'use server'
/** Ações dos agentes usadas na tela inicial e na página de cada agente. */
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getBanco } from '@/lib/db'
import { exigirUsuario } from '@/lib/sessao'
import { alternarParada } from '@/lib/agentes'
import { auditar } from '@/lib/auditoria'
import { conferirPasta, fonteDrive } from '@/lib/rodada-contratos'

/** Só volta pra tela da própria Central (nada de endereço de fora). */
const voltaSegura = (v: FormDataEntryValue | null) => (typeof v === 'string' && /^\/[a-z0-9/_-]*$/i.test(v) ? v : '/')

/** Tela inicial por área ou como fluxo da operação. Fica guardado no navegador de cada um. */
export async function trocarVista(formData: FormData) {
  await exigirUsuario()
  const vista = formData.get('vista') === 'fluxo' ? 'fluxo' : 'areas'
  const jar = await cookies()
  jar.set('central_vista', vista, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 })
  revalidatePath('/')
}

export async function pararOuRetomar(formData: FormData) {
  const u = await exigirUsuario('parar_agente')
  const db = await getBanco()
  await alternarParada(db, u, String(formData.get('id')))
  revalidatePath('/')
  revalidatePath('/agentes/[id]', 'page')
}

/** Botão "Conferir agora" do agente de contratos: a mesma rodada que roda sozinha a cada 10 minutos. */
export async function conferirContratos(formData: FormData) {
  const u = await exigirUsuario()
  const db = await getBanco()
  await auditar(db, { quem: u.email, acao: 'contratos.conferir_agora', alvo: 'agente:contratos' })
  let resultado: string
  try {
    const r = await conferirPasta(db, fonteDrive())
    resultado = r.parado ? 'parado' : `${r.novos}-${r.prontos}-${r.travados}`
  } catch {
    resultado = 'erro'
  }
  revalidatePath('/')
  revalidatePath('/agentes/[id]', 'page')
  redirect(`${voltaSegura(formData.get('volta'))}?contratos=${resultado}`)
}
