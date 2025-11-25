#!/bin/bash
# Script para testar as rotas de usuários (alterar senha e deletar)

set -e

echo "🧪 TESTANDO ROTAS DE USUÁRIOS"
echo "=============================="
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "docker-compose.yml" ]; then
  echo "❌ Erro: docker-compose.yml não encontrado. Execute este script no diretório raiz do projeto."
  exit 1
fi

# Solicitar token de autenticação
echo "📋 Para testar as rotas, você precisa de um token de autenticação."
echo "   Faça login na aplicação e abra o console do navegador (F12)."
echo "   Execute: localStorage.getItem('auth_token')"
echo ""
read -p "Cole o token aqui (ou pressione Enter para pular): " AUTH_TOKEN

if [ -z "$AUTH_TOKEN" ]; then
  echo "⚠️  Sem token. Vou testar apenas as rotas públicas."
  echo ""
fi

# URL base
BASE_URL="http://localhost:4000"
if [ ! -z "$AUTH_TOKEN" ]; then
  AUTH_HEADER="Authorization: Bearer $AUTH_TOKEN"
fi

# Buscar um usuário de teste
echo "1. Listando usuários..."
if [ ! -z "$AUTH_TOKEN" ]; then
  USERS=$(curl -s -H "$AUTH_HEADER" "$BASE_URL/api/users")
else
  USERS=$(curl -s "$BASE_URL/api/users")
fi

echo "$USERS" | jq -r '.[] | "ID: \(.id), Email: \(.email), Role: \(.role)"' | head -5
echo ""

# Pegar o primeiro usuário que não seja admin (para testar exclusão)
TEST_USER_ID=$(echo "$USERS" | jq -r '.[] | select(.role != "admin") | .id' | head -n 1)

if [ -z "$TEST_USER_ID" ]; then
  echo "❌ Nenhum usuário não-admin encontrado para testar."
  exit 1
fi

echo "📌 Usuário de teste selecionado: $TEST_USER_ID"
echo ""

# Testar alteração de senha
if [ ! -z "$AUTH_TOKEN" ]; then
  echo "2. Testando alteração de senha..."
  echo "   PATCH /api/users/$TEST_USER_ID/password"
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d '{"newPassword":"Teste123!"}' \
    "$BASE_URL/api/users/$TEST_USER_ID/password")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  echo "   Status HTTP: $HTTP_CODE"
  echo "   Resposta: $BODY"
  echo ""
  
  if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "200" ]; then
    echo "   ✅ Alteração de senha funcionou!"
  else
    echo "   ❌ Erro na alteração de senha"
  fi
  echo ""
else
  echo "2. ⏭️  Pulando teste de alteração de senha (sem token)"
  echo ""
fi

# Testar exclusão de usuário
if [ ! -z "$AUTH_TOKEN" ]; then
  echo "3. Testando exclusão de usuário..."
  echo "   DELETE /api/users/$TEST_USER_ID"
  echo "   ⚠️  ATENÇÃO: Isso vai DELETAR o usuário!"
  read -p "   Deseja continuar? (s/N): " CONFIRM
  
  if [ "$CONFIRM" == "s" ] || [ "$CONFIRM" == "S" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE \
      -H "$AUTH_HEADER" \
      "$BASE_URL/api/users/$TEST_USER_ID")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    echo "   Status HTTP: $HTTP_CODE"
    echo "   Resposta: $BODY"
    echo ""
    
    if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "200" ]; then
      echo "   ✅ Exclusão de usuário funcionou!"
    else
      echo "   ❌ Erro na exclusão de usuário"
    fi
  else
    echo "   ⏭️  Teste de exclusão cancelado"
  fi
  echo ""
else
  echo "3. ⏭️  Pulando teste de exclusão (sem token)"
  echo ""
fi

# Verificar logs do backend
echo "4. Verificando logs do backend (últimas 20 linhas relacionadas a usuários)..."
docker-compose logs --tail=100 backend | grep -iE "users.*password|users.*delete|users.*PATCH|users.*DELETE" | tail -20 || echo "   Nenhum log relevante encontrado"
echo ""

echo "✅ TESTES CONCLUÍDOS!"
echo ""
echo "💡 Se os testes falharam, verifique:"
echo "   - Se o token está válido e não expirou"
echo "   - Se o usuário logado tem role 'admin'"
echo "   - Logs do backend: docker-compose logs -f backend"

