#!/bin/bash

echo "🔍 VERIFICANDO ERRO NO LOGIN"
echo "============================"
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Últimas 50 linhas dos logs do backend (focando em auth/login):"
echo "-------------------------------------------------------------------"
docker-compose logs --tail=100 backend 2>/dev/null | grep -A 5 -B 5 -iE "auth.*login|login.*error|erro.*login|auth:login" | tail -50
echo ""

echo "2. Todos os erros recentes:"
echo "---------------------------"
docker-compose logs --tail=200 backend 2>/dev/null | grep -iE "error|erro|exception|failed|fail" | tail -20
echo ""

echo "3. Verificando se Prisma está funcionando:"
echo "-------------------------------------------"
docker-compose exec backend node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.count().then(c => { console.log('Usuários no banco:', c); prisma.\$disconnect(); }).catch(e => { console.error('ERRO:', e.message); prisma.\$disconnect(); });" 2>&1
echo ""

echo "4. Verificando variáveis de ambiente JWT_SECRET:"
echo "-------------------------------------------------"
docker-compose exec backend env 2>/dev/null | grep JWT_SECRET || echo "⚠️  JWT_SECRET não encontrado nas variáveis de ambiente"
echo ""

echo "5. Testando conexão com banco dentro do container:"
echo "---------------------------------------------------"
docker-compose exec backend sqlite3 prisma/dev.db "SELECT COUNT(*) FROM User;" 2>&1 || echo "❌ Erro ao acessar banco"
echo ""

echo "6. Verificando usuário admin@aion.com no banco:"
echo "------------------------------------------------"
docker-compose exec backend sqlite3 prisma/dev.db "SELECT email, active, loginAttempts, lockedUntil FROM User WHERE email = 'admin@aion.com';" 2>&1 || echo "❌ Erro ao buscar usuário"
echo ""

echo "✅ Verificação concluída!"
echo ""
echo "💡 Os logs acima mostram o erro específico. Procure por:"
echo "   - [auth:login] para ver logs específicos do login"
echo "   - Error ou Exception para ver erros gerais"
echo "   - Prisma errors para erros de banco de dados"

