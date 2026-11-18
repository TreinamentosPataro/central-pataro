'use server'
/** Ações dos agentes usadas na tela inicial e na página de cada agente. */
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getBanco } from '@/lib/db'
import { exigirUsuario } from '@/lib/sessao'
import { alternarParada } from '@/lib/agentes'
import { auditar } from '@/lib/auditoria'
import { conferirPasta, fonteDrive } from '@/lib/rodada-contratos'

/** Só volta pra tela da própria Central (nada de endereço de fora). */
const voltaSegura = (v: FormDataEntryValue | null) => (typeof v === 'string' && /^\/[a-z0-9/_-]*$/i.test(v) ? v : '/')

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
