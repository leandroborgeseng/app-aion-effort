#!/bin/bash

echo "🔍 DIAGNÓSTICO: Usuários desaparecendo"
echo "======================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Verificando se o backend está rodando..."
if docker-compose ps backend | grep -q "Up"; then
    echo "   ✅ Backend está rodando"
else
    echo "   ❌ Backend não está rodando!"
    exit 1
fi
echo ""

echo "2. Testando endpoint de usuários..."
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:4000/api/users 2>/dev/null || echo -e "\n000")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Endpoint respondeu com sucesso (HTTP $HTTP_CODE)"
    
    # Verificar se há usuários
    USER_COUNT=$(echo "$BODY" | grep -o '"id"' | wc -l || echo "0")
    if [ "$USER_COUNT" -gt "0" ]; then
        echo "   ✅ Encontrados $USER_COUNT usuário(s)"
        echo ""
        echo "   Primeiros usuários:"
        echo "$BODY" | grep -o '"name":"[^"]*"' | head -3
    else
        echo "   ⚠️  Nenhum usuário encontrado na resposta"
        echo "   Resposta completa:"
        echo "$BODY" | head -10
    fi
else
    echo "   ❌ Endpoint retornou erro (HTTP $HTTP_CODE)"
    echo "   Resposta:"
    echo "$BODY" | head -20
fi
echo ""

echo "3. Verificando logs do backend (últimas 30 linhas com 'user' ou 'error')..."
docker-compose logs --tail=50 backend | grep -iE "user|error|exception|failed" | tail -20 || echo "   Nenhum log relevante encontrado"
echo ""

echo "4. Verificando banco de dados..."
USER_COUNT_DB=$(docker-compose exec -T backend sh -c "sqlite3 /app/prisma/dev.db 'SELECT COUNT(*) FROM User;' 2>/dev/null" || echo "erro")
if [ "$USER_COUNT_DB" != "erro" ] && [ -n "$USER_COUNT_DB" ]; then
    echo "   ✅ Banco de dados acessível"
    echo "   Usuários no banco: $USER_COUNT_DB"
    
    if [ "$USER_COUNT_DB" -gt "0" ]; then
        echo "   Listando usuários:"
        docker-compose exec -T backend sh -c "sqlite3 /app/prisma/dev.db 'SELECT id, email, name, role, active FROM User LIMIT 5;' 2>/dev/null" || echo "   Erro ao listar usuários"
    fi
else
    echo "   ❌ Erro ao acessar banco de dados"
fi
echo ""

echo "5. Verificando se há erros recentes nos logs..."
RECENT_ERRORS=$(docker-compose logs --tail=100 backend | grep -iE "error|exception|failed|users" | tail -10)
if [ -n "$RECENT_ERRORS" ]; then
    echo "   ⚠️  Erros recentes encontrados:"
    echo "$RECENT_ERRORS"
else
    echo "   ✅ Nenhum erro recente encontrado"
fi
echo ""

echo "✅ Diagnóstico completo!"
echo ""
echo "💡 Se os usuários não aparecem:"
echo "   1. Verifique os logs: docker-compose logs -f backend"
echo "   2. Teste o endpoint: curl http://localhost:4000/api/users"
echo "   3. Verifique o banco: docker-compose exec backend sqlite3 /app/prisma/dev.db 'SELECT * FROM User;'"
echo ""
echo "💡 Se o endpoint retornar erro 500:"
echo "   1. Execute: git pull origin main"
echo "   2. Execute: docker-compose restart backend"
echo "   3. Aguarde alguns segundos e teste novamente"

