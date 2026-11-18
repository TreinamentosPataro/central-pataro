/**
 * Agente de contratos (contratos.md): conferir o contrato que o comercial preencheu antes da assinatura.
 * Todos os dados aqui são INVENTADOS. CPF 529.982.247-25 e CNPJ 11.222.333/0001-81 só passam no cálculo.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { avisoComercial, cnpjValido, conferirContrato, lerHtmlDoGoogle, lerReais } from '@/lib/contratos'
import { rodadaContratos } from '@/lib/agente-contratos'
import { conferirPasta, type FonteContratos } from '@/lib/rodada-contratos'
import { bancoLocal, type Banco } from '@/lib/db'

interface Opcoes {
  nome?: string
  cpf?: string
  endereco?: string
  bairro?: string
  cidade?: string
  cep?: string
  email?: string
  telefone?: string
  valor?: string
  forma?: string
  parcelas?: string
  vencimentos?: string
  observacoes?: string
  vigencia?: number
  vigencia61?: number
  amarelo?: string
  segundo?: boolean
}

/** Imita o HTML que o Google Docs exporta: rótulo em negrito e o valor na mesma célula. */
function contrato(o: Opcoes = {}): string {
  const v = (x: string | undefined, padrao: string) => (x === undefined ? padrao : x)
  const cel = (rotulo: string, valor: string) =>
    `<td class="c3"><p class="c2"><span class="c1">${rotulo}</span></p><p class="c2"><span class="c4">${valor}</span></p></td>`
  const tabelaContratante = (nome: string) => `<table><tbody>
    <tr>${cel('NOME COMPLETO&nbsp;', nome)}${cel('CPF&nbsp;', v(o.cpf, '529.982.247-25'))}</tr>
    <tr>${cel('ENDERE&Ccedil;O (RUA, AV., ESTRADA e N&ordm;)&nbsp;', v(o.endereco, 'Rua das Flores, 100'))}${cel('BAIRRO&nbsp;', v(o.bairro, 'Centro'))}${cel('CIDADE/ESTADO&nbsp;', v(o.cidade, 'Belo Horizonte/MG'))}${cel('CEP&nbsp;', v(o.cep, '30.100-000'))}</tr>
    <tr>${cel('ESTADO CIVIL&nbsp;', 'Casada')}${cel('N&ordm; RG&nbsp;', 'MG-1.234.567')}${cel('ORG&Atilde;O/UF EXP.&nbsp;', 'SSP/MG')}</tr>
    <tr>${cel('E-MAIL&nbsp;', v(o.email, 'exemplo@escritorio-ficticio.com.br'))}${cel('N&ordm; TELEFONE&nbsp;', v(o.telefone, '(31) 99999-0000'))}</tr>
  </tbody></table>`
  const meses = o.vigencia ?? 12
  const m61 = o.vigencia61 ?? meses
  const linha = (a: string, b: string) => `<tr><td><p><span>${a}</span></p></td><td><p><span>${b}</span></p></td></tr>`
  return `<html><head><style>.c1{font-weight:700}.c4{color:#000}.c9{background-color:#ffff00}</style></head><body>
    <p><span class="c1">CONTRATANTE:</span></p>
    ${tabelaContratante(v(o.nome, 'Maria Exemplo da Silva'))}
    ${o.segundo ? tabelaContratante('Jo&atilde;o Exemplo Souza') : ''}
    <p><span class="c1">CONTRATADA:</span></p>
    <table><tbody><tr><td><p><span>RAZ&Atilde;O SOCIAL / NOME FANTASIAPATARO TREINAMENTOS E DESENVOLVIMENTOS LTDA.</span></p></td></tr>
      <tr>${cel('ENDERE&Ccedil;O (RUA, AV., ESTRADA e N&ordm;)&nbsp;', 'Endere&ccedil;o da Pataro, 1')}${cel('E-MAIL&nbsp;', 'contato@pataro-exemplo.com.br')}</tr></tbody></table>
    <p><span>1.1. O presente instrumento tem por objeto a compra de Infoproduto pela CONTRATANTE, com servi&ccedil;o de acompanhamento por ${meses} (doze) meses</span></p>
    <p><span>b) 20% referentes aos servi&ccedil;os de suporte, orienta&ccedil;&atilde;o e acompanhamento prestados durante o per&iacute;odo de ${meses} (doze) meses</span></p>
    <p><span>2.6. A parcela correspondente ao acompanhamento ser&aacute; prestada ao longo de ${meses} (doze) meses</span></p>
    <p><span>6.1. O presente Contrato ter&aacute; vig&ecirc;ncia pelo prazo de ${m61} (doze) meses</span></p>
    ${o.amarelo ? `<p><span class="c9">${o.amarelo}</span></p>` : ''}
    <table><tbody>
      ${linha('Valor:', v(o.valor, 'R$ 20.000,00'))}
      ${linha('Forma de Pagamento:', v(o.forma, 'Pix e cart&atilde;o de cr&eacute;dito'))}
      ${linha('Quantidade de Parcelas:', v(o.parcelas, '2 PARCELAS'))}
      ${linha('Vencimentos:', v(o.vencimentos, 'R$ 10.000,00 no Pix em 17/11/2026 e R$ 10.000,00 no cart&atilde;o em 15/01/2027'))}
      ${linha('Observa&ccedil;&otilde;es:', v(o.observacoes, 'Pagamento pelo link Hotmart.'))}
    </tbody></table>
    <p><span>Belo Horizonte (MG), 17 de novembro de 2026.</span></p>
  </body></html>`
}

