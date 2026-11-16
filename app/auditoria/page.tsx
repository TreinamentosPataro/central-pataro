import { getBanco } from '@/lib/db'
import { exigirUsuario } from '@/lib/sessao'
import { ultimasAuditorias } from '@/lib/auditoria'

export default async function Auditoria() {
  await exigirUsuario('ver_auditoria')
  const db = await getBanco()
  const linhas = await ultimasAuditorias(db)
  return (
    <>
      <h1>Auditoria</h1>
      <p className="sub">Tudo o que pessoas e agentes fizeram. Ninguém edita nem apaga.</p>
      {linhas.length === 0 ? <div className="vazio">Nada registrado ainda.</div> : (
        <div className="rolar">
          <table>
            <thead><tr><th>Quando</th><th>Quem</th><th>O quê</th><th>Alvo</th><th>Detalhe</th></tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(l.quando).toLocaleString('pt-BR')}</td>
                  <td>{l.quem}</td>
                  <td className="mono">{l.acao}</td>
                  <td className="mono">{l.alvo ?? ''}</td>
                  <td className="mono" style={{ maxWidth: 380, wordBreak: 'break-word' }}>
                    {l.evidencia && <div>{l.evidencia}</div>}
                    {l.depois != null && <div>{JSON.stringify(l.depois).slice(0, 300)}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
