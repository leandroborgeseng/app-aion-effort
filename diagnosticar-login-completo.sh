#!/bin/bash

echo "🔍 DIAGNÓSTICO COMPLETO: Erro de Login"
echo "======================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Verificando status dos containers..."
docker-compose ps
echo ""

echo "2. Verificando se o backend está rodando e saudável..."
BACKEND_CONTAINER=$(docker-compose ps -q backend 2>/dev/null)

if [ -z "$BACKEND_CONTAINER" ]; then
    echo "   ❌ Container do backend não encontrado!"
    echo "   Tentando iniciar..."
    docker-compose up -d backend
    sleep 10
else
    echo "   ✅ Container backend encontrado: $BACKEND_CONTAINER"
    
    # Verificar se está rodando
    if docker inspect $BACKEND_CONTAINER | grep -q '"Running": true'; then
        echo "   ✅ Backend está rodando"
    else
        echo "   ❌ Backend NÃO está rodando!"
        echo "   Tentando iniciar..."
        docker-compose up -d backend
        sleep 10
    fi
fi
echo ""

echo "3. Testando health check do backend DENTRO do container..."
HEALTH_INTERNAL=$(docker-compose exec -T backend curl -s http://localhost:4000/health 2>&1)

if echo "$HEALTH_INTERNAL" | grep -q "ok\|OK"; then
    echo "   ✅ Health check interno passou: $HEALTH_INTERNAL"
else
    echo "   ❌ Health check interno falhou"
    echo "   Resposta: $HEALTH_INTERNAL"
    echo ""
    echo "   Verificando logs do backend..."
    docker-compose logs --tail=20 backend
fi
echo ""

echo "4. Verificando se o backend está acessível através do Caddy..."
# Testar através do Caddy (localhost porque estamos no servidor)
CADDY_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>&1)

if [ "$CADDY_HEALTH" = "200" ]; then
    echo "   ✅ Backend acessível através do Caddy (status: $CADDY_HEALTH)"
else
    echo "   ⚠️  Status através do Caddy: $CADDY_HEALTH"
    echo "   Testando rota de login..."
    
    # Tentar fazer uma requisição de login e ver o que retorna
    LOGIN_RESPONSE=$(curl -s -X POST http://localhost/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"teste@teste.com","password":"teste"}' 2>&1)
    
    echo "   Resposta do login através do Caddy:"
    echo "$LOGIN_RESPONSE" | head -10
fi
echo ""

echo "5. Verificando configuração do Caddy..."
if [ -f "Caddyfile" ]; then
    echo "   ✅ Caddyfile encontrado"
    echo ""
    echo "   Configuração de proxy reverso para /api/*:"
    grep -A 5 "reverse_proxy" Caddyfile | grep -E "backend|4000" || echo "   ⚠️  Não encontrado configuração clara"
else
    echo "   ❌ Caddyfile não encontrado!"
fi
echo ""

echo "6. Testando login diretamente no backend (dentro do container)..."
docker-compose exec -T backend curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"leandro.borges@aion.eng.br","password":"teste"}' 2>&1 | head -5

echo ""
echo ""

echo "7. Verificando logs recentes do backend para erros..."
docker-compose logs --tail=50 backend | grep -iE "error|erro|exception|fatal|auth|login" | tail -20 || echo "   Nenhum erro recente encontrado"
echo ""

echo "8. Verificando logs do Caddy..."
if docker-compose ps caddy | grep -q "Up"; then
    echo "   Últimas linhas dos logs do Caddy:"
    docker-compose logs --tail=10 caddy | tail -10
else
    echo "   ⚠️  Caddy não está rodando"
fi
echo ""

echo "9. Testando acesso externo (se Caddy estiver configurado)..."
EXTERNAL_TEST=$(curl -s -o /dev/null -w "%{http_code}" https://av.aion.eng.br/api/health 2>&1 || echo "000")

if [ "$EXTERNAL_TEST" = "200" ]; then
    echo "   ✅ Acesso externo funcionando (status: $EXTERNAL_TEST)"
else
    echo "   ⚠️  Acesso externo: status $EXTERNAL_TEST"
fi
echo ""

echo "✅ DIAGNÓSTICO CONCLUÍDO!"
echo ""
echo "💡 Resumo:"
echo "   - Backend rodando: $(docker-compose ps backend | grep -q 'Up' && echo 'Sim' || echo 'Não')"
echo "   - Caddy rodando: $(docker-compose ps caddy | grep -q 'Up' && echo 'Sim' || echo 'Não')"
echo ""
echo "💡 Se o problema persistir, verifique:"
echo "   1. docker-compose logs backend | tail -50"
echo "   2. docker-compose logs caddy | tail -50"
echo "   3. docker-compose restart backend caddy"

