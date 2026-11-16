# Agente de CS Pataro — Documento por camadas (do Hoklo, 12/11/2026)

> Cópia do documento enviado pelo Hoklo, colada pelo Norman em 13/11/2026. Fonte original no Claude Docs.
> Respostas do Norman às perguntas abertas: `respostas-norman.md`.

## Camada 1 — Macro

Para: Fred (stakeholder), Henrique Norman (executor), Henrique Hoklo (gerente).

### Pitch

O Agente de CS acompanha cada escritório da Pataro, da primeira call à renovação, cruza tudo o que sabemos
sobre ele e diz ao Henrique e ao Fred quem precisa de quê antes de o aluno esfriar.

Hoje o CS depende de memória, WhatsApp e planilhas, e o problema aparece quando o aluno reclama. Com a meta de
pelo menos 15 vendas por mês definida pelo Fred, a carteira passa a crescer mais rápido do que um
acompanhamento manual consegue ler.

O agente lê as fontes, compara o que o aluno faz com o que ele disse querer na venda e entrega uma fila de
decisões, cada item com evidência e rascunho de mensagem. Nada sai para o cliente sem aprovação humana.

### O que o agente faz

O agente lê, cruza e propõe. Pessoas decidem e enviam.

- Registra, a partir da call comercial, o objetivo que cada aluno declarou querer.
- Abre a ficha do aluno quando a venda é avisada e confirma o recebimento no grupo Vendas.
- Acompanha onboarding, Raio-X e plano de ação e avisa o que está parado ou atrasado.
- Cruza plano, grupos, SDEs, aulas e ranking para saber quem avança, quem trava e quem esfriou.
- Monta uma fila de decisões para Henrique e Fred, com evidência e rascunho de mensagem.
- Prepara as rotinas: ranking mensal, ativação dos grupos, agenda dos mentores, publicação de aulas.
- Vigia os grupos e alerta sobre propaganda não alinhada e discriminação.
- Antecipa renovação e Confraria, mostrando o valor entregue.

O agente não cobra, não negocia, não trata cancelamento nem reclamação e não remove ninguém de grupo.

### Etapas analisadas e ferramentas

As sete primeiras etapas seguem a ordem da jornada de um aluno. As três últimas linhas rodam durante todo o ciclo.

| # | Etapa | O que o agente analisa | Ferramentas |
|---|---|---|---|
| 1 | Lead e call de diagnóstico | Objetivo declarado, dores, promessas feitas | Google Meet, pasta de calls no Drive, notas do closer no Drive |
| 2 | Venda e pagamento | Aviso de venda, dados do contrato | Grupo Vendas (WhatsApp), Trello, Hotmart |
| 3 | Boas-vindas | Formulário preenchido, sócios que participam | Google Forms hoje, Typebot no novo fluxo |
| 4 | Onboarding | Agendamento, realização, gravação | Google Agenda e Meet, Trello |
| 5 | Raio-X | Envio, prazo, respostas | App do Raio-X, PDF anexado ao Trello |
| 6 | Plano de ação | Entrega, cartões feitos, atrasados e parados | App do plano de ação |
| 7 | Acompanhamento | Perguntas e respostas nos grupos, presença nas SDEs, aulas, ranking | WhatsApp, Drive (SDEs), Educa e depois Hotmart, planilha do ranking |
| 8 | Renovação e Confraria | Vencimento, valor entregue, elegibilidade | Base de alunos, Hotmart |
| ∞ | Aulas novas | Gravação sem publicação | Drive, Educa e depois Hotmart |
| ∞ | Grupos | Ativação semanal, regras de convivência | WhatsApp |
| ∞ | Mentores | Agenda e confirmações da semana | Grupo Mentores (WhatsApp) |

### Como funciona na prática

O agente tem três níveis de autonomia, e a autonomia sobe por fase.

