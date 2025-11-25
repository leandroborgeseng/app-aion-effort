#!/bin/bash
# Script para resolver container frontend corrompido (KeyError: 'ContainerConfig')
# Remove container e imagem corrompidos e recria do zero

set -e

echo "🔧 RESOLVENDO CONTAINER FRONTEND CORROMPIDO"
echo "=========================================="
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "docker-compose.yml" ]; then
  echo "❌ Erro: docker-compose.yml não encontrado. Execute este script no diretório raiz do projeto."
  exit 1
fi

# Parar o container frontend
echo "1. Parando container frontend..."
docker-compose stop frontend || true

# Remover o container corrompido
echo ""
echo "2. Removendo container frontend corrompido..."
CONTAINER_ID=$(docker ps -a --filter "name=aion-effort-frontend" --format "{{.ID}}" | head -n 1)
if [ ! -z "$CONTAINER_ID" ]; then
  echo "   Container ID encontrado: $CONTAINER_ID"
  docker rm -f "$CONTAINER_ID" || true
  echo "   ✅ Container removido"
else
  echo "   ℹ️  Nenhum container encontrado"
fi

# Remover a imagem antiga
echo ""
echo "3. Removendo imagem frontend antiga..."
IMAGE_ID=$(docker images --filter "reference=app-aion-effort_frontend" --format "{{.ID}}" | head -n 1)
if [ ! -z "$IMAGE_ID" ]; then
  echo "   Image ID encontrada: $IMAGE_ID"
  docker rmi -f "$IMAGE_ID" || true
  echo "   ✅ Imagem removida"
else
  echo "   ℹ️  Nenhuma imagem encontrada"
fi

# Rebuild completo sem cache
echo ""
echo "4. Fazendo rebuild completo do frontend (sem cache)..."
docker-compose build --no-cache frontend

# Verificar se o build foi bem-sucedido
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Erro durante o build do frontend"
  exit 1
fi

# Criar e iniciar o container
echo ""
echo "5. Criando e iniciando novo container frontend..."
docker-compose up -d frontend

# Aguardar alguns segundos para o container iniciar
echo ""
echo "6. Aguardando container iniciar..."
sleep 5

# Verificar status do container
echo ""
echo "7. Verificando status do container..."
docker-compose ps frontend

# Verificar logs recentes
echo ""
echo "8. Últimos logs do frontend:"
echo "---"
docker-compose logs --tail=20 frontend

# Testar health check
echo ""
echo "9. Testando health check..."
sleep 3
HEALTH=$(docker inspect --format='{{.State.Health.Status}}' aion-effort-frontend 2>/dev/null || echo "unknown")
echo "   Status de saúde: $HEALTH"

echo ""
echo "✅ PROCESSO CONCLUÍDO!"
echo ""
echo "💡 Próximos passos:"
echo "   - Verifique os logs: docker-compose logs -f frontend"
echo "   - Verifique o status: docker-compose ps"
echo "   - Teste a aplicação no navegador"

