# Central · plano de ação

> Entrega de 17/11/2026 (Atividade 1 de 4, P0). Escrito por Norman em 16/11.
> Contém as ferramentas, o custo, o fluxo e o acesso. A Central fica no ar em 20/11.

## O que é a Central

É o lugar onde a Pataro guarda o que sabe e onde os agentes trabalham. Os três (Fred, Hoklo e Norman)
entram pelo navegador, de qualquer lugar, e veem:

- **Cérebro:** o conhecimento da empresa num lugar só (oferta, produtos, políticas, processo comercial,
  números, tom). Todo agente consulta o Cérebro antes de agir, em vez de cada um ter o próprio contexto
- **Agentes:** cada agente é um cartão com nome, função, dono, prazo e situação (rodando, parado, travado
  ou em construção)
- **Fila de aprovação:** tudo o que algum agente quer mandar pra fora espera aqui até uma pessoa aprovar
- **Fichas dos alunos:** a base única que o CS usa (é a Fase 1 do CS, ver `cs-respostas.md`)
- **Registro:** quem fez o quê e quando, seja o agente ou uma pessoa

**Regra:** todo agente entra na Central. Agente solto, fora dela, não conta como entregue.

**Referência:** o sistema que o Nathan Lopes mostrou no Instagram (@nathanlopes.ia, 28/10/2026). Dele
pegamos o Cérebro no centro, os agentes em cartões consultando a mesma base e a ideia do organograma.
A parte de controle (fila, registro, botão de parar) já é mais firme no nosso plano.

## O Cérebro

- **O que entra:** o que a empresa sabe e que vale pra todo agente
  - **Oferta e produtos:** Trilha, Elite, Confraria, Ação. O que cada um entrega, preço e condições
  - **Políticas:** reembolso, prazos, o que o CS responde sozinho e o que vai pra uma pessoa
  - **Processo comercial:** do primeiro contato até o contrato (base do SDR e dos Contratos)
  - **Números:** metas, vendas, alunos ativos
  - **Tom e regras da OAB:** pra tudo que sai pra fora
  - **Aulas:** a busca da Pataro I.A entra aqui como a parte de conteúdo
- **O que não entra:** dado de aluno (CPF, contrato, conversa). Isso fica nas fichas, na área protegida
- **Como cresce:** a tela "Ensinar o Cérebro" recebe um documento. A IA lê, resume e propõe onde guardar,
  e uma pessoa confirma antes de entrar. Nada vira regra sem alguém ver
- **Como os agentes usam:** todo agente tem a ferramenta "Buscar no Cérebro". O SDR, que roda dentro do
  Claude, consulta pelo mesmo caminho (MCP)
- **Cada parte tem dono e data de revisão.** Cérebro desatualizado faz o agente errar com confiança
- **Tela:** um mapa com o Cérebro no meio e os temas em volta, mais uma busca por título ou trecho

## Ferramentas e custo

**Resumo:** a Central começa **sem nenhum custo novo**, só um chip de celular pro agente. Tudo roda no que a
Pataro já paga. O único gasto possível é o ZapSign, e só se o plano atual não tiver API (ver abaixo). Tudo roda no que a
Pataro já paga. Pagar pela IA é uma decisão pra depois, quando os agentes estiverem acertando e valer a
pena eles trabalharem sozinhos, a qualquer hora.

| Peça | Ferramenta | Custo |
|---|---|---|
| Hospedagem da Central | VPS Hostinger (KVM 1, já contratada), ligada 24h | **R$ 0 a mais** |
| WhatsApp (ler grupos, enviar o aprovado) | Evolution API, instalada na mesma VPS | **R$ 0 a mais** + um chip só pro agente |
| Banco de dados (Cérebro, fichas, registro) | Neon (Postgres), mesmo usado nos Planos de Ação | **Grátis** no começo. Plano pago só se passar do limite |
| IA dos agentes (quem pensa) | Assinatura do Claude que já existe, ligada à Central por conector (MCP) | **R$ 0 a mais** no começo. Ver a comparação abaixo |
| Login | Google (a conta de cada um) | Grátis |
| Leitura do Drive (calls, SDEs) | Conta de serviço do Google, só leitura nas pastas liberadas | Grátis |
| Assinatura de contrato | ZapSign (já usado pela Pataro), organização Gestão Pataro | Plano atual. **A API só vem a partir do Equipe**: confirmar qual a Pataro tem. Ver abaixo |
| Plataforma de aulas e vendas | Hotmart (já usado) | R$ 0 a mais |
| Endereço | Subdomínio da Pataro (ex.: `central.<domínio da pataro>`) | R$ 0 a mais |

