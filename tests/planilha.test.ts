/**
 * Agente de contratos · registro na planilha Gestão Contratos Trilha (contratos.md, passos 2 e 8).
 * Todos os dados aqui são INVENTADOS. CPF 529.982.247-25 só passa no cálculo.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { CABECALHO, planejarRegistro, type DadosContrato, type PlanilhaContratos, type Valor } from '@/lib/planilha-contratos'
import { rodadaContratos } from '@/lib/agente-contratos'
import type { Contratante, Conferencia, Pagamento } from '@/lib/contratos'
import { bancoLocal, type Banco } from '@/lib/db'

const maria: Contratante = {
  nome: 'Maria Exemplo da Silva', documento: '529.982.247-25', endereco: 'Rua das Flores, 100', bairro: 'Centro',
  cidadeEstado: 'Belo Horizonte/MG', cep: '30.100-000', estadoCivil: 'Casada', rg: 'MG-1', email: 'maria@exemplo-ficticio.com.br',
  telefone: '(31) 99999-0000',
}
const pagamento: Pagamento = { valor: 'R$ 20.000,00', forma: '[PIX]', parcelas: '2', vencimentos: 'R$ 10.000,00 em 17/11 e R$ 10.000,00 em 15/01', observacoes: '' }
const pronto: Conferencia = { pronto: true, falta: [], avisos: [], resumo: { primeiroNome: 'Maria', contratantes: 1, documento: 'CPF', parcelas: 2, vigenciaMeses: 12 } }
const travado: Conferencia = { ...pronto, pronto: false, falta: ['CEP', 'bairro'] }
const dados = (o: Partial<DadosContrato> = {}): DadosContrato => ({ contratantes: [maria], pagamento, conferencia: pronto, hoje: '18/11/2026', ...o })

const CAIXINHAS = ['Mensagem enviada', 'Dados recebidos', 'Contrato pronto', 'Enviado no AppSing', 'Assinado']
/** Linha da planilha com as 20 colunas, como a API devolve (caixinha = "TRUE"/"FALSE"). */
function linha(v: Partial<Record<string, string>>): string[] {
  return CABECALHO.map((n) => v[n] ?? (CAIXINHAS.includes(n) ? 'FALSE' : ''))
}
const outra = linha({ 'Nº': '7', 'Contratante no contrato': 'Outra Pessoa', 'CPF/CNPJ do contratante': '111.444.777-35' })

describe('planilha de contratos · o que escrever', () => {
  it('acha a linha pelo CPF e completa só o que está em branco', () => {
    const daVenda = linha({
      'Nº': '8', 'Comprador (Hotmart)': 'Maria E. Silva', 'CPF/CNPJ do contratante': '52998224725',
      'E-mail': 'escrito-a-mao@x.com', 'Forma de pagamento': 'Cartão de crédito',
    })
    const p = planejarRegistro([CABECALHO, outra, daVenda], dados())!
    expect(p.registro).toMatchObject({ linha: 3, nova: false })
    const refs = Object.fromEntries(p.celulas.map((c) => [c.ref, c.valor]))
    expect(refs).toMatchObject({ D3: 'Maria Exemplo da Silva', G3: '(31) 99999-0000', I3: 20000, Q3: true })
    expect(refs).not.toHaveProperty('F3') // e-mail escrito à mão fica
    expect(refs).not.toHaveProperty('H3') // forma escrita à mão fica
    expect(refs).not.toHaveProperty('E3')
  })

  it('sem CPF na planilha, acha pelo nome do contratante ou do comprador (sem acento e maiúscula)', () => {
    const daVenda = linha({ 'Comprador (Hotmart)': 'MARIA EXEMPLO DA SILVA' })
    expect(planejarRegistro([CABECALHO, outra, daVenda], dados())!.registro.linha).toBe(3)
  })

  it('sem linha do cliente, cria no fim com o próximo número e as caixinhas', () => {
    const p = planejarRegistro([CABECALHO, outra], dados({ conferencia: travado }))!
    expect(p.registro).toMatchObject({ linha: 3, nova: true })
    const refs = Object.fromEntries(p.celulas.map((c) => [c.ref, c.valor]))
    expect(refs).toMatchObject({ A3: 8, D3: 'Maria Exemplo da Silva', H3: 'PIX', I3: 20000, L3: 'CEP; bairro', Q3: false, S3: false })
    expect(String(refs.T3)).toContain('Completar data da venda')
  })

  it('linha nova entra logo depois do último cliente, mesmo com caixinhas prontas embaixo', () => {
    const p = planejarRegistro([CABECALHO, outra, linha({}), linha({})], dados())!
    expect(p.registro).toMatchObject({ linha: 3, nova: true })
  })

  it('caixinha "Contrato pronto" nunca é desmarcada pelo agente', () => {
    const cheia = linha({
      'CPF/CNPJ do contratante': '529.982.247-25', 'Contrato pronto': 'TRUE', 'Contratante no contrato': 'x', 'E-mail': 'x',
      'WhatsApp': 'x', 'Forma de pagamento': 'x', 'Valor total (R$)': 'x', 'Detalhe do pagamento': 'x', 'Dados a solicitar': 'x',
    })
    expect(planejarRegistro([CABECALHO, cheia], dados({ conferencia: travado }))).toBeNull()
  })

  it('cabeçalho fora da ordem: não escreve nada', () => {
    const trocado = [...CABECALHO]
    ;[trocado[4], trocado[5]] = [trocado[5], trocado[4]]
    expect(() => planejarRegistro([trocado, outra], dados())).toThrow('cabeçalho')
  })

  it('contrato sem nome e sem CPF não cria linha (ia repetir a cada versão)', () => {
    expect(planejarRegistro([CABECALHO], dados({ contratantes: [{ ...maria, nome: '', documento: '' }] }))).toBeNull()
  })
})

