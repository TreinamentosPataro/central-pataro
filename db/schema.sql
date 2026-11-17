-- Central Pataro — esquema do banco (Postgres: Neon em produção, PGlite no computador).
-- Idempotente: pode rodar de novo sem quebrar. Modelo de dados do plano do CS (docs/specs/cs.md).

-- Quem entra no painel e com que papel
CREATE TABLE IF NOT EXISTS usuarios (
  email       text PRIMARY KEY,
  nome        text NOT NULL,
  papel       text NOT NULL CHECK (papel IN ('gerente', 'stakeholder', 'executor')),
  ativo       boolean NOT NULL DEFAULT true,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

-- Cada agente que aparece na Central (CS, Contratos, SDR, os do Hoklo…)
CREATE TABLE IF NOT EXISTS agentes (
  id               text PRIMARY KEY,
  nome             text NOT NULL,
  dono             text NOT NULL,
  prazo            date,
  status           text NOT NULL DEFAULT 'em_construcao'
                   CHECK (status IN ('no_ar', 'em_construcao', 'parado')),
  descricao        text,
  chave_hash       text,              -- sha256 da chave do agente; a chave em si nunca é guardada
  parado           boolean NOT NULL DEFAULT false,  -- botão de parar o executor
  ultima_execucao  timestamptz,
  ordem            int NOT NULL DEFAULT 100
);

-- Escritório: a unidade a que o aluno pertence
CREATE TABLE IF NOT EXISTS escritorios (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text NOT NULL,
  nome_chave      text NOT NULL UNIQUE,  -- nome normalizado, evita duplicar o mesmo escritório
  cidade          text,
  uf              text,
  responsavel_cs  text,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

-- Pessoa: titular, sócio ou segunda cadeira
CREATE TABLE IF NOT EXISTS pessoas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id  uuid REFERENCES escritorios(id),
  nome           text NOT NULL,
  papel          text CHECK (papel IN ('titular', 'socio', 'segunda_cadeira')),
  telefone       text UNIQUE,   -- +55DDDNÚMERO, chave principal de ligação entre fontes
  email          text UNIQUE,   -- minúsculo, segunda chave
  criado_em      timestamptz NOT NULL DEFAULT now()
);

-- Área restrita: CPF, RG e endereço cifrados. Só papéis com permissão leem (lib/papeis.ts)
CREATE TABLE IF NOT EXISTS dados_restritos (
  pessoa_id         uuid PRIMARY KEY REFERENCES pessoas(id) ON DELETE CASCADE,
  cpf_hash          text UNIQUE,   -- HMAC do CPF, pra achar duplicidade sem decifrar
  cpf_cifrado       text,
  rg_cifrado        text,
  endereco_cifrado  text
);

-- Matrícula: programa contratado
CREATE TABLE IF NOT EXISTS matriculas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id  uuid NOT NULL REFERENCES escritorios(id),
  produto        text NOT NULL,          -- trilha, confraria…
  inicio         date,
  vencimento     date,
  status         text NOT NULL DEFAULT 'ativa'
);

-- Jornada: etapa atual do escritório
CREATE TABLE IF NOT EXISTS jornadas (
  escritorio_id  uuid PRIMARY KEY REFERENCES escritorios(id),
  etapa          text NOT NULL DEFAULT 'venda',
  marcos         jsonb NOT NULL DEFAULT '{}'::jsonb,
  bloqueio       text,
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

-- Objetivo declarado (call) ou inferido
CREATE TABLE IF NOT EXISTS objetivos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id  uuid NOT NULL REFERENCES escritorios(id),
  texto          text NOT NULL,
  origem         text NOT NULL CHECK (origem IN ('dito', 'inferido')),
  trecho         text,
  fonte_id       uuid,
  revisado       boolean NOT NULL DEFAULT false,
  data           timestamptz NOT NULL DEFAULT now()
);

-- Fonte: documento lido (call, nota, SDE, Raio-X, plano, ranking)
CREATE TABLE IF NOT EXISTS fontes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        text NOT NULL,
  link        text,
  descricao   text,
  data        timestamptz NOT NULL DEFAULT now()
);

-- Sinal: fato observado
CREATE TABLE IF NOT EXISTS sinais (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id  uuid NOT NULL REFERENCES escritorios(id),
  tipo           text NOT NULL,
  valor          text,
  fonte_id       uuid REFERENCES fontes(id),
  data           timestamptz NOT NULL DEFAULT now()
);

-- Interação: contato com o aluno
CREATE TABLE IF NOT EXISTS interacoes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id  uuid NOT NULL REFERENCES escritorios(id),
  canal          text NOT NULL,
  resumo         text,
  resposta       text,
  proxima_acao   text,
  data           timestamptz NOT NULL DEFAULT now()
);

-- Saúde: leitura de situação, sempre com motivo
CREATE TABLE IF NOT EXISTS saude (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id  uuid NOT NULL REFERENCES escritorios(id),
  cor            text NOT NULL CHECK (cor IN ('verde', 'amarelo', 'vermelho')),
  motivo         text NOT NULL,
  evidencias     jsonb NOT NULL DEFAULT '[]'::jsonb,
  revisado_por   text,
  data           timestamptz NOT NULL DEFAULT now()
);

