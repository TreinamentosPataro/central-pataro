// Aplica db/schema.sql no banco (Neon se houver DATABASE_URL, senão o local). Pode rodar de novo.
import { getBanco, lerSchema } from '../lib/db'

const db = await getBanco()
await db.exec(lerSchema())
console.log(process.env.DATABASE_URL ? 'Schema aplicado no Neon.' : 'Schema aplicado no banco local (.dados/).')
process.exit(0)
