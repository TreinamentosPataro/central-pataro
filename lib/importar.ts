import type { Banco } from './db'
import { auditar } from './auditoria'
import { cifrar, hashCpf } from './cofre'
import {
  chaveNome, corrigirMojibake, cpfValido, normalizarData, normalizarEmail, normalizarTelefone,
} from './normalizar'

/**
 * US-01 — importa a planilha de alunos pra base única.
 * Os nomes das colunas da planilha ainda não são conhecidos: cada campo aceita vários apelidos.
 * Quando a planilha chegar, conferir e acrescentar os apelidos que faltarem aqui.
 */
export const COLUNAS: Record<string, string[]> = {
  nome: ['nome', 'nome completo', 'aluno', 'nome do aluno', 'titular'],
  escritorio: ['escritorio', 'nome do escritorio', 'empresa'],
  papel: ['papel', 'funcao', 'cargo', 'tipo'],
  telefone: ['telefone', 'whatsapp', 'celular', 'fone', 'contato'],
  email: ['email', 'e mail'],
  cpf: ['cpf'],
  rg: ['rg'],
  endereco: ['endereco', 'endereco completo'],
  cidade: ['cidade', 'municipio'],
  uf: ['uf', 'estado'],
  produto: ['produto', 'programa', 'turma'],
  inicio: ['inicio', 'data de inicio', 'data da compra', 'data de entrada'],
  vencimento: ['vencimento', 'data de vencimento', 'fim', 'renovacao'],
}

export interface ResumoImportacao {
  linhas: number
  escritoriosNovos: number
  pessoasNovas: number
  pessoasMescladas: number
  correcoes: number
  revisoes: number
  ignoradas: number
}

function mapearCabecalhos(cabecalhos: string[]): Record<string, string> {
  const mapa: Record<string, string> = {}
  for (const h of cabecalhos) {
    const k = chaveNome(h)
    for (const [campo, apelidos] of Object.entries(COLUNAS)) {
      if (!mapa[campo] && apelidos.includes(k)) mapa[campo] = h
    }
  }
  return mapa
}

function papelPessoa(bruto: string | undefined): 'titular' | 'socio' | 'segunda_cadeira' | null {
  const k = chaveNome(bruto)
  if (!k) return null
  if (k.includes('segunda')) return 'segunda_cadeira'
  if (k.includes('socio')) return 'socio'
  if (k.includes('titular') || k.includes('dono') || k.includes('responsavel')) return 'titular'
  return null
}

async function revisao(db: Banco, origem: string, problema: string, dados: unknown) {
  await db.query(`INSERT INTO revisoes (origem, problema, dados) VALUES ($1, $2, $3)`, [
    origem, problema, JSON.stringify(dados),
  ])
}