const conferir = (o: Opcoes = {}) => conferirContrato(lerHtmlDoGoogle(contrato(o)))

describe('agente de contratos · conferência', () => {
  it('contrato completo fica pronto pra assinatura', () => {
    const c = conferir()
    expect(c.falta).toEqual([])
    expect(c.pronto).toBe(true)
    expect(c.resumo).toEqual({ primeiroNome: 'Maria', contratantes: 1, documento: 'CPF', parcelas: 2, vigenciaMeses: 12 })
  })

  it('campo em branco trava e diz qual', () => {
    const c = conferir({ email: '', cep: '' })
    expect(c.pronto).toBe(false)
    expect(c.falta).toContain('e-mail')
    expect(c.falta).toContain('CEP')
  })

  it('CPF com número errado trava', () => {
    expect(conferir({ cpf: '123.456.789-00' }).falta).toContain('CPF ou CNPJ com número inválido')
  })

  it('aceita CNPJ quando o contratante é sociedade', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true)
    const c = conferir({ cpf: '11.222.333/0001-81' })
    expect(c.pronto).toBe(true)
    expect(c.resumo.documento).toBe('CNPJ')
  })

  it('cidade sem estado, CEP curto e telefone sem DDD travam', () => {
    const c = conferir({ cidade: 'Belo Horizonte', cep: '30100', telefone: '99999-0000' })
    expect(c.falta).toEqual(expect.arrayContaining(['estado (UF) na cidade', 'CEP incompleto', 'telefone sem DDD ou incompleto']))
  })

  it('confere cada contratante quando tem mais de um', () => {
    const c = conferir({ segundo: true })
    expect(c.resumo.contratantes).toBe(2)
    expect(c.pronto).toBe(true)
  })

  it('quadro de pagamento igual ao exemplo da minuta trava', () => {
    const c = conferir({ valor: 'R$ 35.000,00', forma: '[Cartão de credito]', parcelas: '12 PARCELAS', vencimentos: 'Pago integral cartão no dia 08/09/2026,' })
    expect(c.falta).toContain('o quadro de pagamento está igual ao exemplo da minuta (R$ 35.000, pago em 08/09/2026)')
  })

  it('forma escolhida entre colchetes vale; a lista de opções da minuta trava', () => {
    expect(conferir({ forma: '[PIX]' }).pronto).toBe(true)
    expect(conferir({ forma: '[Pix e Boleto]' }).pronto).toBe(true)
    expect(conferir({ forma: '[PIX, CART&Atilde;O OU BOLETO BANC&Aacute;RIO]' }).falta)
      .toContain('a forma de pagamento ainda está com as opções da minuta ([PIX, CARTÃO OU BOLETO BANCÁRIO])')
  })

  it('parcelas em texto livre: vale o primeiro número, e texto sem número não trava', () => {
    expect(conferir({ parcelas: '1 parcela no pix e 10 parcelas no boleto' }).resumo.parcelas).toBe(1)
    const integral = conferir({ parcelas: 'Pago integralmente via cart&atilde;o de cr&eacute;dito' })
    expect(integral.falta).not.toContain('quantidade de parcelas')
    expect(conferir({ parcelas: '' }).falta).toContain('quantidade de parcelas')
  })

  it('cidade com só o nome do estado pede a cidade', () => {
    expect(conferir({ cidade: 'Minas Gerais' }).falta).toContain('cidade (só o estado foi preenchido)')
  })

  it('campo do cliente em branco não herda o da contratada (Pataro)', () => {
    const c = conferir({ endereco: '', email: '' })
    expect(c.falta).toEqual(expect.arrayContaining(['endereço', 'e-mail']))
  })

  it('parcelas que não fecham com o valor travam (o agente não corrige, só avisa)', () => {
    const c = conferir({ vencimentos: 'R$ 10.000,00 em 17/11 e R$ 8.000,00 em 15/01' })
    expect(c.falta.some((f) => f.startsWith('as parcelas descritas não fecham'))).toBe(true)
  })

  it('vigência de 15 meses é aviso; vigência diferente entre cláusulas trava', () => {
    const quinze = conferir({ vigencia: 15 })
    expect(quinze.pronto).toBe(true)
    expect(quinze.avisos).toContain('vigência de 15 meses (diferente do padrão de 12): confirmar que foi combinado')
    const torta = conferir({ vigencia: 12, vigencia61: 15 })
    expect(torta.falta.some((f) => f.startsWith('a vigência não bate entre as cláusulas'))).toBe(true)
  })

  it('marcação amarela não trava: o comercial pinta de amarelo o que preenche', () => {
    const c = conferir({ amarelo: 'R$ 20.000,00' })
    expect(c.pronto).toBe(true)
  })

  it('aviso pro comercial leva só o primeiro nome e o que falta, nunca CPF ou e-mail', () => {
    const c = conferir({ cep: '' })
    const msg = avisoComercial('Contrato Maria', c)
    expect(msg).toContain('Contrato de Maria travado')
    expect(msg).toContain('• CEP')
    expect(msg).not.toMatch(/529|982|@|Silva/)
  })

  it('lê valores em reais', () => {
    expect(lerReais('R$ 35.000,00')).toBe(35000)
    expect(lerReais('R$ 1.234,5')).toBe(1234.5)
    expect(lerReais('sem valor')).toBeNull()
  })
})

