# 🔍 Verificar Erro no Login - Comandos Manuais

## Execute estes comandos no servidor:

```bash
cd /opt/apps/app-aion-effort

# 1. Ver logs específicos de auth/login (últimas 100 linhas)
docker-compose logs --tail=100 backend | grep -A 10 -B 5 -iE "auth.*login|login.*error|auth:login" | tail -50

# 2. Ver TODOS os erros recentes
docker-compose logs --tail=50 backend | grep -iE "error|erro|exception"

# 3. Ver logs completos recentes (últimas 30 linhas)
docker-compose logs --tail=30 backend

# 4. Verificar se o usuário existe no banco
docker-compose exec backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findUnique({ where: { email: 'admin@aion.com' } })
  .then(u => {
    if (u) {
      console.log('✅ Usuário encontrado:');
      console.log('   Email:', u.email);
      console.log('   Nome:', u.name);
      console.log('   Role:', u.role);
      console.log('   Ativo:', u.active);
      console.log('   Tentativas:', u.loginAttempts);
      console.log('   Bloqueado até:', u.lockedUntil || 'não');
    } else {
      console.log('❌ Usuário admin@aion.com NÃO encontrado!');
    }
    prisma.\$disconnect();
  })
  .catch(e => {
    console.error('❌ Erro ao buscar usuário:', e.message);
    console.error(e.stack);
    prisma.\$disconnect();
    process.exit(1);
  });
"

# 5. Verificar se Prisma consegue ler o banco
docker-compose exec backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findFirst()
  .then(u => {
    console.log('✅ Prisma consegue ler banco');
    console.log('   Total de usuários:', u ? 'encontrado' : 'nenhum');
    prisma.\$disconnect();
  })
  .catch(e => {
    console.error('❌ Erro no Prisma:', e.message);
    prisma.\$disconnect();
    process.exit(1);
  });
"

# 6. Verificar se ainda há erros de readonly
docker-compose logs --tail=100 backend | grep -i "readonly" | wc -l
```

## Comando Único para Ver Logs de Login

```bash
cd /opt/apps/app-aion-effort && docker-compose logs --tail=200 backend | grep -A 15 "auth:login" | tail -100
```

## Comando Único para Ver Todos os Erros

```bash
cd /opt/apps/app-aion-effort && docker-compose logs --tail=100 backend | grep -iE "error|erro|exception|failed" | tail -30
```

