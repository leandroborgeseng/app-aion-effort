#!/bin/bash
# Script para testar os endpoints da API MEL

BASE_URL="http://localhost:4000"
TOKEN="${1:-}" # Token pode ser passado como primeiro argumento

echo "🧪 Testando endpoints da API MEL..."
echo ""

# Função para fazer requisição autenticada
make_request() {
  local method=$1
  local endpoint=$2
  local data=$3
  
  if [ -z "$TOKEN" ]; then
    echo "⚠️  Token não fornecido. Faça login primeiro e obtenha o token."
    echo "   Exemplo: ./test-mel-api.sh SEU_TOKEN_AQUI"
    exit 1
  fi
  
  if [ "$method" = "GET" ]; then
    curl -s -X GET \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      "${BASE_URL}${endpoint}" | jq .
  else
    curl -s -X $method \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "${BASE_URL}${endpoint}" | jq .
  fi
}

echo "1️⃣  Testando GET /api/ecm/mel/equipment-types"
make_request "GET" "/api/ecm/mel/equipment-types"
echo ""

echo "2️⃣  Testando GET /api/ecm/mel/summary"
make_request "GET" "/api/ecm/mel/summary"
echo ""

echo "3️⃣  Testando GET /api/ecm/mel/alerts"
make_request "GET" "/api/ecm/mel/alerts?onlyActive=true"
echo ""

echo "4️⃣  Testando POST /api/ecm/mel/recalculate"
make_request "POST" "/api/ecm/mel/recalculate" "{}"
echo ""

echo "✅ Testes concluídos!"
echo ""
echo "💡 Para testar endpoints de setor específico, use:"
echo "   curl -H 'Authorization: Bearer TOKEN' ${BASE_URL}/api/ecm/mel/sector/1"