- **Sozinho:** ler fontes, cruzar sinais, alertar e gerar relatórios.
- **Propõe, humano aprova:** qualquer mensagem para aluno ou grupo, publicar aula, divulgar o ranking, mudar status ou vencimento.
- **Só humano:** cancelamento, reclamação, dinheiro, exceção, remover membro, bloquear acesso.

Henrique Hoklo, Fred e Henrique Norman usam o mesmo painel central, sem depender do computador de cada um. No
início, o que for aprovado é executado num computador dedicado, usando o WhatsApp Web. A API oficial do
WhatsApp fica para a fase 5.

Cada fase termina em um marco que mostra algo funcionando antes de a autonomia aumentar.

### Decisões e pendências

| Decisão ou pendência | Quem responde |
|---|---|
| Aprovar o escopo e as cinco fases | Fred |
| Definir o que é propaganda permitida nos grupos e as exceções | Fred |
| Definir os indicadores de sucesso (resposta no grupo, presença nas SDEs, demanda, crescimento do escritório) | Fred e Henrique Hoklo |
| Confirmar quem é hoje o responsável de CS e quem cobre ausências | Henrique Hoklo |
| Decidir se o Trello continua | Henrique Hoklo |
| Enviar o link e as perguntas do formulário de ranking. O link recebido abre a planilha de boas-vindas | Henrique Hoklo |
| Enviar a planilha da Confraria 2027 e a lista completa dos grupos de alunos | Henrique Hoklo |
| Informar onde ficam as notas das calls de novembro. Na pasta só aparecem as mais antigas | Henrique Hoklo |
| Trocar a senha do CRM que foi compartilhada em chat e passar a usar acesso individual | Henrique Hoklo |

## Camada 2 — Micro

Para: Henrique Norman (executor).

### Metodologia e convenções

A especificação segue desenvolvimento guiado por especificação, entregue em fatias verticais. Cada fatia
atravessa fonte, dado, regra e painel e termina em algo que Henrique Hoklo e Fred conseguem ver funcionando.

1. **Repositório:** as specs ficam versionadas junto com o código, em uma pasta `docs/specs`, e um arquivo
   `CLAUDE.md` na raiz resume escopo, regras de autonomia e convenções para o Claude Code.
2. **Hierarquia:** épico, história, tarefa. Cada história tem ID (US-01), fase, prioridade (MoSCoW) e dependências.
3. **Histórias:** "Como [papel], quero [ação], para [resultado]". Papéis: Gerente (Hoklo), Stakeholder (Fred),
   Executor (Norman), Agente, Aluno.
4. **Critérios de aceite:** formato Dado, Quando, Então. Cada critério vira um teste automatizado antes da implementação.
5. **Decisões técnicas:** registradas em ADRs curtos (contexto, opções, decisão, consequência). O Henrique Norman
   escolhe stack e hospedagem e registra a escolha.
6. **Modo sombra:** antes de qualquer envio, o agente roda só sugerindo, e o time compara o que ele sugeriu com o
   que um humano faria.
7. **IA com avaliação:** um conjunto de casos reais (calls, mensagens de grupo) com a resposta esperada, rodado a
   cada mudança de prompt ou modelo.
8. **Definition of Ready:** história só entra na fatia com fonte de dado acessível, critério de aceite e dono.
9. **Definition of Done:** teste passando, log de auditoria, permissão conferida, demo para Hoklo e documentação atualizada.

### Escopo, premissas e restrições

O primeiro marco é enxergar (fases 1 e 2) e começar a sugerir (fase 3). Nada é enviado ao aluno de forma
automática nesse marco.

**Dentro do MVP**
- Base única de alunos com ID comum e importação da planilha atual.
- Painel central com login e papéis.
- Leitura das fontes: calls e notas (Drive), plano de ação, Raio-X, ranking, grupo Vendas e grupos de alunos.
- Ficha 360 por aluno e escritório.
- Fila de decisões com evidência e rascunho de mensagem.

