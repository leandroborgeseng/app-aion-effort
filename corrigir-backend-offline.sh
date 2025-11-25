#!/bin/bash

echo "🔧 CORRIGINDO: Backend Offline"
echo "=============================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Parando backend..."
docker-compose stop backend 2>/dev/null || true
docker-compose rm -f backend 2>/dev/null || true
echo "   ✅ Backend parado e removido"
echo ""

echo "2. Verificando logs para identificar o erro..."
echo "   Últimas 30 linhas dos logs:"
docker-compose logs --tail=30 backend 2>&1 | tail -30
echo ""

echo "3. Verificando se há erros de sintaxe ou imports..."
# Verificar se os arquivos principais existem e estão corretos
if [ -f "src/routes/users.ts" ]; then
    echo "   ✅ src/routes/users.ts existe"
    
    # Verificar se o import do AuthRequest está correto
    if grep -q "import.*AuthRequest.*from.*middleware/auth" src/routes/users.ts; then
        echo "   ✅ Import de AuthRequest encontrado"
    else
        echo "   ⚠️  Import de AuthRequest não encontrado - pode ser o problema"
    fi
    
    # Verificar se authenticateToken está sendo usado corretamente
    if grep -q "authenticateToken" src/routes/users.ts; then
        echo "   ✅ authenticateToken está sendo usado"
    else
        echo "   ⚠️  authenticateToken não encontrado - pode ser o problema"
    fi
else
    echo "   ❌ src/routes/users.ts não encontrado!"
fi
echo ""

echo "4. Verificando arquivo de middleware de autenticação..."
if [ -f "src/middleware/auth.ts" ]; then
    echo "   ✅ src/middleware/auth.ts existe"
else
    echo "   ❌ src/middleware/auth.ts não encontrado!"
fi
echo ""

echo "5. Tentando rebuild do backend..."
docker-compose build backend 2>&1 | tail -50

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo ""
    echo "   ✅ Build concluído"
else
    echo ""
    echo "   ❌ Erro no build!"
    echo "   Verifique os erros acima"
    exit 1
fi
echo ""

echo "6. Iniciando backend..."
docker-compose up -d backend
sleep 10
echo ""

echo "7. Verificando status após iniciar..."
docker-compose ps backend
echo ""

echo "8. Verificando logs após iniciar..."
docker-compose logs --tail=20 backend | grep -E "error|Error|ERROR|listening|started|ready" || echo "   Nenhum log relevante"
echo ""

echo "9. Testando health check..."
HEALTH=$(docker-compose exec -T backend curl -s http://localhost:4000/health 2>/dev/null || echo "FAILED")

if [ "$HEALTH" != "FAILED" ]; then
    echo "   ✅ Health check passou: $HEALTH"
else
    echo "   ❌ Health check falhou"
    echo ""
    echo "   Últimos erros dos logs:"
    docker-compose logs --tail=10 backend | grep -iE "error|erro|exception" || echo "   Nenhum erro encontrado nos logs recentes"
fi
echo ""

echo "✅ PROCESSO CONCLUÍDO!"
echo ""
echo "💡 Se o backend ainda não estiver funcionando:"
echo "   - Ver logs completos: docker-compose logs backend"
echo "   - Verificar sintaxe: docker-compose exec backend node -c src/routes/users.ts 2>&1 || echo 'Erro de sintaxe'"
echo "   - Tentar iniciar manualmente: docker-compose up backend"

