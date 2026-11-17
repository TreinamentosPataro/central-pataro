# Central · plano de ação

> Pra Fred e Hoklo · 17/11/2026 · Norman · A Central fica no ar em **sexta, 20/11**

## O que é a Central

É o lugar onde a Pataro guarda o que sabe e onde os agentes trabalham. Fred, Hoklo e Norman entram pelo
navegador, de qualquer lugar, com a conta Google de cada um. Lá dentro tem:

- **Cérebro:** tudo o que a empresa sabe, num lugar só (oferta, produtos, políticas, processo comercial,
  números, tom). Todo agente consulta o Cérebro antes de agir
- **Agentes:** cada um aparece como um cartão com nome, função, dono, prazo e situação (rodando, parado,
  travado ou em construção)
- **Fila de aprovação:** tudo o que um agente quer mandar pra fora espera aqui até uma pessoa aprovar
- **Fichas dos alunos:** a base que o agente de CS usa pra responder
- **Registro:** quem fez o quê e quando, seja agente ou pessoa

**Regra:** todo agente entra na Central. Agente solto, fora dela, não conta como entregue.

## O Cérebro

- **O que entra:** oferta e produtos (Trilha, Elite, Confraria, Ação), políticas (reembolso, prazos, o que o
  CS responde sozinho), processo comercial, números, tom, regras da OAB e o conteúdo das aulas
- **O que não entra:** dado de aluno (CPF, contrato, conversa). Isso fica nas fichas, numa área protegida
- **Como cresce:** alguém manda um documento, a IA resume e sugere onde guardar, e uma pessoa confirma.
  Nada vira regra sem alguém ver
- **Cada tema tem dono e data de revisão.** Cérebro desatualizado faz o agente errar com confiança

## Como funciona, passo a passo

1. **As informações chegam:** Drive (calls), grupo Vendas, grupos de alunos, Raio-X e planos de ação,
   ranking e Hotmart
2. **O agente consulta** o Cérebro (como a Pataro funciona) e a ficha do aluno (quem ele é)
3. **O agente prepara** a resposta, o contrato ou a ação e põe na fila
4. **Uma pessoa aprova.** Nada sai sem aprovação: mensagem pra aluno ou grupo, contrato, mudança de status
5. **A Central executa** (WhatsApp, ZapSign, e-mail) e registra o que fez

**Além disso:**

- **CS e Contratos** rodam dentro da Central e usam a mesma base de alunos: a venda que abre a ficha do CS é
  a mesma que dispara o contrato
