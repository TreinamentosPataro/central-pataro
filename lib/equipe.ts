/**
 * Como a equipe aparece na tela: áreas, a frase curta de cada agente e o organograma.
 * Só apresentação; o que o agente é e faz continua na tabela `agentes`.
 */
export interface Area {
  id: string
  nome: string
  lema: string
  agentes: string[]
}

export const AREAS: Area[] = [
  { id: 'atendimento', nome: 'Atendimento & Vendas', lema: 'Quem cuida do aluno e de quem ainda vai ser', agentes: ['cs', 'sdr'] },
  { id: 'operacoes', nome: 'Operações & Jurídico', lema: 'Quem faz a casa rodar redonda', agentes: ['contratos'] },
  { id: 'marketing', nome: 'Marketing & Conteúdo', lema: 'Quem faz a Pataro aparecer', agentes: ['trafego', 'social'] },
  { id: 'financeiro', nome: 'Financeiro & Dados', lema: 'Quem cuida do caixa', agentes: ['financeiro'] },
]

/** A frase do cartão, em itálico: o resultado que o agente entrega, em poucas palavras. */
export const LEMA: Record<string, string> = {
  cs: 'Aluno respondido em minutos',
  contratos: 'Contrato conferido antes de assinar',
  sdr: 'Nenhum lead esfria',
  trafego: 'Mídia paga com método',
  social: 'A Pataro presente todo dia',
  financeiro: 'O caixa sob controle',
}

/** Quem está acima de quem. Os agentes ficam embaixo de quem é dono deles (campo `dono`). */
export const PESSOAS = [
  { id: 'fred', nome: 'Fred', cargo: 'Dono', acima: null },
  { id: 'hoklo', nome: 'Hoklo', cargo: 'Gerente', acima: 'fred' },
  { id: 'norman', nome: 'Norman', cargo: 'Constrói os agentes', acima: 'fred' },
] as const

/** "Norman (Hoklo planeja)" → norman. Quem não bate com ninguém fica com o Hoklo, que gerencia. */
export function donoId(dono: string): string {
  const d = dono.toLowerCase()
  return PESSOAS.find((p) => d.startsWith(p.nome.toLowerCase()))?.id ?? 'hoklo'
}
