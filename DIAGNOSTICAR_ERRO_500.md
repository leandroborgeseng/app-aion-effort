# 🔍 Diagnosticar Erro 500 no Login

## Problema

Ao tentar fazer login, aparece: "Erro no servidor. Tente novamente em alguns instantes."

## Diagnóstico Passo a Passo

### 1. Verificar se o backend está rodando

No servidor de produção:

```bash
# Verificar status dos containers
docker-compose ps

# Ou verificar se a porta 4000 está em uso
netstat -tulpn | grep 4000
# ou
lsof -i :4000
```

### 2. Verificar logs do backend

```bash
# Ver logs em tempo real
docker-compose logs -f backend

# Ver últimas 100 linhas
docker-compose logs --tail=100 backend

# Filtrar apenas erros
docker-compose logs backend | grep -i error
docker-compose logs backend | grep -i "auth:login"
```

### 3. Testar endpoint de login manualmente

```bash
# Testar health check primeiro
curl http://localhost:4000/health

# Testar login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aion.com","password":"admin123"}' \
  -v
```

### 4. Verificar banco de dados

```bash
cd /opt/apps/app-aion-effort

# Verificar se o banco existe e tem permissões
ls -la prisma/dev.db

# Verificar se a tabela User existe
sqlite3 prisma/dev.db ".tables" | grep -i user

# Verificar usuário
sqlite3 prisma/dev.db "SELECT email, active, loginAttempts, lockedUntil FROM User WHERE email = 'admin@aion.com';"

# Verificar integridade do banco
sqlite3 prisma/dev.db "PRAGMA integrity_check;"
```

### 5. Verificar variáveis de ambiente

```bash
# Ver variáveis do container
docker-compose exec backend env | grep -E "JWT_SECRET|DATABASE_URL|NODE_ENV"

# Ver arquivo .env (se existir)
cat .env | grep -v "PASSWORD\|SECRET\|KEY"  # Não mostrar senhas
```

## Soluções Comuns

### Solução 1: Reiniciar backend

```bash
cd /opt/apps/app-aion-effort
docker-compose restart backend

# Aguardar 30 segundos
sleep 30

# Verificar logs
docker-compose logs --tail=50 backend
```

### Solução 2: Verificar permissões do banco

```bash
cd /opt/apps/app-aion-effort

# Ajustar permissões
chmod 664 prisma/dev.db
chown $USER:$USER prisma/dev.db

# Se estiver em Docker, pode precisar de sudo
sudo chmod 664 prisma/dev.db
```

### Solução 3: Verificar se o banco está acessível

```bash
# Testar acesso ao banco
docker-compose exec backend sqlite3 prisma/dev.db "SELECT COUNT(*) FROM User;"

# Se der erro, o banco pode estar corrompido ou inacessível
```

### Solução 4: Rebuild do backend (se necessário)

```bash
cd /opt/apps/app-aion-effort

# Parar containers
docker-compose down

# Rebuild backend
docker-compose build --no-cache backend

# Subir novamente
docker-compose up -d backend

# Aguardar
sleep 30

# Ver logs
docker-compose logs -f backend
```

### Solução 5: Verificar JWT_SECRET

```bash
# O JWT_SECRET deve estar configurado
docker-compose exec backend env | grep JWT_SECRET

# Se não estiver, adicione no .env ou docker-compose.yml
```

## Script de Diagnóstico Completo

Crie um arquivo `diagnosticar-backend.sh`:

```bash
#!/bin/bash

echo "🔍 DIAGNÓSTICO DO BACKEND"
echo "========================="
echo ""

cd /opt/apps/app-aion-effort

echo "1. Status dos containers:"
docker-compose ps
echo ""

echo "2. Verificando backend..."
if docker-compose ps | grep -q "backend.*Up"; then
    echo "✅ Backend está rodando"
else
    echo "❌ Backend NÃO está rodando!"
    echo "   Execute: docker-compose up -d backend"
fi
echo ""

echo "3. Testando health check..."
HEALTH=$(curl -s http://localhost:4000/health 2>/dev/null)
if [ -n "$HEALTH" ]; then
    echo "✅ Health check OK: $HEALTH"
else
    echo "❌ Health check falhou - backend não responde"
fi
echo ""

echo "4. Verificando banco de dados..."
if [ -f "prisma/dev.db" ]; then
    echo "✅ Banco existe"
    PERMS=$(stat -c "%a" prisma/dev.db 2>/dev/null || stat -f "%OLp" prisma/dev.db 2>/dev/null)
    echo "   Permissões: $PERMS"
    
    COUNT=$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM User;" 2>/dev/null)
    if [ -n "$COUNT" ]; then
        echo "✅ Banco acessível - $COUNT usuários encontrados"
    else
        echo "❌ Erro ao acessar banco"
    fi
else
    echo "❌ Banco não encontrado!"
fi
echo ""

echo "5. Últimas linhas dos logs (erros):"
docker-compose logs --tail=20 backend | grep -i "error\|erro\|failed\|fail" | tail -10
echo ""

echo "6. Testando login via curl..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aion.com","password":"admin123"}')
  
if [ -n "$LOGIN_RESPONSE" ]; then
    echo "Resposta: $LOGIN_RESPONSE"
    if echo "$LOGIN_RESPONSE" | grep -q "success\|token"; then
        echo "✅ Login funcionou via curl"
    else
        echo "❌ Login falhou"
    fi
else
    echo "❌ Sem resposta do servidor"
fi
echo ""

echo "✅ Diagnóstico concluído!"
```

Execute:
```bash
chmod +x diagnosticar-backend.sh
./diagnosticar-backend.sh
```

## Coletar Informações para Debug

Execute estes comandos e salve a saída:

```bash
cd /opt/apps/app-aion-effort

# 1. Status
docker-compose ps > /tmp/backend-status.txt

# 2. Logs
docker-compose logs --tail=100 backend > /tmp/backend-logs.txt

# 3. Health check
curl -v http://localhost:4000/health > /tmp/health-check.txt 2>&1

# 4. Teste de login
curl -v -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aion.com","password":"admin123"}' > /tmp/login-test.txt 2>&1

# 5. Informações do banco
sqlite3 prisma/dev.db "SELECT email, active, loginAttempts, lockedUntil FROM User;" > /tmp/users.txt

echo "📋 Arquivos salvos em /tmp/"
ls -lh /tmp/backend-*.txt /tmp/health-*.txt /tmp/login-*.txt /tmp/users.txt
```

## Próximos Passos

1. Execute os comandos de diagnóstico acima
2. Verifique os logs do backend
3. Teste o login via curl
4. Compartilhe os resultados para análise mais detalhada

