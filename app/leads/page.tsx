import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { getBanco } from '@/lib/db'
import { exigirUsuario } from '@/lib/sessao'
import { pode } from '@/lib/papeis'
import { bloquearLead, conversaDoLead, listarLeads, telefoneDoJid, type SituacaoLead } from '@/lib/sdr'

const SITUACAO: Record<SituacaoLead, { nome: string; cor: string }> = {
  novo: { nome: 'Novo', cor: 'pendente' },
  conversando: { nome: 'Conversando', cor: 'pendente' },
  qualificado: { nome: 'Qualificado', cor: 'aprovado' },
  passado: { nome: 'Com o Bruno', cor: 'executado' },
  fora_do_perfil: { nome: 'Fora do perfil', cor: 'descartado' },
  encerrado: { nome: 'Encerrado', cor: 'descartado' },
}
const ETAPA: Record<string, string> = { situacao: 'Situação', problema: 'Problema', implicacao: 'Implicação', necessidade: 'Necessidade' }

const hora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'

async function alternarBloqueio(formData: FormData) {
  'use server'
  const u = await exigirUsuario('aprovar')
  const db = await getBanco()
  await bloquearLead(db, u.email, String(formData.get('id')), formData.get('bloquear') === '1')
  revalidatePath('/leads')
  revalidatePath('/fila')
}

export default async function Leads({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const u = await exigirUsuario()
  const { id } = await searchParams
  const db = await getBanco()
  const leads = await listarLeads(db)
  const aberto = id ? await conversaDoLead(db, id) : null

  return (
    <>
      <span className="sobrancelha">Agente SDR</span>
      <h1>Leads</h1>
      <p className="sub">Quem mandou mensagem pro WhatsApp do agente. Cada resposta passa pela fila antes de sair; quem tem perfil vai pro Bruno.</p>

      {aberto && (
        <section className="area">
          <div className="area-cabeca">
            <h2>{aberto.lead.nome ?? 'Lead sem nome'}</h2>
            <span className={`etiqueta ${SITUACAO[aberto.lead.situacao].cor}`}>{SITUACAO[aberto.lead.situacao].nome}</span>
            <Link href="/leads" className="mudo" style={{ marginLeft: 'auto' }}>Fechar</Link>
          </div>
          <p className="mudo">
            {[telefoneDoJid(aberto.lead.jid), aberto.lead.etapa && `SPIN: ${ETAPA[aberto.lead.etapa]}`,
              aberto.lead.pessoas && `${aberto.lead.pessoas} pessoas`, aberto.lead.faixa && `faturamento ${aberto.lead.faixa}`,
              aberto.lead.bloqueado && 'bloqueado: o agente não fala mais com esse número'].filter(Boolean).join(' · ')}
          </p>
          {aberto.lead.resumo && <div className="evidencia"><b>O que o agente entendeu:</b> {aberto.lead.resumo}</div>}
          <div className="conversa">
            {aberto.mensagens.map((m, i) => (
              <div key={i} className={`balao ${m.de}`}>
                <span>{m.texto}</span>
                <small>{m.de === 'lead' ? 'Lead' : 'Agente'} · {hora(m.quando)}</small>
              </div>
            ))}
          </div>
          {pode(u.papel, 'aprovar') && (
            <form action={alternarBloqueio} className="parar">
              <input type="hidden" name="id" value={aberto.lead.id} />
              <input type="hidden" name="bloquear" value={aberto.lead.bloqueado ? '0' : '1'} />
              <button className={`botao ${aberto.lead.bloqueado ? 'leve' : 'perigo'}`} type="submit">
                {aberto.lead.bloqueado ? 'Voltar a atender esse número' : 'Parar de falar com esse número'}
              </button>
            </form>
          )}
        </section>
      )}

      {leads.length === 0 ? (
        <div className="vazio">Nenhum lead ainda. As conversas aparecem aqui quando alguém mandar mensagem pro chip do agente.</div>
      ) : (
        <div className="rolar">
          <table>
            <thead><tr><th>Lead</th><th>Situação</th><th>SPIN</th><th>Última mensagem</th><th>Quando</th></tr></thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td><Link href={`/leads?id=${l.id}`}><b>{l.nome ?? 'Sem nome'}</b></Link>{l.bloqueado && <span className="mudo"> · bloqueado</span>}</td>
                  <td><span className={`etiqueta ${SITUACAO[l.situacao].cor}`}>{SITUACAO[l.situacao].nome}</span></td>
                  <td>{l.etapa ? ETAPA[l.etapa] : '—'}</td>
                  <td className="mudo">{l.ultima ? (l.ultima.length > 70 ? `${l.ultima.slice(0, 70)}…` : l.ultima) : '—'}</td>
                  <td className="mudo">{hora(l.ultima_do_lead ?? l.criado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
