/**
 * Página de cada agente (/agentes/<id>): o que ele precisa pra funcionar e em que pé está.
 * Parte é conferida na hora (variável do servidor, grupo ligado, WhatsApp conectado, dado importado);
 * parte são pendências combinadas com o time, com dono. Resolveu uma combinada? Tira daqui.
 */
import type { Banco } from './db'
import { clienteEvolution, whatsappConfigurado, type EstadoConexao } from './whatsapp'
import { NOME_AGENTE_SDR } from './sdr-instrucoes'

export interface Requisito {
  nome: string
  ok: boolean
  nota: string
  dono?: string        // quem destrava, quando não está ok
  href?: string        // onde resolver dentro da Central
}

/** Combinado com o time e que a Central não tem como conferir sozinha. */
const COMBINADAS: Record<string, Requisito[]> = {
  contratos: [
    { nome: 'ZapSign com API', ok: false, nota: 'Plano atual (Profissional) não tem API. Sem ela, o envio pra assinatura é feito à mão. Equipe: +R$ 20/mês no anual', dono: 'Fred e Hoklo decidem' },
    { nome: 'Primeiro contrato novo de ponta a ponta', ok: false, nota: 'Bruno cria o contrato no Drive → fila → aprovação → aviso no grupo e linha na planilha', dono: 'Bruno' },
  ],
  sdr: [
    { nome: 'Anúncio apontando pro número do agente', ok: false, nota: 'Hoje o lead escreve no WhatsApp do comercial; o SDR só atende quem escreve no chip do agente', dono: 'Hoklo' },
    { nome: '10 conversas reais do SDR antigo', ok: false, nota: 'Pra ajustar o tom do agente ao jeito que o lead da Pataro fala', dono: 'Hoklo' },
    { nome: 'IA respondendo sozinha (API do Claude)', ok: false, nota: 'Por enquanto a rodada é pelo Claude (/sdr). Se o teste for bem, passa pra API', dono: 'Fred e Hoklo, depois do teste' },
  ],
  cs: [
    { nome: 'Planilha de alunos (5 abas)', ok: false, nota: 'Vira a primeira ficha real de cada aluno', dono: 'Henrique encaminha' },
  ],
}

async function estadoWhatsapp(): Promise<EstadoConexao> {
  if (!whatsappConfigurado()) return 'sem_servidor'
  try {
    return await clienteEvolution().estado()
  } catch {
    return 'sem_servidor'
  }
}

const NOME_WA: Record<EstadoConexao, string> = {
  conectado: 'Chip conectado', conectando: 'Esperando ler o QR', desconectado: 'Chip desconectado', sem_servidor: 'Servidor do WhatsApp fora do ar',
}