export async function importarLinhas(
  db: Banco, brutas: Record<string, string>[], origem: string, quem: string,
): Promise<ResumoImportacao> {
  const r: ResumoImportacao = {
    linhas: brutas.length, escritoriosNovos: 0, pessoasNovas: 0, pessoasMescladas: 0,
    correcoes: 0, revisoes: 0, ignoradas: 0,
  }
  if (!brutas.length) return r
  const mapa = mapearCabecalhos(Object.keys(brutas[0]))
  if (!mapa.nome) throw new Error(`Não achei a coluna de nome. Colunas: ${Object.keys(brutas[0]).join(', ')}`)

  for (const [i, bruta] of brutas.entries()) {
    const nLinha = i + 2 // linha 1 é o cabeçalho
    // 1. conserta texto quebrado em todas as células e registra
    const linha: Record<string, string> = {}
    const corrigidos: Record<string, { de: string; para: string }> = {}
    for (const [k, v] of Object.entries(bruta)) {
      const c = corrigirMojibake(v)
      linha[k] = c.valor
      if (c.corrigiu) corrigidos[k] = { de: v, para: c.valor }
    }
    if (Object.keys(corrigidos).length) {
      r.correcoes += Object.keys(corrigidos).length
      await auditar(db, {
        quem, acao: 'importacao.corrigiu_texto', alvo: `${origem}#${nLinha}`, depois: corrigidos,
      })
    }
    const v = (campo: string) => (mapa[campo] ? linha[mapa[campo]]?.trim() ?? '' : '')

    const nome = v('nome')
    if (!nome) { r.ignoradas++; continue }
    const telefone = normalizarTelefone(v('telefone'))
    const email = normalizarEmail(v('email'))
    const nomeEscritorio = v('escritorio') || nome

    // 2. escritório (mesmo nome normalizado = mesmo escritório)
    const chaveEsc = chaveNome(nomeEscritorio)
    let [esc] = await db.query<{ id: string }>(`SELECT id FROM escritorios WHERE nome_chave = $1`, [chaveEsc])
    if (!esc) {
      ;[esc] = await db.query<{ id: string }>(
        `INSERT INTO escritorios (nome, nome_chave, cidade, uf) VALUES ($1, $2, $3, $4) RETURNING id`,
        [nomeEscritorio, chaveEsc, v('cidade') || null, v('uf').toUpperCase().slice(0, 2) || null],
      )
      await db.query(`INSERT INTO jornadas (escritorio_id) VALUES ($1) ON CONFLICT DO NOTHING`, [esc.id])
      r.escritoriosNovos++
    }

    // 3. pessoa: mesma pessoa = mesmo telefone ou mesmo e-mail
    const porTel = telefone
      ? (await db.query<{ id: string; nome: string; escritorio_id: string }>(
          `SELECT id, nome, escritorio_id FROM pessoas WHERE telefone = $1`, [telefone]))[0]
      : undefined
    const porEmail = email
      ? (await db.query<{ id: string; nome: string; escritorio_id: string }>(
          `SELECT id, nome, escritorio_id FROM pessoas WHERE email = $1`, [email]))[0]
      : undefined

    if (porTel && porEmail && porTel.id !== porEmail.id) {
      await revisao(db, `${origem}#${nLinha}`, 'Telefone e e-mail apontam pra pessoas diferentes', {
        nome, telefone, email, pessoa_do_telefone: porTel.nome, pessoa_do_email: porEmail.nome,
      })
      r.revisoes++
      continue
    }

    let pessoaId: string
    const existente = porTel ?? porEmail
    if (existente) {
      pessoaId = existente.id
      r.pessoasMescladas++
      const divergencias: Record<string, { base: string; planilha: string }> = {}
      if (chaveNome(existente.nome) !== chaveNome(nome)) divergencias.nome = { base: existente.nome, planilha: nome }
      if (existente.escritorio_id !== esc.id) divergencias.escritorio = { base: existente.escritorio_id, planilha: nomeEscritorio }
      if (Object.keys(divergencias).length) {
        await revisao(db, `${origem}#${nLinha}`, 'Registro duplicado com dados diferentes', {
          pessoa_id: pessoaId, divergencias,
        })
        r.revisoes++
      }
      // completa o que estava vazio, sem sobrescrever
      await db.query(
        `UPDATE pessoas SET telefone = COALESCE(telefone, $2), email = COALESCE(email, $3),
                papel = COALESCE(papel, $4) WHERE id = $1`,
        [pessoaId, telefone, email, papelPessoa(v('papel'))],
      )
    } else {
      const [nova] = await db.query<{ id: string }>(
        `INSERT INTO pessoas (escritorio_id, nome, papel, telefone, email) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [esc.id, nome, papelPessoa(v('papel')) ?? (v('escritorio') ? null : 'titular'), telefone, email],
      )
      pessoaId = nova.id
      r.pessoasNovas++
    }
    if (!telefone && !email) {
      await revisao(db, `${origem}#${nLinha}`, 'Pessoa sem telefone nem e-mail: não dá pra ligar às outras fontes', { nome })
      r.revisoes++
    }

    // 4. área restrita
    const cpf = v('cpf')
    if (cpf || v('rg') || v('endereco')) {
      if (cpf && !cpfValido(cpf)) {
        await revisao(db, `${origem}#${nLinha}`, 'CPF inválido (não foi guardado)', { nome })
        r.revisoes++
      }
      const cpfOk = cpf && cpfValido(cpf) ? cpf.replace(/\D/g, '') : null
      const h = hashCpf(cpfOk)
      const dono = h
        ? (await db.query<{ pessoa_id: string }>(`SELECT pessoa_id FROM dados_restritos WHERE cpf_hash = $1`, [h]))[0]
        : undefined
      if (dono && dono.pessoa_id !== pessoaId) {
        await revisao(db, `${origem}#${nLinha}`, 'CPF já pertence a outra pessoa da base', { nome })
        r.revisoes++
      } else {
        await db.query(
          `INSERT INTO dados_restritos (pessoa_id, cpf_hash, cpf_cifrado, rg_cifrado, endereco_cifrado)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (pessoa_id) DO UPDATE SET
             cpf_hash = COALESCE(dados_restritos.cpf_hash, EXCLUDED.cpf_hash),
             cpf_cifrado = COALESCE(dados_restritos.cpf_cifrado, EXCLUDED.cpf_cifrado),
             rg_cifrado = COALESCE(dados_restritos.rg_cifrado, EXCLUDED.rg_cifrado),
             endereco_cifrado = COALESCE(dados_restritos.endereco_cifrado, EXCLUDED.endereco_cifrado)`,
          [pessoaId, h, cifrar(cpfOk), cifrar(v('rg')), cifrar(v('endereco'))],
        )
      }
    }

    // 5. matrícula
    const produto = chaveNome(v('produto'))
    if (produto) {
      const inicio = normalizarData(v('inicio'))
      const [ja] = await db.query(
        `SELECT 1 FROM matriculas WHERE escritorio_id = $1 AND produto = $2 AND inicio IS NOT DISTINCT FROM $3::date`,
        [esc.id, produto, inicio],
      )
      if (!ja) {
        await db.query(
          `INSERT INTO matriculas (escritorio_id, produto, inicio, vencimento) VALUES ($1, $2, $3, $4)`,
          [esc.id, produto, inicio, normalizarData(v('vencimento'))],
        )
      }
    }
  }

  await auditar(db, { quem, acao: 'importacao.rodou', alvo: origem, depois: r })
  return r
}