- **SDR e os agentes do Hoklo** (tráfego, social, financeiro) avisam a Central como estão ("rodei agora, fiz
  12, travei em X"). Enquanto um agente não avisa nada, aparece como "em construção"
- **Botão de parar:** Fred e Hoklo desligam os envios na hora. A leitura continua, os envios param

## Quem acessa

| Quem | Papel | O que faz |
|---|---|---|
| Hoklo | Gerente | Vê tudo, aprova a fila, aperta o botão de parar |
| Fred | Dono | Vê tudo, aprova a fila, aperta o botão de parar |
| Norman | Construção | Vê tudo, configura os agentes |

- Só entra quem está na lista de e-mails liberados
- CPF, RG e endereço ficam escondidos na tela comum. Só o agente de contratos e o Norman veem
- O agente só lê os grupos e as pastas que forem liberados

## Ferramentas e custo

**A Central começa sem custo novo**, só com um chip de celular pro agente. Tudo roda no que a Pataro já paga. O único custo a decidir é o ZapSign com integração (+R$ 20/mês, ver abaixo).

| Peça | Ferramenta | Custo |
|---|---|---|
| Onde a Central fica | Servidor da Hostinger (já contratado), ligado 24h | R$ 0 a mais |
| Banco de dados | Neon, o mesmo dos Planos de Ação | Grátis no começo |
| WhatsApp do agente | Programa no mesmo servidor | R$ 0 a mais + um chip só pro agente |
| IA dos agentes | Assinatura do Claude que já existe | R$ 0 a mais no começo |
| Assinatura de contrato | ZapSign, conta da gestão | Plano Profissional, já pago (ver abaixo) |
| Login | Conta Google de cada um | Grátis |

### A IA: começar grátis, pagar depois se valer a pena

Guardar e buscar no Cérebro não custa nada. O que pode custar é a IA que lê, pensa e escreve a resposta.

| | **Grátis (começo)** | **Pago (depois)** |
|---|---|---|
| Como roda | Alguém pede ao Claude "processa o que chegou", 2 ou 3 vezes por dia | Sozinho, sempre que chega mensagem |
| Horário | Quando alguém pede | 24h, inclusive fim de semana |
| Aprovação | Uma pessoa aprova antes de sair | Uma pessoa aprova antes de sair |
| Resposta pro aluno | Em horas | Em minutos |
| Custo | R$ 0 a mais | US$ 30 a 60 por mês (~R$ 170 a 340), com teto de US$ 80 |

- **Por que começar no grátis:** custo zero e combina com a Fase 1 do CS, que já é semiautomática. Quem abre
  a Central pra aprovar a fila aproveita e pede pra processar
- **Limite do grátis:** se ninguém pedir, nada é processado, e pergunta de madrugada espera a próxima rodada
- **Por que não deixar a assinatura rodando sozinha:** as regras do Claude proíbem e a conta da Pataro pode
  ser bloqueada
- **Quando passar pro pago:** depois de 27/11, olhando quantas respostas foram aprovadas sem mexer. A decisão
  sai com número na mão

### ZapSign

**Hoje a Pataro está no plano Profissional** (conferido em 17/11): 240 documentos por ano, 48 já usados,
4 de 10 usuários. Esse plano **não tem a integração (API)**, que é o que deixa o agente mandar contrato
sozinho. Ela só vem a partir do plano **Equipe**.

| Plano | Preço no anual | Integração (API) |
|---|---|---|
| Profissional (o atual) | R$ 29,90/mês · R$ 358,80 por ano | Não tem |
| Equipe | R$ 49,90/mês · R$ 598,80 por ano | Tem |

A diferença é de **R$ 20 por mês (R$ 240 por ano)**. Os dois têm os mesmos 240 documentos por ano.

- **Sem trocar de plano (custo zero):** o agente prepara tudo e faz os cliques na tela do ZapSign, como o
  Hoklo faz hoje. Funciona, mas é mais lento, quebra se o ZapSign mudar a tela e precisa de alguém
  acompanhando
- **Com o Equipe (+R$ 20/mês):** o agente cria o contrato direto, já com os signatários na ordem certa, e
  fica sabendo sozinho quando o cliente assinou, sem ninguém conferir
- A Trilha faz ~6 contratos por mês, então os 240 documentos do ano dão com folga nos dois planos

### WhatsApp: por que não dá pra usar o oficial

A Central precisa **ler os grupos de alunos que já existem** (são ~30) e responder neles. É aí que o
WhatsApp oficial trava.

**O WhatsApp oficial (API da Meta)** é feito pra empresa conversar com um cliente de cada vez: atendimento,
aviso de pedido, cobrança. Grupo, para ele, é quase uma exceção:

- **Não entra em grupo que já existe.** Só funciona em grupo criado pela própria API. Os nossos grupos
  teriam que ser refeitos do zero
- **Máximo de 8 pessoas por grupo**, contando o número da empresa. Grupo de aluno passa disso
- **Não adiciona ninguém.** A pessoa só entra por link de convite
- **Exige conta verificada pela Meta** (o selo de conta oficial), que tem análise e não é garantida
- Fora de grupo, cada conversa iniciada pela empresa é cobrada e precisa de mensagem pré-aprovada pela Meta

Ou seja: pra usar o oficial, a Pataro teria que desmontar os grupos de alunos e recriar em pedaços de 8
pessoas. Não faz sentido.

**O que vamos usar:** um programa no nosso servidor que funciona como o WhatsApp Web. É como se um celular
com WhatsApp ficasse aberto 24h, só que dentro do servidor, sem PC ligado no escritório. Ele entra nos grupos
como qualquer participante, lê as mensagens e manda o que foi aprovado.

**O risco e como a gente controla:** como não é o caminho oficial, o WhatsApp pode bloquear o número se
achar que é robô. Pra isso não acontecer, e pra não doer se acontecer:

- **Chip só pro agente**, nunca o número da empresa nem o de alguém do time
- **Nada de disparo em massa.** O agente responde pouco e só o que uma pessoa aprovou, no ritmo de um humano
- **Começa só lendo.** Os primeiros dias são de leitura e resposta pela fila, sem envio automático
- **Se o número for bloqueado:** troca o chip e adiciona o número novo nos grupos. As mensagens já lidas
  ficam guardadas na Central, nada se perde

**O que precisa:** um chip novo e alguém do time adicionar esse número nos grupos de alunos (uma vez só).

## Cronograma

| Quando | O quê |
|---|---|
| ✅ seg 16/11 | **Pronto:** a base da Central (fila de aprovação, registro, fichas, cartões dos agentes) e o Cérebro com 18 temas carregados e a busca dos agentes |
| ter 17/11 | Este plano no grupo e ajustes com Fred e Hoklo |
| qua 18/11 | Desenho da Fase 1 do CS pro Hoklo aprovar · primeiro contrato real da Trilha indo pro ZapSign · planilha de alunos entrando na Central |
| qui 19/11 | Contratos ligados na Central · WhatsApp do agente conectado · Cérebro com oferta, preços e reembolso · começa o SDR |
| sex 20/11 | **Central no ar:** Cérebro, agentes, fila, registro e fichas reais. CS e Contratos ligados, o resto como "em construção" |

## Depois de 20/11

- **Cérebro completo:** processo comercial (junto com o SDR, 23/11), números, tom e aulas
- **Agente chefe:** recebe o pedido de alguém do time e passa pro agente certo. Depois, conversar com a
  Central direto
- **IA paga, se fizer sentido:** decisão depois de 27/11, com teto de US$ 80
- **Agentes do Hoklo** (tráfego, social, financeiro) entrando na Central
- **Vender a Central** pra outros escritórios, mais pra frente
