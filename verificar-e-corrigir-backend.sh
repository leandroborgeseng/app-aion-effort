#!/bin/bash

echo "🔧 VERIFICANDO E CORRIGINDO BACKEND"
echo "==================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Verificando status dos containers..."
docker-compose ps
echo ""

echo "2. Verificando se o backend está rodando..."
BACKEND_STATUS=$(docker-compose ps backend | grep -E "Up|Running" || echo "NOT_RUNNING")

if [ "$BACKEND_STATUS" = "NOT_RUNNING" ]; then
    echo "   ❌ Backend NÃO está rodando!"
    echo "   Tentando iniciar..."
    docker-compose up -d backend
    echo "   Aguardando backend inicializar..."
    sleep 10
else
    echo "   ✅ Backend está rodando"
fi
echo ""

echo "3. Verificando logs do backend (últimas 30 linhas)..."
docker-compose logs --tail=30 backend
echo ""

echo "4. Verificando saúde do backend..."
HEALTH_CHECK=$(docker-compose exec -T backend curl -s http://localhost:4000/health 2>/dev/null || echo "FAILED")

if [ "$HEALTH_CHECK" = "FAILED" ]; then
    echo "   ❌ Health check falhou!"
    echo ""
    echo "   Verificando se o processo Node está rodando dentro do container..."
    docker-compose exec -T backend ps aux | grep -E "node|pnpm|tsx" || echo "   Processo Node não encontrado"
    echo ""
    echo "   Tentando reiniciar o backend..."
    docker-compose restart backend
    sleep 15
    echo ""
    echo "   Verificando novamente..."
    HEALTH_CHECK=$(docker-compose exec -T backend curl -s http://localhost:4000/health 2>/dev/null || echo "FAILED")
fi

if [ "$HEALTH_CHECK" != "FAILED" ]; then
    echo "   ✅ Health check passou: $HEALTH_CHECK"
else
    echo "   ❌ Health check ainda falhou após reinício"
    echo ""
    echo "   Verificando se há erros nos logs..."
    docker-compose logs backend | grep -iE "error|erro|exception|fatal" | tail -20
fi
echo ""

echo "5. Testando acesso externo à porta 4000..."
EXTERNAL_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>/dev/null || echo "000")

if [ "$EXTERNAL_TEST" = "200" ] || [ "$EXTERNAL_TEST" = "000" ]; then
    if [ "$EXTERNAL_TEST" = "200" ]; then
        echo "   ✅ Backend acessível externamente na porta 4000"
    else
        echo "   ⚠️  Backend não está expondo porta 4000 externamente (pode ser normal se estiver atrás do Caddy)"
    fi
else
    echo "   ⚠️  Status inesperado: $EXTERNAL_TEST"
fi
echo ""

echo "6. Testando acesso através do Caddy (se configurado)..."
CADDY_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/auth/login 2>/dev/null || echo "000")

if [ "$CADDY_TEST" != "000" ]; then
    echo "   ✅ Rota /api/auth/login está acessível (status: $CADDY_TEST)"
else
    echo "   ⚠️  Não foi possível testar através do Caddy"
fi
echo ""

echo "7. Testando login diretamente no container..."
docker-compose exec -T backend curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"leandro.borges@aion.eng.br","password":"teste"}' 2>&1 | head -5

echo ""
echo ""

echo "✅ VERIFICAÇÃO CONCLUÍDA!"
echo ""
echo "💡 Se o backend ainda não estiver funcionando:"
echo "   1. Ver logs completos: docker-compose logs backend"
echo "   2. Reiniciar todos os serviços: docker-compose restart"
echo "   3. Verificar se há erros no código: docker-compose logs backend | grep -i error"

