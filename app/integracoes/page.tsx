import { exigirUsuario } from '@/lib/sessao'
import { GRUPOS_INTEGRACAO, NOME_ESTADO } from '@/lib/integracoes'

export default async function Integracoes({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await exigirUsuario()
  const { q = '' } = await searchParams
  const termo = q.trim().toLowerCase()
  const grupos = GRUPOS_INTEGRACAO
    .map((g) => ({ ...g, itens: g.itens.filter((i) => !termo || `${i.nome} ${i.para} ${g.nome}`.toLowerCase().includes(termo)) }))
    .filter((g) => g.itens.length)
  const todos = GRUPOS_INTEGRACAO.flatMap((g) => g.itens)
  const conectadas = todos.filter((i) => i.estado === 'conectado').length

  return (
    <>
      <span className="sobrancelha">Integrações</span>
      <h1>As ferramentas da Central</h1>
      <p className="sub"><b>{conectadas}</b> de {todos.length} conectadas. É por elas que os agentes leem, guardam e enviam.</p>

      <form className="busca-larga" action="/integracoes" role="search">
        <input type="search" name="q" defaultValue={q} placeholder="Buscar integração (WhatsApp, Drive, ZapSign…)" aria-label="Buscar integração" />
      </form>

      {grupos.length === 0 && <div className="vazio">Nenhuma integração com “{q}”.</div>}
      {grupos.map((g) => (
        <section key={g.nome} className="area">
          <div className="area-cabeca">
            <h2>{g.nome}</h2>
            <span className="pilula">{g.itens.length} {g.itens.length === 1 ? 'ferramenta' : 'ferramentas'}</span>
          </div>
          <div className="integracoes">
            {g.itens.map((i) => (
              <div key={i.nome} className="integracao">
                <span className="logo" style={{ background: i.cor }} aria-hidden>{i.sigla}</span>
                <span className="integracao-texto">
                  <b>{i.nome}</b>
                  <small>{i.para}</small>
                  <small>{i.nota}</small>
                </span>
                <span className={`estado-int ${i.estado}`}>{NOME_ESTADO[i.estado]}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
