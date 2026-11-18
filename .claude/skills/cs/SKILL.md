---
name: cs
description: Rodada do agente de CS da Central Pataro nos grupos de alunos, modo semiautomático. Lê as perguntas que ficaram sem resposta nos grupos liberados, escreve a resposta com o Cérebro e o catálogo de aulas da Pataro I.A e põe na fila da Central pra uma pessoa aprovar. Use quando o usuário disser "processa o CS", "roda o CS", "responde os grupos", "/cs".
---

# /cs — rodada do agente de CS nos grupos

O agente **escreve**, uma pessoa **aprova** na fila (`/fila`) e só então a resposta sai, **no mesmo grupo** da
pergunta. Nada aqui manda mensagem direto.

## 1. Buscar as perguntas

```bash
npx tsx --env-file=.env.producao scripts/cs.ts pendentes
```

Gera `.tmp/cs-pendentes.json` (fora do git: tem mensagem de aluno). Ler com a ferramenta de leitura. **Não colar
no chat**: no resumo final, só quantas e de quais grupos.

Cada pergunta vem com `antes` e `depois` (o que se falou no grupo em volta), `aulas_sugeridas` (as 5 aulas do
catálogo mais parecidas) e o arquivo traz `instrucoes`, `formato` e `cerebro`. Seguir as instruções à risca.

## 2. Decidir uma ação por pergunta

`.tmp/cs-acoes.json`:

```json
[
  { "mensagem_id": "…", "acao": "responder", "texto": "Oi, Maria! …", "aula": "Nome da aula — link" },
  { "mensagem_id": "…", "acao": "ignorar", "motivo": "já respondida pelo Hoklo" }
]
```

- **Ler o `depois` antes de tudo**: se já responderam, ignorar
- Aula só da lista `aulas_sugeridas`, e só se ela ENSINA o tema (não basta tocar no assunto)
- Sem base no Cérebro nem aula: responder que vai chamar alguém do time, sem chutar
- O código recusa resposta com mais de 1.500 caracteres ou com número de CPF

## 3. Mandar pra fila

```bash
npx tsx --env-file=.env.producao scripts/cs.ts propor .tmp/cs-acoes.json
```

Apagar os dois arquivos de `.tmp/` e avisar em 2 a 4 linhas: quantas respostas foram pra fila, quantas ignoradas.

## Teste no PC (sem WhatsApp)

```bash
npm run cs -- simular "grupo:trilha-teste" "Maria" "Alguém tem o modelo de contrato de honorários?" 90
npm run cs -- pendentes
```

Só pergunta com mais de 30 minutos entra (o time tem tempo de responder antes). `simular` recusa rodar no Neon.
