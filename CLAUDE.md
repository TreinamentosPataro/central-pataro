# Central Pataro

Painel único dos agentes de IA da Pataro Treinamentos. Nasce como o **E0 (Fundação) do Agente de CS**
(`docs/specs/cs.md`) e recebe os outros agentes (Contratos, SDR, e os do Hoklo: tráfego, social, financeiro).

Papéis: **Hoklo** = gerente, **Fred** = stakeholder, **Norman** = executor (quem constrói).

## O fluxo que não muda

fontes entram → base única guarda → regras e IA leem → **fila** apresenta → **uma pessoa aprova** → só então
o agente executa. Tudo deixa rastro na **auditoria**.

## Regras de autonomia (do plano do CS)

- **Sozinho:** ler fontes, cruzar sinais, alertar, gerar relatório
- **Propõe, humano aprova:** qualquer mensagem pra aluno ou grupo, publicar aula, divulgar ranking, mudar status ou vencimento
- **Só humano:** cancelamento, reclamação, dinheiro, exceção, remover membro, bloquear acesso
- Quem aprova: gerente ou stakeholder (`lib/papeis.ts`). Executor vê, não aprova

## Regras que não podem quebrar

- Nada sai pro aluno sem item **aprovado** na fila. O agente busca em `/api/agente/aprovados` e usa `texto_final`
- O **destino** (grupo, e-mail) vem de tabela, nunca da IA. Mensagem do plano X nunca vai pro grupo do plano Y
- Agente só lê grupos e pastas de uma **lista permitida**
- CPF, RG e endereço: só em `dados_restritos`, cifrados (`lib/cofre.ts`), visíveis só pra quem tem `ver_restrito`
- `auditoria` é só de inserção (o banco bloqueia UPDATE e DELETE)
- Senha, token e chave de agente: nunca no git, em log ou em chat. Chave de agente só existe como hash no banco
- Dado de aluno nunca entra no git: planilhas em `importacoes/` (ignorada)
- Toda ação é idempotente (`chave_idem` na proposta; marcar executado duas vezes não muda nada)

## Convenções

- Specs em `docs/specs/`, decisões técnicas em `docs/adr/` (contexto, opções, decisão, consequência)
- Histórias com ID (US-01…), critérios em Dado/Quando/Então, **cada critério vira teste** em `tests/` antes do código
- Definition of Done: teste passando, auditoria registrando, permissão conferida, demo pro Hoklo, docs atualizadas
- Código e textos de tela em português. Marca: dourado `#F4AA27`, preto `#0B0B0B`, papel `#F6F3EC`, sem navy

## Stack

Next.js 15 (App Router) · Postgres (Neon em produção, PGlite local em `.dados/`) · SQL direto (`db/schema.sql`,
idempotente) · sessão por cookie assinado · Vitest. Detalhes e porquês: `docs/adr/001-stack.md`.

## Comandos

```
npm run dev                 # painel em http://localhost:3000
npm test                    # critérios de aceite
npm run db:migrar           # aplica o schema (Neon ou local)
npm run db:semear [-- --demo]
npm run importar -- importacoes/aba.csv
npm run agente:chave -- contratos
```
No banco local (PGlite), só um processo por vez: pare o `dev` antes de rodar scripts.
