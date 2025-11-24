#!/bin/bash

# Script para testar a API de OS com token do .env
# Execute: ./teste-api-os-com-token.sh

# Carregar token do .env
if [ -f .env ]; then
  # Priorizar o token específico para OS Resumida
  TOKEN=$(grep "^API_PBI_REL_OS_ANALITICO_RESUMIDO=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
  
  # Se não encontrar, usar o token genérico
  if [ -z "$TOKEN" ] || [ "$TOKEN" = "coloque_o_token_aqui" ]; then
    TOKEN=$(grep "^EFFORT_API_KEY=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
  fi
fi

# Se ainda não tiver token, usar o padrão
TOKEN="${TOKEN:-coloque_o_token_aqui}"

echo "============================================"
echo "🧪 Teste da API de Ordens de Serviço"
echo "============================================"
echo ""
echo "Token usado: ${TOKEN:0:10}..." # Mostrar apenas primeiros 10 caracteres
echo ""

# Teste 1: Ano Corrente, 5 itens
echo "📋 TESTE 1: Ano Corrente (5 itens)"
echo "-----------------------------------"
curl -X GET "https://sjh.globalthings.net/api/pbi/v1/listagem_analitica_das_os_resumida?tipoManutencao=Todos&periodo=AnoCorrente&pagina=0&qtdPorPagina=5" \
  -H "X-API-KEY: ${TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\n\nStatus HTTP: %{http_code}\n" \
  | jq '.' 2>/dev/null || cat

echo ""
echo ""

# Teste 2: Ver apenas status
echo "📋 TESTE 2: Verificar status HTTP"
echo "-----------------------------------"
curl -X GET "https://sjh.globalthings.net/api/pbi/v1/listagem_analitica_das_os_resumida?tipoManutencao=Todos&periodo=AnoCorrente&pagina=0&qtdPorPagina=1" \
  -H "X-API-KEY: ${TOKEN}" \
  -w "\nStatus HTTP: %{http_code}\nTempo: %{time_total}s\n" \
  -o /dev/null -s

echo ""
echo ""

# Teste 3: Contar quantas OS retornam
echo "📋 TESTE 3: Contar OS retornadas"
echo "-----------------------------------"
COUNT=$(curl -s -X GET "https://sjh.globalthings.net/api/pbi/v1/listagem_analitica_das_os_resumida?tipoManutencao=Todos&periodo=AnoCorrente&pagina=0&qtdPorPagina=100" \
  -H "X-API-KEY: ${TOKEN}" \
  -H "Content-Type: application/json" | jq 'length' 2>/dev/null || echo "0")

echo "Total de OS retornadas: ${COUNT}"
echo ""

