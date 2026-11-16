/**
 * Critérios de aceite do E0 (Fundação) do plano do CS, como testes.
 * Cada describe cita a história (docs/specs/cs.md).
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { bancoLocal, type Banco } from '@/lib/db'
import { auditar } from '@/lib/auditoria'
import { aprovadosParaExecutar, decidir, marcarExecutado, proporItem } from '@/lib/fila'
import { agentePelaChave, alternarParada, novaChave } from '@/lib/agentes'
import { fichaDoEscritorio } from '@/lib/alunos'
import { importarLinhas } from '@/lib/importar'
import { corrigirMojibake, cpfValido, lerCsv, normalizarTelefone } from '@/lib/normalizar'
import type { Usuario } from '@/lib/sessao'

const HOKLO: Usuario = { email: 'hoklo@teste', nome: 'Hoklo', papel: 'gerente' }
const NORMAN: Usuario = { email: 'norman@teste', nome: 'Norman', papel: 'executor' }
const CPF_TESTE = '529.982.247-25' // CPF de exemplo, válido só no cálculo

let db: Banco

beforeAll(() => {
  process.env.COFRE_CHAVE = 'chave-de-teste-com-mais-de-32-caracteres-ok'
})

beforeEach(async () => {
  db = await bancoLocal() // Postgres novo, só na memória, a cada teste
  await db.query(`INSERT INTO agentes (id, nome, dono) VALUES ('cs', 'Agente de CS', 'Norman')`)
})

describe('normalização', () => {
  it('conserta "NÃ£o" e "SÃ£o Paulo"', () => {
    expect(corrigirMojibake('NÃ£o')).toEqual({ valor: 'Não', corrigiu: true })
    expect(corrigirMojibake('SÃ£o Paulo').valor).toBe('São Paulo')
    expect(corrigirMojibake('Não mexe em texto certo')).toEqual({ valor: 'Não mexe em texto certo', corrigiu: false })
    expect(corrigirMojibake('Escritório SÃ£o JosÃ©').valor).toBe('Escritório São José')
    expect(corrigirMojibake('Ã‰ isso â€” disse').valor).toBe('É isso — disse')
    expect(corrigirMojibake('Ação, AÇÃO, Âmbito, ônus').corrigiu).toBe(false)
  })
  it('telefone vira +55DDDNÚMERO', () => {
    expect(normalizarTelefone('(31) 99999-8888')).toBe('+5531999998888')
    expect(normalizarTelefone('+55 31 99999-8888')).toBe('+5531999998888')
    expect(normalizarTelefone('123')).toBeNull()
  })
  it('valida CPF pelo dígito', () => {
    expect(cpfValido(CPF_TESTE)).toBe(true)
    expect(cpfValido('111.111.111-11')).toBe(false)
  })
  it('lê CSV com ; e aspas', () => {
    const l = lerCsv('Nome;Obs\n"Ana; Silva";"disse ""oi"""\n')
    expect(l).toEqual([{ Nome: 'Ana; Silva', Obs: 'disse "oi"' }])
  })
})

describe('US-01 · Base única com ID comum', () => {
  const planilha = [
    { Nome: 'Ana Souza', 'Escritório': 'Souza Advocacia', Papel: 'Titular', WhatsApp: '(31) 99999-0001', 'E-mail': 'ana@souza.adv', CPF: CPF_TESTE, Produto: 'Trilha', 'Início': '01/03/2026' },
    { Nome: 'Bruno Lima', 'Escritório': 'Souza Advocacia', Papel: 'Sócio', WhatsApp: '31 99999-0002', 'E-mail': 'bruno@souza.adv', CPF: '', Produto: 'Trilha', 'Início': '01/03/2026' },
    { Nome: 'Ana Souza', 'Escritório': 'Souza Advocacia', Papel: 'Titular', WhatsApp: '+55 31 99999-0001', 'E-mail': '', CPF: '', Produto: 'Trilha', 'Início': '01/03/2026' },
    { Nome: 'Carla', 'Escritório': 'Escritório SÃ£o JosÃ©', Papel: 'Titular', WhatsApp: '31 99999-0003', 'E-mail': '', CPF: '', Produto: 'Confraria', 'Início': '' },
  ]

  it('cada aluno recebe um ID estável e os sócios ficam no mesmo escritório', async () => {
    const r = await importarLinhas(db, planilha, 'teste.csv', 'norman@teste')
    expect(r.pessoasNovas).toBe(3)
    expect(r.escritoriosNovos).toBe(2)
    const socios = await db.query<{ n: number }>(
      `SELECT count(DISTINCT escritorio_id)::int AS n FROM pessoas WHERE nome IN ('Ana Souza', 'Bruno Lima')`)
    expect(socios[0].n).toBe(1)
    const antes = await db.query<{ id: string }>(`SELECT id FROM pessoas WHERE nome = 'Ana Souza'`)
    await importarLinhas(db, planilha, 'teste.csv', 'norman@teste') // rodar de novo não duplica
    const depois = await db.query<{ id: string }>(`SELECT id FROM pessoas WHERE nome = 'Ana Souza'`)
    expect(depois).toEqual(antes)
    expect((await db.query(`SELECT 1 FROM matriculas`)).length).toBe(2)
  })

  it('mesmo identificador vira um só, e a divergência vai pra revisão', async () => {
    await importarLinhas(db, planilha, 'teste.csv', 'norman@teste')
    const r = await importarLinhas(db, [
      { Nome: 'Ana Souza Pereira', 'Escritório': 'Souza Advocacia', WhatsApp: '31999990001', 'E-mail': '' },
    ], 'outra-aba.csv', 'norman@teste')
    expect(r.pessoasMescladas).toBe(1)
    expect(r.pessoasNovas).toBe(0)
    const rev = await db.query<{ problema: string }>(`SELECT problema FROM revisoes`)
    expect(rev.map((x) => x.problema)).toContain('Registro duplicado com dados diferentes')
  })

  it('valor corrompido é corrigido e a correção fica registrada', async () => {
    const r = await importarLinhas(db, planilha, 'teste.csv', 'norman@teste')
    expect(r.correcoes).toBeGreaterThan(0)
    const [esc] = await db.query<{ nome: string }>(`SELECT nome FROM escritorios WHERE nome LIKE 'Escrit%São%'`)
    expect(esc.nome).toBe('Escritório São José')
    const aud = await db.query(`SELECT 1 FROM auditoria WHERE acao = 'importacao.corrigiu_texto'`)
    expect(aud.length).toBeGreaterThan(0)
  })

  it('CPF fica cifrado no banco', async () => {
    await importarLinhas(db, planilha, 'teste.csv', 'norman@teste')
    const [r] = await db.query<{ cpf_cifrado: string }>(`SELECT cpf_cifrado FROM dados_restritos LIMIT 1`)
    expect(r.cpf_cifrado).not.toContain('529')
  })
})

describe('US-02 · Painel com papéis', () => {
  it('papel sem permissão não vê CPF, RG e endereço; quem pode vê e fica registrado', async () => {
    await importarLinhas(db, [
      { Nome: 'Ana Souza', 'Escritório': 'Souza Advocacia', WhatsApp: '31999990001', CPF: CPF_TESTE },
    ], 'teste.csv', 'norman@teste')
    const [esc] = await db.query<{ id: string }>(`SELECT id FROM escritorios`)

    const doNorman = await fichaDoEscritorio(db, NORMAN, esc.id)
    expect(doNorman!.pessoas[0].restrito).toBeUndefined()
    expect(JSON.stringify(doNorman)).not.toContain('52998224725')

    const doHoklo = await fichaDoEscritorio(db, HOKLO, esc.id)
    expect(doHoklo!.pessoas[0].restrito!.cpf).toBe('52998224725')
    const aud = await db.query(`SELECT 1 FROM auditoria WHERE acao = 'ficha.ver_restrito' AND quem = 'hoklo@teste'`)
    expect(aud.length).toBe(1)
  })
})

describe('US-03 · Trilha de auditoria', () => {
  it('auditoria não pode ser alterada nem apagada', async () => {
    await auditar(db, { quem: 'x', acao: 'teste' })
    await expect(db.query(`UPDATE auditoria SET acao = 'mudou'`)).rejects.toThrow(/só de inserção/)
    await expect(db.query(`DELETE FROM auditoria`)).rejects.toThrow(/só de inserção/)
  })

  it('proposta, aprovação e execução ficam registradas com quem e o quê', async () => {
    const { id } = await proporItem(db, { agente_id: 'cs', tipo: 'pergunta_sem_resposta', titulo: 'Ana perguntou e ninguém respondeu', rascunho: 'Oi, Ana!', evidencia: 'msg de 12/11 10h' })
    await decidir(db, HOKLO, id, { tipo: 'aprovar' })
    await marcarExecutado(db, 'cs', id, true, 'enviado')
    const acoes = (await db.query<{ acao: string; quem: string }>(`SELECT acao, quem FROM auditoria ORDER BY id`))
    expect(acoes).toEqual([
      { acao: 'fila.propor', quem: 'agente:cs' },
      { acao: 'fila.aprovar', quem: 'hoklo@teste' },
      { acao: 'fila.executou', quem: 'agente:cs' },
    ])
  })
})

describe('Fila de decisões e execução com aprovação', () => {
  it('nada sai sem aprovação, e executor não aprova', async () => {
    const { id } = await proporItem(db, { agente_id: 'cs', tipo: 't', titulo: 'x', rascunho: 'oi' })
    expect(await aprovadosParaExecutar(db, 'cs')).toHaveLength(0)
    await expect(decidir(db, NORMAN, id, { tipo: 'aprovar' })).rejects.toThrow(/não aprova/)
    await decidir(db, HOKLO, id, { tipo: 'ajustar', texto: 'Oi, tudo bem?' })
    const prontos = await aprovadosParaExecutar(db, 'cs')
    expect(prontos[0].texto_final).toBe('Oi, tudo bem?')
  })

  it('mesma proposta duas vezes entra uma vez só, e marcar executado duas vezes não quebra', async () => {
    const a = await proporItem(db, { agente_id: 'cs', tipo: 't', titulo: 'x', chave_idem: 'msg-123' })
    const b = await proporItem(db, { agente_id: 'cs', tipo: 't', titulo: 'x', chave_idem: 'msg-123' })
    expect(b).toEqual({ id: a.id, novo: false })
    await decidir(db, HOKLO, a.id, { tipo: 'aprovar' })
    await marcarExecutado(db, 'cs', a.id, true, 'ok')
    const de_novo = await marcarExecutado(db, 'cs', a.id, true, 'ok')
    expect(de_novo.estado).toBe('executado')
  })

  it('descartar exige motivo', async () => {
    const { id } = await proporItem(db, { agente_id: 'cs', tipo: 't', titulo: 'x' })
    await expect(decidir(db, HOKLO, id, { tipo: 'descartar', motivo: ' ' })).rejects.toThrow(/motivo/)
  })

  it('botão de parar: agente parado não recebe nada pra executar', async () => {
    const { id } = await proporItem(db, { agente_id: 'cs', tipo: 't', titulo: 'x', rascunho: 'oi' })
    await decidir(db, HOKLO, id, { tipo: 'aprovar' })
    await alternarParada(db, HOKLO, 'cs')
    expect(await aprovadosParaExecutar(db, 'cs')).toHaveLength(0)
    await expect(alternarParada(db, NORMAN, 'cs')).rejects.toThrow(/não para/)
  })
})

describe('US-04 · Segredos', () => {
  it('a chave do agente não fica guardada, só o hash', async () => {
    const chave = await novaChave(db, 'cs', 'norman@teste')
    const [a] = await db.query<{ chave_hash: string }>(`SELECT chave_hash FROM agentes WHERE id = 'cs'`)
    expect(a.chave_hash).not.toContain(chave)
    expect((await agentePelaChave(db, `Bearer ${chave}`))?.id).toBe('cs')
    expect(await agentePelaChave(db, 'Bearer chave-errada')).toBeNull()
    const aud = await db.query<{ t: string }>(`SELECT row_to_json(a)::text AS t FROM auditoria a`)
    expect(aud.map((x) => x.t).join()).not.toContain(chave)
  })
})