export async function requisitosDoAgente(db: Banco, id: string): Promise<Requisito[]> {
  const precisaWhats = ['contratos', 'sdr', 'cs'].includes(id)
  const wa = precisaWhats ? await estadoWhatsapp() : null
  const destino = async (chave: string) => {
    const [d] = await db.query<{ endereco: string | null; enviar: boolean; ler: boolean }>(`SELECT endereco, enviar, ler FROM destinos WHERE id = $1`, [chave])
    return d
  }
  const whats: Requisito | null = wa && {
    nome: 'WhatsApp do agente', ok: wa === 'conectado', nota: NOME_WA[wa], dono: wa === 'conectado' ? undefined : 'Henrique (ler o QR com o chip)',
    href: '/integracoes/whatsapp',
  }
  const r: Requisito[] = []

  if (id === 'contratos') {
    const g = await destino('grupo:comercial')
    r.push(
      { nome: 'Robô do Google', ok: !!process.env.GOOGLE_SERVICO_JSON, nota: process.env.GOOGLE_SERVICO_JSON ? 'Chave no servidor' : 'Falta a chave do robô no servidor' },
      { nome: 'Pasta Contratos Trilha', ok: !!process.env.CONTRATOS_PASTA_ID, nota: process.env.CONTRATOS_PASTA_ID ? 'Conferida a cada 10 minutos' : 'Falta o id da pasta no servidor' },
      { nome: 'Planilha Gestão Contratos Trilha', ok: !!process.env.CONTRATOS_PLANILHA_ID, nota: process.env.CONTRATOS_PLANILHA_ID ? 'Cada contrato conferido é registrado' : 'Falta o id da planilha no servidor' },
      whats!,
      { nome: 'Grupo do comercial ligado', ok: !!(g?.endereco && g.enviar), nota: g?.endereco && g.enviar ? 'Aviso de contrato travado sai lá depois da aprovação' : 'O aviso de contrato travado fica parado na fila até o grupo ser escolhido', dono: g?.endereco && g.enviar ? undefined : 'Henrique', href: '/integracoes/whatsapp' },
    )
  } else if (id === 'sdr') {
    const g = await destino('grupo:comercial')
    r.push(
      whats!,
      { nome: 'Grupo do comercial ligado', ok: !!(g?.endereco && g.enviar), nota: 'Pra onde vai o resumo do lead qualificado (Bruno)', dono: g?.endereco && g.enviar ? undefined : 'Henrique', href: '/integracoes/whatsapp' },
      { nome: 'Nome do agente', ok: NOME_AGENTE_SDR !== 'Assistente da Pataro', nota: `Hoje se apresenta como "${NOME_AGENTE_SDR}"`, dono: 'Hoklo' },
    )
  } else if (id === 'cs') {
    const [a] = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM escritorios`)
    const [l] = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM destinos WHERE ler AND endereco IS NOT NULL`)
    r.push(
      { nome: 'Base de alunos', ok: (a?.n ?? 0) > 0, nota: a?.n ? `${a.n} escritórios na base` : 'Base vazia: falta importar a planilha', href: '/alunos' },
      whats!,
      { nome: 'Grupos de alunos na lista permitida', ok: (l?.n ?? 0) > 0, nota: l?.n ? `${l.n} grupos liberados pra leitura` : 'Nenhum grupo liberado: o agente não lê nada', href: '/integracoes/whatsapp' },
    )
  } else {
    r.push({ nome: 'Construção', ok: false, nota: 'Agente do Hoklo, ainda em construção. Entra na Central quando estiver pronto', dono: 'Hoklo' })
  }
  return [...r, ...(COMBINADAS[id] ?? [])]
}

export interface Atividade {
  quem: string
  acao: string
  evidencia: string | null
  quando: string
}

/** O que aconteceu com o agente: o que ele fez e o que as pessoas fizeram com ele. */
export async function atividadeDoAgente(db: Banco, id: string, limite = 15): Promise<Atividade[]> {
  return db.query<Atividade>(
    `SELECT quem, acao, evidencia, quando FROM auditoria
     WHERE quem = 'agente:' || $1 OR alvo = 'agente:' || $1
        OR alvo IN (SELECT 'fila:' || id::text FROM fila WHERE agente_id = $1)
     ORDER BY quando DESC LIMIT $2`,
    [id, limite],
  )
}

/** Ação da auditoria em português curto. */
export function nomeAcao(acao: string): string {
  const mapa: Record<string, string> = {
    'fila.propor': 'propôs um item', 'fila.aprovar': 'aprovou', 'fila.ajustar': 'aprovou com ajuste', 'fila.descartar': 'descartou',
    'fila.executou': 'executou', 'fila.falhou': 'falhou ao executar', 'agente.parar': 'parou o agente', 'agente.retomar': 'retomou o agente',
    'agente.erro': 'erro', 'agente.rodou': 'rodou', 'contratos.conferir_agora': 'pediu pra conferir agora',
    'contrato.pronto': 'conferiu: contrato pronto', 'contrato.travado': 'conferiu: contrato travado',
    'planilha.nova_linha': 'criou linha na planilha', 'planilha.completar': 'completou a planilha',
    'sdr.responder': 'escreveu resposta pro lead', 'sdr.passar': 'passou lead pro Bruno', 'sdr.encerrar': 'encerrou conversa',
    'cerebro.buscar': 'buscou no Cérebro',
  }
  return mapa[acao] ?? acao
}
