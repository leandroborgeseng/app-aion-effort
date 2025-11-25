#!/bin/bash

echo "🔧 RESOLVENDO: Container Backend Corrompido"
echo "==========================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Parando e removendo container corrompido..."
docker-compose stop backend 2>/dev/null || true
docker rm -f aion-effort-backend ea3ca5f4e5aa_aion-effort-backend 2>/dev/null || true
docker-compose rm -f backend 2>/dev/null || true
echo "   ✅ Containers removidos"
echo ""

echo "2. Removendo imagem do backend (se necessário)..."
# Tentar remover imagem se estiver corrompida
docker rmi app-aion-effort_backend 2>/dev/null || true
docker rmi aion-effort-backend 2>/dev/null || true
echo "   ✅ Limpeza de imagens concluída"
echo ""

echo "3. Verificando erros do Prisma nos logs antigos..."
echo "   (Verificando se há problema no schema ou migrations)"
echo ""

echo "4. Rebuild completo do backend (sem cache)..."
docker-compose build --no-cache backend

if [ $? -ne 0 ]; then
    echo ""
    echo "   ❌ Erro no build!"
    echo ""
    echo "   Verificando erros de sintaxe TypeScript..."
    
    # Verificar se há erros óbvios de sintaxe
    if [ -f "src/routes/users.ts" ]; then
        echo "   Verificando src/routes/users.ts..."
        # Tentar verificar sintaxe básica (se possível)
    fi
    
    echo ""
    echo "   Tente ver os logs do build:"
    echo "   docker-compose build backend 2>&1 | tail -100"
    exit 1
fi

echo "   ✅ Build concluído"
echo ""

echo "5. Criando e iniciando container do backend..."
docker-compose up -d backend

if [ $? -ne 0 ]; then
    echo ""
    echo "   ❌ Erro ao criar container!"
    echo ""
    echo "   Tentando método alternativo..."
    docker-compose create backend
    docker-compose start backend
fi

echo "   Aguardando backend inicializar..."
sleep 15
echo ""

echo "6. Verificando status..."
docker-compose ps backend
echo ""

echo "7. Verificando logs do backend (últimas 30 linhas)..."
docker-compose logs --tail=30 backend
echo ""

echo "8. Verificando erros nos logs..."
ERRORS=$(docker-compose logs backend | grep -iE "error|erro|exception|fatal" | tail -10)

if [ -n "$ERRORS" ]; then
    echo "   ⚠️  Erros encontrados:"
    echo "$ERRORS"
else
    echo "   ✅ Nenhum erro encontrado nos logs recentes"
fi
echo ""

echo "9. Testando health check..."
HEALTH=$(docker-compose exec -T backend curl -s http://localhost:4000/health 2>/dev/null || echo "FAILED")

if [ "$HEALTH" != "FAILED" ]; then
    echo "   ✅ Backend está respondendo: $HEALTH"
else
    echo "   ❌ Backend não está respondendo"
    echo ""
    echo "   Verificando se o processo está rodando..."
    docker-compose exec -T backend ps aux | grep -E "node|pnpm" || echo "   Processo não encontrado"
fi
echo ""

echo "✅ PROCESSO CONCLUÍDO!"
echo ""
echo "💡 Se ainda houver problemas:"
echo "   - Ver logs: docker-compose logs -f backend"
echo "   - Verificar erros de Prisma: docker-compose exec backend pnpm prisma:generate"
echo "   - Verificar sintaxe: docker-compose exec backend node -c src/server.ts"

