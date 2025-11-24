#!/bin/bash

echo "🧹 LIMPANDO E REINICIANDO CONTAINERS"
echo "===================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Parando todos os containers..."
docker-compose stop backend frontend caddy
echo ""

echo "2. Removendo containers antigos (forçado)..."
docker-compose rm -f backend frontend
echo ""

echo "3. Removendo containers órfãos do Docker..."
# Remover containers do projeto
docker ps -a | grep "aion-effort" | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true
echo ""

echo "4. Limpando containers antigos diretamente..."
OLD_BACKEND=$(docker ps -a | grep "backend" | grep -v "caddy" | awk '{print $1}' | head -1)
OLD_FRONTEND=$(docker ps -a | grep "frontend" | awk '{print $1}' | head -1)

if [ -n "$OLD_BACKEND" ]; then
    echo "   Removendo container backend antigo: $OLD_BACKEND"
    docker stop $OLD_BACKEND 2>/dev/null || true
    docker rm -f $OLD_BACKEND 2>/dev/null || true
fi

if [ -n "$OLD_FRONTEND" ]; then
    echo "   Removendo container frontend antigo: $OLD_FRONTEND"
    docker stop $OLD_FRONTEND 2>/dev/null || true
    docker rm -f $OLD_FRONTEND 2>/dev/null || true
fi
echo ""

echo "5. Limpando volumes órfãos (se houver)..."
docker volume ls | grep "aion-effort" | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || true
echo ""

echo "6. Atualizando código do GitHub..."
git pull origin main
echo ""

echo "7. Criando e iniciando containers do zero..."
# Primeiro o backend
echo "   Iniciando backend..."
docker-compose up -d backend

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao iniciar backend"
    echo "   Tentando alternativa: remover imagem e rebuildar..."
    docker rmi app-aion-effort_backend 2>/dev/null || true
    docker-compose build backend
    docker-compose up -d backend
fi

echo "   Aguardando backend inicializar..."
sleep 5

# Depois o frontend
echo "   Iniciando frontend..."
docker-compose up -d frontend

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao iniciar frontend"
    echo "   Tentando alternativa: remover imagem e rebuildar..."
    docker rmi app-aion-effort_frontend 2>/dev/null || true
    docker-compose build frontend
    docker-compose up -d frontend
fi

# Por último o caddy
echo "   Iniciando caddy..."
docker-compose up -d caddy
echo ""

echo "8. Aguardando serviços inicializarem..."
sleep 10
echo ""

echo "9. Verificando status dos serviços..."
BACKEND_STATUS=$(docker-compose ps backend | grep -q "Up" && echo "✅ OK" || echo "❌ FALHOU")
FRONTEND_STATUS=$(docker-compose ps frontend | grep -q "Up" && echo "✅ OK" || echo "❌ FALHOU")
CADDY_STATUS=$(docker-compose ps caddy | grep -q "Up" && echo "✅ OK" || echo "❌ FALHOU")

echo "   Backend: $BACKEND_STATUS"
echo "   Frontend: $FRONTEND_STATUS"
echo "   Caddy: $CADDY_STATUS"
echo ""

if [ "$BACKEND_STATUS" != "✅ OK" ] || [ "$FRONTEND_STATUS" != "✅ OK" ]; then
    echo "   ⚠️  Alguns serviços falharam. Verificando logs..."
    echo ""
    if [ "$BACKEND_STATUS" != "✅ OK" ]; then
        echo "   Backend logs:"
        docker-compose logs --tail=20 backend
    fi
    if [ "$FRONTEND_STATUS" != "✅ OK" ]; then
        echo "   Frontend logs:"
        docker-compose logs --tail=20 frontend
    fi
    exit 1
fi

echo "10. Testando endpoints..."
sleep 3

# Testar backend
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>/dev/null || echo "000")
if [ "$BACKEND_HEALTH" = "200" ]; then
    echo "   ✅ Backend está respondendo"
else
    echo "   ⚠️  Backend não está respondendo corretamente (HTTP $BACKEND_HEALTH)"
fi

# Testar frontend
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
if [ "$FRONTEND_HEALTH" = "200" ]; then
    echo "   ✅ Frontend está respondendo"
else
    echo "   ⚠️  Frontend pode não estar respondendo (HTTP $FRONTEND_HEALTH)"
fi
echo ""

echo "✅ LIMPEZA E REINÍCIO CONCLUÍDOS!"
echo ""
echo "💡 Próximos passos:"
echo "   1. Acesse: https://av.aion.eng.br"
echo "   2. Limpe o cache do navegador (Ctrl+Shift+R)"
echo "   3. Teste a página de Usuários"
echo ""
echo "📋 Se houver problemas:"
echo "   docker-compose logs -f backend frontend"

