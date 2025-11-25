# Recuperar Usuário Administrador

## Problema
O usuário administrador foi perdido após reescritas do banco de dados.

## Solução Rápida

Execute no servidor:

```bash
cd /opt/apps/app-aion-effort

# Método 1: Usando o script (RECOMENDADO)
docker-compose exec backend pnpm tsx scripts/createAdminUser.ts admin@aion.com admin123 "Administrador"

# Método 2: Se o método 1 não funcionar, execute dentro do container
docker-compose exec backend sh
cd /app
pnpm tsx scripts/createAdminUser.ts admin@aion.com admin123
exit

# Método 3: Criar via SQL direto (se necessário)
docker-compose exec backend node -e "
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@aion.com' },
    update: {
      password: hashedPassword,
      role: 'admin',
      active: true,
      canImpersonate: true,
    },
    create: {
      email: 'admin@aion.com',
      name: 'Administrador',
      password: hashedPassword,
      role: 'admin',
      active: true,
      canImpersonate: true,
    },
  });
  console.log('✅ Usuário criado!');
}

main().finally(() => prisma.\$disconnect());
"
```

## Testar Login

```bash
# Testar login via curl
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aion.com","password":"admin123"}'

# Ou testar via navegador
# https://av.aion.eng.br/login
```

## Credenciais Padrão

- **Email:** `admin@aion.com`
- **Senha:** `admin123`

⚠️ **IMPORTANTE:** Altere a senha após o primeiro login!

