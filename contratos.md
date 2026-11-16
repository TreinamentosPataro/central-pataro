# Agente de contratos · fluxo

> Atividade 3 de 4 (P2), prazo 18/11/2026. Reescrito por Norman em 16/11, depois da reunião com o Hoklo
> (gravação "Daily Automação", 16/11, 10h15).
> **Pronto quando:** um contrato real da Trilha sai da pasta do Drive e vai pra assinatura no ZapSign sem
> trabalho manual. Se faltar dado, o agente avisa o comercial.

## Como é hoje

O Hoklo já faz esse fluxo **com o Claude, passo a passo**: o Claude executa e ele autoriza cada etapa. O
agente é transformar isso em rotina, com fila de aprovação e registro na Central.

## Quem faz o quê

| Etapa | Quem | Onde |
|---|---|---|
| Negociar, mandar proposta e link de pagamento | Comercial (Bruno) | Reunião e WhatsApp |
| Confirmar o pagamento | Bruno | Hotmart |
| **Preencher o contrato** a partir da minuta | **Bruno** (continua com ele) | Google Docs, pasta `Gestão Operacional / 10 - Jurídico / Contratos Trilha` |
| Conferir, registrar, subir e mandar pra assinatura | **Agente** | Planilha `Gestão Contratos Trilha` + ZapSign |
| Registrar os valores a receber | Agente (depois) | Planilha do financeiro (o Hoklo cria) |
| Auditoria: vendas x contratos | Agente | Hotmart x planilha |

**Por que o Bruno continua preenchendo:** a condição de pagamento nasce na conversa e muda muito (entrada
num dia e o resto no cartão, parcela só em janeiro, vigência de 15 meses em vez de 12). Não dá pra tirar
isso de outro lugar.

**Se o cliente quiser ver a minuta antes**, o Bruno manda o rascunho, mas o fluxo só segue depois do
pagamento. **Contrato só vai pra assinatura com pagamento fechado.**

## O fluxo do agente

1. **Olha a pasta `Contratos Trilha` no Drive** e acha os contratos novos (o Bruno cria um documento por
   cliente, copiado da `Minuta do Contrato`).
2. **Registra na planilha `Gestão Contratos Trilha`**: data da venda, comprador (Hotmart), contratante,
   CPF/CNPJ, e-mail, WhatsApp, forma de pagamento, valor, detalhe do pagamento, transação Hotmart.
3. **Confere se tem tudo.** Campos da minuta:
   - **Contratante:** nome completo, CPF (ou CNPJ, quando é sociedade), endereço, bairro, CEP, cidade,
     estado, e-mail, telefone. Se tiver mais de um contratante, os dados de todos
   - **Quadro de pagamento (cláusula 7):** valor, forma de pagamento, quantidade de parcelas, vencimentos,
     observações
   - **Vigência (cláusula 6):** 12 meses é o padrão. Diferente disso (ex.: 15), é exceção do comercial e
     o agente só confere se está escrito
4. **Se faltar dado:** manda no **grupo do comercial** qual contrato está travado e o que falta. Quando o
   mesmo dado faltar de novo, lembra o Bruno de que todo contrato precisa trazer aquilo.
5. **Revisa o documento:** os campos batem com a planilha, o valor e as parcelas fecham, e não sobrou
   marcação amarela nem dado de exemplo.
6. **Sobe no ZapSign** (organização **Gestão Pataro**, pasta `Trilha Previdenciária - Contratos`) com os
   signatários e a ordem fixos:
   - **1º** o cliente (ou os clientes)
   - **depois** o Fred (Frederico), pela Pataro Treinamentos
   - **testemunhas:** Hoklo e Ana Paula
   - Fred, Hoklo e Ana Paula já ficam cadastrados; o agente só troca o contratante
7. **Primeiras semanas:** antes de mandar, o contrato entra na **fila da Central** e uma pessoa confere.
   Depois de 3 contratos reais sem correção, vai direto.
8. **Marca na planilha:** contrato pronto, enviado no ZapSign, assinado.
9. **Valores a receber (depois):** parcela fora do padrão da Hotmart (ex.: R$ 10 mil agora e R$ 10 mil em
   janeiro) vai pra planilha do financeiro. **O Hoklo cria esse lugar**; o agente só registra quando existir.
10. **Auditoria:** quantas vendas fecharam na Hotmart x quantos contratos tem na planilha. Se não bater,
    avisa. É isso que amarra o fluxo, do fechamento até o contrato assinado.

## Confraria

Mesmo fluxo, com pasta própria (`Contratos Confraria 2027`, criada na reunião). Acontece **uma vez por
ano**, na renovação. Entra depois da Trilha.

## ZapSign: o agente precisa da API

- O aviso de "limite atingido" que apareceu na reunião foi porque o Hoklo entrou na **organização errada**.
  A organização certa é a **Gestão Pataro**, e nela não tem limite batido.
- **A API só existe a partir do plano Equipe** (R$ 49,90 por mês no anual, 20 documentos por mês). O
  Profissional (R$ 29,90) não tem integração. **Falta confirmar qual plano a Gestão Pataro tem.**
- **Dois caminhos:**

| | Plano Equipe (com API) | Sem API |
|---|---|---|
| Como sobe o contrato | A Central cria o documento e os signatários direto no ZapSign | O Claude abre o ZapSign no navegador e faz os cliques, como o Hoklo já faz |
| Custo | R$ 49,90 por mês (R$ 598,80 no ano) | R$ 0 a mais |
| Confiabilidade | Alta: não quebra se a tela mudar | Frágil: depende da tela, e alguém precisa acompanhar |
| Status de assinatura | A Central fica sabendo sozinha quando assinou | Alguém confere no ZapSign |

**Recomendação:** se a Gestão Pataro já tem o Equipe (ou maior), custo zero e segue com a API. Se não tem,
começar **sem API** (o Claude faz os cliques, com uma pessoa acompanhando, como o Hoklo já faz) e só
subir pro Equipe se esse caminho der trabalho demais. O volume da Trilha (~6 contratos por mês desde
agosto) cabe com folga nos 20 documentos do Equipe.

## Cuidados

- **Dado de cliente não entra no git nem na fila.** CPF, endereço e valores ficam no Drive, no ZapSign e
  na área restrita da Central. Na fila e no aviso pro comercial, só o primeiro nome e o que falta.
- **O agente nunca muda condição de pagamento.** Se o valor ou as parcelas não fecham, ele avisa; quem
  corrige é o Bruno.
- **Retroativo:** os contratos desde 01/08 podem passar pelo agente depois, mas o começo é só venda nova.

## Pendências

- [ ] **Hoklo + Ana:** confirmar qual plano a organização Gestão Pataro tem no ZapSign e se a API está liberada
- [ ] **Agente:** sempre usar a organização **Gestão Pataro** (a outra deu o aviso de limite na reunião)
- [ ] **Hoklo:** organizar a pasta `Contratos Trilha` (ele mesmo disse que está bagunçada) e passar acesso
      de leitura pra conta de serviço da Central
- [ ] **Hoklo:** criar a planilha do financeiro a receber (não bloqueia o agente)
- [ ] **Norman:** acesso ao grupo do comercial, pra o agente avisar quando faltar dado
- [ ] **Norman:** primeiro teste com um dos contratos que já estão prontos no ZapSign e ainda não foram
      enviados
