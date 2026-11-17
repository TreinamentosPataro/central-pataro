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

/** Número entre 0 e 1 sempre igual pro mesmo índice: o desenho não muda a cada visita. */
function acaso(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** Ponto de controle pra linha curva: sai do meio do segmento, pro lado, como um nervo. */
function curva(x1: number, y1: number, x2: number, y2: number, torcao: number) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  return { qx: mx - dy * torcao, qy: my + dx * torcao }
}

function q(x1: number, y1: number, x2: number, y2: number, torcao: number) {
  const { qx, qy } = curva(x1, y1, x2, y2, torcao)
  return `Q${qx.toFixed(1)} ${qy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

/**
 * Mapa do Cérebro: núcleo no centro, temas em volta e verbetes em leque pra fora, ligados por linhas curvas.
 * Pulsos de luz saem do núcleo e correm até cada verbete (a "sinapse"); quando chegam, o ponto acende.
 * Tudo em SVG animado, sem JavaScript. Quem pede menos movimento no sistema não vê os pulsos (CSS).
 */
export function MapaCerebro({ temas, ativo }: { temas: Tema[]; ativo?: string }) {
  let n = 0 // conta os verbetes, pra cada pulso ter seu ritmo
  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="mapa" role="img" aria-label="Mapa do Cérebro: temas e verbetes">
      <defs>
        <radialGradient id="nucleo" cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#fff1c9" />
          <stop offset="35%" stopColor="#ffc24d" />
          <stop offset="75%" stopColor="#f4aa27" />
          <stop offset="100%" stopColor="#7a4a05" />
        </radialGradient>
        <radialGradient id="halo" r="50%">
          <stop offset="0%" stopColor="#f4aa27" stopOpacity=".32" />
          <stop offset="60%" stopColor="#f4aa27" stopOpacity=".06" />
          <stop offset="100%" stopColor="#f4aa27" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="faisca" r="50%">
          <stop offset="0%" stopColor="#fff6dc" />
          <stop offset="40%" stopColor="#ffc24d" stopOpacity=".9" />
          <stop offset="100%" stopColor="#f4aa27" stopOpacity="0" />
        </radialGradient>
        <filter id="brilho" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <circle cx={CX} cy={CY} r={165} fill="url(#halo)" className="respira" />

      {temas.map((t, i) => {
        const a = (i / temas.length) * Math.PI * 2 - Math.PI / 2
        const tx = CX + Math.cos(a) * R_TEMA
        const ty = CY + Math.sin(a) * R_TEMA
        const nv = t.verbetes.length
        const cheio = nv > 4
        const passo = cheio ? 0.5 : 0.44
        const torcaoTema = (i % 2 ? 1 : -1) * 0.14
        const nervoTema = `M${CX} ${CY} ${q(CX, CY, tx, ty, torcaoTema)}`
        // nome do tema embaixo do nó, como no mapa de referência (os verbetes abrem pro lado de fora)
        const ry = ty + 30
        const apagado = ativo && ativo !== t.id
        return (
          <g key={t.id} opacity={apagado ? 0.3 : 1}>
            <path d={nervoTema} className="mapa-linha forte" />
            {t.verbetes.map((v, k) => {
              const idx = n++
              const av = a + (k - (nv - 1) / 2) * passo
              const rv = cheio ? R_VERBETE + 24 : R_VERBETE
              const vx = tx + Math.cos(av) * rv
              const vy = ty + Math.sin(av) * rv
              const s = situacao(v)
              const cv = Math.cos(av)
              const sv = Math.sin(av)
              const lim = cheio ? 0.08 : 0.25
              const lx = vx + cv * 12
              const ly = vy + sv * 12 + (sv > 0.5 ? 8 : sv < -0.5 ? -2 : 3)
              const ancora = cv > lim ? 'start' : cv < -lim ? 'end' : 'middle'
              const torcao = (k % 2 ? 1 : -1) * (0.16 + acaso(idx) * 0.12)
              const nervo = `M${tx.toFixed(1)} ${ty.toFixed(1)} ${q(tx, ty, vx, vy, torcao)}`
              // dendritos: ramos finos que saem do verbete pra fora, com um neurônio solto na ponta
              const ramos = [0, 1].slice(0, 1 + Math.round(acaso(idx + 50))).map((r) => {
                const ar = av + (r ? 0.55 : -0.45) + (acaso(idx * 3 + r) - 0.5) * 0.4
                const dr = 34 + acaso(idx * 7 + r) * 30
                const ex = vx + Math.cos(ar) * dr
                const ey = vy + Math.sin(ar) * dr
                return { d: `M${vx.toFixed(1)} ${vy.toFixed(1)} ${q(vx, vy, ex, ey, r ? 0.2 : -0.2)}`, ex, ey }
              })
              // a sinapse: núcleo → tema → verbete, num caminho só
              const viagem = `${nervoTema} ${q(tx, ty, vx, vy, torcao)}`
              const dur = (2.6 + acaso(idx + 9) * 2.4).toFixed(2)
              const comeca = (acaso(idx + 21) * 4).toFixed(2)
              return (
                <g key={v.id}>
                  {ramos.map((r, j) => (
                    <g key={j} className="dendrito">
                      <path d={r.d} className="mapa-linha fina" />
                      <circle cx={r.ex} cy={r.ey} r={2.2} className="neuronio" />
                    </g>
                  ))}
                  <a href={`/cerebro/${v.id}`}>
                    <title>{`${v.titulo} · ${s === 'ok' ? 'em dia' : s === 'revisar' ? 'revisar' : 'a preencher'}`}</title>
                    <path d={nervo} className="mapa-linha" />
                    <circle cx={vx} cy={vy} r={5} className={`mapa-verbete ${s}`} />
                    <text x={lx} y={ly} textAnchor={ancora} className="mapa-rotulo-verbete">{curto(v.titulo)}</text>
                  </a>
                  {s !== 'a_preencher' && (
                    <g className="pulso">
                      {/* o ponto acende no fim de cada viagem do pulso (mesmo ritmo, mesmo começo) */}
                      <circle cx={vx} cy={vy} r={9} fill="url(#faisca)" opacity="0">
                        <animate attributeName="opacity" values="0;0;1;0" keyTimes="0;.86;.93;1" dur={`${dur}s`} begin={`${comeca}s`} repeatCount="indefinite" />
                      </circle>
                      <circle r={2.6} className="sinapse" filter="url(#brilho)">
                        <animateMotion path={viagem} dur={`${dur}s`} begin={`${comeca}s`} repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines=".45 0 .25 1" />
                        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.08;.85;1" dur={`${dur}s`} begin={`${comeca}s`} repeatCount="indefinite" />
                      </circle>
                    </g>
                  )}
                </g>
              )
            })}
            <a href={`/cerebro?tema=${t.id}#lista`}>
              <title>{`${t.nome}: ${t.ok} em dia, ${t.faltam} a preencher ou revisar`}</title>
              <circle cx={tx} cy={ty} r={14} className="mapa-tema" />
              <text x={tx} y={ry} textAnchor="middle" className="mapa-rotulo-tema">
                {t.nome} <tspan className="mapa-num">{nv}</tspan>
              </text>
            </a>
          </g>
        )
      })}

      <circle cx={CX} cy={CY} r={30} fill="url(#nucleo)" filter="url(#brilho)" className="respira nucleo-mapa" />
      <text x={CX} y={CY + 52} textAnchor="middle" className="mapa-rotulo-centro">Cérebro</text>
    </svg>
  )
}
