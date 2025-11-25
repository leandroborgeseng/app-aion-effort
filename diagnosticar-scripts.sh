#!/bin/bash

echo "🔍 DIAGNÓSTICO: Verificando Scripts"
echo "===================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Verificando se os scripts existem no HOST..."
if [ -f "scripts/verUsuario.ts" ] && [ -f "scripts/alterarSenhaUsuario.ts" ]; then
    echo "   ✅ Scripts encontrados no host:"
    ls -lh scripts/verUsuario.ts scripts/alterarSenhaUsuario.ts
else
    echo "   ❌ Scripts NÃO encontrados no host!"
    echo "   Arquivos no diretório scripts:"
    ls -la scripts/ | head -10
    echo ""
    echo "   Executando git pull para baixar os scripts..."
    git pull origin main
    echo ""
    if [ -f "scripts/verUsuario.ts" ] && [ -f "scripts/alterarSenhaUsuario.ts" ]; then
        echo "   ✅ Scripts encontrados após git pull"
    else
        echo "   ❌ Scripts ainda não encontrados. Verifique o repositório."
        exit 1
    fi
fi
echo ""

echo "2. Verificando configuração do volume no docker-compose.yml..."
if grep -q "./scripts:/app/scripts" docker-compose.yml; then
    echo "   ✅ Volume de scripts configurado no docker-compose.yml"
    grep "./scripts:/app/scripts" docker-compose.yml
else
    echo "   ❌ Volume de scripts NÃO está configurado!"
    echo "   Adicionando agora..."
    
    # Fazer backup
    cp docker-compose.yml docker-compose.yml.backup
    
    # Adicionar volume de scripts (antes da linha de uploads)
    sed -i '/- \.\/uploads:\/app\/uploads:rw/i\      # Montar scripts como volume para atualizar sem rebuild\n      - ./scripts:/app/scripts:ro' docker-compose.yml
    
    echo "   ✅ Volume adicionado ao docker-compose.yml"
    echo "   Reiniciando backend para aplicar mudanças..."
    docker-compose stop backend
    docker-compose up -d backend
    sleep 5
    echo "   ✅ Backend reiniciado"
fi
echo ""

echo "3. Verificando se o volume está montado no container..."
docker-compose exec -T backend ls -la /app/scripts/verUsuario.ts 2>/dev/null

if [ $? -eq 0 ]; then
    echo "   ✅ Script encontrado no container!"
    echo ""
    echo "   Arquivos em /app/scripts:"
    docker-compose exec -T backend ls -la /app/scripts/ | grep -E "verUsuario|alterarSenha" || true
else
    echo "   ❌ Script NÃO encontrado no container!"
    echo ""
    echo "   Listando diretório /app/scripts no container:"
    docker-compose exec -T backend ls -la /app/scripts/ 2>/dev/null | head -10
    echo ""
    echo "   ⚠️  Tentando reiniciar backend para montar o volume..."
    docker-compose restart backend
    sleep 5
    echo ""
    echo "   Verificando novamente..."
    docker-compose exec -T backend ls -la /app/scripts/verUsuario.ts 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Agora encontrado após reinício!"
    else
        echo "   ❌ Ainda não encontrado. Verificando permissões do volume..."
        echo ""
        echo "   Permissões no host:"
        ls -ld scripts/
        echo ""
        echo "   Pode ser necessário rebuild do backend."
    fi
fi
echo ""

echo "4. Testando execução do script..."
docker-compose exec -T backend pnpm tsx scripts/verUsuario.ts leandro.borges@aion.eng.br 2>&1 | head -20

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo ""
    echo "   ✅ Script executado com sucesso!"
else
    echo ""
    echo "   ❌ Erro ao executar script"
    echo ""
    echo "   Tentando método alternativo (diretório atual)..."
    docker-compose exec -T backend sh -c "cd /app && pnpm tsx scripts/verUsuario.ts leandro.borges@aion.eng.br" 2>&1 | head -20
fi
echo ""

echo "✅ DIAGNÓSTICO CONCLUÍDO!"
echo ""
echo "💡 Se os scripts ainda não funcionarem, execute:"
echo "   ./rebuild-backend-scripts.sh"