**Fora do MVP**
- Envio automático de mensagens.
- API oficial do WhatsApp.
- Modelo preditivo treinado. Até existir histórico, a predição é feita por regras e leitura da IA.
- Publicação automática de aulas.

**Premissas**
- WhatsApp Web, não API oficial, no início.
- Toda ação para o aluno passa por aprovação de Henrique Hoklo ou Fred.
- O consentimento de tratamento de dados já consta do contrato assinado pelo aluno.
- As fontes estão em três contas Google (comercial, gestão e mentores) e a plataforma de aulas migra da Educa para a Hotmart.

**Restrições**
- O painel precisa ser acessível aos três, sem rodar no computador de cada um.
- CPF, RG e endereço ficam em área restrita.
- Senhas e tokens nunca circulam em chat.

### Arquitetura de referência e modelo de dados

A arquitetura abaixo é uma referência, não uma imposição. Stack e hospedagem são do Henrique Norman. O que não
muda é o fluxo: fontes entram, a base única guarda, regras e IA leem, a fila apresenta, uma pessoa aprova e só
então algo executa.

Tudo o que o agente lê, sugere, aprova e executa deixa rastro na auditoria.

O modelo de dados é uma proposta. Antes de implementar, o Norman define IDs, dono de cada coluna e regra de duplicidade.

| Entidade | Para quê | Campos principais |
|---|---|---|
| Escritório | Unidade a que o aluno pertence | nome, cidade, UF, responsável de CS |
| Pessoa | Titular, sócio ou segunda cadeira | nome completo, papel, telefone, e-mail, escritório |
| Matrícula | Programa contratado | produto (Trilha ou Confraria), início, vencimento, status |
| Jornada | Etapa atual do aluno | etapa, datas de cada marco, bloqueio |
| Objetivo | O que o aluno quer | texto, origem (dito ou inferido), trecho, data |
| Fonte | Documento lido | tipo (call, nota, SDE, Raio-X, plano, ranking), link, data |
| Sinal | Fato observado | tipo, valor, data, fonte, escritório |
| Interação | Contato com o aluno | canal, data, resumo, resposta, próxima ação |
| Saúde | Leitura de situação | cor, motivo, evidências, data, quem revisou |
| Item de fila | Sugestão do agente | tipo, evidência, rascunho, estado, aprovador |
| Ação executada | O que foi feito | item de origem, o que foi enviado, quando, resultado |
| Evento de auditoria | Rastro de tudo | quem, o quê, quando, antes e depois |

### Épicos e histórias

Os épicos seguem as fases. As histórias detalhadas cobrem as fases 1 e 2. As demais são escritas quando a fase
anterior estiver em demo.

| Épico | Fase | Resultado |
|---|---|---|
| E0 Fundação | 1 | Base única, painel central, acessos e auditoria |
| E1 Ingestão de fontes | 2 | Cada fonte alimenta a ficha |
| E2 Ficha 360 e saúde | 2 e 3 | Sinais cruzados e saúde com motivo |
| E3 Fila de decisões | 3 | Sugestões com evidência e rascunho |
| E4 Execução com aprovação | 4 | Executor, log e botão de parar |
| E5 Rotinas | 4 | Ranking, aulas, grupos, mentores |
| E6 Predição e retenção | 5 | Renovação, Confraria, score calibrado |

#### E0 — Fundação

**US-01 · Base única com ID comum (Must)** — Como Hoklo, quero uma base única de escritórios e pessoas, para
deixar de depender das cinco abas da planilha.
- Dado a planilha atual, quando a importação roda, então cada aluno recebe um ID estável e os sócios ficam ligados ao mesmo escritório.
- Dado dois registros com o mesmo identificador, quando importados, então viram um só e a divergência é listada para revisão.
- Dado um valor corrompido, como "NÃ£o", quando importado, então é corrigido e a correção fica registrada.

