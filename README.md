# Central (agentes da Pataro)

Painel único dos agentes da Pataro Treinamentos. Foco desde 12/11/2026. O Norman é o dono (P0).

## Onde paramos (18/11/2026, noite) — ler primeiro

**No ar:** https://central.patarotreinamentos.com.br (último deploy: commit d862b7b). Login Google só pros 3 e-mails:
Fred `patarofrederico@gmail.com` (stakeholder), Hoklo `gestao@patarotreinamentos.com.br` (gerente), Norman
`gestaopatarotreinamentos@gmail.com` (executor). 102 testes passando. **Tudo depende agora do chip do agente.**

### Situação de cada agente

| Agente | O que já roda | Falta pra funcionar de verdade |
|---|---|---|
| **Contratos** | Confere a pasta Contratos Trilha a cada 10 min + botão "Conferir agora"; registra na planilha Gestão Contratos Trilha (só célula em branco); pronto → fila (`zapsign:trilha`), travado → aviso pro `grupo:comercial` (já ligado, Enviar on) | Chip conectado; primeiro contrato novo do Bruno (nenhum desde 17/11); ZapSign sem API → envio pra assinatura ainda à mão (Fred e Hoklo decidem o plano Equipe) |
| **SDR** | Conversa privada no chip vira lead (`/leads`); rodada `/sdr` escreve pelo SPIN do Thales; aprovada sai pro lead; qualificado → resumo pro `grupo:comercial` | Chip conectado; anúncio apontar pro número do chip (Hoklo); 10 conversas reais e nome do agente (Hoklo) pra ajustar o tom |
| **CS** | Desenho da Fase 1 **aprovado pelo Hoklo (18/11)**. Acompanhamento nos grupos: lê só grupo com "Ler", pergunta sem resposta há 30 min → rodada `/cs` (Cérebro + 5 aulas do catálogo da Pataro I.A) → aprovada sai no mesmo grupo. **73 grupos de acompanhamento já cadastrados** com Ler on e Enviar off | Chip conectado e adicionado nos 73 grupos (Henrique, 18/11 à noite); planilha de alunos (5 abas) → ficha real (Henrique encaminha); ligar "Enviar" nos grupos quando quiserem que a resposta saia |
| Tráfego, Social, Financeiro | Cartão e página "em construção" | São do Hoklo |

**Página de cada agente** (`/agentes/<id>`, o cartão da tela inicial é clicável): ficha, "o que ele precisa pra
funcionar" (conferido na hora + pendências combinadas com dono, em `lib/painel-agente.ts` → `COMBINADAS`: resolveu, tira
de lá), aprovações do agente, parte própria e atividade.

**IA em modo de teste:** SDR e CS rodam pelo Claude Code (skills `/sdr` e `/cs` neste repositório) e uma pessoa aprova
na fila. Combinado em 18/11: se a usabilidade for boa, passa pra API do Claude (rodada dentro da Central, com teto de
gasto). **Não é regra fixa** que tudo tenha que sair da Central.

