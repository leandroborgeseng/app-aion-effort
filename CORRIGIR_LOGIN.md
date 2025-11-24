# Corrigir Problemas de Login

## Problema: Não consigo fazer login após deploy

## Solução Rápida

### No servidor, execute:

```bash
cd /opt/apps/app-aion-effort

# Executar script de correção
./corrigir-login.sh
```

## Solução Manual (Passo a Passo)

### 1. Verificar containers
```bash
docker-compose ps
# Deve mostrar ambos containers como "Up (healthy)"
```

### 2. Verificar banco de dados
```bash
# Verificar se o banco existe
ls -lh prisma/dev.db

# Ajustar permissões
chmod 666 prisma/dev.db
chmod 777 prisma
```

### 3. Aplicar migrações do Prisma
```bash
docker-compose exec backend pnpm prisma:db:push
```

### 4. Criar/Atualizar usuário admin
```bash
docker-compose exec backend pnpm create:admin
```

**Credenciais padrão:**
- Email: `admin@aion.com`
- Senha: `admin123`

### 5. Verificar logs do backend
```bash
docker-compose logs --tail=50 backend | grep -i "error\|login\|auth"
```

### 6. Testar API de login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aion.com","password":"admin123"}'
```

## Problemas Comuns

### Erro: "Email ou senha incorretos"
**Solução:**
1. Recriar usuário admin:
```bash
docker-compose exec backend pnpm create:admin
```

2. Verificar se o usuário existe:
```bash
docker-compose exec backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany().then(users => {
  console.log('Usuários:', users.map(u => ({email: u.email, role: u.role})));
  prisma.\$disconnect();
});
"
```

### Erro: "Sistema temporariamente indisponível"
**Causa:** Prisma não consegue conectar ao banco

**Solução:**
1. Verificar permissões do banco:
```bash
chmod 666 prisma/dev.db
chmod 777 prisma
```

2. Verificar se o banco existe:
```bash
ls -la prisma/dev.db
```

3. Recriar banco se necessário:
```bash
docker-compose exec backend pnpm prisma:db:push
```

### Erro: "Conta bloqueada"
**Causa:** Muitas tentativas de login falharam

**Solução:**
```bash
docker-compose exec backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.updateMany({
  where: {},
  data: { loginAttempts: 0, lockedUntil: null }
}).then(() => {
  console.log('Contas desbloqueadas');
  prisma.\$disconnect();
});
"
```

### Erro: JWT_SECRET não configurado
**Solução:**
1. Verificar `.env`:
```bash
cat .env | grep JWT_SECRET
```

2. Se não existir, adicionar:
```bash
echo "JWT_SECRET=seu-secret-key-muito-seguro-aqui" >> .env
```

3. Reiniciar containers:
```bash
docker-compose restart backend
```

## Verificação Final

Após corrigir, teste:

1. **API funcionando:**
```bash
curl http://localhost:4000/health
# Deve retornar: {"ok":true,"mock":false}
```

2. **Login funcionando:**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aion.com","password":"admin123"}'
# Deve retornar um token JWT
```

3. **Acessar aplicação:**
- Abra: `http://seu-servidor:3000`
- Faça login com: `admin@aion.com` / `admin123`

## Se ainda não funcionar

1. **Ver logs completos:**
```bash
docker-compose logs backend > backend.log 2>&1
cat backend.log | tail -100
```

2. **Verificar banco dentro do container:**
```bash
docker-compose exec backend ls -la /app/prisma/dev.db
docker-compose exec backend sqlite3 /app/prisma/dev.db "SELECT email, role FROM User LIMIT 5;"
```

3. **Reiniciar tudo:**
```bash
docker-compose down
docker-compose up -d
sleep 10
docker-compose exec backend pnpm create:admin
```

