#!/bin/bash

echo "🔍 DIAGNÓSTICO: Campo de senha não aparece"
echo "==========================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Verificando se o código foi atualizado..."
LATEST_COMMIT=$(git log -1 --oneline)
echo "   Último commit: $LATEST_COMMIT"
echo ""

echo "2. Verificando se o arquivo UsersPage.tsx tem o campo de senha..."
if grep -q "password" src/web/routes/UsersPage.tsx; then
    echo "   ✅ Campo 'password' encontrado no código"
    echo "   Linhas relevantes:"
    grep -n "password\|Senha" src/web/routes/UsersPage.tsx | head -5
else
    echo "   ❌ Campo 'password' NÃO encontrado no código!"
fi
echo ""

echo "3. Verificando se o frontend foi rebuildado recentemente..."
LAST_BUILD=$(docker-compose exec -T frontend stat -c %y /usr/share/nginx/html/index.html 2>/dev/null | cut -d' ' -f1)
echo "   Última modificação do index.html: $LAST_BUILD"
echo ""

echo "4. Verificando conteúdo do HTML gerado..."
HTML_CONTENT=$(docker-compose exec -T frontend cat /usr/share/nginx/html/index.html 2>/dev/null)
if echo "$HTML_CONTENT" | grep -q "assets/index-"; then
    ASSET_FILE=$(echo "$HTML_CONTENT" | grep -o "assets/index-[^\"]*\.js" | head -1)
    echo "   ✅ HTML encontrado"
    echo "   Asset JS referenciado: $ASSET_FILE"
    
    echo ""
    echo "5. Verificando se o asset JS existe..."
    if docker-compose exec -T frontend test -f "/usr/share/nginx/html/$ASSET_FILE" 2>/dev/null; then
        echo "   ✅ Asset JS existe"
        echo "   Tamanho: $(docker-compose exec -T frontend stat -c%s "/usr/share/nginx/html/$ASSET_FILE" 2>/dev/null) bytes"
        
        echo ""
        echo "6. Verificando se o código compilado contém 'password'..."
        if docker-compose exec -T frontend grep -q "password" "/usr/share/nginx/html/$ASSET_FILE" 2>/dev/null; then
            echo "   ✅ Código 'password' encontrado no asset JS compilado"
        else
            echo "   ❌ Código 'password' NÃO encontrado no asset JS compilado!"
            echo "   Isso indica que o frontend não foi rebuildado com as mudanças"
        fi
    else
        echo "   ❌ Asset JS não encontrado!"
    fi
else
    echo "   ❌ HTML não encontrado ou formato incorreto"
fi
echo ""

echo "7. Verificando logs do último build do frontend..."
echo "   Últimas linhas do build (pode demorar):"
docker-compose logs frontend 2>&1 | grep -i "build\|error\|warning" | tail -10 || echo "   Nenhum log de build encontrado"
echo ""

echo "8. Verificando data de modificação dos arquivos no container..."
echo "   index.html:"
docker-compose exec -T frontend ls -la /usr/share/nginx/html/index.html 2>/dev/null || echo "   Não encontrado"
echo "   Diretório assets:"
docker-compose exec -T frontend ls -lat /usr/share/nginx/html/assets/ 2>/dev/null | head -5 || echo "   Não encontrado"
echo ""

echo "✅ Diagnóstico completo!"
echo ""
echo "💡 Se o código 'password' não foi encontrado no asset JS:"
echo "   1. Execute: ./rebuild-frontend-producao.sh"
echo "   2. Aguarde o rebuild completar (pode demorar 3-5 minutos)"
echo "   3. Limpe o cache do navegador"
echo "   4. Teste novamente"

