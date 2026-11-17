import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getBanco } from '@/lib/db'
import { exigirUsuario } from '@/lib/sessao'
import { pode } from '@/lib/papeis'
import { auditar } from '@/lib/auditoria'
import { listarDestinos, salvarDestino, semearDestinos } from '@/lib/destinos'
import { clienteEvolution, whatsappConfigurado, type EstadoConexao, type GrupoWhatsapp } from '@/lib/whatsapp'
import { Recarregar } from './recarregar'

const NOME_ESTADO: Record<EstadoConexao, string> = {
  conectado: 'Conectado',
  conectando: 'Esperando o QR',
  desconectado: 'Desconectado',
  sem_servidor: 'Servidor fora do ar',
}

async function salvar(formData: FormData) {
  'use server'
  const u = await exigirUsuario('configurar_whatsapp')
  const db = await getBanco()
  let destino = '/integracoes/whatsapp?salvo=1'
  try {
    await salvarDestino(db, u.email, {
      id: String(formData.get('id') ?? ''),
      nome: String(formData.get('nome') ?? '') || undefined,
      endereco: String(formData.get('endereco') ?? ''),
      enviar: formData.get('enviar') === 'on',
      ler: formData.get('ler') === 'on',
    })
    revalidatePath('/fila')
  } catch (e) {
    destino = `/integracoes/whatsapp?erro=${encodeURIComponent((e as Error).message)}`
  }
  redirect(destino)
}

async function desconectar() {
  'use server'
  const u = await exigirUsuario('configurar_whatsapp')
  await clienteEvolution().desconectar()
  await auditar(await getBanco(), { quem: u.email, acao: 'whatsapp.desconectar', alvo: 'whatsapp:agente' })
  redirect('/integracoes/whatsapp')
}

