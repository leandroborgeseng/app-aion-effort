#!/bin/bash
# Script para diagnosticar problemas nas rotas de usuários

echo "🔍 DIAGNÓSTICO: Rotas de Usuários"
echo "=================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Verificando se o backend está rodando..."
docker-compose ps backend
echo ""

echo "2. Verificando logs recentes do backend (erros relacionados a usuários)..."
docker-compose logs --tail=50 backend | grep -iE "users.*password|users.*delete|401|403|Token" | tail -20 || echo "   Nenhum log relevante encontrado"
echo ""

echo "3. Verificando se as rotas estão registradas corretamente..."
echo "   Buscando por 'PATCH.*password' e 'DELETE.*users' no código..."
docker-compose exec -T backend grep -n "patch.*password\|delete.*:id" /app/src/routes/users.ts | head -5 || echo "   Não foi possível verificar"
echo ""

echo "4. Testando endpoint de listar usuários (sem autenticação)..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:4000/api/users
echo ""

echo "5. Verificando se há erros de sintaxe no arquivo users.ts..."
docker-compose exec -T backend node -c /app/src/routes/users.ts 2>&1 || echo "   Erro de sintaxe encontrado"
echo ""

echo "✅ DIAGNÓSTICO CONCLUÍDO!"
echo ""
echo "💡 Para testar manualmente:"
echo "   1. Faça login na aplicação"
echo "   2. Abra o console do navegador (F12)"
echo "   3. Execute: localStorage.getItem('auth_token')"
echo "   4. Use o token para testar as rotas:"
echo ""
echo "   curl -X PATCH http://localhost:4000/api/users/USER_ID/password \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'Authorization: Bearer SEU_TOKEN' \\"
echo "     -d '{\"newPassword\":\"Teste123!\"}'"
echo ""
echo "   curl -X DELETE http://localhost:4000/api/users/USER_ID \\"
echo "     -H 'Authorization: Bearer SEU_TOKEN'"

