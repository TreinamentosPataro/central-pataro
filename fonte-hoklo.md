# O que o Hoklo pediu (fonte)

> Material recebido do Henrique Hoklo. Os resumos das 4 atividades foram repassados em 16/11/2026
> e o documento do agente de CS é de 12/11/2026. Está guardado aqui como referência; as respostas
> do Norman ficam nos outros arquivos desta pasta.

## As 4 atividades

### 1 de 4 · Central (P0)
- Mapear ferramentas e custo.
- Desenhar como os agentes se ligam e como todo mundo acessa.
- Entregar o plano e depois colocar no ar.

Início 13/11. Planejamento (ferramentas, custo, fluxo, acesso) até **17/11**. No ar até **20/11**.
P0: vem antes de tudo e corre em paralelo com as outras frentes.

### 2 de 4 · CS (P1)
- Ler o Plano de Automação CS (enviado em 12/11).
- Entregar como a plataforma vai funcionar e como a ferramenta entra.

Fase 1 semiautomática; Fase 2 totalmente automática vem depois. Início 12/11, prazo **18/11**.
Norman executa, Hoklo planeja. **Pronto quando:** o Hoklo aprova o desenho da Fase 1.

### 3 de 4 · Contratos (P2)
- Pegar a minuta salva na pasta do Drive.
- Subir no ZapSign (a Ana Paula já liberou o acesso pelo e-mail gestão) e enviar pra assinatura
  automaticamente.
- Conferir todo dia se tem contrato novo.
- Reunião com o Hoklo pra ele mostrar o fluxo (acionar ele).

Início 13/11, prazo **18/11**. **Pronto quando:** um contrato real da Trilha sobe e vai pra assinatura
sem trabalho manual. Se faltar nome, CPF ou e-mail, o agente avisa o comercial. Links no painel, em Contratos.

### 4 de 4 · SDR (P2)
- Estudar a aula do Thales Leray, Fase 6 (comercial inteiro).
- Adaptar o modelo pronto pra nossa operação.
- Montar e testar o agente dentro do Claude.

Estudo já começou. Construção a partir de **19/11**, prazo **23/11**. **Pronto quando:** o agente atende
um lead de teste do primeiro contato até o contrato, e o Hoklo e o Fred aprovam. Links no painel, em SDR.

---

## Documento do agente de CS (Hoklo, 12/11/2026), resumido

### Camada 1 — Macro

**Pitch:** o agente acompanha cada escritório da primeira call à renovação, cruza tudo o que se sabe
dele e diz ao Henrique e ao Fred quem precisa de quê antes de o aluno esfriar. Meta do Fred: pelo menos
15 vendas por mês, então a carteira cresce mais rápido do que o acompanhamento manual dá conta.

**O agente lê, cruza e propõe. Pessoas decidem e enviam.**
- Registra, a partir da call comercial, o objetivo que o aluno declarou
- Abre a ficha quando a venda é avisada e confirma o recebimento no grupo Vendas
- Acompanha onboarding, Raio-X e plano de ação; avisa o que está parado ou atrasado
- Cruza plano, grupos, SDEs, aulas e ranking: quem avança, quem trava, quem esfriou
- Monta a fila de decisões pro Henrique e o Fred, com evidência e rascunho de mensagem
- Prepara as rotinas: ranking mensal, ativação dos grupos, agenda dos mentores, publicação de aulas
- Vigia os grupos: propaganda não alinhada e discriminação
- Antecipa renovação e Confraria, mostrando o valor entregue

**Não faz:** cobrar, negociar, cancelamento, reclamação, remover alguém de grupo.

**Etapas e ferramentas**

| # | Etapa | O que analisa | Ferramentas |
|---|---|---|---|
| 1 | Lead e call de diagnóstico | Objetivo, dores, promessas | Meet, pasta de calls no Drive, notas do closer no Drive |
| 2 | Venda e pagamento | Aviso de venda, dados do contrato | Grupo Vendas (WhatsApp), Trello, Hotmart |
| 3 | Boas-vindas | Formulário, sócios | Google Forms hoje, Typebot no novo fluxo |
| 4 | Onboarding | Agendamento, realização, gravação | Google Agenda e Meet, Trello |
| 5 | Raio-X | Envio, prazo, respostas | App do Raio-X, PDF anexado ao Trello |
| 6 | Plano de ação | Entrega, cartões feitos, atrasados, parados | App do plano de ação |
| 7 | Acompanhamento | Grupos, presença nas SDEs, aulas, ranking | WhatsApp, Drive (SDEs), Educa → Hotmart, planilha do ranking |
| 8 | Renovação e Confraria | Vencimento, valor entregue, elegibilidade | Base de alunos, Hotmart |
| ∞ | Aulas novas | Gravação sem publicação | Drive, Educa → Hotmart |
| ∞ | Grupos | Ativação semanal, regras de convivência | WhatsApp |
| ∞ | Mentores | Agenda e confirmações da semana | Grupo Mentores (WhatsApp) |

**Autonomia em 3 níveis:**
- Sozinho: ler fontes, cruzar sinais, alertar, gerar relatórios
- Propõe e humano aprova: qualquer mensagem pra aluno ou grupo, publicar aula, divulgar ranking, mudar
  status ou vencimento
- Só humano: cancelamento, reclamação, dinheiro, exceção, remover membro, bloquear acesso

Os três usam o mesmo painel central, sem depender do computador de cada um. No início, o que for aprovado
é executado num computador dedicado com WhatsApp Web. API oficial só na fase 5.

