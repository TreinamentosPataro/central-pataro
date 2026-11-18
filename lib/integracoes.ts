/**
 * Ferramentas que a Central usa ou vai usar, e em que pé está cada uma.
 * Atualizar aqui quando uma ligação mudar (é a tela /integracoes).
 */
export type EstadoIntegracao = 'conectado' | 'falta' | 'depois'

export interface Integracao {
  nome: string
  sigla: string
  cor: string
  para: string
  estado: EstadoIntegracao
  nota: string
  href?: string     // tela própria da integração
}

export const GRUPOS_INTEGRACAO: { nome: string; itens: Integracao[] }[] = [
  {
    nome: 'Base da Central',
    itens: [
      { nome: 'Neon', sigla: 'N', cor: '#0b0b0b', para: 'Banco de dados', estado: 'conectado', nota: 'Cérebro, fichas, fila e auditoria' },
      { nome: 'Google', sigla: 'G', cor: '#4a7bd6', para: 'Login', estado: 'conectado', nota: 'Só os e-mails liberados entram' },
      { nome: 'Servidor Hostinger', sigla: 'H', cor: '#673de6', para: 'Hospedagem', estado: 'conectado', nota: 'Ligado 24h' },
    ],
  },
  {
    nome: 'Mensagens',
    itens: [
      { nome: 'WhatsApp', sigla: 'W', cor: '#1fa855', para: 'Grupos de alunos', estado: 'falta', nota: 'Falta ler o QR com o chip do agente', href: '/integracoes/whatsapp' },
      { nome: 'Gmail', sigla: 'M', cor: '#c5432f', para: 'E-mail', estado: 'depois', nota: 'Depois de 20/11' },
    ],
  },
  {
    nome: 'Documentos e contratos',
    itens: [
      { nome: 'Google Drive', sigla: 'D', cor: '#e1a10a', para: 'Calls e contratos', estado: 'conectado', nota: 'Pasta Contratos Trilha, conferida a cada 10 min' },
      { nome: 'ZapSign', sigla: 'Z', cor: '#2563eb', para: 'Assinatura', estado: 'falta', nota: 'Plano atual sem API' },
      { nome: 'Planilhas Google', sigla: 'P', cor: '#188038', para: 'Gestão Contratos Trilha', estado: 'conectado', nota: 'Acesso liberado pro robô' },
    ],
  },
  {
    nome: 'Vendas e alunos',
    itens: [
      { nome: 'Hotmart', sigla: 'H', cor: '#f04e23', para: 'Vendas e aulas', estado: 'depois', nota: 'Auditoria de vendas depois' },
      { nome: 'Planos de Ação', sigla: 'A', cor: '#b97a0c', para: 'Raio-X e planos', estado: 'falta', nota: 'Mesmo banco, falta ligar' },
    ],
  },
  {
    nome: 'Inteligência',
    itens: [
      { nome: 'Claude', sigla: 'C', cor: '#d97757', para: 'IA dos agentes', estado: 'falta', nota: 'Assinatura, modo semiautomático' },
    ],
  },
]

export const NOME_ESTADO: Record<EstadoIntegracao, string> = {
  conectado: 'Conectado',
  falta: 'Falta conectar',
  depois: 'Mais pra frente',
}
