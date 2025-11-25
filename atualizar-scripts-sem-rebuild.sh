#!/bin/bash

echo "📝 ATUALIZANDO SCRIPTS SEM REBUILD"
echo "==================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Atualizando código do GitHub..."
git pull origin main
echo ""

echo "2. Verificando se scripts estão montados como volume no docker-compose.yml..."
if grep -q "./scripts:/app/scripts" docker-compose.yml; then
    echo "   ✅ Scripts já estão montados como volume"
    echo "   Reiniciando backend para garantir que está usando os scripts atualizados..."
    docker-compose restart backend
    sleep 5
    echo "   ✅ Backend reiniciado"
else
    echo "   ⚠️  Scripts NÃO estão montados como volume"
    echo "   Adicionando volume de scripts ao docker-compose.yml..."
    
    # Backup do docker-compose.yml
    cp docker-compose.yml docker-compose.yml.backup
    
    # Adicionar volume de scripts
    sed -i '/- \.\/uploads:\/app\/uploads:rw/a\      # Montar scripts como volume para atualizar sem rebuild\n      - ./scripts:/app/scripts:ro' docker-compose.yml
    
    echo "   ✅ Volume de scripts adicionado"
    echo "   Reiniciando backend..."
    docker-compose restart backend
    sleep 5
    echo "   ✅ Backend reiniciado"
fi
echo ""

echo "3. Verificando se os novos scripts estão disponíveis..."
docker-compose exec -T backend ls -la /app/scripts/alterarSenhaUsuario.ts /app/scripts/verUsuario.ts 2>/dev/null

if [ $? -eq 0 ]; then
    echo "   ✅ Scripts novos encontrados no container!"
else
    echo "   ⚠️  Scripts novos não encontrados"
    echo "   Pode ser necessário rebuild do backend"
    echo ""
    echo "   Para rebuild (se necessário):"
    echo "   docker-compose build backend"
    echo "   docker-compose up -d backend"
fi
echo ""

echo "✅ PROCESSO CONCLUÍDO!"
echo ""
echo "💡 Agora você pode usar os scripts:"
echo "   ./alterar-senha-usuario.sh leandro.borges@aion.eng.br nova_senha"
echo "   ./ver-usuario.sh leandro.borges@aion.eng.br"

