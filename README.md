# Central (agentes da Pataro)

Painel único dos agentes da Pataro Treinamentos. Foco desde 12/11/2026. O Norman é o dono (P0).

## Onde paramos (17/11/2026, noite) — ler primeiro

**Meta:** entregar tudo até **quinta 19/11 cedo** (sexta 20/11 é feriado e o time não trabalha).

### Feito em 17/11
- **Central no ar** em https://central.patarotreinamentos.com.br: VPS + Neon + login Google só pros 3 e-mails
  (Fred `patarofrederico@gmail.com` stakeholder, Hoklo `gestao@patarotreinamentos.com.br` gerente, Norman
  `gestaopatarotreinamentos@gmail.com` executor). Banco migrado e semeado (6 agentes, 18 verbetes do Cérebro)
- **Visual da referência** (vídeo do Nathan, `docs/referencia/nathan-lopes-2026-10-28/`): menu lateral, agentes
  por área (`lib/equipe.ts`), cartão com batimento (`app/onda.tsx`), Cérebro com sinapses (`app/cerebro/mapa.tsx`),
  telas novas **Organograma** e **Integrações** (`lib/integracoes.ts`). Fundo branco, Cérebro preto, dourado
- **Plano da Central** reescrito pra Fred e Hoklo e enviado no grupo (`plano-central.md` → `pdf/`). Parte técnica
  em `notas-tecnicas.md`
- **Desenho da Fase 1 do CS** (`cs-respostas.md` → `pdf/cs-respostas.pdf`): agente **manda pelo WhatsApp depois
  da aprovação na Central** (sem modo sombra). **Falta o Henrique mandar pro Hoklo aprovar**
- **ZapSign conferido** na conta gestão: plano **Profissional, sem API** (240 docs/ano, 48 usados, 4/10 usuários).
  Equipe custa +R$ 20/mês no anual. **Fred e Hoklo decidem** (o Henrique acha que vão assinar o Equipe)
- **Agente de contratos, parte 1** (sem acesso ao Drive ainda), 16 testes com dados inventados:
  - `lib/contratos.ts`: lê o HTML exportado do Google Docs no formato da "Minuta do Contrato" (tabela do
    contratante com rótulo e valor na mesma célula; quadro da cláusula 7; vigência em 1.1, 2.3, 2.6 e 6.1;
    marcação amarela) e lista o que falta. Pega o quadro igual ao exemplo da minuta (R$ 35.000, 08/09/2026,
    "[Cartão de credito]")
  - `lib/agente-contratos.ts`: rodada que põe na fila "pronto pra assinatura" (destino `zapsign:trilha`) ou
    "travado" (destino `grupo:comercial`, mensagem pronta), tabela `contratos`, sem repetir versão
  - `lib/google-servico.ts` + `npm run agente:contratos`: robô do Google lê a pasta. Só contratos criados a partir
    de `CONTRATOS_DESDE` (padrão 2026-11-17), pros antigos não voltarem pra fila

### Feito em 17/11, à tarde
- **WhatsApp do agente no ar na VPS** (deploy do commit 5c8d21a, à noite): Evolution API v2.3.7 + Postgres próprio no
  `compose.yml` (sem porta pra internet; a Central fala com ele por `http://whatsapp:8080`; guarda só a sessão do
  chip). Tela **Integrações → WhatsApp** (`app/integracoes/whatsapp/`) mostra o QR, o estado e a lista de
  **grupos liberados** (tabela `destinos`: a fila guarda só a chave `grupo:comercial`, uma pessoa escolhe o grupo
  de verdade; "Ler" = lista permitida do CS). Envio em `lib/enviador.ts`: só item aprovado, só destino ligado,
  respeita o botão de parar, não repete, reserva o item antes de mandar. Sai logo depois da aprovação e numa
  rodada a cada minuto (`instrumentation.ts`). 12 testes em `tests/whatsapp.test.ts`. Testado no PC com o
  Evolution de verdade (`deploy/whatsapp-local.yml`): QR gerado e tela ok
