import { getBanco } from '@/lib/db'
import { exigirUsuario } from '@/lib/sessao'
import { listarAgentes } from '@/lib/agentes'
import { donoId, LEMA, PESSOAS } from '@/lib/equipe'
import { Onda, type EstadoOnda } from '../onda'

export default async function Organograma() {
  await exigirUsuario()
  const db = await getBanco()
  const agentes = await listarAgentes(db)
  const topo = PESSOAS.find((p) => p.acima === null)!
  const meio = PESSOAS.filter((p) => p.acima === topo.id)

  return (
    <>
      <span className="sobrancelha">Organograma</span>
      <h1>Quem responde a quem</h1>
      <p className="sub">O Fred no topo, o time embaixo dele e cada agente com o seu dono. Todo agente consulta o Cérebro e passa pela fila.</p>

      <div className="org">
        <div className="org-nivel">
          <div className="no pessoa topo">
            <span className="avatar-pessoa grande" aria-hidden>{topo.nome[0]}</span>
            <b>{topo.nome}</b>
            <small>{topo.cargo}</small>
          </div>
        </div>
        <div className="org-ramos" style={{ '--n': meio.length } as React.CSSProperties}>
          {meio.map((p) => {
            const deles = agentes.filter((a) => donoId(a.dono) === p.id)
            return (
              <div key={p.id} className="org-ramo">
                <div className="no pessoa">
                  <span className="avatar-pessoa grande" aria-hidden>{p.nome[0]}</span>
                  <b>{p.nome}</b>
                  <small>{p.cargo}</small>
                </div>
                {deles.length > 0 && (
                  <div className="org-filhos">
                    {deles.map((a) => {
                      const e: EstadoOnda = a.parado ? 'parado' : (a.status as EstadoOnda)
                      return (
                        <div key={a.id} className={`no agente-no ${e}`} title={LEMA[a.id]}>
                          <span className="avatar"><Onda id={a.id} estado={e} tamanho={40} /></span>
                          <b>{a.nome}</b>
                          <small>{a.funcao}</small>
                          <span className={`situacao ${e}`}>{a.parado ? 'Parado' : a.status === 'no_ar' ? '✓ No ar' : `Em construção${a.prazo ? ` · ${a.prazo}` : ''}`}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
