/**
 * Conferência da pasta Contratos Trilha dentro da Central: a cada 10 minutos (ligada pelo instrumentation.ts) e
 * pelo botão "Conferir agora" no cartão do agente. Respeita o botão de parar.
 *
 * .env: GOOGLE_SERVICO_JSON (chave do robô) e CONTRATOS_PASTA_ID. Sem os dois, não liga.
 * A "Minuta do Contrato" e cópias de modelo ficam de fora. Só entra contrato criado a partir de CONTRATOS_DESDE
 * (padrão 17/11/2026): os de antes já foram pra assinatura à mão e não podem voltar pra fila.
 */
import type { Banco } from './db'
import { getBanco } from './db'
import { registrarExecucao } from './agentes'
import { rodadaContratos, type ArquivoContrato, type ResultadoRodada } from './agente-contratos'
import { exportarHtml, listarDocsDaPasta, type ArquivoDrive } from './google-servico'

/** De onde vêm os contratos. No servidor é o Drive; nos testes, uma lista inventada. */
export interface FonteContratos {
  listar(): Promise<ArquivoDrive[]>
  html(id: string): Promise<string>
}

export type ResultadoConferencia = ResultadoRodada & { parado?: boolean }

const MODELO = /minuta|modelo|c[oó]pia de/i

export function contratosConfigurado(): boolean {
  return !!process.env.GOOGLE_SERVICO_JSON && !!process.env.CONTRATOS_PASTA_ID
}

export function fonteDrive(): FonteContratos {
  const pasta = process.env.CONTRATOS_PASTA_ID
  if (!pasta) throw new Error('CONTRATOS_PASTA_ID ausente: falta o id da pasta Contratos Trilha no .env.')
  return { listar: () => listarDocsDaPasta(pasta), html: exportarHtml }
}

/**
 * Uma rodada: lista a pasta, baixa só o que é novo ou mudou (o resto nem é exportado) e confere.
 * Erro do Google vai pra auditoria como agente.erro e sobe pra quem chamou.
 */
export async function conferirPasta(
  db: Banco, fonte: FonteContratos, desde = process.env.CONTRATOS_DESDE ?? '2026-11-17',
): Promise<ResultadoConferencia> {
  const [agente] = await db.query<{ parado: boolean }>(`SELECT parado FROM agentes WHERE id = 'contratos'`)
  if (agente?.parado) return { vistos: 0, novos: 0, prontos: 0, travados: 0, parado: true }

  try {
    const docs = (await fonte.listar()).filter((d) => !MODELO.test(d.name) && d.createdTime >= desde)
    const conhecidos = new Map(
      (await db.query<{ drive_id: string; versao: string; situacao: string }>(`SELECT drive_id, versao, situacao FROM contratos`))
        .map((c) => [c.drive_id, c]),
    )
    const arquivos: ArquivoContrato[] = []
    for (const d of docs) {
      const c = conhecidos.get(d.id)
      // mesma versão, ou já mandado/assinado: a rodada ia pular de qualquer jeito, então nem baixa
      if (c && (c.versao === d.modifiedTime || c.situacao === 'enviado' || c.situacao === 'assinado')) continue
      arquivos.push({ id: d.id, nome: d.name, versao: d.modifiedTime, link: d.webViewLink, html: await fonte.html(d.id) })
    }
    const r = await rodadaContratos(db, arquivos)
    return { ...r, vistos: docs.length }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await registrarExecucao(db, 'contratos', 'erro', `Conferência da pasta falhou: ${msg}`)
    throw e
  }
}

export function ligarRodadaContratos(intervaloMs = 10 * 60_000): void {
  if (!contratosConfigurado()) return
  let rodando = false
  const rodar = async () => {
    if (rodando) return
    rodando = true
    try {
      const r = await conferirPasta(await getBanco(), fonteDrive())
      if (r.novos) console.log(`[contratos] ${r.novos} conferidos · ${r.prontos} prontos · ${r.travados} travados`)
    } catch (e) {
      console.error('[contratos] rodada falhou:', e instanceof Error ? e.message : e)
    } finally {
      rodando = false
    }
  }
  setTimeout(rodar, 30_000) // primeira logo depois de subir
  setInterval(rodar, intervaloMs)
}
