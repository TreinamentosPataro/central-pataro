# Referência: vídeo do Nathan Lopes (28/10/2026)

Link: https://www.instagram.com/p/DfDBDKSMpQ8/ (@nathanlopes.ia, 1min22)

O que pegamos dele pra Central:
- **Cérebro** no centro, temas em volta, linhas curvas como nervos, neurônios soltos nas pontas, pulsos de luz
  correndo pelas linhas (`app/cerebro/mapa.tsx`)
- **Agentes** em cartões com avatar de batimento (eletrocardiograma), nome, função em itálico com serifa,
  etiquetas e rodapé com a situação (`app/page.tsx`, `app/onda.tsx`)
- **Topo** com título grande e a faixa de batimentos com "X de Y no time"

O que mudamos: fundo branco (o dele é escuro), Cérebro continua preto, dourado da Pataro no lugar do verde e
roxo.

2ª versão (17/11), pedida pelo Henrique ("deixar bem parecido"): menu lateral com seções (Empresa, Governança) e
contador de aprovações; agentes agrupados por área com frase em itálico e "X agentes · Y no ar"; cartão enxuto
(batimento, nome, cargo, frase, etiquetas, rodapé com a situação); Cérebro com "Ensinar algo novo" em cartão
largo, busca e contagem; telas novas de **Organograma** (`app/organograma`) e **Integrações** (`app/integracoes`,
lista em `lib/integracoes.ts`). Áreas, frases e organograma ficam em `lib/equipe.ts`.

Ainda não feitos: a conversa com a Central (a esfera do "Command Center") e o agente chefe que distribui pedidos.

Quadros: `cerebro.jpg`, `agentes.jpg`, `integracoes.jpg` e as folhas com um quadro a cada 2 segundos.