### Onde está o custo de verdade: quem pensa

**O Cérebro não custa nada.** Guardar documentos e buscar neles é trabalho do banco de dados, que é
grátis. Igual a um Drive organizado.

O que pode custar é **quem pensa**: alguém tem que ler a pergunta do aluno, consultar o Cérebro e a ficha
e escrever a resposta. Essa parte é a IA (o Claude). Tem dois jeitos de fazer isso:

| | **Gratuito: semiautomático** (começo) | **Pago: automático** (depois) |
|---|---|---|
| Quem dispara | Uma pessoa abre o Claude e pede: "processa o que chegou nos grupos" | O agente, sozinho, quando chega mensagem |
| Quando roda | 2 ou 3 vezes por dia, quando alguém pede | 24h, inclusive de madrugada e fim de semana |
| Onde a IA roda | Assinatura do Claude que já existe | API do Claude (cobra por uso) |
| O que faz | Lê os grupos, consulta o Cérebro e as fichas, põe as respostas na fila | **O mesmo** |
| Aprovação | Uma pessoa aprova antes de sair | Uma pessoa aprova antes de sair |
| Custo de IA | **R$ 0 a mais** | **US$ 30 a 60 por mês** (~R$ 170 a 340), com teto de US$ 80 |
| Tempo de resposta pro aluno | Horas (até a próxima rodada) | Minutos (até alguém aprovar) |

**Pontos do gratuito**
- ✅ Custo zero: usa a assinatura que a Pataro já paga
- ✅ Dentro das regras da Anthropic: é uma pessoa usando o Claude, como no dia a dia
- ✅ Combina com a Fase 1 do CS, que já é semiautomática. Como alguém já vai abrir a Central pra aprovar
  a fila, aproveita e pede pro Claude processar
- ✅ É o mesmo jeito que o SDR vai funcionar (dentro do Claude)
- ⚠️ Só roda quando alguém pede. Se ninguém abrir, nada é processado
- ⚠️ Pergunta de madrugada ou no fim de semana espera a próxima rodada
- ⚠️ A assinatura tem limite de uso por hora. Pro volume da Fase 1 deve dar, mas pode travar em dia cheio

**Pontos do pago**
- ✅ Funciona sozinho, 24h. O aluno tem resposta pronta na fila em minutos
- ✅ Ninguém precisa lembrar de rodar
- ✅ Gasto previsível e travado: teto de US$ 80 por mês. Se chegar nele, a IA para e o Norman recebe aviso
- ⚠️ Custo mensal novo, que cresce com o uso
- ⚠️ Precisa de cartão cadastrado na Anthropic e alguém acompanhando o gasto

**Por que não ligar a assinatura do Claude de forma automática, pra ter o pago sem pagar?** As regras da
assinatura proíbem usar a conta como robô ligado num sistema; uso automático é só pela API. Se a Anthropic
perceber, pode bloquear a conta, e seria a conta da Pataro. Além disso, o limite por hora travaria no meio
do dia.

**Quando passar pro pago:** quando os agentes estiverem acertando (a medida de 27/11: quantas respostas
foram aprovadas sem mexer) e o time sentir falta de resposta fora do horário. Aí a decisão sai com número
na mão: tempo economizado contra US$ 30 a 60 por mês.

#### De onde vêm os US$ 30 a 60 do pago

Preços por milhão de tokens: Sonnet 5.5 US$ 2 de entrada e US$ 10 de saída, Haiku 4.5 US$ 1 e US$ 5.

| Uso | Volume por mês (suposição) | Custo |
|---|---|---|
| Rascunhos da fila de aprovação | ~15 por dia | ~US$ 12 |
| Triagem das mensagens dos grupos (pergunta sem resposta, regra quebrada) | ~30 grupos, todo dia | ~US$ 7,50 |
| Raio-X, ranking e relatório semanal | — | ~US$ 5 |
| Ler call comercial e tirar objetivo, dores e promessas | ~40 calls | ~US$ 2,50 |
| Cérebro (ler e resumir documento novo; a busca é no banco, sem custo) | ~30 documentos | ~US$ 2 |
| Contratos (conferir se tem nome, CPF e e-mail) | ~15 a 20 vendas | < US$ 1 |
| **Total** | | **~US$ 30**, com folga **US$ 30 a 60** |

O **SDR** não entra nessa conta em nenhum dos dois jeitos: roda dentro do Claude, na assinatura.

### ZapSign: precisa da API?

