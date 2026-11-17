# Agente de CS · desenho da Fase 1

> Pra Hoklo e Fred · 18/11/2026 · Norman · Fica pronto quando o **Hoklo aprovar** este desenho

## A proposta em uma linha

**O agente de CS mora dentro da Central.** Ele usa a mesma base de alunos, a mesma fila de aprovação e o
mesmo registro que os outros agentes. Não é uma ferramenta separada: é o primeiro agente de verdade da Central,
que já está no ar.

## O que é a Fase 1

A Fase 1 é **semiautomática**: o agente **enxerga** tudo sobre cada aluno e **sugere** o que fazer. **Nada sai
pro aluno sem uma pessoa aprovar.**

**Na prática, pra vocês:**

1. **Ficha de cada escritório.** Na Central aparece o que o aluno disse querer na call, em que etapa está, o
   plano de ação (o que fez, o que atrasou, o que parou), o Raio-X, o ranking e o que ele anda falando nos grupos
2. **Cor de saúde com o motivo.** Cada ficha diz verde, amarelo ou vermelho e por quê. Exemplo: "amarelo: 3
   cartões parados há 12 dias e não aparece no grupo desde 02/12"
3. **Fila de decisões.** Mostra quem precisa de quê, com a prova e um rascunho de mensagem. Vocês aprovam,
   ajustam ou descartam
4. **Modo sombra nas primeiras semanas.** O agente sugere e vocês marcam se mandariam aquilo. O envio pelo
   WhatsApp só liga depois que essa comparação passar (ver pergunta 8)

## O que o agente faz em cada etapa

| Etapa | Na Fase 1 |
|---|---|
| Call de diagnóstico | Lê a transcrição e anota objetivo, dores e promessas, mostrando o trecho de onde tirou. O objetivo fica "a revisar" até alguém confirmar |
| Venda | Lê o grupo Vendas, abre a ficha do aluno e propõe a confirmação no grupo |
| Boas-vindas | Lê as respostas do formulário e liga os sócios ao escritório |
| Raio-X e plano de ação | Lê direto dos Planos de Ação (é nosso sistema, mesmo banco) |
| Acompanhamento | Lê os grupos liberados, aponta pergunta sem resposta e propõe um rascunho |
| Ranking | Lê a planilha do mês e marca quem caiu |
| Grupos | Avisa em privado quando alguém quebra regra. Nunca age sobre o membro |
| Cancelamento, reclamação, dinheiro | Só registra e avisa. Quem resolve é uma pessoa |

**Fica pra depois:** envio automático, rotinas (ranking mensal, agenda dos mentores, publicação de aula),
renovação e Confraria.

## As entregas, com data

| Entrega | O que vocês veem | Data |
|---|---|---|
| 1 | Central no ar com login (✅ desde 17/11) e uma ficha real aberta com os dados da planilha de alunos | **20/11** |
| 2 | Call, grupo Vendas e plano de ação aparecendo na ficha | **02/12** |
| 3 | Raio-X, ranking e grupos gerando avisos, e a cor de saúde com motivo | **09/12** |
| 4 | Fila de decisões com rascunhos, em modo sombra | **18/12** |
| 5 | Envio aprovado pelo WhatsApp e as primeiras rotinas | **janeiro/2027**, depois que o modo sombra passar |

Até 23/11 o tempo é dividido com o agente de contratos e o SDR. A partir de 24/11, o CS fica com a maior parte
da semana.

## Respostas às 9 perguntas

### 1. Onde roda e com o quê?

A Central está no ar desde 17/11, no servidor da Hostinger que já pagamos, com banco de dados no Neon (o mesmo
dos Planos de Ação) e login pela conta Google. Só entram os e-mails liberados. Por ser o mesmo banco dos Planos
de Ação, o agente lê o plano e o Raio-X direto, sem copiar planilha.

### 2. Como o sistema sabe que é o mesmo aluno em todo lugar?

Cada escritório e cada pessoa ganham um código próprio na Central, que nunca muda. Pra juntar as fontes, a chave
é o **telefone**, porque grupo Vendas, grupos de alunos e WhatsApp giram em torno dele. O **e-mail** é a segunda
chave (formulário, Hotmart). O **CPF** fica guardado numa área protegida e só serve pra desempatar cadastro
repetido, pra não ficar circulando.

