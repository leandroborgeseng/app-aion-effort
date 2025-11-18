# Dockerfile multi-stage para otimizar o build

# Stage 1: Build do frontend
FROM node:20-slim AS frontend-builder

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml ./
COPY vite.config.ts tsconfig.json ./

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar código fonte do frontend
COPY index.html ./
COPY src/web ./src/web
COPY src/utils ./src/utils
COPY public ./public

# Build do frontend
RUN pnpm build

# Stage 2: Build do backend e aplicação final
FROM node:20-slim AS backend-builder

WORKDIR /app

# Instalar dependências do sistema necessárias para Prisma
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Instalar pnpm
RUN npm install -g pnpm

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml ./

# Instalar dependências (incluindo devDependencies para build)
RUN pnpm install --frozen-lockfile

# Copiar código fonte do backend
COPY src ./src
COPY prisma ./prisma
COPY tsconfig.json ./

# Gerar Prisma Client (ignorar checksum se servidor do Prisma estiver com problemas)
RUN PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 pnpm prisma:generate

# Stage 3: Aplicação final
FROM node:20-slim

WORKDIR /app

# Instalar dependências do sistema necessárias para Prisma
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Instalar pnpm
RUN npm install -g pnpm

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copiar package.json e instalar dependências
# tsx precisa estar disponível para executar TypeScript
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile && \
    pnpm store prune

# Copiar arquivos necessários
COPY --from=backend-builder /app/src ./src
COPY --from=backend-builder /app/prisma ./prisma
COPY --from=backend-builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=frontend-builder /app/dist ./dist
COPY tsconfig.json ./

# Criar diretórios necessários
RUN mkdir -p uploads/contracts && \
    chown -R nodejs:nodejs /app

# Mudar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 4000

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=4000
ENV USE_MOCK=false

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando para iniciar a aplicação
CMD ["pnpm", "start"]

