# Central na VPS. Em produção o banco é o Neon (DATABASE_URL no .env da VPS), o PGlite fica só no computador.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3300 HOSTNAME=0.0.0.0
COPY --from=build /app ./
# Usuário sem privilégio que a imagem já cria
USER node
EXPOSE 3300
CMD ["npx", "next", "start", "-p", "3300"]
