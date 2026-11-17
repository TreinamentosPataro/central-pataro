# Central · notas técnicas

> Parte técnica que saiu do `plano-central.md` em 17/11/2026 (o plano virou versão pro Fred e o Hoklo).
> Só pro Norman.

## Decisões técnicas

- **Stack:** Next.js + Neon + login Google, rodando na VPS. Mesma base dos Planos de Ação, então os dois
  conversam direto pelo banco, sem copiar planilha.
- **Código e especificação no mesmo repositório**, privado, na conta TreinamentosPataro (`central-pataro`).
  Histórias e decisões em `docs/specs`, como o Hoklo pediu. **Push todo dia.**
- **Cérebro:** documentos em texto, por tema, com histórico de cada mudança. Busca começa pela busca de texto
  do Postgres (sem custo). Embeddings só se a de texto não der conta.
- **Identificador do aluno:** ID interno da Central. O que liga as fontes é o **telefone**; e-mail é a
  segunda chave; CPF fica na área restrita e só desempata duplicado.
- **IA no modo gratuito:** assinatura do Claude ligada à Central por MCP. O SDR consulta o Cérebro pelo mesmo
  MCP.
- **WhatsApp:** Evolution API na VPS, chip dedicado.
- **Status dos agentes de fora (SDR, tráfego, social, financeiro):** cada um manda o status pra um endpoint
  próprio da Central.
- **Segredos:** `.env` no servidor, nunca no chat nem no código.
- **Leitura do Drive:** conta de serviço do Google, só leitura nas pastas liberadas.

## Conta do modo pago (API)

Preços por milhão de tokens: Sonnet 5.5 US$ 2 de entrada e US$ 10 de saída, Haiku 4.5 US$ 1 e US$ 5.

| Uso | Volume por mês (suposição) | Custo |
|---|---|---|
| Rascunhos da fila de aprovação | ~15 por dia | ~US$ 12 |
| Triagem das mensagens dos grupos | ~30 grupos, todo dia | ~US$ 7,50 |
| Raio-X, ranking e relatório semanal | — | ~US$ 5 |
| Ler call comercial (objetivo, dores, promessas) | ~40 calls | ~US$ 2,50 |
| Cérebro (ler e resumir documento novo) | ~30 documentos | ~US$ 2 |
| Contratos (conferir nome, CPF, e-mail) | ~15 a 20 vendas | < US$ 1 |
| **Total** | | **~US$ 30**, com folga **US$ 30 a 60** |