O agente de contratos funciona melhor com a API do ZapSign, e ela só vem a partir do plano Equipe. **Falta
confirmar qual plano a organização Gestão Pataro tem.** (O aviso de "limite atingido" na reunião de 16/11
foi só porque o Hoklo entrou na organização errada.)

| Plano | Preço (anual) | Documentos | Integração (API) |
|---|---|---|---|
| Profissional | R$ 29,90/mês | 20 por mês | **Não tem** |
| **Equipe** ✅ | **R$ 49,90/mês** (R$ 598,80 no ano) | 20 por mês | **Tem** |

**Com a API**, a Central cria o contrato e os signatários direto no ZapSign e fica sabendo sozinha quando o
cliente assinou. **Sem a API**, o Claude teria que clicar na tela do ZapSign pelo navegador (é como o Hoklo
faz hoje): funciona, mas quebra se a tela mudar e precisa de alguém acompanhando.

**Decisão:** se a Gestão Pataro já tem o Equipe, custo zero. Se não tem, começa sem API e só sobe de plano
(R$ 49,90/mês) se os cliques derem trabalho demais. A Trilha faz ~6 contratos por mês, cabe com folga nos 20.

### WhatsApp sem computador ligado 24h

Pra ler os grupos e enviar o que foi aprovado, alguma coisa precisa ficar conectada ao WhatsApp o tempo
todo. Opções:

| Opção | Como funciona | Custo | Ponto de atenção |
|---|---|---|---|
| **WhatsApp no servidor (Evolution API)** ✅ escolhida | Um programa na VPS da Hostinger faz o papel do WhatsApp Web. A VPS já fica ligada 24h | **R$ 0 a mais** | Não é oficial: o WhatsApp pode banir o número. Por isso, **chip só pro agente**, nunca o número da empresa |
| Serviço pronto (Z-API e parecidos) | Uma empresa cuida da conexão, a Central só se liga nela | ~R$ 100 por mês | Mesmo risco de banimento, e a mensagem dos alunos passa por terceiro |
| WhatsApp oficial (Meta) | API da própria Meta, sem risco de banimento | Paga por conversa | **Não serve:** só funciona com grupo de até 8 pessoas criado pela própria API. Não entra nos grupos que já existem |
| Computador ligado no escritório | WhatsApp Web aberto num PC dedicado | R$ 0 ou compra de um mini PC | Depende de luz, internet e de ninguém desligar |

**Por que o servidor:** some a máquina, some o risco de alguém desligar, e não tem custo novo. Guardar as
mensagens que chegam não usa IA, então a leitura dos grupos roda 24h mesmo no modo gratuito; o que espera
a rodada é só a resposta.

**O que precisa:** um chip novo pro agente e alguém do time adicionar esse número nos ~30 grupos (uma vez só).

## Como os agentes se ligam

```
                              CÉREBRO (oferta, políticas, processo, números, tom, aulas)
                                         │ todo agente consulta
FONTES                  CENTRAL (VPS + Neon)  ▼                      PRA FORA
Drive (calls, SDEs)  ─┐
Grupo Vendas         ─┤   base única ─► regras + IA ─► fila ─► uma pessoa ─► executor ─► WhatsApp
Grupos de alunos     ─┼─► (alunos,                                aprova                   ZapSign
Planos de Ação/Raio-X─┤    contratos,                                                      e-mail
Ranking (planilha)   ─┤    sinais)              tudo grava no registro (quem, quando, o quê)
Hotmart              ─┘
```

- **Duas bases, papéis diferentes:** o Cérebro diz *como a Pataro funciona*; a base única diz *quem é cada
  aluno*. O agente cruza as duas pra montar a resposta.
- **CS e Contratos** rodam dentro da Central. Os dois leem a mesma base de alunos. Essa base é o que
  liga os dois: a venda que abre a ficha do CS é a mesma que dispara o contrato.
- **SDR** (dentro do Claude) e os agentes do Hoklo (tráfego, social, financeiro) avisam a Central por um
  endereço próprio. Cada um manda a situação ("rodei agora, fiz 12, travei em X") e a Central mostra.
  Enquanto um agente ainda não manda nada, ele aparece como "em construção".
- **Nada sai sem aprovação.** Mensagem pra aluno ou grupo, contrato e qualquer mudança de status passam
  pela fila. O executor só age sobre item aprovado e grava o que fez.
- **Botão de parar:** o Hoklo e o Fred conseguem desligar o executor na hora. A leitura continua, os
  envios param.

## Quem acessa e o que vê