export default async function Whatsapp({ searchParams }: { searchParams: Promise<{ erro?: string; salvo?: string }> }) {
  const u = await exigirUsuario()
  const { erro, salvo } = await searchParams
  const podeConfigurar = pode(u.papel, 'configurar_whatsapp')
  const db = await getBanco()
  await semearDestinos(db)
  const destinos = await listarDestinos(db)

  const configurado = whatsappConfigurado()
  const wa = clienteEvolution()
  const estado: EstadoConexao = configurado ? await wa.estado() : 'sem_servidor'
  let qr: string | null = null
  let grupos: GrupoWhatsapp[] = []
  let falha: string | null = null
  try {
    if (configurado && podeConfigurar && estado !== 'conectado' && estado !== 'sem_servidor') qr = await wa.qr()
    if (estado === 'conectado') grupos = await wa.grupos()
  } catch (e) {
    falha = (e as Error).message
  }
  const nomeGrupo = new Map(grupos.map((g) => [g.id, g.nome]))

  return (
    <>
      <span className="sobrancelha"><Link href="/integracoes">Integrações</Link> · WhatsApp</span>
      <h1>WhatsApp do agente</h1>
      <p className="sub">
        Um chip só do agente, nunca o número da empresa. Ele só manda o que alguém aprovou na fila, e só pros grupos ligados aqui.
      </p>

      {erro && <div className="aviso">{erro}</div>}
      {salvo && <div className="aviso">Salvo.</div>}

      <section className="area">
        <div className="area-cabeca">
          <h2>Conexão</h2>
          <span className={`estado-int ${estado === 'conectado' ? 'conectado' : 'falta'}`}>{NOME_ESTADO[estado]}</span>
        </div>

        {!configurado && (
          <div className="vazio">O servidor do WhatsApp ainda não foi ligado na Central (falta WHATSAPP_URL e WHATSAPP_CHAVE no servidor).</div>
        )}
        {configurado && estado === 'sem_servidor' && (
          <div className="vazio">A Central não está conseguindo falar com o servidor do WhatsApp. Tente de novo em um minuto.</div>
        )}
        {falha && <div className="aviso">{falha}</div>}

        {qr && (
          <div className="qr">
            <img src={qr} alt="QR pra conectar o WhatsApp do agente" width={264} height={264} />
            <ol className="lista-simples">
              <li>Abra o WhatsApp <b>no celular do chip do agente</b>.</li>
              <li>Toque em <b>Aparelhos conectados → Conectar um aparelho</b>.</li>
              <li>Aponte a câmera pra este QR. Ele se renova sozinho.</li>
            </ol>
            <Recarregar />
          </div>
        )}
        {configurado && !podeConfigurar && estado !== 'conectado' && (
          <div className="vazio">Quem conecta o chip é o Norman, o Hoklo ou o Fred.</div>
        )}
        {estado === 'conectado' && podeConfigurar && (
          <form action={desconectar} className="acoes">
            <span className="mudo">{grupos.length} grupos visíveis pro chip.</span>
            <button className="botao perigo" type="submit">Desconectar o chip</button>
          </form>
        )}
      </section>

      <section className="area">
        <div className="area-cabeca">
          <h2>Grupos liberados</h2>
          <span className="pilula">{destinos.filter((d) => d.enviar).length} ligados</span>
        </div>
        <p className="mudo">
          O agente escreve só a chave (ex.: grupo:comercial). O grupo de verdade é escolhido aqui, por uma pessoa.
          “Ler” libera o agente a ler o grupo; fora dessa lista ele não lê nada.
        </p>

        <div className="rolar">
          <table>
            <thead><tr><th>Destino</th><th>Grupo no WhatsApp</th><th>Enviar</th><th>Ler</th><th></th></tr></thead>
            <tbody>
              {destinos.map((d) => (
                <tr key={d.id}>
                  <td><b>{d.nome}</b><br /><small className="mudo">{d.id}</small></td>
                  {podeConfigurar ? (
                    <>
                      <td>
                        <select name="endereco" form={`d-${d.id}`} defaultValue={d.endereco ?? ''} aria-label={`Grupo de ${d.nome}`}>
                          <option value="">— nenhum —</option>
                          {d.endereco && !nomeGrupo.has(d.endereco) && <option value={d.endereco}>{d.endereco}</option>}
                          {grupos.map((g) => (
                            <option key={g.id} value={g.id}>{g.nome}{g.membros ? ` (${g.membros})` : ''}</option>
                          ))}
                        </select>
                      </td>
                      <td><input type="checkbox" name="enviar" form={`d-${d.id}`} defaultChecked={d.enviar} aria-label="Enviar" /></td>
                      <td><input type="checkbox" name="ler" form={`d-${d.id}`} defaultChecked={d.ler} aria-label="Ler" /></td>
                      <td>
                        <form id={`d-${d.id}`} action={salvar}>
                          <input type="hidden" name="id" value={d.id} />
                          <button className="botao" type="submit">Salvar</button>
                        </form>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{d.endereco ? nomeGrupo.get(d.endereco) ?? 'ligado' : '—'}</td>
                      <td>{d.enviar ? 'sim' : 'não'}</td>
                      <td>{d.ler ? 'sim' : 'não'}</td>
                      <td></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {podeConfigurar && (
          <form action={salvar} className="formulario" style={{ maxWidth: 560 }}>
            <h3>Novo destino</h3>
            <input type="text" name="id" placeholder="Chave, ex.: grupo:trilha-turma-3" required />
            <input type="text" name="nome" placeholder="Nome que quem aprova vai ver" required />
            <select name="endereco" defaultValue="" aria-label="Grupo no WhatsApp">
              <option value="">— escolher o grupo depois —</option>
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
            <div className="acoes">
              <label className="marcar"><input type="checkbox" name="enviar" /> Enviar</label>
              <label className="marcar"><input type="checkbox" name="ler" /> Ler</label>
              <button className="botao ouro" type="submit">Cadastrar</button>
            </div>
          </form>
        )}
      </section>
    </>
  )
}
