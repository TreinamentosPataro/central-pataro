# Central (agentes da Pataro)

Painel único dos agentes da Pataro Treinamentos. Foco desde 12/11/2026. O Norman é o dono (P0).

| Arquivo | O que é | Pra quando |
|---|---|---|
| [fonte-hoklo.md](fonte-hoklo.md) | O que o Hoklo pediu: as 4 atividades e o documento do agente de CS | — |
| [plano-central.md](plano-central.md) | Plano da Central: ferramentas, custo, fluxo, acesso, cronograma | 17/11 |
| [cs-respostas.md](cs-respostas.md) | Desenho da Fase 1 do CS, as fatias com data e as 9 respostas | 18/11 |
| [contratos.md](contratos.md) | Fluxo do agente de contratos e as perguntas pra reunião | 18/11 |

**Histórico:** a 1ª versão (13/11) foi feita em outro computador e não subiu pro GitHub. Estes arquivos
foram refeitos em 16/11.

**Código:** a Central vai ter repositório próprio e privado na conta da Pataro no GitHub (como os outros
produtos), com estas especificações em `docs/specs`. **Push todo dia.**

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
