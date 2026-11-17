/**
 * Rodada do agente de contratos: recebe os contratos da pasta do Drive (já em HTML), confere cada um e põe na
 * fila da Central. Nada vai pro ZapSign nem pro grupo do comercial sem uma pessoa aprovar.
 *
 * Versão igual à última conferida → ignora (não repete item na fila). O Bruno mexeu no documento → confere de novo.
 */
import type { Banco } from './db'
import { auditar } from './auditoria'
import { proporItem } from './fila'
import { avisoComercial, conferirContrato, lerHtmlDoGoogle } from './contratos'

export interface ArquivoContrato {
  id: string
  nome: string
  versao: string
  html: string
  link?: string
}

export interface ResultadoRodada {
  vistos: number
  novos: number
  prontos: number
  travados: number
}

/** Signatários fixos (contratos.md): cliente primeiro, depois o Fred; Hoklo e Ana Paula de testemunha. */
export const ORDEM_ASSINATURA = ['o cliente', 'Fred (Pataro Treinamentos)', 'testemunhas: Hoklo e Ana Paula']

export async function rodadaContratos(db: Banco, arquivos: ArquivoContrato[]): Promise<ResultadoRodada> {
  const r: ResultadoRodada = { vistos: arquivos.length, novos: 0, prontos: 0, travados: 0 }
  for (const a of arquivos) {
    const [antes] = await db.query<{ versao: string; situacao: string }>(`SELECT versao, situacao FROM contratos WHERE drive_id = $1`, [a.id])
    // já mandado ou assinado: o agente não mexe mais
    if (antes && (antes.situacao === 'enviado' || antes.situacao === 'assinado')) continue
    if (antes && antes.versao === a.versao) continue
    r.novos++

    const c = conferirContrato(lerHtmlDoGoogle(a.html))
    const quem = c.resumo.primeiroNome ?? a.nome
    const link = a.link ? `\nDocumento: ${a.link}` : ''
    const fila = c.pronto
      ? await proporItem(db, {
          agente_id: 'contratos',
          tipo: 'contrato_pronto',
          titulo: `Contrato de ${quem} pronto pra assinatura`,
          evidencia: [
            `Conferido: ${c.resumo.contratantes} ${c.resumo.contratantes === 1 ? 'contratante' : 'contratantes'} (${c.resumo.documento} válido), endereço, e-mail e telefone; ` +
              `pagamento em ${c.resumo.parcelas}x; vigência de ${c.resumo.vigenciaMeses} meses.`,
            ...c.avisos.map((x) => `Atenção: ${x}.`),
          ].join('\n') + link,
          rascunho: `Subir no ZapSign (Gestão Pataro, pasta Trilha Previdenciária - Contratos) e mandar pra assinatura na ordem: ${ORDEM_ASSINATURA.join(' → ')}.`,
          destino: 'zapsign:trilha',
          chave_idem: `contrato:${a.id}:${a.versao}`,
        })
      : await proporItem(db, {
          agente_id: 'contratos',
          tipo: 'contrato_travado',
          titulo: `Contrato de ${quem} travado: ${c.falta.length} ${c.falta.length === 1 ? 'ponto' : 'pontos'} pra corrigir`,
          evidencia: c.falta.map((x) => `Falta: ${x}.`).join('\n') + link,
          rascunho: avisoComercial(a.nome, c),
          destino: 'grupo:comercial',
          chave_idem: `contrato:${a.id}:${a.versao}`,
        })

    const situacao = c.pronto ? 'pronto' : 'travado'
    if (c.pronto) r.prontos++
    else r.travados++
    await db.query(
      `INSERT INTO contratos (drive_id, nome_arquivo, versao, situacao, primeiro_nome, falta, avisos, fila_id, conferido_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
       ON CONFLICT (drive_id) DO UPDATE SET nome_arquivo = EXCLUDED.nome_arquivo, versao = EXCLUDED.versao,
         situacao = EXCLUDED.situacao, primeiro_nome = EXCLUDED.primeiro_nome, falta = EXCLUDED.falta,
         avisos = EXCLUDED.avisos, fila_id = EXCLUDED.fila_id, conferido_em = now()`,
      [a.id, a.nome, a.versao, situacao, c.resumo.primeiroNome, JSON.stringify(c.falta), JSON.stringify(c.avisos), fila.id],
    )
    await auditar(db, {
      quem: 'agente:contratos',
      acao: `contrato.${situacao}`,
      alvo: `contrato:${a.id}`,
      antes: antes ?? undefined,
      depois: { situacao, falta: c.falta.length, avisos: c.avisos.length },
    })
  }
  await db.query(`UPDATE agentes SET ultima_execucao = now() WHERE id = 'contratos'`)
  return r
}