**US-02 · Painel central com login e papéis (Must)** — Como Hoklo, Fred ou Norman, quero abrir o mesmo painel,
para consultar e aprovar sem depender do computador de cada um.
- Dado um usuário autorizado, quando entra, então vê a fila e as fichas conforme o seu papel.
- Dado um papel sem permissão, quando abre uma ficha, então CPF, RG e endereço não aparecem.

**US-03 · Trilha de auditoria (Must)** — Como Hoklo, quero saber quem aprovou e o que foi enviado, para poder
explicar qualquer ação do agente.
- Dado qualquer leitura de fonte, sugestão, aprovação ou execução, então ficam registrados quem, quando, o que e a evidência.

**US-04 · Segredos e contas de serviço (Must)** — Como Norman, quero acesso de leitura controlado às fontes,
para que nenhuma senha de pessoa seja usada pelo agente.
- Dado as três contas Google, quando o agente lê o Drive, então usa conta de serviço com leitura só nas pastas definidas.
- Dado qualquer credencial, então ela nunca é gravada em log, em chat ou no repositório.

#### E1 — Ingestão de fontes

**US-05 · Calls e notas do Drive viram ficha (Must)** — Como Hoklo, quero que cada call gravada registre o
objetivo e as dores do lead, para ver depois o que ele disse querer.
- Dado uma nova pasta de call no Drive, quando detectada, então a transcrição é lida e ligada a um lead.
- Dado a transcrição, quando processada, então a ficha recebe objetivo, dores e promessas, cada um com o trecho de origem e marcado como dito ou inferido.
- Dado um campo de alto impacto, então ele fica "a revisar" até um humano confirmar.
- Dado nome com grafia diferente entre call e cadastro, então o vínculo vira sugestão e um humano confirma.

**US-06 · Grupo Vendas abre a ficha (Must)** — Como Hoklo, quero que o aviso de venda abra a ficha do aluno,
para não depender de alguém ver a mensagem.
- Dado uma mensagem do closer com a "Mensagem padrão para novo cliente" ou um comprovante, quando detectada, então a ficha é aberta com os campos extraídos.
- Dado a ficha aberta, então o agente gera um rascunho de confirmação para o grupo, enviado só com aprovação.

**US-07 · Plano de ação vira sinais (Must)** — Como Hoklo, quero ver o que o aluno moveu no plano, para saber se
ele está executando.
- Dado o plano de um aluno, quando lido, então a ficha mostra os cartões por estado (Fila, Em andamento, Feito), o prazo e o atraso.
- Dado um cartão atrasado ou sem mudança há um prazo configurável, então o agente cria um sinal com a data da última mudança.

**US-08 · Raio-X na ficha (Should)** — Como Hoklo, quero as respostas do Raio-X na ficha, para não abrir PDF por PDF.
- Dado um Raio-X preenchido, quando recebido, então as respostas ficam na ficha e o Fred é avisado.

**US-09 · Ranking vira sinal (Should)** — Como Hoklo, quero comparar o faturamento declarado mês a mês, para
perceber crescimento e queda.
- Dado as respostas de dois meses seguidos, quando lidas, então a ficha mostra a variação e sinaliza queda.

**US-10 · Grupos de alunos viram sinais (Should)** — Como Hoklo, quero saber quem pergunta e quem não recebe
resposta, para não deixar ninguém sem retorno.
- Dado um grupo da lista permitida, quando há pergunta de aluno sem resposta, então o agente cria um sinal e um alerta.
- Dado um grupo fora da lista, então o agente não lê nada dele.

### Catálogo de eventos e automações

Cada automação é um evento, uma reação e um modo. Prazos e janelas (dias sem contato, 90, 60 e 30 dias para
vencimento) são parâmetros configuráveis, com valores ainda a validar.

