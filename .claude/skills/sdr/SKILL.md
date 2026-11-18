---
name: sdr
description: Rodada do agente SDR da Central Pataro no modo semiautomático. Lê as conversas de leads que esperam resposta, escreve a próxima mensagem pelo método SPIN (Thales Leray) e põe na fila da Central pra uma pessoa aprovar. Use quando o usuário disser "processa o SDR", "roda o SDR", "responde os leads", "/sdr".
---

# /sdr — rodada do agente SDR

O agente **escreve**, uma pessoa **aprova** na fila (`/fila`) e só então a mensagem sai pelo WhatsApp do agente.
Nada aqui manda mensagem direto.

## 1. Buscar o que espera resposta

```bash
npx tsx --env-file=.env.producao scripts/sdr.ts pendentes
```

Gera `.tmp/sdr-pendentes.json` (fora do git: tem nome e mensagem de lead). Ler o arquivo com a ferramenta de
leitura. **Não colar o conteúdo no chat**: no resumo final, só primeiro nome e o que foi feito.

O arquivo traz:
- `instrucoes`: o comportamento do agente (identidade, SPIN, regras, limites, escalação). Seguir à risca
- `formato`: as três ações possíveis
- `cerebro`: o que a Pataro sabe (Trilha, Elite, OAB…). **Só falar de produto com base nisso**
- `conversas`: cada lead com o histórico. `motivo: "retomar"` = lead sumiu há mais de 24 h (puxar de volta com
  leveza, sem cobrar resposta)

## 2. Decidir uma ação por conversa

Escrever `.tmp/sdr-acoes.json`, uma lista:

```json
[
  { "lead_id": "…", "acao": "responder", "texto": "…", "etapa": "situacao", "pessoas": 6, "faixa": "120 a 500 mil", "resumo": "…" },
  { "lead_id": "…", "acao": "passar", "texto": "…", "resumo": "Escritório em Uberlândia, 6 pessoas, 120 a 500 mil/ano. Dor: … Objeções: … Indicado: Trilha. Nome/e-mail/horário: …" },
  { "lead_id": "…", "acao": "encerrar", "texto": "…" }
]
```

Regras que o código também confere (e recusa):
- **Nunca preço, valor em R$ ou desconto** na mensagem pro lead
- Mensagem curta (até 1.200 caracteres), **uma pergunta só**
- `passar` exige `resumo` (vai pro grupo do comercial, pro Bruno)

Antes de escrever, reler a conversa inteira: não repetir pergunta que o lead já respondeu.

## 3. Mandar pra fila

```bash
npx tsx --env-file=.env.producao scripts/sdr.ts propor .tmp/sdr-acoes.json
```

Depois, apagar os dois arquivos de `.tmp/` e avisar em 2 a 4 linhas: quantas respostas foram pra fila, quantos leads
passados pro Bruno, quantos encerrados (só primeiro nome).

## Teste no PC (sem WhatsApp)

```bash
npm run sdr -- simular "Maria Teste" "Oi, vi o anúncio da Trilha. Como funciona?"
npm run sdr -- pendentes
```

Sem `--env-file=.env.producao` usa o banco do PC (`.dados/`). `simular` recusa rodar no Neon.
Personas do teste de estresse: `confraria/agentes/sdr/estudo.md` (repositório normanOS).
