# Como Criar Usuário Admin

## Passo 1: Verificar se o banco de dados existe

```bash
# Verificar se o arquivo do banco existe
ls -la prisma/dev.db

# Se não existir, criar o banco executando migrations
docker-compose exec backend pnpm prisma:migrate deploy
```

## Passo 2: Criar usuário admin

```bash
docker-compose exec backend pnpm create:admin
```

## Se o banco não existir, criar primeiro:

```bash
# 1. Entrar no container
docker exec -it aion-effort-backend bash

# 2. Executar migrations
pnpm prisma:migrate deploy

# 3. Criar admin
pnpm create:admin

# 4. Sair
exit
```

## Credenciais padrão

- **Email:** `admin@aion.com`
- **Senha:** `admin123`

## Criar com credenciais personalizadas

```bash
docker-compose exec backend pnpm create:admin seu-email@exemplo.com sua-senha "Seu Nome"
```

