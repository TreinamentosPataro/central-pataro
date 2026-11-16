import { situacao, type resumoPorTema } from '@/lib/cerebro'

type Tema = ReturnType<typeof resumoPorTema>[number]

const L = 820
const A = 640
const CX = L / 2
const CY = A / 2 + 10
const R_TEMA = 190
const R_VERBETE = 74

function curto(t: string, n = 22) {
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

/** Mapa do Cérebro: centro, temas em volta, verbetes em leque pra fora. Ponto vazado = a preencher. */
export function MapaCerebro({ temas, ativo }: { temas: Tema[]; ativo?: string }) {
  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="mapa" role="img" aria-label="Mapa do Cérebro: temas e verbetes">
      <defs>
        <radialGradient id="nucleo" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffd27a" />
          <stop offset="55%" stopColor="#f4aa27" />
          <stop offset="100%" stopColor="#8a5a08" />
        </radialGradient>
        <radialGradient id="halo" r="50%">
          <stop offset="0%" stopColor="#f4aa27" stopOpacity=".28" />
          <stop offset="100%" stopColor="#f4aa27" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={CX} cy={CY} r={150} fill="url(#halo)" />

      {temas.map((t, i) => {
        const a = (i / temas.length) * Math.PI * 2 - Math.PI / 2
        const tx = CX + Math.cos(a) * R_TEMA
        const ty = CY + Math.sin(a) * R_TEMA
        const n = t.verbetes.length
        const cheio = n > 4
        const passo = cheio ? 0.5 : 0.44
        // nome do tema do lado de dentro (virado pro centro): ao lado nos temas das laterais,
        // acima/abaixo nos de cima e de baixo, pra não cobrir o círculo nem o vizinho
        const ca = Math.cos(a)
        const sa = Math.sin(a)
        const rot = Math.abs(sa) < 0.5
          ? { x: tx - Math.sign(ca) * 28, y: ty + 4, ancora: (ca > 0 ? 'end' : 'start') as 'end' | 'start' }
          : { x: tx, y: ty - Math.sign(sa) * 40 + 4, ancora: 'middle' as const }
        const apagado = ativo && ativo !== t.id
        return (
          <g key={t.id} opacity={apagado ? 0.35 : 1}>
            <line x1={CX} y1={CY} x2={tx} y2={ty} className="mapa-linha forte" />
            {t.verbetes.map((v, k) => {
              const av = a + (k - (n - 1) / 2) * passo
              // tema cheio: pontos em duas distâncias alternadas, pros nomes não se atropelarem
              const rv = cheio ? R_VERBETE + 24 : R_VERBETE
              const vx = tx + Math.cos(av) * rv
              const vy = ty + Math.sin(av) * rv
              const s = situacao(v)
              const cv = Math.cos(av)
              const sv = Math.sin(av)
              // nome pro lado do ponto (esquerda/direita); no tema cheio quase todo nome vai pra um lado,
              // e os vizinhos ficam em alturas diferentes
              const lim = cheio ? 0.08 : 0.25
              const lx = vx + cv * 12
              const ly = vy + sv * 12 + (sv > 0.5 ? 8 : sv < -0.5 ? -2 : 3)
              const ancora = cv > lim ? 'start' : cv < -lim ? 'end' : 'middle'
              return (
                <a key={v.id} href={`/cerebro/${v.id}`}>
                  <title>{`${v.titulo} · ${s === 'ok' ? 'em dia' : s === 'revisar' ? 'revisar' : 'a preencher'}`}</title>
                  <line x1={tx} y1={ty} x2={vx} y2={vy} className="mapa-linha" />
                  <circle cx={vx} cy={vy} r={6} className={`mapa-verbete ${s}`} />
                  <text x={lx} y={ly} textAnchor={ancora} className="mapa-rotulo-verbete">
                    {curto(v.titulo)}
                  </text>
                </a>
              )
            })}
            <a href={`/cerebro?tema=${t.id}#lista`}>
              <title>{`${t.nome}: ${t.ok} em dia, ${t.faltam} a preencher ou revisar`}</title>
              <circle cx={tx} cy={ty} r={20} className="mapa-tema" />
              <text x={tx} y={ty + 4} textAnchor="middle" className="mapa-num">{t.verbetes.length}</text>
              <text x={rot.x} y={rot.y} textAnchor={rot.ancora} className="mapa-rotulo-tema">{t.nome}</text>
            </a>
          </g>
        )
      })}

      <circle cx={CX} cy={CY} r={34} fill="url(#nucleo)" />
      <text x={CX} y={CY + 54} textAnchor="middle" className="mapa-rotulo-centro">Cérebro</text>
    </svg>
  )
}