### 3. O Meet guarda a transcrição inteira ou só o resumo do Gemini?

Depende de como a call foi gravada. Com a **transcrição** ligada, o texto inteiro vai pro Drive de quem marcou
a call. Com só as **anotações do Gemini**, vai só o resumo. Vou abrir 3 calls recentes da conta comercial pra ver
qual existe. Se for só o resumo, o agente funciona, mas sem mostrar o trecho exato. Aí a saída é ligar a
transcrição nas próximas calls, que é uma opção do próprio Meet.

### 4. Como ler o plano de ação? O link aberto é seguro pra faturamento e metas?

O agente lê o plano direto do banco, com uma permissão **só de leitura**. Sobre o link: hoje cada plano abre por
um endereço longo e impossível de adivinhar, sem senha. Ninguém chega nele por acaso, mas quem recebe o link
abre. Pra faturamento e metas, proponho:
- O link pode ser **trocado** na hora se vazar
- A página **não aparece no Google**
- Numa fase seguinte, o aluno entra com um código enviado pro e-mail. Essa é decisão de vocês, porque acrescenta
  um passo pro aluno

### 5. O Raio-X pode ir direto pro banco? E os PDFs antigos do Trello?

Sim. O Raio-X já tem formato definido nos Planos de Ação (12 blocos), então ele passa a ser guardado no banco
além de gerar o PDF. Os PDFs antigos do Trello entram uma vez só: a IA lê cada um e preenche o mesmo formato, e
uma pessoa confere 1 em cada 5. Com isso, o Trello deixa de ser necessário pro Raio-X.

### 6. A Hotmart deixa criar aula e ver o consumo dos alunos?

Ver vendas, assinaturas e o progresso dos alunos, sim. **Criar aula sozinho, não encontrei**, e essa resposta
fica aberta até eu testar com a conta. Enquanto isso, o agente prepara título, descrição e anexos, e uma pessoa
publica.

### 7. Como ler os grupos de WhatsApp, e qual o plano B?

- **Como:** um programa no nosso servidor, ligado 24h, funciona como um WhatsApp Web. Ele usa um **chip só do
  agente**, que entra nos grupos de alunos. Ele lê **só os grupos liberados** e manda as mensagens pra Central.
  Até a entrega 5, ele não envia nada
- **Por que não o WhatsApp oficial da Meta:** ele não entra em grupo que já existe e aceita no máximo 8 pessoas
  por grupo. Teríamos que desmontar os grupos de alunos
- **Risco:** o WhatsApp pode bloquear número que usa programa não oficial. O risco vem quase todo de **enviar**
  muito, não de ler. Por isso a Fase 1 só lê. E por isso o chip é do agente, nunca o número da empresa
- **Plano B:**
  - **Se o programa parar:** a Central avisa ("sem leitura há 2 horas"). Enquanto isso, dá pra exportar a
    conversa pelo próprio WhatsApp e a Central lê o arquivo
  - **Se o número for bloqueado:** troca o chip e adiciona o número novo nos grupos. As mensagens já lidas ficam
    guardadas na Central. Antes de ligar, conferir que todo grupo tem um segundo administrador da Pataro
  - **Quando o envio ligar:** mensagens espaçadas, só o que foi aprovado, com limite por hora

### 8. Quanto tempo de modo sombra, e como medir?

**4 semanas ou 100 sugestões**, o que vier por último. Em cada sugestão da fila, vocês marcam "mandaria assim",
"mandaria com ajuste" ou "não mandaria". O envio liga quando:
- **80% ou mais** caírem nas duas primeiras
- **nenhuma** mensagem tiver ido pro grupo errado
- **nenhum** dado pessoal tiver aparecido

Se não bater, ajusto o agente e contamos mais 2 semanas.

### 9. Quanto tempo leva cada parte?

Está na tabela das entregas: uma a cada 1 ou 2 semanas, comigo sozinho no código. Se alguma informação não
chegar a tempo (lista dos grupos, notas das calls), a entrega sai sem ela e a informação entra na seguinte.
