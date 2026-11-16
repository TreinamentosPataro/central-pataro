/**
 * Primeira carga do Cérebro (16/11/2026). Só o que já está escrito em algum lugar:
 * contexto.md (site da Pataro, 01/10), reunião de contratos com o Hoklo (16/11) e as regras do plano do CS.
 * Conteúdo vazio = "a preencher": aparece no mapa como lacuna, com dono, até alguém escrever.
 * Nada de dado de aluno aqui.
 */
export interface VerbeteInicial {
  id: string
  tema: string
  titulo: string
  conteudo: string
  dono: string
  revisar_em: string | null
  fonte: string
}

const REVISAO = '2026-12-18'

export const VERBETES_INICIAIS: VerbeteInicial[] = [
  // ---------- Oferta e produtos ----------
  {
    id: 'catalogo', tema: 'oferta', titulo: 'Catálogo de produtos', dono: 'Fred', revisar_em: REVISAO,
    fonte: 'Site da Pataro (levantado em 01/10/2026)',
    conteudo: `Do degrau mais baixo pro mais alto:
0. E-book "Ferramentas pra alavancar na advocacia": grátis, captura e-mail. Isca de lead.
1. CMJ (Códigos do Mercado Jurídico): curso gravado + certificado + banco de currículos. Pra estagiário e advogado que não quer empreender.
2. Advocacia Previdenciária de Elite: gravado, aulas curtas + mentorias em grupo ao vivo. Pra advogado empreendedor montar escritório independente.
3. Mentoria Fórmula Previdenciária: 12 aulas ao vivo + modelos de petição, planilhas e checklists. Técnica, dos fundamentos às teses.
4. Mentoria Ação Previdenciários: mentoria intensiva pra equipe. Quem compra é o dono; quem faz são os funcionários.
5. Trilha Previdenciarista de Elite: 12 meses, híbrido, grupo com monitor. É o carro-chefe.
6. Confraria Previdenciária: mastermind de pares.
7. Confraria Experience: imersão anual de 3 dias.
Nenhuma página do site mostra preço: a venda vai pro WhatsApp comercial ou pra Hotmart.`,
  },
  {
    id: 'trilha', tema: 'oferta', titulo: 'Trilha Previdenciarista de Elite', dono: 'Fred', revisar_em: REVISAO,
    fonte: 'Site da Pataro + reunião de contratos (16/11/2026)',
    conteudo: `Programa de 12 meses, híbrido, com grupo e monitor. É o carro-chefe da Pataro.
Pra quem: escritório com 3 ou mais funcionários e faturamento acima de R$ 120 mil por ano. Tem seleção; abaixo disso, o aluno vai pro curso gravado.
Promessa: crescimento, organização e autogestão do escritório.
Aulas: no Curseduca, espaço "Programa Trilha Previdenciária de Elite" (16 cursos, 349 aulas, com modelos, planilhas e as Sessões de Direcionamento Estratégico).
Contrato: assinado no ZapSign depois do pagamento fechado. Vigência padrão de 12 meses; prazo diferente é exceção do comercial e tem que estar escrito no contrato.
Preço e condições de pagamento: a preencher.`,
  },
  {
    id: 'confraria', tema: 'oferta', titulo: 'Confraria Previdenciária', dono: 'Fred', revisar_em: REVISAO,
    fonte: 'Site da Pataro + contexto.md',
    conteudo: `Mastermind com encontros periódicos. Entra só quem já passou por um programa da Pataro ou foi indicado por um confrade.
É o que o Fred mais valoriza: a rede dele e o canal onde vende com mais facilidade.
Contrato anual, renovado uma vez por ano (pasta "Contratos Confraria 2027" no Drive).
Preço e o que está incluído: a preencher.`,
  },
  {
    id: 'elite', tema: 'oferta', titulo: 'Advocacia Previdenciária de Elite', dono: 'Fred', revisar_em: REVISAO,
    fonte: 'Site da Pataro + contagem do Curseduca (11/11/2026)',
    conteudo: `Curso gravado (Hotmart), com aulas curtas e mentorias em grupo ao vivo. Pra advogado empreendedor montar um escritório independente e automatizado.
Aulas: no Curseduca, espaço "Principal" (97 aulas). A Trilha tem uma cópia dele.
Preço: a preencher.`,
  },
  {
    id: 'acao', tema: 'oferta', titulo: 'Mentoria Ação Previdenciários', dono: 'Fred', revisar_em: REVISAO,
    fonte: 'Site da Pataro',
    conteudo: `Mentoria intensiva pra equipe do escritório: benefício, atendimento, negociação e ferramentas.
Quem compra é o dono do escritório; quem faz são os funcionários.
Preço e duração: a preencher.`,
  },
  {
    id: 'experience', tema: 'oferta', titulo: 'Confraria Experience', dono: 'Fred', revisar_em: '2026-12-01',
    fonte: 'Página do evento (01/10/2026)',
    conteudo: `Imersão anual de 3 dias pra donos de escritório previdenciário. Promessa: sair da rotina operacional.
5ª edição: 04 a 06/11/2026, Resort Vila Campana, saindo de BH.
Preço (2º lote): R$ 1.297 externo · R$ 1.097 mentorado · R$ 797 confrade.`,
  },

  // ---------- Políticas ----------
  {
    id: 'reembolso', tema: 'politicas', titulo: 'Reembolso e cancelamento', dono: 'Fred', revisar_em: null,
    fonte: 'Pedido ao Fred e ao Hoklo (até 18/11)', conteudo: '',
  },
  {
    id: 'autonomia-dos-agentes', tema: 'politicas', titulo: 'O que o agente faz sozinho e o que vai pra uma pessoa', dono: 'Hoklo', revisar_em: REVISAO,
    fonte: 'Plano de Automação CS do Hoklo (13/11/2026)',
    conteudo: `Sozinho: ler as fontes, cruzar sinais, alertar, gerar relatório.
Propõe e uma pessoa aprova: qualquer mensagem pra aluno ou grupo, publicar aula, divulgar ranking, mudar status ou vencimento.
Só uma pessoa: cancelamento, reclamação, dinheiro, exceção, remover membro, bloquear acesso.
Quem aprova: o Hoklo (gerente) ou o Fred (stakeholder).
O grupo de destino sai de uma tabela, nunca da IA. Mensagem de um plano nunca vai pro grupo de outro.`,
  },
  {
    id: 'contratos', tema: 'politicas', titulo: 'Regras dos contratos', dono: 'Hoklo', revisar_em: REVISAO,
    fonte: 'Reunião de contratos com o Hoklo (16/11/2026)',
    conteudo: `Contrato só vai pra assinatura com o pagamento fechado. O cliente pode ver a minuta antes, mas o fluxo só segue depois do pagamento.
Quem preenche: o comercial (Bruno), a partir da "Minuta do Contrato" no Drive (pasta 10 - Jurídico / Contratos Trilha). A condição de pagamento nasce na conversa e muda muito; o agente nunca muda condição, só confere e avisa.
ZapSign: sempre na organização Gestão Pataro. Ordem de assinatura: primeiro o cliente (ou os clientes), depois o Fred pela Pataro Treinamentos. Testemunhas: Hoklo e Ana Paula.
Vigência padrão: 12 meses. Prazo diferente é exceção e tem que estar escrito.
Faltou dado (nome, CPF, endereço, e-mail, telefone, quadro de pagamento): avisar o comercial no grupo do comercial, dizendo qual contrato e o que falta.`,
  },

  // ---------- Processo comercial ----------
  {
    id: 'do-contato-ao-contrato', tema: 'processo', titulo: 'Do primeiro contato ao contrato', dono: 'Hoklo', revisar_em: REVISAO,
    fonte: 'Reuniões de 12/11 e 16/11/2026',
    conteudo: `O caminho inteiro da Pataro: perfil → tráfego → SDR → closer → contrato → CS → entregáveis → financeiro.
Na venda: o comercial marca a reunião, faz a proposta, manda o link de pagamento. O cliente paga (Hotmart), o comercial confirma o pagamento e preenche o contrato. O agente de contratos confere, sobe no ZapSign e acompanha a assinatura.
Depois de assinado: parcelas fora do padrão da Hotmart vão pra planilha do financeiro a receber, e a auditoria confere se as vendas da Hotmart batem com os contratos.`,
  },
  {
    id: 'roteiro-sdr', tema: 'processo', titulo: 'Roteiro do SDR', dono: 'Norman', revisar_em: null,
    fonte: 'Aula do Thales Leray, Fase 6 (estudo até 19/11, SDR em 23/11)', conteudo: '',
  },

  // ---------- Números ----------
  { id: 'metas', tema: 'numeros', titulo: 'Metas de venda', dono: 'Fred', revisar_em: null, fonte: 'A pedir ao Fred', conteudo: '' },
  { id: 'alunos-ativos', tema: 'numeros', titulo: 'Alunos ativos por produto', dono: 'Hoklo', revisar_em: null, fonte: 'Planilha de alunos (5 abas)', conteudo: '' },

  // ---------- Tom e OAB ----------
  {
    id: 'oab', tema: 'tom', titulo: 'Regras da OAB', dono: 'Fred', revisar_em: REVISAO,
    fonte: 'Provimento 205/2021 e Código de Ética da OAB',
    conteudo: `O público é advogado. Toda peça de captação, publicidade ou marketing respeita o Provimento 205/2021 e o Código de Ética da OAB.
Não prometer resultado de processo nem de faturamento. Na dúvida, não sai sozinho: vai pra uma pessoa aprovar.`,
  },
  { id: 'tom-de-voz', tema: 'tom', titulo: 'Como a Pataro fala com o aluno', dono: 'Hoklo', revisar_em: null, fonte: 'A definir com o Hoklo', conteudo: '' },

  // ---------- Aulas ----------
  {
    id: 'onde-estao-as-aulas', tema: 'aulas', titulo: 'Onde estão as aulas', dono: 'Norman', revisar_em: REVISAO,
    fonte: 'Contagem do Curseduca (11/11/2026)',
    conteudo: `Curseduca (patarotreinamentos.curseduca.pro), em dois espaços:
- "Principal": curso Advocacia Previdenciária de Elite, 97 aulas.
- "Programa Trilha Previdenciária de Elite": 16 cursos, 349 aulas, com a cópia do Elite, os modelos e planilhas e as Sessões de Direcionamento Estratégico.
A busca da Pataro I.A acha a aula certa pra cada dúvida; o agente de CS usa essa busca pra indicar a aula na resposta.`,
  },

  // ---------- A empresa ----------
  {
    id: 'fred', tema: 'empresa', titulo: 'Quem é o Fred', dono: 'Fred', revisar_em: REVISAO,
    fonte: 'Site da Pataro',
    conteudo: `Frederico "Fred" Pataro, advogado previdenciarista há mais de 17 anos (método desde 2007). Começou o escritório numa cidade de 10 mil habitantes.
Prêmios: 8º escritório mais digital do Brasil (2023); melhor escritório previdenciário digital do Brasil (2024).
Comunidade de mais de 5 mil previdenciários. Método próprio: CTSD, "Contrato Todo Santo Dia".
Canais: Instagram @fredpataro (principal), YouTube, PataroCast.`,
  },
  {
    id: 'time', tema: 'empresa', titulo: 'Quem faz o quê no time', dono: 'Hoklo', revisar_em: REVISAO,
    fonte: 'Reunião de 12/11/2026',
    conteudo: `Fred: cronograma da Confraria, aulas do Elite, entregáveis junto com o Hoklo. Assina os contratos pela Pataro.
Hoklo: gerente da Central. Tráfego, social media, planejamento do CS, agente financeiro. Testemunha dos contratos.
Norman: constrói a Central e os agentes de CS, contratos e SDR.
Bruno: comercial; preenche os contratos.
Ana Paula: testemunha dos contratos; cuida do acesso ao ZapSign.`,
  },
]
