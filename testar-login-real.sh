#!/bin/bash

echo "🧪 TESTE REAL: Verificando Resposta do Login"
echo "============================================"
echo ""

cd /opt/apps/app-aion-effort || exit 1

EMAIL="leandro.borges@aion.eng.br"
PASSWORD="Lean777\$"

echo "1. Testando login DENTRO do container backend (direto na porta 4000)..."
echo ""

RESPONSE_INTERNAL=$(docker-compose exec -T backend curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 2>&1)

echo "Resposta completa:"
echo "$RESPONSE_INTERNAL"
echo ""
echo "---"
echo ""

# Extrair status code
STATUS_INTERNAL=$(echo "$RESPONSE_INTERNAL" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY_INTERNAL=$(echo "$RESPONSE_INTERNAL" | grep -v "HTTP_STATUS:")

echo "Status HTTP: $STATUS_INTERNAL"
echo ""
echo "Body (primeiros 500 caracteres):"
echo "$BODY_INTERNAL" | head -c 500
echo ""
echo ""

# Verificar se é JSON válido
if echo "$BODY_INTERNAL" | python3 -m json.tool > /dev/null 2>&1; then
    echo "✅ Resposta é JSON válido"
else
    echo "❌ Resposta NÃO é JSON válido!"
    echo ""
    echo "Conteúdo completo:"
    echo "$BODY_INTERNAL"
fi
echo ""
echo ""

echo "2. Testando login através do Caddy (localhost/api/auth/login)..."
echo ""

RESPONSE_CADDY=$(curl -s -w "\nHTTP_STATUS:%{http_code}\nCONTENT_TYPE:%{content_type}\n" -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 2>&1)

echo "Resposta completa:"
echo "$RESPONSE_CADDY" | head -20
echo ""
echo "---"
echo ""

# Extrair componentes
STATUS_CADDY=$(echo "$RESPONSE_CADDY" | grep "HTTP_STATUS:" | cut -d: -f2)
CONTENT_TYPE=$(echo "$RESPONSE_CADDY" | grep "CONTENT_TYPE:" | cut -d: -f2)
BODY_CADDY=$(echo "$RESPONSE_CADDY" | grep -vE "HTTP_STATUS|CONTENT_TYPE")

echo "Status HTTP: $STATUS_CADDY"
echo "Content-Type: $CONTENT_TYPE"
echo ""
echo "Body (primeiros 500 caracteres):"
echo "$BODY_CADDY" | head -c 500
echo ""
echo ""

if [ -n "$BODY_CADDY" ] && [ "$BODY_CADDY" != "" ]; then
    if echo "$BODY_CADDY" | python3 -m json.tool > /dev/null 2>&1; then
        echo "✅ Resposta através do Caddy é JSON válido"
    else
        echo "❌ Resposta através do Caddy NÃO é JSON válido!"
    fi
else
    echo "⚠️  Resposta através do Caddy está vazia!"
fi
echo ""
echo ""

echo "3. Verificando logs do backend durante o teste..."
echo ""
docker-compose logs --tail=10 backend | grep -E "auth|login" | tail -5
echo ""

echo "4. Verificando logs do Caddy durante o teste..."
echo ""
docker-compose logs --tail=10 caddy | tail -5
echo ""

echo "✅ TESTE CONCLUÍDO!"
echo ""
echo "💡 Comparação:"
echo "   - Backend direto (porta 4000): Status $STATUS_INTERNAL"
echo "   - Através do Caddy (/api/auth/login): Status $STATUS_CADDY, Content-Type: $CONTENT_TYPE"

