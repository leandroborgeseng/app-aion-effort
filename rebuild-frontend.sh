#!/bin/bash

echo "🔨 REBUILD DO FRONTEND"
echo "======================"
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Parando o container frontend..."
docker-compose stop frontend
echo ""

echo "2. Fazendo rebuild do frontend (isso pode demorar alguns minutos)..."
echo "   Aguarde..."
docker-compose build --no-cache frontend 2>&1 | tee /tmp/frontend-build.log
BUILD_EXIT_CODE=${PIPESTATUS[0]}
echo ""

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo "   ✅ Build concluído com sucesso!"
else
    echo "   ❌ Build falhou com código de saída: $BUILD_EXIT_CODE"
    echo ""
    echo "   Últimas linhas do log:"
    tail -30 /tmp/frontend-build.log
    exit 1
fi
echo ""

echo "3. Verificando se os assets foram gerados no build..."
echo "   Criando container temporário para verificar..."
docker-compose run --rm --no-deps frontend sh -c "ls -la /usr/share/nginx/html/assets/*.js 2>/dev/null | wc -l" || echo "0"
echo ""

echo "4. Iniciando o container frontend..."
docker-compose up -d frontend
echo ""

echo "5. Aguardando o frontend inicializar..."
sleep 5
echo ""

echo "6. Verificando se os assets estão agora disponíveis..."
ASSET_COUNT=$(docker-compose exec -T frontend sh -c "ls -1 /usr/share/nginx/html/assets/*.js 2>/dev/null | wc -l" || echo "0")
if [ "$ASSET_COUNT" -gt "0" ]; then
    echo "   ✅ Encontrados $ASSET_COUNT arquivo(s) JS!"
    echo ""
    echo "   Arquivos encontrados:"
    docker-compose exec -T frontend ls -1 /usr/share/nginx/html/assets/*.js | head -5
else
    echo "   ❌ Ainda nenhum arquivo JS encontrado!"
    echo ""
    echo "   Listando conteúdo do diretório assets:"
    docker-compose exec -T frontend ls -la /usr/share/nginx/html/assets/ 2>/dev/null || echo "   Diretório não existe"
fi
echo ""

echo "7. Verificando logs do build para erros..."
if grep -i "error\|failed\|fatal" /tmp/frontend-build.log | grep -v "deprecated"; then
    echo "   ⚠️  Possíveis erros encontrados no build:"
    grep -i "error\|failed\|fatal" /tmp/frontend-build.log | grep -v "deprecated" | tail -10
else
    echo "   ✅ Nenhum erro encontrado no log do build"
fi
echo ""

echo "✅ Rebuild completo!"
echo ""
echo "💡 Se os assets ainda não aparecerem, verifique:"
echo "   1. Logs do build: cat /tmp/frontend-build.log"
echo "   2. Logs do container: docker-compose logs frontend"
echo "   3. Verifique se o Vite está configurado corretamente"

