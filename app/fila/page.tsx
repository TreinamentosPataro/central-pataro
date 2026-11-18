import { getBanco } from '@/lib/db'
import { exigirUsuario } from '@/lib/sessao'
import { listarFila } from '@/lib/fila'
import { pode } from '@/lib/papeis'
import { Item, infoDestinos } from './item'

export default async function Fila() {
  const u = await exigirUsuario()
  const db = await getBanco()
  const pendentes = await listarFila(db, ['pendente'])
  const recentes = (await listarFila(db, ['aprovado', 'ajustado', 'descartado', 'executado', 'falhou'])).slice(0, 20)
  const podeAprovar = pode(u.papel, 'aprovar')
  const destinos = await infoDestinos(db)

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