| Papel | Quem | O que faz |
|---|---|---|
| Gerente | Hoklo | Vê tudo, aprova a fila, aperta o botão de parar |
| Stakeholder | Fred | Vê tudo, aprova a fila, aperta o botão de parar |
| Executor | Norman | Vê tudo, configura os agentes e as fontes |

- **Entrada só pelo Google**, com uma lista de e-mails liberados. E-mail fora da lista não entra.
- **CPF, RG e endereço** ficam numa área separada. Na ficha, aparecem só pra quem precisa (o agente de
  contratos e o Norman). Na tela comum, ficam escondidos.
- **Senha e token** ficam num arquivo protegido no servidor. Não vão pro chat nem pro código.
- **O agente só lê** os grupos e as pastas que estiverem na lista liberada.

## Decisões técnicas

- **Stack:** Next.js + Neon + login Google, rodando na VPS. É a mesma base dos Planos de Ação, então os
  dois conversam direto pelo banco, sem copiar planilha.
- **Código e especificação no mesmo repositório**, privado, na conta da Pataro no GitHub. As histórias e
  as decisões ficam em `docs/specs`, como o Hoklo pediu. **O push é feito todo dia**: foi a falta disso
  que fez o trabalho de 13/11 ficar preso num computador só.
- **Cérebro:** documentos em texto, organizados por tema e com histórico de cada mudança (quem mudou,
  quando, o que era antes). A busca começa pela busca de texto do próprio Postgres, sem custo. Busca por
  significado (embeddings) só entra se a de texto não der conta.
- **Identificador do aluno:** um ID interno da Central. O que liga as fontes é o **telefone**, porque é
  por onde tudo acontece (grupos, grupo Vendas, WhatsApp do aluno). O e-mail serve de segunda chave. O CPF
  fica na área restrita e só desempata duplicado.

## Cronograma até 20/11

| Dia | O quê | Depende de |
|---|---|---|
| seg 16/11 | Recomeçar a base: painel, login Google, registro, banco no Neon | — |
| seg 16/11 | Importar a planilha de alunos (5 abas) | **Hoklo:** planilha + e-mails dele e do Fred |
| ter 17/11 | **Este plano no grupo**, ajustar com o Hoklo e o Fred | — |
| qua 18/11 | Desenho da Fase 1 do CS pro Hoklo aprovar · contrato real da Trilha indo pro ZapSign | **Hoklo:** lista dos grupos · plano do ZapSign confirmado (API) · acesso à pasta Contratos Trilha |
| qui 19/11 | Contratos ligados na Central · WhatsApp do agente conectado na VPS · começa a construção do SDR | **Fred ou Hoklo:** chip novo no ar e adicionado aos grupos |
| qui 19/11 | **Cérebro, 1ª versão:** oferta, produtos e políticas carregados; CS e Contratos consultando | **Fred ou Hoklo:** documentos de oferta, preços e política de reembolso |
| sex 20/11 | **Central no ar:** Cérebro, agentes em cartões, fila, registro, uma ficha real. CS e Contratos ligados, o resto como "em construção" | — |

## Depois de 20/11

- **Cérebro completo:** processo comercial (com o SDR, 23/11), números, tom e aulas da Pataro I.A
- **Organograma:** um agente "chefe de gabinete" que recebe o pedido de alguém do time e distribui pro
  agente certo. Depois disso, a tela de conversa com a Central
- **Modo pago (API), se fizer sentido:** decidir depois da medida de 27/11, com o teto de US$ 80
- **Integrações:** tela com o que está conectado (Drive, WhatsApp, ZapSign, Hotmart) e o que dá pra ligar
- **Agentes do Hoklo** (tráfego, social, financeiro) entrando como cartões e consultando o Cérebro
- **Loja de agentes:** só quando a Central for vendida pra outros escritórios

## O que eu preciso

- **Hoklo, até seg 16/11:** planilha atual de alunos (as 5 abas) e os e-mails dele e do Fred pro login
- **Hoklo, até ter 17/11:** lista completa dos grupos de alunos e onde estão as notas das calls de novembro
- **Fred ou Hoklo, até qua 18/11:** o que existe escrito sobre oferta, preços e política de reembolso
  (pode ser página de venda, PDF ou mensagem). É o que entra primeiro no Cérebro
- **Hoklo + Ana:** confirmar qual plano a organização Gestão Pataro tem no ZapSign e se a API está liberada
- **Fred ou Hoklo:** um chip novo só pro agente, e alguém pra adicionar esse número nos grupos de alunos
- **Fred:** de quem é a assinatura do Claude que a Central vai usar no modo gratuito (a da Pataro, de preferência)
