/**
 * Cadastra os usuários e os agentes da Central. Pode rodar de novo (não duplica).
 *   npm run db:semear            → usuários + agentes
 *   npm run db:semear -- --demo  → + 3 escritórios FICTÍCIOS e itens na fila, pra ver o painel funcionando
 *
 * Usuários: defina USUARIOS no .env.local, no formato  email|Nome|papel;email|Nome|papel
 * (papel: gerente, stakeholder ou executor). Sem isso, entram e-mails de exemplo.
 */
import { getBanco } from '../lib/db'
import { auditar } from '../lib/auditoria'
import { proporItem } from '../lib/fila'

const db = await getBanco()

const usuarios = (process.env.USUARIOS ??
  'fred@exemplo.local|Fred|stakeholder;hoklo@exemplo.local|Hoklo|gerente;norman@exemplo.local|Norman|executor')
  .split(';').map((s) => s.trim()).filter(Boolean).map((s) => {
    const [email, nome, papel] = s.split('|').map((x) => x.trim())
    return { email: email.toLowerCase(), nome, papel }
  })

for (const u of usuarios) {
  await db.query(
    `INSERT INTO usuarios (email, nome, papel) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome, papel = EXCLUDED.papel, ativo = true`,
    [u.email, u.nome, u.papel],
  )
}

// Prazos da reunião de 12/11/2026 e das atividades passadas pelo Hoklo em 13/11
const agentes = [
  ['cs', 'Agente de CS', 'Norman (Hoklo planeja)', '2026-11-18', 'Lê as fontes de cada aluno, cruza e propõe. Nada sai sem aprovação.', 1],
  ['contratos', 'Agente de contratos', 'Norman', '2026-11-18', 'Contrato da Trilha preenchido e enviado pro ZapSign. Faltou dado → avisa o comercial.', 2],
  ['sdr', 'Agente SDR', 'Norman', '2026-11-23', 'Atende o lead do primeiro contato até o contrato.', 3],
  ['trafego', 'Tráfego', 'Hoklo', '2026-11-20', null, 4],
  ['social', 'Social media', 'Hoklo', '2026-11-19', null, 5],
  ['financeiro', 'Agente financeiro', 'Hoklo', '2026-11-27', null, 6],
] as const

for (const [id, nome, dono, prazo, descricao, ordem] of agentes) {
  await db.query(
    `INSERT INTO agentes (id, nome, dono, prazo, descricao, ordem) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, dono = EXCLUDED.dono, prazo = EXCLUDED.prazo,
       descricao = EXCLUDED.descricao, ordem = EXCLUDED.ordem`,
    [id, nome, dono, prazo, descricao, ordem],
  )
}
await auditar(db, { quem: 'sistema', acao: 'semente.rodou', depois: { usuarios: usuarios.length, agentes: agentes.length } })
console.log(`${usuarios.length} usuários e ${agentes.length} agentes cadastrados.`)

if (process.argv.includes('--demo')) {
  // Dados FICTÍCIOS, só pra ver o painel. Nenhum aluno real.
  const demo = [
    { nome: 'Exemplo Advocacia A (fictício)', cidade: 'Belo Horizonte', uf: 'MG', etapa: 'plano_de_acao', cor: 'verde', motivo: 'Moveu 3 cartões do plano esta semana' },
    { nome: 'Exemplo Advocacia B (fictício)', cidade: 'Vitória', uf: 'ES', etapa: 'raio_x', cor: 'amarelo', motivo: 'Raio-X enviado há 9 dias, sem resposta' },
    { nome: 'Exemplo Advocacia C (fictício)', cidade: 'Goiânia', uf: 'GO', etapa: 'acompanhamento', cor: 'vermelho', motivo: 'Sem mexer no plano há 21 dias e pergunta sem resposta no grupo' },
  ]
  const ids: string[] = []
  for (const d of demo) {
    const chave = d.nome.toLowerCase()
    let [e] = await db.query<{ id: string }>(`SELECT id FROM escritorios WHERE nome_chave = $1`, [chave])
    if (!e) {
      ;[e] = await db.query<{ id: string }>(
        `INSERT INTO escritorios (nome, nome_chave, cidade, uf, responsavel_cs) VALUES ($1, $2, $3, $4, 'Hoklo') RETURNING id`,
        [d.nome, chave, d.cidade, d.uf],
      )
      await db.query(`INSERT INTO pessoas (escritorio_id, nome, papel) VALUES ($1, 'Titular de exemplo', 'titular')`, [e.id])
      await db.query(`INSERT INTO matriculas (escritorio_id, produto, inicio, vencimento) VALUES ($1, 'trilha', '2026-03-01', '2027-03-01')`, [e.id])
      await db.query(`INSERT INTO jornadas (escritorio_id, etapa) VALUES ($1, $2)`, [e.id, d.etapa])
      await db.query(`INSERT INTO saude (escritorio_id, cor, motivo) VALUES ($1, $2, $3)`, [e.id, d.cor, d.motivo])
      await db.query(`INSERT INTO sinais (escritorio_id, tipo, valor) VALUES ($1, 'exemplo', $2)`, [e.id, d.motivo])
      await db.query(
        `INSERT INTO objetivos (escritorio_id, texto, origem, trecho) VALUES ($1, 'Chegar a 30 contratos por mês', 'dito', 'quero chegar em uns 30 contratos por mês até o fim do ano')`,
        [e.id],
      )
    }
    ids.push(e.id)
  }
  await proporItem(db, {
    agente_id: 'cs', tipo: 'pergunta_sem_resposta', escritorio_id: ids[2], chave_idem: 'demo-1',
    titulo: 'Pergunta sem resposta há 2 dias no grupo (exemplo)',
    evidencia: 'Grupo de exemplo · "alguém tem o modelo de contrato de honorários?" · sem resposta',
    rascunho: 'Oi! Tem sim: o modelo está na aula "Contratos de honorários" da Trilha. Qualquer dúvida, chama aqui.',
    destino: 'grupo-exemplo',
  })
  await proporItem(db, {
    agente_id: 'cs', tipo: 'plano_parado', escritorio_id: ids[1], chave_idem: 'demo-2',
    titulo: 'Raio-X enviado há 9 dias sem resposta (exemplo)',
    evidencia: 'Raio-X enviado em 04/11 · prazo combinado 7 dias',
    rascunho: 'Oi! Passando pra saber se ficou alguma dúvida no Raio-X. Se quiser, a gente responde junto numa call rápida.',
  })
  await proporItem(db, {
    agente_id: 'contratos', tipo: 'contrato_novo', chave_idem: 'demo-3',
    titulo: 'Contrato da Trilha pronto pra enviar (exemplo)',
    evidencia: 'Venda avisada no grupo Vendas · nome, CPF e e-mail conferidos',
    rascunho: null,
  })
  console.log('Dados de demonstração (fictícios) criados.')
}
process.exit(0)
