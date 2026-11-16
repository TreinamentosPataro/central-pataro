/** @type {import('next').NextConfig} */
const nextConfig = {
  // o PGlite (banco local de desenvolvimento) carrega WASM e não pode ser empacotado
  serverExternalPackages: ['@electric-sql/pglite'],
}
export default nextConfig