- **Robô do Google ligado:** `agente-contrato@centralpataro.iam.gserviceaccount.com`, APIs do Drive e do Sheets
  ativadas, pasta Contratos Trilha compartilhada (`CONTRATOS_PASTA_ID=1wk8rUsZHDRKkE0YfdTBAz7hUWjzjrj5l`). Chave no PC em
  `~/.central/robo-google.json` (fora do git). Na VPS: `/opt/central/robo-google.json` (dono uid 1000, 600), montado
  no container em `/run/segredos/robo-google.json`. Planilha **Gestão Contratos Trilha** compartilhada como editor
  (`CONTRATOS_PLANILHA_ID=1tdffmdMeCVmw3-R7kFMHdojt_1BrJCPbzxvI85RAauU`, aba **Contratos**, 20 colunas: Nº, Data da
  venda, Comprador (Hotmart), Contratante no contrato, CPF/CNPJ do contratante, E-mail, WhatsApp, Forma de pagamento,
  Valor total (R$), Detalhe do pagamento, Transação Hotmart, Dados a solicitar, Enviar mensagem, Enviar (2ª
  contratante), Mensagem enviada, Dados recebidos, Contrato pronto, Enviado no AppSing, Assinado, Observações)
- **Deploy de 17/11 à noite:** tabela `destinos` criada no Neon, `.env` da VPS com `GOOGLE_SERVICO_JSON`,
  `CONTRATOS_PASTA_ID`, `CONTRATOS_PLANILHA_ID`, `CONTRATOS_DESDE`, `WHATSAPP_CHAVE`, `WHATSAPP_DB_SENHA`,
  `WHATSAPP_INSTANCIA` (cópia em `.env.producao`). Conferido dentro do container: Evolution 2.3.7 respondendo, chave
  do WhatsApp aceita, chave do robô lida. Código no GitHub (TreinamentosPataro/central-pataro)
- **Teste seco com os 16 contratos reais** (sem gravar nada): a régua estava apertada. Ajustado: marcação amarela
  não trava (o comercial pinta o que preenche), forma entre colchetes vale ("[PIX]") e só trava a lista da minuta,
  parcelas em texto livre, campo em branco do cliente não herda o endereço da Pataro, "Minas Gerais" sem cidade pede a
  cidade. Resultado: 6 prontos, 10 travados por falta de verdade (CEP, bairro, e-mail, telefone em branco; 2 com o
  quadro igual ao exemplo da minuta, R$ 35 mil em 08/09)

### Próximos passos (em ordem)
1. **Henrique: ligar o chip** — pôr o número do chip do agente no grupo do comercial (WhatsApp normal), ler o QR em
   Integrações → WhatsApp e, na linha `grupo:comercial`, escolher o grupo, marcar Enviar e Salvar. O robô **não**
   adivinha o grupo: a escolha é de uma pessoa, uma vez só
2. ~~**Rodada de contratos dentro da Central**~~ ✅ 18/11 (no ar, commit 8cecd45): `lib/rodada-contratos.ts` confere a pasta a cada
   10 min (ligada no `instrumentation.ts`, primeira 30 s depois de subir) e pelo botão **Conferir agora** no cartão do
   agente. Respeita o botão de parar, só baixa documento novo ou alterado, erro do Google vai pra auditoria
   (`agente.erro`). `npm run agente:contratos` usa a mesma função. Testado no PC contra a pasta real (0 novos desde 17/11)
3. ~~**Registrar na planilha**~~ ✅ 18/11 (falta deploy): `lib/planilha-contratos.ts`. Acha a linha do cliente pelo CPF/CNPJ
   (coluna E) ou pelo nome (D ou C) e **só completa célula em branco** (D a J, L = o que falta); marca "Contrato pronto"
   quando pronto, nunca desmarca. Sem linha do cliente, cria uma depois do último cliente (Nº seguinte, caixinhas
   desmarcadas, nota em Observações pra completar data da venda, comprador e transação Hotmart). Cabeçalho fora da
   ordem = não escreve nada. Planilha fora do ar não segura a fila (erro vai pra auditoria). Auditoria guarda só linha
   e colunas, nunca o conteúdo. Cabeçalho real conferido em 18/11 (`.tmp/cabecalho.ts`, só leitura)
4. **Primeiro contrato novo** (criado a partir de 17/11) cai na fila → Hoklo aprova → aviso sai no grupo do comercial
5. **Envio pro ZapSign depois da aprovação**: sem API = Claude fazendo os cliques; com o Equipe = API (Fred e Hoklo decidem)
6. **Grupos de alunos** na lista permitida (tela do WhatsApp, "Ler") quando o chip estiver nos grupos
7. **Planilha de alunos** (5 abas, do Hoklo): `npm run importar` → primeira ficha real (entrega 1 do CS)
8. **Cérebro**: preços, reembolso, metas e tom estão "a preencher" (textos do Fred ou do Hoklo)
9. **SDR**: aula do Thales (Fase 6) e montar dentro do Claude (prazo 19/11 pro estudo, 23/11 a 1ª versão)
10. **Mandar o PDF do CS pro Hoklo aprovar** (`pdf/cs-respostas.pdf`), se ainda não foi

