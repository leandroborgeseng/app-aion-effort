# 🔧 Solucionar Erro 500 no Login

## Problema

O backend está retornando erro 500 ao tentar fazer login, mesmo que o servidor esteja rodando.

## Diagnóstico Imediato

Execute no servidor:

```bash
cd /opt/apps/app-aion-effort

# Ver logs do backend focando em auth/login
docker-compose logs --tail=100 backend | grep -iE "auth.*login|erro|error|exception" | tail -30

# Ou executar o script de verificação
chmod +x verificar-erro-login.sh
./verificar-erro-login.sh
```

## Causas Comuns e Soluções

### 1. Prisma não consegue conectar ao banco

**Sintoma:** Erro "Prisma não disponível" ou "Cannot find module"

**Solução:**
```bash
# Verificar se o banco está acessível do container
docker-compose exec backend ls -la prisma/dev.db

# Verificar permissões
docker-compose exec backend sqlite3 prisma/dev.db "SELECT COUNT(*) FROM User;"

# Se der erro, ajustar permissões
chmod 664 prisma/dev.db
docker-compose restart backend
```

### 2. JWT_SECRET não configurado

**Sintoma:** Erro ao gerar token JWT

**Solução:**
```bash
# Verificar JWT_SECRET
docker-compose exec backend env | grep JWT_SECRET

# Se não estiver configurado, adicionar no docker-compose.yml ou .env
# Editar docker-compose.yml e adicionar:
#   environment:
#     - JWT_SECRET=seu-secret-aqui
```

### 3. Erro ao buscar usuário no banco

**Sintoma:** Erro no query do Prisma

**Solução:**
```bash
# Verificar se a tabela User existe
docker-compose exec backend sqlite3 prisma/dev.db ".tables"

# Verificar integridade do banco
docker-compose exec backend sqlite3 prisma/dev.db "PRAGMA integrity_check;"

# Se o banco estiver corrompido, fazer backup e recriar
cp prisma/dev.db prisma/dev.db.backup
docker-compose exec backend pnpm prisma:db:push
```

### 4. Problema com bcrypt

**Sintoma:** Erro ao comparar senha

**Solução:**
```bash
# Reinstalar dependências no container
docker-compose exec backend pnpm install

# Reiniciar
docker-compose restart backend
```

## Solução Rápida - Rebuild Completo

Se nada funcionar, fazer rebuild completo:

```bash
cd /opt/apps/app-aion-effort

# 1. Fazer backup do banco
cp prisma/dev.db prisma/dev.db.backup-$(date +%Y%m%d-%H%M%S)

# 2. Parar containers
docker-compose down

# 3. Rebuild backend sem cache
docker-compose build --no-cache backend

# 4. Subir novamente
docker-compose up -d backend

# 5. Aguardar inicialização
sleep 30

# 6. Ver logs
docker-compose logs -f backend
```

## Verificar Erro Específico nos Logs

Execute e compartilhe a saída:

```bash
cd /opt/apps/app-aion-effort

# Ver todas as linhas de log relacionadas a auth
docker-compose logs --tail=500 backend | grep -iE "auth|login" | tail -50

# Ver erros e exceptions
docker-compose logs --tail=500 backend | grep -iE "error|exception|failed" | tail -50
```

## Teste Alternativo - Criar Novo Admin

Se o problema persistir, criar um novo usuário admin:

```bash
cd /opt/apps/app-aion-effort

# Usar SQL direto
sqlite3 prisma/dev.db << 'EOF'
INSERT OR REPLACE INTO User (id, email, name, password, role, active, canImpersonate, loginAttempts, lockedUntil, createdAt, updatedAt)
VALUES (
  'admin-new-' || (strftime('%s', 'now') || '-' || (abs(random()) % 1000000)),
  'admin@teste.com',
  'Admin Teste',
  '$2b$10$2eAZNXTjwRh6PE4w77uQPuWQDYShpHWaGDgCGYs/vOgDiwPfTug/q',
  'admin',
  1,
  1,
  0,
  NULL,
  datetime('now'),
  datetime('now')
);
EOF

# Reiniciar backend
docker-compose restart backend

# Tentar login com admin@teste.com / admin123
```