describe('agente de contratos · rodada na Central', () => {
  let db: Banco
  beforeEach(async () => {
    db = await bancoLocal()
    await db.query(`INSERT INTO agentes (id, nome, dono) VALUES ('contratos', 'Agente de contratos', 'Norman')`)
  })
  const fila = () => db.query<{ tipo: string; titulo: string; rascunho: string; destino: string; evidencia: string }>(`SELECT tipo, titulo, rascunho, destino, evidencia FROM fila ORDER BY criado_em`)

  it('contrato pronto vira item na fila pra subir no ZapSign, com a ordem de assinatura', async () => {
    const r = await rodadaContratos(db, [{ id: 'doc1', nome: 'Contrato Maria', versao: 'v1', html: contrato(), link: 'https://docs.google.com/document/d/doc1' }])
    expect(r).toEqual({ vistos: 1, novos: 1, prontos: 1, travados: 0 })
    const [item] = await fila()
    expect(item.tipo).toBe('contrato_pronto')
    expect(item.titulo).toBe('Contrato de Maria pronto pra assinatura')
    expect(item.destino).toBe('zapsign:trilha')
    expect(item.rascunho).toContain('o cliente → Fred (Pataro Treinamentos) → testemunhas: Hoklo e Ana Paula')
  })

  it('contrato travado vira aviso pro grupo do comercial, sem dado sensível', async () => {
    await rodadaContratos(db, [{ id: 'doc2', nome: 'Contrato Maria', versao: 'v1', html: contrato({ email: '', cep: '' }) }])
    const [item] = await fila()
    expect(item.tipo).toBe('contrato_travado')
    expect(item.destino).toBe('grupo:comercial')
    expect(JSON.stringify(item)).not.toMatch(/529\.982|Silva|Rua das Flores/)
  })

  it('a mesma versão não entra duas vezes; versão nova é conferida de novo', async () => {
    const travado = { id: 'doc3', nome: 'Contrato Maria', versao: 'v1', html: contrato({ cep: '' }) }
    await rodadaContratos(db, [travado])
    const segunda = await rodadaContratos(db, [travado])
    expect(segunda.novos).toBe(0)
    expect(await fila()).toHaveLength(1)
    const corrigido = await rodadaContratos(db, [{ ...travado, versao: 'v2', html: contrato() }])
    expect(corrigido.prontos).toBe(1)
    const itens = await fila()
    expect(itens.map((i) => i.tipo)).toEqual(['contrato_travado', 'contrato_pronto'])
    const [c] = await db.query<{ situacao: string }>(`SELECT situacao FROM contratos WHERE drive_id = 'doc3'`)
    expect(c.situacao).toBe('pronto')
  })

  it('contrato já enviado pro ZapSign não é mexido de novo', async () => {
    await rodadaContratos(db, [{ id: 'doc4', nome: 'X', versao: 'v1', html: contrato() }])
    await db.query(`UPDATE contratos SET situacao = 'enviado' WHERE drive_id = 'doc4'`)
    const r = await rodadaContratos(db, [{ id: 'doc4', nome: 'X', versao: 'v2', html: contrato({ cep: '' }) }])
    expect(r.novos).toBe(0)
  })
})

