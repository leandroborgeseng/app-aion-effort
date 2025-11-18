# Docker - Guia de Uso

Este guia explica como executar a aplicação Aion Effort usando Docker.

## Pré-requisitos

- Docker instalado (versão 20.10 ou superior)
- Docker Compose instalado (versão 2.0 ou superior)

## Modo de Produção

### Build e Execução

```bash
# Build da imagem
docker-compose build

# Iniciar a aplicação
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar a aplicação
docker-compose down
```

A aplicação estará disponível em: `http://localhost:4000`

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
NODE_ENV=production
PORT=4000
USE_MOCK=false
FRONTEND_URL=http://localhost:4000
DATABASE_URL=file:./prisma/dev.db
JWT_SECRET=sua-chave-secreta-aqui
```

## Modo de Desenvolvimento

### Build e Execução

```bash
# Build da imagem de desenvolvimento
docker-compose -f docker-compose.dev.yml build

# Iniciar a aplicação em modo desenvolvimento
docker-compose -f docker-compose.dev.yml up

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f

# Parar a aplicação
docker-compose -f docker-compose.dev.yml down
```

A aplicação estará disponível em:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

### Hot Reload

No modo de desenvolvimento, o código fonte é montado como volume, permitindo hot reload automático quando você modificar os arquivos.

## Comandos Úteis

### Executar comandos dentro do container

```bash
# Modo produção
docker-compose exec app <comando>

# Modo desenvolvimento
docker-compose -f docker-compose.dev.yml exec app <comando>
```

### Exemplos de comandos

```bash
# Executar migrações do Prisma
docker-compose exec app pnpm prisma:migrate

# Gerar Prisma Client
docker-compose exec app pnpm prisma:generate

# Criar usuário admin
docker-compose exec app pnpm create:admin

# Seed de usuários
docker-compose exec app pnpm seed:users
```

### Acessar shell do container

```bash
# Modo produção
docker-compose exec app sh

# Modo desenvolvimento
docker-compose -f docker-compose.dev.yml exec app sh
```

## Volumes Persistentes

Os seguintes dados são persistidos em volumes:

- **Banco de dados**: `./prisma/dev.db` - Banco SQLite
- **Uploads**: `./uploads` - Arquivos enviados (contratos, etc.)

## Troubleshooting

### Rebuild completo

Se houver problemas, faça um rebuild completo:

```bash
docker-compose build --no-cache
docker-compose up -d
```

### Limpar tudo

```bash
# Parar e remover containers, volumes e imagens
docker-compose down -v
docker rmi aion-effort-app
```

### Verificar logs

```bash
# Logs em tempo real
docker-compose logs -f app

# Últimas 100 linhas
docker-compose logs --tail=100 app
```

## Estrutura de Arquivos Docker

- `Dockerfile` - Build de produção (multi-stage, otimizado)
- `Dockerfile.dev` - Build de desenvolvimento
- `docker-compose.yml` - Configuração de produção
- `docker-compose.dev.yml` - Configuração de desenvolvimento
- `.dockerignore` - Arquivos ignorados no build

## Notas Importantes

1. **Banco de Dados**: O SQLite é persistido no volume `./prisma/dev.db`. Certifique-se de fazer backup regularmente.

2. **Uploads**: Os arquivos enviados são salvos em `./uploads`. Este diretório também é persistido.

3. **Segurança**: Em produção, altere o `JWT_SECRET` para uma chave segura e única.

4. **Portas**: Por padrão, a aplicação usa a porta 4000. Se precisar alterar, modifique o `docker-compose.yml` e as variáveis de ambiente.

5. **Health Check**: A aplicação possui um health check configurado em `/health`.

