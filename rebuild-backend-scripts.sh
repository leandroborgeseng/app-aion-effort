#!/bin/bash

echo "🔨 REBUILD DO BACKEND (ALTERNATIVA)"
echo "===================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "⚠️  ATENÇÃO: Este processo pode levar alguns minutos"
echo ""

echo "1. Atualizando código do GitHub..."
git pull origin main
echo ""

echo "2. Parando backend..."
docker-compose stop backend
echo ""

echo "3. Rebuild da imagem backend (isso pode levar alguns minutos)..."
docker-compose build --no-cache backend

if [ $? -eq 0 ]; then
    echo "   ✅ Rebuild concluído"
else
    echo "   ❌ Erro no rebuild"
    exit 1
fi
echo ""

echo "4. Iniciando backend..."
docker-compose up -d backend
echo "   Aguardando backend inicializar..."
sleep 10
echo ""

echo "5. Verificando se os scripts estão disponíveis..."
docker-compose exec -T backend ls -la /app/scripts/alterarSenhaUsuario.ts /app/scripts/verUsuario.ts 2>/dev/null

if [ $? -eq 0 ]; then
    echo "   ✅ Scripts encontrados no container!"
else
    echo "   ❌ Scripts não encontrados"
    exit 1
fi
echo ""

echo "✅ PROCESSO CONCLUÍDO!"
echo ""
echo "💡 Agora você pode usar os scripts:"
echo "   ./alterar-senha-usuario.sh leandro.borges@aion.eng.br nova_senha"
echo "   ./ver-usuario.sh leandro.borges@aion.eng.br"