### Pra trabalhar no PC
- `npm run dev` (banco local em `.dados/`, entrada escolhendo o usuário; dados de teste com `npm run db:semear -- --demo`).
  `.env.local` = só PC; `.env.producao` = segredos do servidor (fora do git, não mostrar no chat)
- **Dev dando 404 do nada** depois de muitas mudanças ou de um `npm run build`: parar o dev, apagar `.next/` e subir de novo
- Rodar algo contra o Neon: `npx tsx --env-file=.env.producao scripts/<script>.ts`
- **Deploy:** só quando o Henrique pedir. `npx tsx --env-file=.env.producao scripts/migrar.ts` (se mudou o schema) e
  depois `bash deploy/deploy.sh` (sobe o último commit). O Evolution leva ~30 s pra responder depois de subir
- **WhatsApp no PC:** `docker compose -p central-whats-local -f deploy/whatsapp-local.yml up -d` (Docker Desktop
  ligado) e `.env.local` com `WHATSAPP_URL=http://localhost:8080` e `WHATSAPP_CHAVE=chave-local-de-teste`
- **Robô no PC:** `.env.local` já tem `GOOGLE_SERVICO_JSON`, `CONTRATOS_PASTA_ID` e `CONTRATOS_PLANILHA_ID`.
  Teste seco (lê os contratos reais sem gravar): ver o `.tmp/seco.ts` (pasta ignorada pelo git)
- **GitHub:** este repositório sai pela conta TreinamentosPataro (`gh auth switch -u TreinamentosPataro`); o normanOS
  pela hNNrq
- **Push e deploy só quando o Henrique pedir.** Push com a conta da Pataro (o gh tem as duas contas):
  `TOKEN=$(gh auth token --user TreinamentosPataro)` e `git -c credential.helper= -c "credential.helper=!f(){ echo username=TreinamentosPataro; echo password=$TOKEN; }; f" push origin main`.
  Deploy: `bash deploy/deploy.sh`
- PDFs pro Fred e o Hoklo: `python pdf/gerar.py <nome-do-md>` (linguagem simples, sem programação, sem a lista do
  que precisamos deles: o Henrique conversa pessoalmente)

## Documentos

| Arquivo | O que é | Pra quando |
|---|---|---|
| [fonte-hoklo.md](fonte-hoklo.md) | O que o Hoklo pediu: as 4 atividades e o documento do agente de CS | — |
| [plano-central.md](plano-central.md) | Plano da Central pro Fred e o Hoklo (PDF em `pdf/`) | 17/11 ✅ enviado |
| [notas-tecnicas.md](notas-tecnicas.md) | A parte técnica que saiu do plano | — |
| [cs-respostas.md](cs-respostas.md) | Desenho da Fase 1 do CS pro Hoklo aprovar (PDF em `pdf/`) | 18/11 |
| [contratos.md](contratos.md) | Fluxo do agente de contratos (reunião de 16/11) | 18/11 |

**Histórico:** a 1ª versão (13/11) foi feita em outro computador e não subiu pro GitHub. Refeita em 16/11.

## No ar (desde 17/11/2026)

| O quê | Onde |
|---|---|
| Endereço | https://central.patarotreinamentos.com.br |
| Servidor | VPS Hostinger KVM 1, `deployadmin@179.198.109.32` (chave SSH do PC), `/opt/central`, container `central-painel-1`, porta 3300 só local |
| Segredos | `/opt/central/.env` na VPS (cópia local em `.env.producao`, fora do git). `COFRE_CHAVE` também no cofre de senhas da Pataro |
| Entrada | Caddy do **partner-reports**: bloco `central.patarotreinamentos.com.br` → `central-painel:3300` no fim de `/opt/partner-reports/deploy/Caddyfile` (cópia de antes: `Caddyfile.antes-central-20261117`). Reinstalar o partner-reports com o Caddyfile original tira a Central do ar |
| DNS | registro A `central` → IP da VPS, nuvem cinza, Cloudflare da Informatiza |
| Banco | Neon, projeto `central` (São Paulo) |
| Login | Google Cloud, projeto **CentralPataro**, app **em teste**: só os usuários de teste passam no Google, e a Central ainda confere a tabela `usuarios` |
| Atualizar | commit e `bash deploy/deploy.sh` (do PC). A versão anterior fica em `/opt/central/app.antigo` |
| Liberar alguém | e-mail nos usuários de teste do Google **e** em `usuarios` (`USUARIOS=... npx tsx --env-file=.env.producao scripts/semear.ts`) |
