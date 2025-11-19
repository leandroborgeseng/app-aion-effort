#!/bin/bash

# Script para fazer deploy das mudanças de setores da API do Effort

set -e

echo "🚀 DEPLOY: Setores da API do Effort"
echo "===================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

# 1. Verificar status
echo "📋 1. Verificando status do Git..."
git status
echo ""

# 2. Pull
echo "📋 2. Fazendo pull das mudanças..."
git pull origin main
echo ""

# 3. Verificar último commit
LAST_COMMIT=$(git log -1 --oneline)
echo "✅ Último commit: $LAST_COMMIT"
echo ""

# 4. Parar containers
echo "📋 3. Parando containers..."
docker-compose down
echo ""

# 5. Rebuild backend SEM cache
echo "📋 4. Rebuild do backend (sem cache)..."
docker-compose build --no-cache --pull backend
echo ""

# 6. Subir containers
echo "📋 5. Subindo containers..."
docker-compose up -d
echo ""

# 7. Aguardar
echo "📋 6. Aguardando containers iniciarem..."
sleep 30
echo ""

# 8. Verificar status
echo "📋 7. Status dos containers:"
docker-compose ps
echo ""

# 9. Testar API de setores
echo "📋 8. Testando API de setores..."
echo ""
echo "Testando: curl http://localhost:4000/api/ecm/investments/sectors/list"
RESPONSE=$(curl -s http://localhost:4000/api/ecm/investments/sectors/list || echo "ERRO")
echo ""

if echo "$RESPONSE" | grep -q "effort_api"; then
    echo "✅ API retornando setores da API do Effort!"
    echo "$RESPONSE" | head -20
else
    echo "⚠️  Resposta não contém 'effort_api'"
    echo "$RESPONSE" | head -20
fi

echo ""
echo "=========================================="
echo "✅ DEPLOY CONCLUÍDO!"
echo ""
echo "📋 O que foi atualizado:"
echo "  - API agora busca setores REAIS da API do Effort"
echo "  - Extrai setores únicos dos equipamentos"
echo "  - Cache de 10 minutos para melhor performance"
echo "  - Fallback para setores mapeados se API falhar"
echo ""
echo "📋 Para testar:"
echo "  curl http://localhost:4000/api/ecm/investments/sectors/list"
echo "  ou acesse: http://189.90.139.222:3000/investimentos"
echo ""