describe('planilha de contratos · dentro da rodada', () => {
  let db: Banco
  beforeEach(async () => {
    db = await bancoLocal()
    await db.query(`INSERT INTO agentes (id, nome, dono) VALUES ('contratos', 'Agente de contratos', 'Norman')`)
  })

  /** Planilha em memória que aplica o que o agente escreve. */
  function memoria(linhas: string[][]): PlanilhaContratos & { linhas: string[][] } {
    return {
      linhas,
      ler: async () => linhas.map((l) => [...l]),
      escrever: async (celulas: { ref: string; valor: Valor }[]) => {
        for (const c of celulas) {
          const col = c.ref.charCodeAt(0) - 65
          const n = Number(c.ref.slice(1)) - 1
          while (linhas.length <= n) linhas.push(CABECALHO.map(() => ''))
          linhas[n][col] = typeof c.valor === 'boolean' ? String(c.valor).toUpperCase() : String(c.valor)
        }
      },
    }
  }

  const html = () => `<html><body><p><span>CONTRATANTE:</span></p><table><tbody>
    <tr><td><p><span>NOME COMPLETO</span></p><p><span>Maria Exemplo da Silva</span></p></td><td><p><span>CPF</span></p><p><span>529.982.247-25</span></p></td></tr>
  </tbody></table></body></html>`

  it('o contrato conferido vira linha; a auditoria guarda só a linha e as colunas', async () => {
    const p = memoria([CABECALHO, outra])
    await rodadaContratos(db, [{ id: 'doc1', nome: 'Contrato Maria', versao: 'v1', html: html() }], p)
    expect(p.linhas).toHaveLength(3)
    expect(p.linhas[2][3]).toBe('Maria Exemplo da Silva')
    const [a] = await db.query<{ depois: unknown }>(`SELECT depois FROM auditoria WHERE acao = 'planilha.nova_linha'`)
    expect(JSON.stringify(a.depois)).not.toMatch(/529|Maria/)
  })

  it('planilha fora do ar não segura a fila: o contrato entra e o erro vai pra auditoria', async () => {
    const quebrada: PlanilhaContratos = { ler: async () => { throw new Error('Sheets fora (503)') }, escrever: async () => {} }
    const r = await rodadaContratos(db, [{ id: 'doc2', nome: 'Contrato Maria', versao: 'v1', html: html() }], quebrada)
    expect(r.novos).toBe(1)
    expect(await db.query(`SELECT 1 FROM fila`)).toHaveLength(1)
    const [e] = await db.query<{ evidencia: string }>(`SELECT evidencia FROM auditoria WHERE acao = 'agente.erro'`)
    expect(e.evidencia).toContain('Sheets fora')
  })
})
