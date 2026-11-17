import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { getBanco } from '@/lib/db'
import { exigirUsuario } from '@/lib/sessao'
import { decidir, listarFila, type ItemFila } from '@/lib/fila'
import { pode } from '@/lib/papeis'
import { enviarAprovados } from '@/lib/enviador'
import { clienteEvolution, whatsappConfigurado } from '@/lib/whatsapp'
import { listarDestinos } from '@/lib/destinos'

const ESTADO: Record<string, string> = {
  pendente: 'Esperando', aprovado: 'Aprovado sem mexer', ajustado: 'Aprovado com ajuste',
  descartado: 'Descartado', executado: 'Executado', falhou: 'Falhou',
}

const TIPO: Record<string, string> = {
  contrato_pronto: 'contrato pronto', contrato_travado: 'contrato travado',
  plano_parado: 'plano parado', pergunta_sem_resposta: 'pergunta sem resposta', contrato_novo: 'contrato novo',
}

const DESTINO: Record<string, string> = {
  'zapsign:trilha': 'ZapSign · Trilha Previdenciária - Contratos',
  'grupo:comercial': 'Grupo do comercial (WhatsApp)',
}

async function decidirItem(formData: FormData) {
  'use server'
  const u = await exigirUsuario('aprovar')
  const db = await getBanco()
  const id = String(formData.get('id'))
  const acao = String(formData.get('acao'))
  const texto = String(formData.get('texto') ?? '')
  const original = String(formData.get('original') ?? '')
  if (acao === 'descartar') {
    await decidir(db, u, id, { tipo: 'descartar', motivo: String(formData.get('motivo') ?? '') })
  } else if (texto.trim() !== original.trim()) {
    await decidir(db, u, id, { tipo: 'ajustar', texto })
  } else {
    await decidir(db, u, id, { tipo: 'aprovar' })
  }
  // aprovado pra um grupo ligado → sai na hora; se o WhatsApp estiver fora, a rodada de cada minuto manda depois
  if (acao !== 'descartar' && whatsappConfigurado()) {
    await enviarAprovados(db, clienteEvolution()).catch((e) => console.error('[whatsapp] envio após aprovação:', e))
  }
  revalidatePath('/fila')
  revalidatePath('/')
}

interface InfoDestino { nome: string; ligado: boolean }

function Item({ item, podeAprovar, destinos = {} }: { item: ItemFila; podeAprovar: boolean; destinos?: Record<string, InfoDestino> }) {
  const destino = item.destino ? destinos[item.destino] : undefined
  const esperandoGrupo = destino && !destino.ligado && (item.estado === 'aprovado' || item.estado === 'ajustado') && !item.resultado
  return (
    <div className="item-fila">
      <div className="item-topo">
        <span className={`etiqueta ${item.estado}`}>{ESTADO[item.estado]}</span>
        <span className="mudo">{item.agente_nome} · {TIPO[item.tipo] ?? item.tipo.replace(/_/g, ' ')}</span>
        {item.escritorio_id && <Link className="mudo" href={`/alunos/${item.escritorio_id}`}>{item.escritorio_nome}</Link>}
        <span className="mudo" style={{ marginLeft: 'auto' }}>
          {new Date(item.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <h3>{item.titulo}</h3>
      {item.evidencia && <div className="evidencia"><b>Evidência:</b> {item.evidencia}</div>}
      {item.destino && <div className="mudo" style={{ marginBottom: 8 }}>Destino: {DESTINO[item.destino] ?? destino?.nome ?? item.destino}</div>}

      {item.estado === 'pendente' && podeAprovar ? (
        <form action={decidirItem}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="original" value={item.rascunho ?? ''} />
          {item.rascunho !== null && (
            <>
              <label className="mudo" htmlFor={`t-${item.id}`}>Rascunho (pode editar antes de aprovar)</label>
              <textarea id={`t-${item.id}`} name="texto" defaultValue={item.rascunho ?? ''} />
            </>
          )}
          <div className="acoes">
            <button className="botao ouro" name="acao" value="aprovar" type="submit">Aprovar</button>
            <input className="motivo" type="text" name="motivo" placeholder="Motivo, se for descartar" />
            <button className="botao perigo" name="acao" value="descartar" type="submit">Descartar</button>
          </div>
        </form>
      ) : (
        <>
          {(item.texto_final ?? item.rascunho) && <div className="evidencia">{item.texto_final ?? item.rascunho}</div>}
          <div className="mudo">
            {item.aprovador && <>Decidido por {item.aprovador}. </>}
            {item.motivo && <>Motivo: {item.motivo}. </>}
            {item.resultado && <>Resultado: {item.resultado}.</>}
            {esperandoGrupo && <>Esperando o grupo ser ligado em <Link href="/integracoes/whatsapp">Integrações → WhatsApp</Link>.</>}
            {item.estado === 'pendente' && !podeAprovar && 'Só o Hoklo ou o Fred aprovam.'}
          </div>
        </>
      )}
    </div>
  )
}

export default async function Fila() {
  const u = await exigirUsuario()
  const db = await getBanco()
  const pendentes = await listarFila(db, ['pendente'])
  const recentes = (await listarFila(db, ['aprovado', 'ajustado', 'descartado', 'executado', 'falhou'])).slice(0, 20)
  const podeAprovar = pode(u.papel, 'aprovar')
  const destinos = Object.fromEntries(
    (await listarDestinos(db)).map((d) => [d.id, { nome: d.nome, ligado: Boolean(d.endereco && d.enviar) }]),
  )

  return (
    <>
      <h1>Fila de decisões</h1>
      <p className="sub">O agente propõe, uma pessoa decide. Nada sai pro aluno sem passar por aqui.</p>
      {pendentes.length === 0
        ? <div className="vazio">Nada esperando decisão.</div>
        : pendentes.map((i) => <Item key={i.id} item={i} podeAprovar={podeAprovar} destinos={destinos} />)}
      {recentes.length > 0 && (
        <>
          <h2>Decididos recentemente</h2>
          {recentes.map((i) => <Item key={i.id} item={i} podeAprovar={false} destinos={destinos} />)}
        </>
      )}
    </>
  )
}
