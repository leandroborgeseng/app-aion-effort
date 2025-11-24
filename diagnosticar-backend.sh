#!/bin/bash

echo "🔍 DIAGNÓSTICO DO BACKEND"
echo "========================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Status dos containers:"
docker-compose ps
echo ""

echo "2. Verificando backend..."
if docker-compose ps 2>/dev/null | grep -q "backend.*Up"; then
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
    if command -v stat &> /dev/null; then
        PERMS=$(stat -c "%a" prisma/dev.db 2>/dev/null || stat -f "%OLp" prisma/dev.db 2>/dev/null)
        echo "   Permissões: $PERMS"
    fi
    
    COUNT=$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM User;" 2>/dev/null)
    if [ -n "$COUNT" ]; then
        echo "✅ Banco acessível - $COUNT usuários encontrados"
        
        # Verificar usuário admin
        ADMIN=$(sqlite3 prisma/dev.db "SELECT email, active, loginAttempts FROM User WHERE email = 'admin@aion.com';" 2>/dev/null)
        if [ -n "$ADMIN" ]; then
            echo "✅ Usuário admin@aion.com encontrado: $ADMIN"
        else
            echo "⚠️  Usuário admin@aion.com não encontrado"
        fi
    else
        echo "❌ Erro ao acessar banco"
    fi
else
    echo "❌ Banco não encontrado!"
fi
echo ""

echo "5. Últimas 30 linhas dos logs do backend:"
docker-compose logs --tail=30 backend 2>/dev/null | tail -30
echo ""

echo "6. Erros recentes nos logs:"
docker-compose logs --tail=50 backend 2>/dev/null | grep -iE "error|erro|failed|fail|exception" | tail -10
echo ""

echo "7. Testando login via curl..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aion.com","password":"admin123"}' 2>&1)
  
if [ -n "$LOGIN_RESPONSE" ]; then
    echo "Resposta do servidor:"
    echo "$LOGIN_RESPONSE" | head -5
    if echo "$LOGIN_RESPONSE" | grep -q "success\|token"; then
        echo ""
        echo "✅ Login funcionou via curl!"
    elif echo "$LOGIN_RESPONSE" | grep -q "error\|Erro"; then
        echo ""
        echo "❌ Erro no login"
    else
        echo ""
        echo "⚠️  Resposta não reconhecida"
    fi
else
    echo "❌ Sem resposta do servidor"
fi
echo ""

echo "8. Verificando variáveis de ambiente importantes:"
docker-compose exec backend env 2>/dev/null | grep -E "JWT_SECRET|DATABASE_URL|NODE_ENV|PORT" | head -5 || echo "⚠️  Não foi possível verificar (container pode estar parado)"
echo ""

echo "✅ Diagnóstico concluído!"
echo ""
echo "💡 Próximos passos:"
echo "   - Se backend não está rodando: docker-compose up -d backend"
echo "   - Se health check falhou: docker-compose logs -f backend"
echo "   - Se login falhou: verificar logs acima"

