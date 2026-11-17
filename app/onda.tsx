/**
 * Batimento do agente (linha de eletrocardiograma). Cada agente tem o seu desenho, sempre o mesmo (vem do id).
 * No ar: linha dourada com brilho correndo. Em construção: linha cinza, quase parada. Parado: reta.
 */
function semente(texto: string): number {
  let h = 2166136261
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return (h >>> 0) / 4294967295
}

function caminho(id: string, viva: boolean): string {
  const r = semente(id)
  const r2 = semente(id + 'b')
  const meio = 20
  if (!viva) return `M2 ${meio} L62 ${meio}`
  const x = 14 + r * 14 // onde o pico começa
  const alto = 11 + r2 * 6
  return [
    `M2 ${meio}`,
    `L${x - 6} ${meio}`,
    `Q${x - 4} ${meio - 3} ${x - 2} ${meio}`, // onda P
    `L${x + 2} ${meio + 4}`,
    `L${x + 5} ${meio - alto}`, // pico
    `L${x + 8} ${meio + alto * 0.55}`,
    `L${x + 11} ${meio}`,
    `L${x + 17} ${meio}`,
    `Q${x + 21} ${meio - 5 - r * 3} ${x + 25} ${meio}`, // onda T
    `L62 ${meio}`,
  ].join(' ')
}

export type EstadoOnda = 'no_ar' | 'em_construcao' | 'parado'

export function Onda({ id, estado, tamanho = 44 }: { id: string; estado: EstadoOnda; tamanho?: number }) {
  const d = caminho(id, estado !== 'parado')
  const g = `onda-${id}`
  return (
    <svg viewBox="0 0 64 40" width={tamanho} height={tamanho * 0.625} className={`onda ${estado}`} aria-hidden>
      <defs>
        <linearGradient id={g} x1="0" x2="1">
          <stop offset="0%" stopColor="#f4aa27" stopOpacity=".25" />
          <stop offset="50%" stopColor="#ffcf6b" />
          <stop offset="100%" stopColor="#f4aa27" stopOpacity=".35" />
        </linearGradient>
      </defs>
      <path d={d} className="onda-base" />
      {estado === 'no_ar' && <path d={d} className="onda-viva" stroke={`url(#${g})`} pathLength={100} />}
      {estado === 'em_construcao' && <path d={d} className="onda-obra" pathLength={100} />}
    </svg>
  )
}
