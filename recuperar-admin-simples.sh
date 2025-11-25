#!/bin/bash

echo "👤 RECUPERANDO USUÁRIO ADMINISTRADOR"
echo "===================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Executando script de criação do admin dentro do container backend..."
echo ""

docker-compose exec -T backend pnpm tsx scripts/createAdminUser.ts admin@aion.com admin123 "Administrador"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Usuário administrador criado/atualizado!"
    echo ""
    echo "📋 Credenciais:"
    echo "   Email: admin@aion.com"
    echo "   Senha: admin123"
    echo ""
    echo "2. Testando login..."
    sleep 2
    
    RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@aion.com","password":"admin123"}')
    
    if echo "$RESPONSE" | grep -q "token"; then
        echo "   ✅ Login funcionando!"
        echo ""
        echo "✅ TUDO PRONTO! Você pode fazer login agora."
    else
        echo "   ⚠️  Login ainda não funcionou, mas o usuário foi criado."
        echo "   Tente fazer login manualmente em https://av.aion.eng.br"
    fi
else
    echo ""
    echo "❌ Erro ao criar usuário. Tente executar manualmente:"
    echo ""
    echo "docker-compose exec backend pnpm tsx scripts/createAdminUser.ts admin@aion.com admin123"
fi

echo ""