-- Fila de decisões: o que o agente propôs e espera alguém aprovar
CREATE TABLE IF NOT EXISTS fila (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id      text NOT NULL REFERENCES agentes(id),
  escritorio_id  uuid REFERENCES escritorios(id),
  tipo           text NOT NULL,
  titulo         text NOT NULL,
  evidencia      text,
  rascunho       text,
  destino        text,          -- ex.: id do grupo; vem de tabela, nunca da IA
  estado         text NOT NULL DEFAULT 'pendente'
                 CHECK (estado IN ('pendente', 'aprovado', 'ajustado', 'descartado', 'executado', 'falhou')),
  texto_final    text,          -- o que de fato vai sair (rascunho ou versão ajustada)
  aprovador      text,
  motivo         text,
  decidido_em    timestamptz,
  executado_em   timestamptz,
  resultado      text,
  chave_idem     text UNIQUE,   -- o agente manda a mesma proposta duas vezes → entra uma só
  criado_em      timestamptz NOT NULL DEFAULT now()
);

-- Itens que a importação não resolveu sozinha (duplicidade com divergência, vínculo em dúvida)
CREATE TABLE IF NOT EXISTS revisoes (
  id          bigserial PRIMARY KEY,
  origem      text NOT NULL,
  problema    text NOT NULL,
  dados       jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolvido   boolean NOT NULL DEFAULT false,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

-- Auditoria: quem, o quê, quando, antes e depois. Só inserção.
CREATE TABLE IF NOT EXISTS auditoria (
  id         bigserial PRIMARY KEY,
  quem       text NOT NULL,
  acao       text NOT NULL,
  alvo       text,
  antes      jsonb,
  depois     jsonb,
  evidencia  text,
  quando     timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION auditoria_imutavel() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'auditoria é só de inserção: não pode alterar nem apagar';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auditoria_sem_alteracao ON auditoria;
CREATE TRIGGER auditoria_sem_alteracao
  BEFORE UPDATE OR DELETE ON auditoria
  FOR EACH ROW EXECUTE FUNCTION auditoria_imutavel();

-- Cérebro: o que a Pataro sabe e vale pra todo agente (oferta, políticas, processo, números, tom, aulas).
-- Nunca dado de aluno: isso fica nas fichas. Cada mudança vai pra auditoria com antes e depois.
CREATE TABLE IF NOT EXISTS cerebro (
  id              text PRIMARY KEY,          -- slug estável, ex.: politica-reembolso
  tema            text NOT NULL,             -- ver TEMAS em lib/cerebro.ts
  titulo          text NOT NULL,
  conteudo        text NOT NULL DEFAULT '',  -- vazio = "a preencher"
  dono            text,                      -- quem responde pelo que está escrito
  revisar_em      date,                      -- depois disso aparece como "revisar"
  fonte           text,                      -- de onde saiu (documento, reunião, site)
  atualizado_por  text,
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cerebro_busca_idx ON cerebro
  USING gin (to_tsvector('portuguese', titulo || ' ' || conteudo));

-- O que cada agente sabe fazer (aparece no cartão). Coluna nova: ADD IF NOT EXISTS pra bancos já criados.
ALTER TABLE agentes ADD COLUMN IF NOT EXISTS habilidades jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE agentes ADD COLUMN IF NOT EXISTS funcao text;

CREATE INDEX IF NOT EXISTS fila_estado_idx ON fila (estado, criado_em);
CREATE INDEX IF NOT EXISTS auditoria_quando_idx ON auditoria (quando DESC);
CREATE INDEX IF NOT EXISTS sinais_escritorio_idx ON sinais (escritorio_id, data DESC);

-- Agente de contratos: cada contrato que ele viu na pasta do Drive. Sem dado sensível: só o primeiro nome
-- e o que falta. CPF, endereço e valores ficam no Drive e no ZapSign.
CREATE TABLE IF NOT EXISTS contratos (
  drive_id        text PRIMARY KEY,
  nome_arquivo    text NOT NULL,
  versao          text NOT NULL,           -- modifiedTime do Drive: mudou, confere de novo
  situacao        text NOT NULL CHECK (situacao IN ('travado', 'pronto', 'enviado', 'assinado')),
  primeiro_nome   text,
  falta           jsonb NOT NULL DEFAULT '[]'::jsonb,
  avisos          jsonb NOT NULL DEFAULT '[]'::jsonb,
  fila_id         uuid REFERENCES fila(id),
  conferido_em    timestamptz NOT NULL DEFAULT now()
);

-- Destinos: a lista permitida de grupos e números. O item da fila guarda só a chave (ex.: grupo:comercial);
-- o endereço de verdade (JID do WhatsApp) sai daqui, nunca da IA. Sem endereço ou com envio desligado, nada sai.
-- "ler" = o agente pode ler aquele grupo (lista permitida do CS); fora da lista, o agente não lê nada.
CREATE TABLE IF NOT EXISTS destinos (
  id              text PRIMARY KEY,          -- chave usada na fila: grupo:comercial, grupo:vendas…
  nome            text NOT NULL,             -- como aparece pra quem aprova
  canal           text NOT NULL DEFAULT 'whatsapp' CHECK (canal IN ('whatsapp')),
  endereco        text,                      -- JID do grupo (…@g.us) ou do número (…@s.whatsapp.net)
  enviar          boolean NOT NULL DEFAULT false,
  ler             boolean NOT NULL DEFAULT false,
  atualizado_por  text,
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);
