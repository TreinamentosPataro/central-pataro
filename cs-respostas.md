# Agente de CS · como a Fase 1 funciona e respostas ao Hoklo

> Entrega de 18/11/2026 (Atividade 2 de 4). Escrito por Norman em 16/11 a partir do
> "Agente de CS Pataro — Documento por camadas" (Hoklo, 12/11). Fica pronto quando o Hoklo aprovar o
> desenho da Fase 1.

## A proposta em uma linha

**A Central é a base do CS.** É um painel só, com a mesma base de alunos, a mesma fila de aprovação e o
mesmo registro. O CS não ganha uma ferramenta própria: é o primeiro agente de verdade dentro da Central.

## O que é a Fase 1 (semiautomática)

Aqui, a Fase 1 da atividade é o MVP do documento: **enxergar** (fases 1 e 2 do doc) e **começar a
sugerir** (fase 3), com tudo passando por aprovação. Nada sai pro aluno sozinho.

**Na prática, para o Hoklo e o Fred:**
1. Abrem a Central e veem a **ficha de cada escritório**: o que o aluno disse querer na call, em que
   etapa está, o plano de ação (o que fez, o que atrasou, o que está parado), o Raio-X, o ranking e o
   que ele anda falando nos grupos.
2. Cada ficha tem uma **cor de saúde com o motivo** (ex.: "amarelo: 3 cartões parados há 12 dias e não
   aparece no grupo desde 02/12").
3. A **fila de decisões** mostra quem precisa de quê, com a evidência e um rascunho de mensagem. A pessoa
   aprova, edita ou descarta.
4. Nas primeiras semanas, a fila roda em **modo sombra**: o agente sugere e o time compara com o que
   teria feito. O envio pelo WhatsApp só liga depois que essa comparação passar (ver resposta 8).

**Como a ferramenta entra em cada etapa:**

| Etapa | Na Fase 1 |
|---|---|
| Call de diagnóstico | Lê a transcrição no Drive e tira objetivo, dores e promessas, com o trecho de origem. Objetivo fica "a revisar" até alguém confirmar |
| Venda | Lê o grupo Vendas, abre a ficha e propõe a confirmação no grupo |
| Boas-vindas | Lê as respostas do formulário e liga os sócios ao escritório |
| Raio-X e plano de ação | Lê direto do banco dos Planos de Ação (é nosso, mesmo Neon) |
| Acompanhamento | Lê os grupos liberados, aponta pergunta sem resposta e propõe rascunho |
| Ranking | Lê a planilha do mês e marca queda |
| Grupos | Alerta privado quando alguém quebra regra. Nunca age sobre o membro |
| Cancelamento, reclamação, dinheiro | Só registra e avisa. Quem resolve é uma pessoa |

**Fica pra depois:** envio automático, API oficial do WhatsApp, rotinas (ranking mensal, agenda dos
mentores, publicação de aula), renovação e Confraria.

## As fatias, com data

| Fatia | Demo pro Hoklo | Data |
|---|---|---|
| 1 | Central no ar, login e uma ficha real aberta com os dados da planilha | **20/11** |
| 2 | Call, grupo Vendas e plano de ação aparecendo na ficha | **02/12** |
| 3 | Raio-X, ranking e grupos gerando sinais, e a saúde com motivo | **09/12** |
| 4 | Fila de decisões com rascunhos, em modo sombra | **18/12** |
| 5 | Envio aprovado pelo WhatsApp e as primeiras rotinas | **janeiro/2027**, depois que o modo sombra passar |

Até 23/11 o tempo é dividido com Contratos e SDR. A partir de 24/11, o CS fica com a maior parte da
semana.

## Respostas às 9 perguntas

**1. Stack, banco e hospedagem**
Next.js + Neon (Postgres) + login Google, na VPS da Hostinger. É a mesma base dos Planos de Ação, o que
deixa ler plano e Raio-X direto do banco. Vai registrado como a ADR-001 no repositório.

**2. Identificador comum do aluno**
Cada escritório e cada pessoa ganham um ID interno da Central, que não muda. Pra ligar as fontes, a chave
é o **telefone** (no formato +55 DDD número), porque grupo Vendas, grupos de alunos e WhatsApp giram em
torno dele. O **e-mail** é a segunda chave (formulário, Hotmart, login). O **CPF** fica na área restrita e
só desempata duplicado: não serve de chave do dia a dia, pra não circular.

**3. O Meet guarda a transcrição inteira ou só o resumo do Gemini?**
Depende de como a reunião foi gravada. Se a **transcrição** do Meet estiver ligada, ela vai inteira pro
Drive de quem organizou a call, como documento. Se só as **anotações do Gemini** estiverem ligadas, vai
só o resumo. Vou abrir 3 pastas de call recentes da conta comercial pra ver qual das duas existe. Se for
só o resumo, a extração funciona, mas sem o trecho literal. Aí a saída é ligar a transcrição nas próximas
calls (é uma opção no Meet, sem custo novo se o plano do Google permitir).

**4. Como ler o plano de ação? O link aberto serve pra faturamento e metas?**
O app dos Planos de Ação é nosso e grava no Neon. A Central lê pelo banco, com um usuário **só de
leitura**, sem raspar o Kanban. Sobre o link: hoje o plano abre por um endereço com 64 caracteres
aleatórios, sem login. Ninguém adivinha esse endereço, mas qualquer um que o receba abre. Pra faturamento
e metas, proponho três coisas: o link pode ser **revogado e trocado** quando vazar (já dá pra suspender o
acesso), a página **não aparece em busca**, e numa fase seguinte o aluno passa a entrar com código no
e-mail. Essa última é decisão de vocês, porque acrescenta um passo pro aluno.

**5. O Raio-X pode gravar direto no banco? E os PDFs do Trello?**
Sim. O formato do Raio-X já está definido nos Planos de Ação (12 blocos). O app passa a gravar as respostas
no banco além de gerar o PDF. Os PDFs antigos são uma migração de uma vez: baixo os anexos pela API do
Trello, a IA lê cada PDF e preenche o mesmo formato, e uma pessoa confere por amostragem (1 em cada 5).
Isso também resolve a pergunta "o Trello continua?": pro Raio-X, deixa de ser necessário.

**6. A Hotmart tem API pra criar aula e ler consumo?**
A Hotmart tem API de vendas e assinaturas, e a área de membros tem endpoints de leitura de módulos e
progresso do aluno. **Criar aula pela API eu não encontrei**, e a resposta aqui fica aberta até eu testar
com a conta. Enquanto isso, o plano é: o agente prepara título, descrição e anexos da aula, e uma pessoa
publica. Isso já estava previsto como "propõe" no catálogo.

**7. Como ler os grupos de WhatsApp, e qual o plano B?**
- **Como:** o número da Pataro que já está nos grupos fica aberto no WhatsApp Web, num computador
  dedicado, ligado o tempo todo. Um programa nesse computador lê **só os grupos da lista liberada** e
  manda as mensagens pra Central. Nada é enviado por ele até a fatia 5.
- **Risco:** o WhatsApp pode banir número que usa automação não oficial. O risco vem quase todo do
  **envio** em volume, não da leitura. Por isso a Fase 1 só lê.
- **Plano B:**
  - **Se o programa cair:** a Central avisa ("sem leitura há 2 horas") e dá pra mandar a exportação manual
    da conversa (WhatsApp → Exportar conversa), que a Central sabe ler.
  - **Se o número for bloqueado:** um segundo administrador em todos os grupos garante que ninguém perde
    acesso. Precisamos conferir isso **antes** de ligar.
  - **Quando o envio ligar:** mensagens espaçadas, só o que foi aprovado, com limite por hora.
- **O computador:** uma máquina do escritório que fique ligada e não seja de uso pessoal. Mini PC se não
  tiver. Acesso remoto pra eu dar manutenção.

**8. Quanto tempo de modo sombra, e com que métrica?**
**4 semanas ou 100 sugestões**, o que vier por último. Cada sugestão da fila recebe uma marca do humano:
"mandaria assim", "mandaria com ajuste" ou "não mandaria". O envio liga quando **80% ou mais** cair nas duas
primeiras, **sem nenhum erro de destino** (mensagem pro grupo errado) e **sem nenhum dado pessoal
exposto**. Se não bater, ajusto o agente e conto mais 2 semanas.

**9. Duração e capacidade de cada fatia**
Estão na tabela das fatias, acima. Uma fatia a cada 1 a 2 semanas, com o Norman sozinho no código.
Até 23/11, o tempo é dividido com Contratos e SDR. Depois, o CS vira a maior parte da semana. Se uma fonte
não chegar a tempo (lista dos grupos, notas das calls), a fatia sai sem ela e a fonte entra na seguinte.

## O que eu preciso pra cumprir as datas

| O quê | De quem | Até |
|---|---|---|
| Planilha atual de alunos (5 abas) | Hoklo | 16/11 |
| Lista completa dos grupos de alunos | Hoklo | 17/11 |
| Onde estão as notas das calls de novembro | Hoklo | 17/11 |
| Link e perguntas do formulário de ranking (o que veio abre a planilha de boas-vindas) | Hoklo | 20/11 |
| Acesso de leitura às pastas de calls e SDEs nas 3 contas Google | Hoklo | 27/11 |
| Computador dedicado e confirmação do segundo administrador nos grupos | Fred ou Hoklo | 02/12 |
| Propaganda permitida nos grupos e as exceções | Fred | 09/12 |
| Indicadores de sucesso | Fred e Hoklo | 09/12 |
