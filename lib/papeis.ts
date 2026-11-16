/**
 * Quem pode o quê. Menor privilégio: na dúvida, não pode.
 * Regra do plano do CS: toda ação pro aluno passa por aprovação do Hoklo (gerente) ou do Fred (stakeholder).
 */
export type Papel = 'gerente' | 'stakeholder' | 'executor'

export type Permissao =
  | 'ver_painel'
  | 'ver_restrito'      // CPF, RG, endereço
  | 'aprovar'           // aprovar ou descartar item da fila
  | 'parar_agente'      // botão de parar o executor
  | 'ver_auditoria'

const TABELA: Record<Papel, Permissao[]> = {
  gerente: ['ver_painel', 'ver_restrito', 'aprovar', 'parar_agente', 'ver_auditoria'],
  stakeholder: ['ver_painel', 'ver_restrito', 'aprovar', 'parar_agente', 'ver_auditoria'],
  executor: ['ver_painel', 'ver_auditoria'],
}

export function pode(papel: Papel | undefined | null, permissao: Permissao): boolean {
  if (!papel) return false
  return TABELA[papel]?.includes(permissao) ?? false
}

export const NOME_PAPEL: Record<Papel, string> = {
  gerente: 'Gerente',
  stakeholder: 'Stakeholder',
  executor: 'Executor',
}