### Quando o chip conectar (conferir nesta ordem)
1. **QR do chip** em Integrações → WhatsApp. O Evolution 2.3.7 tem um problema conhecido de pareamento ("não é possível
   conectar novos dispositivos"): no WhatsApp do Henrique **funcionou na 2ª tentativa**. Se falhar várias vezes, a
   correção é trocar o Baileys dentro da imagem (issue evolution-foundation/evolution-api#2437; o fork citado lá é de
   terceiro: revisar e travar no commit antes de usar). O chip ainda não tem sessão: não há nada a perder
2. **Avisos de mensagem nova:** ligam sozinhos até 1 min depois de conectar (`lib/rodada-whatsapp.ts`, log
   `[whatsapp] avisos de mensagem nova ligados`). Conferir na VPS com `GET /webhook/find/agente` no `127.0.0.1:3301`
   (cabeçalho `apikey` = `WHATSAPP_CHAVE`)
3. **Formato real do aviso** (nunca testado com mensagem de verdade): mandar um "oi" de outro celular pro chip → tem
   que aparecer em `/leads`; mandar uma pergunta num grupo de acompanhamento → tem que contar em "Grupos que ele lê" na
   página do CS. Se não aparecer, ver o log do container e ajustar `lerEntradaEvolution` (`lib/sdr.ts`) ou
   `lerMensagemGrupo` (`lib/cs-grupos.ts`)
4. Primeira rodada de verdade: `/sdr` e `/cs`

### Próximos passos de desenvolvimento (em ordem)
1. **Ficha real do aluno (entrega 1 do CS):** quando chegar a planilha de alunos (5 abas), `npm run importar` e conferir 5
   alunos na mão contra a fonte
2. **Entrega 2 do CS (02/12):** call, grupo Vendas e plano de ação na ficha. O banco dos Planos de Ação é **outro Neon**
   (não é o da Central, ao contrário do que o desenho diz): precisa de um acesso só de leitura lá. Pedir ao Henrique
   antes de criar usuário no banco de produção dos Planos de Ação
3. **Envio pro ZapSign** depois da aprovação: sem API = Claude fazendo os cliques; com o Equipe = API
4. **Cérebro:** preços, reembolso, metas e tom estão "a preencher" (Fred ou Hoklo)
5. **Pendências combinadas editáveis pela Central** (hoje estão no código), se o Henrique quiser

### Feito em 18/11 (resumo; detalhe no git log e em `confraria/diario/2026-11.md` do normanOS)
- Contratos rodando sozinhos na Central (8cecd45) e registro na planilha (579ad10)
- SDR 1ª versão (973bc12): tabelas `leads` e `lead_mensagens`, porta `POST /api/whatsapp/entrada?chave=…` (chave
  derivada da `WHATSAPP_CHAVE`, sem segredo novo; o Evolution chama `http://painel:3300` pela rede interna), envio pro
  lead em `lib/enviador.ts` (destino `lead:<id>`), recusa preço/desconto, retoma quem sumiu no máximo 2 vezes
- Página de cada agente (242e3cf)
- CS nos grupos (9cdce6e, d862b7b): tabela `grupo_mensagens`, `lib/cs-grupos.ts`, `lib/cs-instrucoes.ts`, `scripts/cs.ts`.
  O catálogo de aulas é lido de `../fred-ia/conteudo/` (normanOS) na hora da rodada: rodar `/cs` a partir desta pasta
  dentro do normanOS (ou com `CS_AULAS_DIR`)
- **Grupos cadastrados:** os 108 grupos do WhatsApp do Henrique foram listados por uma conexão temporária no Evolution
  (criada e apagada em seguida; só nomes e códigos, nenhuma mensagem). Entraram na tabela `destinos`: 73 de
  acompanhamento (`grupo:trilha-<nome>`, Ler on, Enviar off), `grupo:comercial` (Enviar on) e `grupo:vendas` (tudo off).
  Os 4 grupos grandes (Trilha Prev. Avisos, Confraria, Confraria 2027 Oficial, Confraria Experience 2026) ficaram de
  fora por enquanto (volume); internos e pessoais também. A lista completa não foi guardada

### Referência técnica (configurado em 17/11)
- **WhatsApp do agente:** Evolution API v2.3.7 + Postgres próprio no `compose.yml` (sem porta pra internet; a VPS
  enxerga em `127.0.0.1:3301`). Instância `agente`. Guarda só a sessão do chip. Envio só de item aprovado, pra destino
  ligado, respeitando o botão de parar; sai logo depois da aprovação e numa rodada a cada minuto (`instrumentation.ts`)
- **Robô do Google:** `agente-contrato@centralpataro.iam.gserviceaccount.com`. Pasta Contratos Trilha
  (`CONTRATOS_PASTA_ID=1wk8rUsZHDRKkE0YfdTBAz7hUWjzjrj5l`, leitor) e planilha Gestão Contratos Trilha
  (`CONTRATOS_PLANILHA_ID=1tdffmdMeCVmw3-R7kFMHdojt_1BrJCPbzxvI85RAauU`, editor, aba **Contratos**, 20 colunas de Nº a
  Observações; o agente confere o cabeçalho antes de escrever). Chave no PC em `~/.central/robo-google.json`; na VPS em
  `/opt/central/robo-google.json`, montada em `/run/segredos/robo-google.json`. Só entra contrato criado a partir de
  `CONTRATOS_DESDE` (2026-11-17)
- **Régua dos contratos** (ajustada com os 16 contratos reais): amarelo não trava, forma entre colchetes vale, parcelas em
  texto livre, campo em branco não herda o endereço da Pataro, estado sem cidade pede a cidade
- **ZapSign:** conta gestão, plano Profissional sem API (240 docs/ano, 48 usados, 4/10 usuários). Equipe: +R$ 20/mês no anual
- `.env` da VPS (cópia em `.env.producao`, fora do git): `GOOGLE_SERVICO_JSON`, `CONTRATOS_PASTA_ID`,
  `CONTRATOS_PLANILHA_ID`, `CONTRATOS_DESDE`, `WHATSAPP_CHAVE`, `WHATSAPP_DB_SENHA`, `WHATSAPP_INSTANCIA`

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
