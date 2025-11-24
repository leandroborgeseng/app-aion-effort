#!/bin/bash

echo "🔍 VERIFICANDO ASSETS DO FRONTEND"
echo "=================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Listando conteúdo do diretório assets..."
docker-compose exec -T frontend ls -la /usr/share/nginx/html/assets/ 2>/dev/null || echo "   Diretório não existe"
echo ""

echo "2. Verificando se há arquivos no diretório assets..."
FILE_COUNT=$(docker-compose exec -T frontend sh -c "ls -1 /usr/share/nginx/html/assets/ 2>/dev/null | wc -l" || echo "0")
echo "   Arquivos encontrados: $FILE_COUNT"
echo ""

echo "3. Listando todos os arquivos no diretório raiz do frontend..."
docker-compose exec -T frontend find /usr/share/nginx/html -type f -name "*.js" | head -10
echo ""

echo "4. Verificando se o diretório dist foi gerado corretamente no build..."
echo "   (Isso pode indicar se o build foi bem-sucedido)"
docker-compose exec -T frontend sh -c "if [ -d /usr/share/nginx/html ]; then echo '   ✅ Diretório existe'; ls -la /usr/share/nginx/html/ | head -15; fi"
echo ""

echo "5. Verificando tamanho do index.html..."
docker-compose exec -T frontend stat -c%s /usr/share/nginx/html/index.html 2>/dev/null && echo " bytes"
echo ""

echo "✅ Verificação completa!"
echo ""
echo "💡 Se o diretório assets estiver vazio, o frontend precisa ser rebuildado:"
echo "   docker-compose build --no-cache frontend"
echo "   docker-compose up -d frontend"

