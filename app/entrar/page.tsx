import { redirect } from 'next/navigation'
import { getBanco } from '@/lib/db'
import { iniciarSessao, usuarioAtual } from '@/lib/sessao'
import { auditar } from '@/lib/auditoria'
import { NOME_PAPEL, type Papel } from '@/lib/papeis'

const MODO_DEV = process.env.LOGIN_MODO !== 'google' && process.env.NODE_ENV !== 'production'

async function entrarComo(formData: FormData) {
  'use server'
  if (!MODO_DEV) throw new Error('Entrada de teste desligada.')
  const email = String(formData.get('email') ?? '')
  const db = await getBanco()
  const [u] = await db.query(`SELECT 1 FROM usuarios WHERE email = $1 AND ativo`, [email])
  if (!u) throw new Error('Usuário não liberado.')
  await iniciarSessao(email)
  await auditar(db, { quem: email, acao: 'sessao.entrar', evidencia: 'modo dev' })
  redirect('/')
}

export default async function Entrar() {
  if (await usuarioAtual()) redirect('/')
  const db = await getBanco()
  const usuarios = await db.query<{ email: string; nome: string; papel: Papel }>(
    `SELECT email, nome, papel FROM usuarios WHERE ativo ORDER BY nome`,
  )
  return (
    <div className="entrar">
      <div className="cartao">
        <div className="marca" style={{ marginBottom: 16 }}>
          <span className="marca-p" aria-hidden>P</span> Central Pataro
        </div>
        {MODO_DEV ? (
          <>
            <p className="mudo">Modo de desenvolvimento: escolha quem você é. Em produção, a entrada é pela conta Google liberada.</p>
            {usuarios.length === 0 && <p className="aviso">Nenhum usuário cadastrado. Rode <code>npm run db:semear</code>.</p>}
            {usuarios.map((u) => (
              <form key={u.email} action={entrarComo}>
                <input type="hidden" name="email" value={u.email} />
                <button className="botao leve" type="submit">
                  <span>{u.nome}</span><span className="mudo">{NOME_PAPEL[u.papel]}</span>
                </button>
              </form>
            ))}
          </>
        ) : (
          <p>A entrada com a conta Google ainda vai ser ligada (ADR-001). Fale com o Norman.</p>
        )}
      </div>
    </div>
  )
}
