# Aion View

Sistema de visualização e gestão de equipamentos médicos com integração às APIs Effort/PowerBI.

## Instalação

```bash
pnpm install
cp .env.example .env
```

## Desenvolvimento

### Modo Mock (sem API Effort)
```bash
pnpm dev      # API em :4000
pnpm web      # Frontend em :5173
```

### Modo Real (com API Effort)
Configure os tokens de API no `.env`. Cada endpoint requer um token específico.
Veja `API_TOKENS.md` para a lista completa de tokens necessários.

```bash
pnpm real     # API em :4000
pnpm web      # Frontend em :5173
```

## Estrutura

- `src/server.ts` - Servidor Express principal
- `src/sdk/` - SDK para APIs Effort
- `src/routes/` - Rotas da API interna
- `src/web/` - Frontend React
- `mocks/` - Fixtures JSON para desenvolvimento
- `prisma/` - Schema do banco de dados

## Rotas Principais

- `/api/ecm/lifecycle` - Gestão do ciclo de vida (E1)
- `/api/ecm/critical` - Críticos & SLA (E2)
- `/api/ecm/rounds` - Rondas semanais (E3)

## Deploy com Docker

Para fazer deploy em outra máquina usando Docker:

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/SEU_USUARIO/app-aion-effort.git
   cd app-aion-effort
   ```

2. **Configure as variáveis de ambiente:**
   ```bash
   # Crie um arquivo .env baseado no exemplo abaixo
   # IMPORTANTE: NUNCA commite o arquivo .env no Git!
   ```

3. **Execute com Docker Compose:**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

4. **Execute migrações e crie usuário admin:**
   ```bash
   docker-compose exec app pnpm prisma:migrate deploy
   docker-compose exec app pnpm create:admin
   ```

📖 **Veja o guia completo:** [`DEPLOY.md`](DEPLOY.md)  
🐳 **Documentação Docker:** [`README.DOCKER.md`](README.DOCKER.md)

## Variáveis de Ambiente Necessárias

Crie um arquivo `.env` na raiz com pelo menos:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=file:./prisma/dev.db
JWT_SECRET=sua-chave-secreta-forte-aqui
USE_MOCK=false
EFFORT_BASE_URL=https://sjh.globalthings.net
EFFORT_API_KEY=seu-token-aqui
```

Veja `API_TOKENS.md` para todos os tokens necessários.

