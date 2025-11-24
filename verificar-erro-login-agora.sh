#!/bin/bash

echo "🔍 VERIFICANDO ERRO NO LOGIN"
echo "============================"
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Últimos erros nos logs do backend (focando em auth/login):"
echo "-------------------------------------------------------------"
docker-compose logs --tail=100 backend 2>/dev/null | grep -A 10 -B 5 -iE "auth.*login|login.*error|erro.*login|auth:login" | tail -50
echo ""

echo "2. Todos os erros recentes (últimas 50 linhas):"
echo "-----------------------------------------------"
docker-compose logs --tail=50 backend 2>/dev/null | grep -iE "error|erro|exception|failed|fail" 
echo ""

echo "3. Logs completos das últimas 30 linhas:"
echo "----------------------------------------"
docker-compose logs --tail=30 backend
echo ""

echo "4. Verificando se há erro de readonly ainda:"
echo "--------------------------------------------"
READONLY_COUNT=$(docker-compose logs --tail=100 backend 2>/dev/null | grep -i "readonly" | wc -l)
if [ "$READONLY_COUNT" -eq 0 ]; then
    echo "   ✅ Nenhum erro de readonly encontrado!"
else
    echo "   ⚠️  Ainda há $READONLY_COUNT erros de readonly"
fi
echo ""

echo "5. Testando se o Prisma consegue acessar o banco:"
echo "-------------------------------------------------"
docker-compose exec backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findFirst().then(u => {
  console.log('✅ Prisma consegue ler banco');
  console.log('   Primeiro usuário:', u?.email || 'nenhum');
  prisma.\$disconnect();
}).catch(e => {
  console.error('❌ Erro no Prisma:', e.message);
  prisma.\$disconnect();
  process.exit(1);
});
" 2>&1
echo ""

echo "6. Verificando se o usuário admin@aion.com existe:"
echo "--------------------------------------------------"
docker-compose exec backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findUnique({ where: { email: 'admin@aion.com' } })
  .then(u => {
    if (u) {
      console.log('✅ Usuário encontrado:');
      console.log('   Email:', u.email);
      console.log('   Nome:', u.name);
      console.log('   Role:', u.role);
      console.log('   Ativo:', u.active);
      console.log('   Tentativas:', u.loginAttempts);
      console.log('   Bloqueado até:', u.lockedUntil || 'não');
    } else {
      console.log('❌ Usuário admin@aion.com NÃO encontrado!');
    }
    prisma.\$disconnect();
  })
  .catch(e => {
    console.error('❌ Erro:', e.message);
    prisma.\$disconnect();
    process.exit(1);
  });
" 2>&1
echo ""

echo "✅ Verificação concluída!"
echo ""
echo "💡 Com base nos logs acima, identifique o erro específico."

