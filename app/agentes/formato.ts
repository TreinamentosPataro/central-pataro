/** Textos curtos usados na tela inicial e na página de cada agente. */

export function avisoConferencia(v: string | undefined): string | null {
  if (!v) return null
  if (v === 'parado') return 'Agente parado: nada foi conferido.'
  if (v === 'erro') return 'Não deu pra ler a pasta do Drive. O erro está na auditoria.'
  const [novos, prontos, travados] = v.split('-').map(Number)
  if (!novos) return 'Conferido: nenhum contrato novo ou alterado.'
  return `Conferido: ${novos} ${novos === 1 ? 'contrato' : 'contratos'} · ${prontos} pronto${prontos === 1 ? '' : 's'} · ${travados} travado${travados === 1 ? '' : 's'}. Estão na fila.`
}

export const horaBR = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