describe('agente de contratos · conferência da pasta (sozinho e pelo botão)', () => {
  let db: Banco
  beforeEach(async () => {
    db = await bancoLocal()
    await db.query(`INSERT INTO agentes (id, nome, dono) VALUES ('contratos', 'Agente de contratos', 'Norman')`)
  })

  const doc = (id: string, name: string, modifiedTime = 'v1', createdTime = '2026-11-18T10:00:00Z') =>
    ({ id, name, createdTime, modifiedTime, webViewLink: `https://docs.google.com/document/d/${id}` })

  /** Pasta inventada que conta quantos documentos foram baixados. */
  function pasta(docs: ReturnType<typeof doc>[], html: Record<string, string> = {}) {
    const baixados: string[] = []
    const fonte: FonteContratos = {
      listar: async () => docs,
      html: async (id) => { baixados.push(id); return html[id] ?? contrato() },
    }
    return { fonte, baixados }
  }

  it('deixa de fora a minuta, os modelos e os contratos de antes de 17/11', async () => {
    const { fonte, baixados } = pasta([
      doc('a', 'Contrato Maria'),
      doc('b', 'Minuta do Contrato'),
      doc('c', 'Cópia de Contrato Modelo'),
      doc('d', 'Contrato antigo', 'v1', '2026-10-02T10:00:00Z'),
    ])
    const r = await conferirPasta(db, fonte, '2026-11-17')
    expect(r).toMatchObject({ vistos: 1, novos: 1, prontos: 1 })
    expect(baixados).toEqual(['a'])
  })

  it('não baixa de novo o que não mudou; baixa quando o Bruno mexe no documento', async () => {
    const { fonte, baixados } = pasta([doc('a', 'Contrato Maria')], { a: contrato({ cep: '' }) })
    await conferirPasta(db, fonte, '2026-11-17')
    const segunda = await conferirPasta(db, fonte, '2026-11-17')
    expect(segunda.novos).toBe(0)
    expect(baixados).toEqual(['a'])

    const mexido = pasta([doc('a', 'Contrato Maria', 'v2')])
    const r = await conferirPasta(db, mexido.fonte, '2026-11-17')
    expect(r).toMatchObject({ novos: 1, prontos: 1 })
  })

  it('com o botão de parar ligado, não lê a pasta', async () => {
    await db.query(`UPDATE agentes SET parado = true WHERE id = 'contratos'`)
    let leu = false
    const r = await conferirPasta(db, { listar: async () => { leu = true; return [] }, html: async () => '' })
    expect(r.parado).toBe(true)
    expect(leu).toBe(false)
  })

  it('erro do Google fica na auditoria como erro do agente', async () => {
    const quebrada: FonteContratos = { listar: async () => { throw new Error('Drive fora (500)') }, html: async () => '' }
    await expect(conferirPasta(db, quebrada)).rejects.toThrow('Drive fora')
    const [a] = await db.query<{ acao: string; evidencia: string }>(`SELECT acao, evidencia FROM auditoria WHERE quem = 'agente:contratos'`)
    expect(a.acao).toBe('agente.erro')
    expect(a.evidencia).toContain('Drive fora')
  })
})