| Evento | Fonte | Reação do agente | Modo | Fase |
|---|---|---|---|---|
| Aviso de venda | Grupo Vendas | Abre a ficha e propõe a confirmação no grupo | Propõe | 3 |
| Call gravada | Drive | Extrai objetivo, dores e promessas | Sozinho, com revisão | 2 |
| Boas-vindas preenchido | Formulário | Atualiza a ficha com todos os sócios | Sozinho | 2 |
| Raio-X recebido | App do Raio-X | Guarda as respostas e avisa o Fred | Sozinho | 2 |
| Cartão do plano atrasado | App do plano | Cria sinal e rascunho "precisa de ajuda?" | Propõe | 3 |
| Marco concluído | App do plano | Rascunho de parabéns e "como foi?" | Propõe | 3 |
| Queda no ranking | Ranking | Rascunho "o que aconteceu?" | Propõe | 3 |
| Pergunta sem resposta no grupo | WhatsApp | Alerta e rascunho de resposta | Propõe | 3 |
| Mensagem fora das regras | WhatsApp | Alerta privado, sem ação sobre o membro | Sozinho | 3 |
| Reclamação ou pedido de cancelamento | WhatsApp | Registra o contexto e avisa | Só humano | 3 |
| Virada do mês | Calendário | Cria o ciclo do ranking e propõe o envio 1:1 | Propõe | 4 |
| SDE ou aula gravada | Drive | Prepara título, descrição e anexos | Propõe | 4 |
| Segunda de manhã | Calendário | Propõe a agenda dos mentores | Propõe | 4 |
| Vencimento se aproxima | Base | Monta a ficha de valor entregue | Propõe | 5 |

### Requisitos não funcionais, definição de pronto e entrega

**Segurança e privacidade**
- Acesso por papel, com o menor privilégio possível. Dados sensíveis em área separada e restrita.
- Segredos em cofre. Nada de senha em chat, log ou repositório.
- O agente só lê grupos e pastas de uma lista permitida.
- Retenção e descarte de dados definidos com o jurídico.

**Confiabilidade e controle**
- Toda ação é idempotente e registrada. Falha repete com limite e avisa.
- Botão de parar o executor, acessível a Hoklo e Fred.
- Modo sombra antes de ligar qualquer envio.

**Qualidade da IA**
- Toda extração cita o trecho de origem e marca dito ou inferido.
- Campos de alto impacto (objetivo, risco, status) exigem confirmação humana até o modelo atingir o nível combinado em casos reais.
- Conjunto de avaliação rodado a cada mudança de prompt ou modelo.

Entrega em fatias. Duração de cada uma a definir pelo Henrique Norman.

| Fatia | Fase | Demo para o Hoklo |
|---|---|---|
| 1 | 1 | Painel no ar, login e uma ficha real aberta com dados importados |
| 2 | 2 | Call, grupo Vendas e plano de ação aparecendo na ficha |
| 3 | 2 | Raio-X, ranking e grupos gerando sinais e saúde com motivo |
| 4 | 3 | Fila de decisões com rascunhos, em modo sombra |
| 5 | 4 | Execução aprovada e as primeiras rotinas |

### Perguntas abertas para o Henrique Norman

1. Qual stack, banco e hospedagem você usará para o painel? Registre em um ADR.
2. Qual será o identificador comum do aluno: telefone, e-mail ou CPF?
3. O Meet guarda a transcrição completa das calls ou só o resumo do Gemini?
4. Como ler o plano de ação: API, banco ou leitura do Kanban? O link aberto a quem o tiver é aceitável para dados de faturamento e metas?
5. O Raio-X pode gravar as respostas direto no banco? Como migrar os PDFs anexados ao Trello?
6. A Hotmart tem API para criar aula e ler consumo?
7. Qual a abordagem e o plano de contingência para ler grupos de WhatsApp, e como será o computador dedicado?
8. Por quanto tempo o modo sombra roda e com que métrica comparamos o agente com o humano?
9. Qual a duração e a capacidade para cada fatia?
