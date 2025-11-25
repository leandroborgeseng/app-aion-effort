#!/bin/bash

echo "🔧 CORRIGINDO PROBLEMA COM SCRIPTS"
echo "=================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Atualizando código do GitHub..."
git pull origin main
echo ""

echo "2. Verificando se scripts existem no host..."
if [ ! -f "scripts/verUsuario.ts" ] || [ ! -f "scripts/alterarSenhaUsuario.ts" ]; then
    echo "   ⚠️  Scripts não encontrados!"
    echo "   Listando arquivos em scripts/:"
    ls -la scripts/ | head -10
    echo ""
    echo "   Verificando se precisa baixar do git..."
    git checkout scripts/verUsuario.ts scripts/alterarSenhaUsuario.ts 2>/dev/null
    git pull origin main
fi

if [ -f "scripts/verUsuario.ts" ] && [ -f "scripts/alterarSenhaUsuario.ts" ]; then
    echo "   ✅ Scripts encontrados no host"
else
    echo "   ❌ Scripts ainda não encontrados. Tentando baixar novamente..."
    git fetch origin main
    git checkout origin/main -- scripts/verUsuario.ts scripts/alterarSenhaUsuario.ts
fi
echo ""

echo "3. Verificando e corrigindo docker-compose.yml..."
if ! grep -q "./scripts:/app/scripts" docker-compose.yml; then
    echo "   ⚠️  Volume de scripts não configurado. Adicionando..."
    
    # Backup
    cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
    
    # Adicionar volume após uploads
    sed -i '/- \.\/uploads:\/app\/uploads:rw/a\      # Montar scripts como volume\n      - ./scripts:/app/scripts:ro' docker-compose.yml
    
    echo "   ✅ Volume adicionado"
else
    echo "   ✅ Volume já está configurado"
fi
echo ""

echo "4. Reiniciando backend para aplicar mudanças..."
docker-compose stop backend
sleep 2
docker-compose up -d backend
echo "   Aguardando backend inicializar..."
sleep 10
echo ""

echo "5. Verificando se scripts estão no container..."
docker-compose exec -T backend test -f /app/scripts/verUsuario.ts 2>/dev/null

if [ $? -eq 0 ]; then
    echo "   ✅ Scripts encontrados no container!"
else
    echo "   ❌ Scripts ainda não encontrados no container"
    echo ""
    echo "   Tentando método alternativo: copiar scripts para dentro do container..."
    
    # Copiar scripts temporariamente
    docker cp scripts/verUsuario.ts aion-effort-backend:/app/scripts/verUsuario.ts 2>/dev/null || true
    docker cp scripts/alterarSenhaUsuario.ts aion-effort-backend:/app/scripts/alterarSenhaUsuario.ts 2>/dev/null || true
    
    echo "   Scripts copiados. Verificando novamente..."
    docker-compose exec -T backend test -f /app/scripts/verUsuario.ts 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Scripts agora encontrados!"
    else
        echo "   ⚠️  Ainda não funcionou. Pode ser necessário rebuild."
        echo "   Execute: ./rebuild-backend-scripts.sh"
    fi
fi
echo ""

echo "6. Testando execução do script..."
docker-compose exec -T backend pnpm tsx scripts/verUsuario.ts leandro.borges@aion.eng.br 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCESSO! Scripts estão funcionando!"
else
    echo ""
    echo "⚠️  Ainda há problemas. Verificando detalhes..."
    echo ""
    echo "   Tentando executar com caminho absoluto..."
    docker-compose exec -T backend sh -c "cd /app && pnpm tsx /app/scripts/verUsuario.ts leandro.borges@aion.eng.br" 2>&1 | head -30
fi

echo ""
echo "✅ PROCESSO CONCLUÍDO!"
echo ""
echo "💡 Comandos disponíveis:"
echo "   ./ver-usuario.sh leandro.borges@aion.eng.br"
echo "   ./alterar-senha-usuario.sh leandro.borges@aion.eng.br nova_senha"