**Pendências do macro:** escopo e 5 fases (Fred); propaganda permitida nos grupos (Fred); indicadores de
sucesso (Fred e Hoklo); responsável de CS hoje e quem cobre ausência (Hoklo); Trello continua? (Hoklo);
link e perguntas do formulário de ranking (Hoklo; o link recebido abre a planilha de boas-vindas);
planilha da Confraria 2027 e lista completa dos grupos (Hoklo); onde ficam as notas das calls de novembro
(Hoklo); trocar a senha do CRM compartilhada em chat (Hoklo).

### Camada 2 — Micro (pro Norman)

**Método:** spec versionada no repositório (`docs/specs` + `CLAUDE.md` na raiz); épico → história → tarefa,
com ID (US-01), fase, MoSCoW e dependências; histórias "Como [papel], quero…, para…"; aceite em
Dado/Quando/Então, cada critério vira teste antes do código; decisões em ADR; modo sombra antes de qualquer
envio; conjunto de avaliação com casos reais rodado a cada mudança de prompt ou modelo; Definition of Ready
(fonte acessível, aceite, dono) e of Done (teste, auditoria, permissão, demo pro Hoklo, doc atualizada).

**MVP (primeiro marco = enxergar e começar a sugerir; nada sai pro aluno sozinho):**
- Dentro: base única com ID comum + importação da planilha; painel com login e papéis; leitura de calls e
  notas, plano, Raio-X, ranking, grupo Vendas e grupos; ficha 360; fila de decisões com evidência e rascunho
- Fora: envio automático, API oficial do WhatsApp, modelo preditivo treinado, publicação automática de aulas

**Premissas:** WhatsApp Web no início; toda ação pro aluno passa pelo Hoklo ou o Fred; consentimento de
dados já está no contrato; fontes em 3 contas Google (comercial, gestão, mentores); aulas migram da Educa
pra Hotmart. **Restrições:** painel acessível aos três sem rodar no computador de ninguém; CPF, RG e
endereço em área restrita; senha e token nunca em chat.

**Fluxo que não muda:** fontes entram → base única guarda → regras e IA leem → fila apresenta → uma pessoa
aprova → só então algo executa. Tudo deixa rastro na auditoria. Stack e hospedagem são do Norman.

**Modelo de dados proposto:** Escritório, Pessoa, Matrícula, Jornada, Objetivo, Fonte, Sinal, Interação,
Saúde, Item de fila, Ação executada, Evento de auditoria. O Norman define IDs, dono de cada coluna e regra
de duplicidade.

**Épicos:** E0 Fundação (fase 1) · E1 Ingestão (2) · E2 Ficha 360 e saúde (2–3) · E3 Fila de decisões (3) ·
E4 Execução com aprovação (4) · E5 Rotinas (4) · E6 Predição e retenção (5).

**Histórias detalhadas (fases 1 e 2):**
- US-01 Base única com ID comum (Must): ID estável, sócios ligados ao escritório, duplicados viram um só
  com divergência listada, valor corrompido ("NÃ£o") corrigido e registrado
- US-02 Painel com login e papéis (Must): cada papel vê o que pode; sem permissão, CPF/RG/endereço somem
- US-03 Trilha de auditoria (Must): leitura, sugestão, aprovação e execução registram quem, quando, o quê
  e evidência
- US-04 Segredos e contas de serviço (Must): Drive lido por conta de serviço só nas pastas definidas;
  credencial nunca em log, chat ou repositório
- US-05 Calls do Drive viram ficha (Must): call nova detectada, transcrição ligada ao lead; objetivo, dores
  e promessas com trecho de origem, marcados dito/inferido; campo de alto impacto fica "a revisar"; vínculo
  com grafia diferente vira sugestão
- US-06 Grupo Vendas abre a ficha (Must): "Mensagem padrão para novo cliente" ou comprovante abre a ficha;
  rascunho de confirmação no grupo, só com aprovação
- US-07 Plano de ação vira sinais (Must): cartões por estado, prazo e atraso; cartão parado vira sinal
- US-08 Raio-X na ficha (Should): respostas na ficha, Fred avisado
- US-09 Ranking vira sinal (Should): variação do faturamento mês a mês, queda sinalizada
- US-10 Grupos viram sinais (Should): pergunta sem resposta vira alerta; grupo fora da lista não é lido

**Catálogo de eventos:** aviso de venda (propõe, fase 3) · call gravada (sozinho com revisão, 2) ·
boas-vindas (sozinho, 2) · Raio-X (sozinho, 2) · cartão atrasado (propõe, 3) · marco concluído (propõe, 3) ·
queda no ranking (propõe, 3) · pergunta sem resposta (propõe, 3) · mensagem fora das regras (alerta
privado, 3) · reclamação ou cancelamento (só humano, 3) · virada do mês (propõe, 4) · SDE ou aula gravada
(propõe, 4) · segunda de manhã, agenda dos mentores (propõe, 4) · vencimento se aproxima (propõe, 5).
Janelas (dias sem contato, 90/60/30 dias pro vencimento) são parâmetros.

**Não funcionais:** menor privilégio; dado sensível em área separada; segredos em cofre; só lista
permitida de grupos e pastas; retenção definida com o jurídico; ação idempotente e registrada; falha
repete com limite e avisa; botão de parar pro Hoklo e o Fred; modo sombra antes de qualquer envio;
extração cita trecho e marca dito/inferido; campo de alto impacto com confirmação humana até atingir o
nível combinado.

**Fatias (duração definida pelo Norman):**
1. Painel no ar, login e uma ficha real com dados importados
2. Call, grupo Vendas e plano de ação na ficha
3. Raio-X, ranking e grupos gerando sinais e saúde com motivo
4. Fila de decisões com rascunhos, em modo sombra
5. Execução aprovada e as primeiras rotinas

**Perguntas pro Norman:** respondidas em [`cs-respostas.md`](cs-respostas.md).
