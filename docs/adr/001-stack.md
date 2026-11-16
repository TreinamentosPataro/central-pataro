# ADR-001 — Stack, banco e hospedagem da Central

- **Data:** 13/11/2026
- **Quem decidiu:** Henrique Norman (executor), conforme o plano do CS deixa a cargo dele
- **Status:** aceita para a fatia 1; rever na fatia 2 (custo de IA) e na fatia 4 (executor do WhatsApp)

## Contexto

O plano do CS pede um painel acessível a Hoklo, Fred e Norman sem rodar no computador de ninguém, com login e
papéis, área restrita pra CPF/RG/endereço, auditoria de tudo e uma fila onde uma pessoa aprova antes de qualquer
envio. A Pataro já roda três apps em Neon e um VPS. Regra da confraria: gasto só com verba aprovada pelo Fred.
Prazo da fatia 1: 20/11/2026.

## Opções consideradas

1. **Next.js + Postgres (Neon) + hospedagem serverless** — uma base de código pra tela e API, banco que a Pataro já usa
2. **n8n + planilha/Airtable como base** — rápido pra automações, mas sem área restrita de verdade, sem auditoria
   imutável e com a "base única" espalhada
3. **Supabase (banco + login prontos)** — bom, mas seria mais um fornecedor; o Neon já está em uso

## Decisão

| Peça | Escolha |
|---|---|
| Painel e API | Next.js 15 (App Router), TypeScript |
| Banco | Postgres. **Neon** em produção (projeto separado dos apps atuais). **PGlite** (Postgres em WASM) no computador, sem instalar nada |
| Acesso ao banco | SQL direto, schema único e idempotente em `db/schema.sql` |
| Login | Cookie de sessão assinado (HMAC). Hoje: entrada de teste escolhendo o usuário (só fora de produção). Antes de publicar: **Google**, só e-mails cadastrados em `usuarios` |
| Papéis | `gerente` (Hoklo), `stakeholder` (Fred), `executor` (Norman), tabela em `lib/papeis.ts` |
| Área restrita | Tabela `dados_restritos`, CPF/RG/endereço cifrados com AES-256-GCM (chave em `COFRE_CHAVE`), CPF com HMAC pra achar duplicidade |
| Auditoria | Tabela `auditoria` com gatilho que bloqueia UPDATE e DELETE |
| Agentes ↔ Central | API HTTP com chave por agente (só o hash fica no banco): `POST /api/eventos`, `GET /api/agente/aprovados`, `POST /api/agente/executado` |
| Hospedagem do painel | Netlify ou Vercel, plano grátis |
| Robô (WhatsApp Web, leitura de fontes) | Processo separado no VPS da Pataro ou num computador dedicado, falando com a Central pela mesma API |
| IA | A decidir na fatia 2: Claude API (extração das calls com trecho de origem) depende de verba; Groq grátis pra triagem |
| Testes | Vitest com PGlite em memória: cada critério de aceite é um teste |

## Consequências

- Agente feito em qualquer ferramenta (código, n8n, Claude) entra na Central, desde que fale com a API
- O painel não depende do robô: se o WhatsApp cair, fila, fichas e auditoria continuam
- Perder `COFRE_CHAVE` = perder CPF/RG/endereço cifrados. Guardar no cofre de senhas da Pataro
- PGlite aceita um processo por vez: no computador, parar o `dev` antes de rodar scripts
- Falta antes de publicar: login Google, projeto no Neon, variáveis na hospedagem
