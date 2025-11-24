#!/bin/bash

# Script para testar a API de Ordens de Serviço do Effort
# Uso: ./test-api-os.sh

# ============================================
# CONFIGURAÇÕES - AJUSTE AQUI
# ============================================

# URL base da API Effort (ajuste se necessário)
BASE_URL="${EFFORT_BASE_URL:-https://sjh.globalthings.net}"

# Token da API (substitua pelo seu token real)
# Você pode pegar do arquivo .env: EFFORT_API_KEY ou API_PBI_REL_OS_ANALITICO_RESUMIDO
API_KEY="${EFFORT_API_KEY:-SEU_TOKEN_AQUI}"

# ============================================
# TESTE 1: Buscar OS do Ano Corrente (página 1, 50 itens)
# ============================================
echo "============================================"
echo "TESTE 1: OS do Ano Corrente (página 1, 50 itens)"
echo "============================================"
echo ""

curl -X GET "${BASE_URL}/api/pbi/v1/listagem_analitica_das_os_resumida" \
  -H "X-API-KEY: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -G \
  --data-urlencode "tipoManutencao=Todos" \
  --data-urlencode "periodo=AnoCorrente" \
  --data-urlencode "pagina=0" \
  --data-urlencode "qtdPorPagina=50" \
  | jq '.' 2>/dev/null || cat

echo ""
echo ""

# ============================================
# TESTE 2: Buscar OS do Ano Corrente (página 1, 10 itens) - Mais simples
# ============================================
echo "============================================"
echo "TESTE 2: OS do Ano Corrente (página 1, 10 itens)"
echo "============================================"
echo ""

curl -X GET "${BASE_URL}/api/pbi/v1/listagem_analitica_das_os_resumida?tipoManutencao=Todos&periodo=AnoCorrente&pagina=0&qtdPorPagina=10" \
  -H "X-API-KEY: ${API_KEY}" \
  -H "Content-Type: application/json" \
  | jq '.' 2>/dev/null || cat

echo ""
echo ""

# ============================================
# TESTE 3: Buscar OS com filtro de data (último ano)
# ============================================
echo "============================================"
echo "TESTE 3: OS com filtro de data (último ano)"
echo "============================================"
echo ""

# Calcular datas (1 ano atrás até hoje)
DATA_FIM=$(date +%Y-%m-%d)
DATA_INICIO=$(date -v-365d +%Y-%m-%d 2>/dev/null || date -d "365 days ago" +%Y-%m-%d 2>/dev/null || date +%Y-%m-%d)

curl -X GET "${BASE_URL}/api/pbi/v1/listagem_analitica_das_os_resumida" \
  -H "X-API-KEY: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -G \
  --data-urlencode "tipoManutencao=Todos" \
  --data-urlencode "periodo=Todos" \
  --data-urlencode "dataInicio=${DATA_INICIO}" \
  --data-urlencode "dataFim=${DATA_FIM}" \
  --data-urlencode "pagina=0" \
  --data-urlencode "qtdPorPagina=10" \
  | jq '.' 2>/dev/null || cat

echo ""
echo ""

# ============================================
# TESTE 4: Buscar TODAS as OS (sem filtro)
# ============================================
echo "============================================"
echo "TESTE 4: TODAS as OS (sem filtro de período)"
echo "============================================"
echo ""

curl -X GET "${BASE_URL}/api/pbi/v1/listagem_analitica_das_os_resumida?tipoManutencao=Todos&periodo=Todos&pagina=0&qtdPorPagina=5" \
  -H "X-API-KEY: ${API_KEY}" \
  -H "Content-Type: application/json" \
  | jq '.' 2>/dev/null || cat

echo ""
echo ""

# ============================================
# TESTE 5: Verificar apenas o status da resposta
# ============================================
echo "============================================"
echo "TESTE 5: Verificar status HTTP"
echo "============================================"
echo ""

curl -X GET "${BASE_URL}/api/pbi/v1/listagem_analitica_das_os_resumida?tipoManutencao=Todos&periodo=AnoCorrente&pagina=0&qtdPorPagina=1" \
  -H "X-API-KEY: ${API_KEY}" \
  -w "\n\nStatus HTTP: %{http_code}\nTempo total: %{time_total}s\n" \
  -o /dev/null -s

echo ""
echo "============================================"
echo "FIM DOS TESTES"
echo "============================================"
echo ""
echo "💡 DICAS:"
echo "1. Se receber 401/403: Verifique o token da API"
echo "2. Se receber 404: Verifique a URL base"
echo "3. Se receber 500: Pode ser problema no servidor Effort"
echo "4. Se não retornar dados: Verifique os parâmetros de período"
echo ""
echo "📋 Para usar com seu token:"
echo "export EFFORT_API_KEY='seu_token_aqui'"
echo "./test-api-os.sh"

