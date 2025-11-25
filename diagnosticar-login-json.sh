#!/bin/bash

echo "🔍 DIAGNÓSTICO: Erro de JSON no Login"
echo "======================================"
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Testando login diretamente no backend..."
echo ""

EMAIL="leandro.borges@aion.eng.br"
PASSWORD="Lean777\$"

echo "Email: $EMAIL"
echo "Senha: [oculto]"
echo ""

# Testar com curl para ver a resposta bruta
echo "2. Fazendo requisição de login com curl..."
echo ""

RESPONSE=$(curl -v -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  2>&1)

echo "Resposta completa:"
echo "$RESPONSE"
echo ""
echo "---"

# Extrair apenas o body
BODY=$(echo "$RESPONSE" | grep -A 100 "^{" | head -20 || echo "Resposta não é JSON")

echo ""
echo "3. Corpo da resposta (body):"
echo "$BODY"
echo ""

# Verificar status code
STATUS=$(echo "$RESPONSE" | grep -oP "< HTTP/\d\.\d \K\d+" | head -1)

if [ -n "$STATUS" ]; then
    echo "Status HTTP: $STATUS"
    
    if [ "$STATUS" != "200" ]; then
        echo "⚠️  Status não é 200 OK"
    fi
else
    echo "⚠️  Não foi possível determinar o status HTTP"
fi
echo ""

# Verificar Content-Type
CONTENT_TYPE=$(echo "$RESPONSE" | grep -i "content-type" | head -1)

if [ -n "$CONTENT_TYPE" ]; then
    echo "Content-Type: $CONTENT_TYPE"
    
    if [[ ! "$CONTENT_TYPE" =~ "application/json" ]]; then
        echo "⚠️  Content-Type não é application/json!"
    fi
else
    echo "⚠️  Content-Type não encontrado na resposta"
fi
echo ""

echo "4. Verificando logs do backend (últimas 20 linhas)..."
echo ""
docker-compose logs --tail=20 backend | grep -E "auth|login|error|Error" || echo "Nenhum log relevante encontrado"
echo ""

echo "5. Verificando se o backend está respondendo..."
HEALTH=$(curl -s http://localhost:4000/health 2>&1)

if [ -n "$HEALTH" ]; then
    echo "✅ Backend está respondendo no /health:"
    echo "$HEALTH"
else
    echo "❌ Backend não está respondendo no /health"
fi
echo ""

echo "✅ DIAGNÓSTICO CONCLUÍDO!"
echo ""
echo "💡 Se a resposta não for JSON, verifique:"
echo "   1. Logs do backend: docker-compose logs backend | tail -50"
echo "   2. Se o backend está rodando: docker-compose ps backend"
echo "   3. Se há erros no código do backend"

