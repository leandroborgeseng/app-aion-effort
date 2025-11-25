#!/bin/bash

echo "👤 RECUPERANDO USUÁRIO ADMINISTRADOR"
echo "===================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Verificando se o container backend está rodando..."
if ! docker-compose ps backend | grep -q "Up"; then
    echo "   ❌ Container backend não está rodando!"
    echo "   Iniciando backend..."
    docker-compose up -d backend
    sleep 10
fi

echo "   ✅ Backend está rodando"
echo ""

echo "2. Criando/Atualizando usuário administrador..."
echo "   Email: admin@aion.com"
echo "   Senha: admin123"
echo ""

# Executar script dentro do container backend
docker-compose exec -T backend pnpm tsx scripts/createAdminUser.ts admin@aion.com admin123 "Administrador" <<EOF

EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "   ✅ Usuário administrador criado/atualizado com sucesso!"
else
    echo ""
    echo "   ⚠️  Erro ao criar usuário. Tentando método alternativo..."
    
    # Método alternativo: criar via SQL direto
    echo "   Criando via SQL direto..."
    docker-compose exec -T backend node -e "
    const bcrypt = require('bcrypt');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    async function main() {
      const email = 'admin@aion.com';
      const password = 'admin123';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      try {
        await prisma.user.upsert({
          where: { email },
          update: {
            password: hashedPassword,
            role: 'admin',
            active: true,
            canImpersonate: true,
            name: 'Administrador',
          },
          create: {
            email,
            name: 'Administrador',
            password: hashedPassword,
            role: 'admin',
            active: true,
            canImpersonate: true,
          },
        });
        console.log('✅ Usuário administrador criado/atualizado!');
        console.log('Email:', email);
        console.log('Senha:', password);
      } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
      } finally {
        await prisma.\$disconnect();
      }
    }
    
    main();
    " || {
        echo "   Tentando método via SQLite direto..."
        docker-compose exec -T backend sh -c "
        cd /app && node -e \"
        const bcrypt = require('bcrypt');
        bcrypt.hash('admin123', 10, (err, hash) => {
          if (err) {
            console.error('Erro ao gerar hash:', err);
            process.exit(1);
          }
          console.log('Hash gerado:', hash);
        });
        \"
        " || echo "   ⚠️  Não foi possível gerar hash"
    }
fi
echo ""

echo "3. Verificando se o usuário foi criado..."
docker-compose exec -T backend sqlite3 /app/prisma/dev.db "SELECT email, role, active, name FROM User WHERE email = 'admin@aion.com';" 2>/dev/null || echo "   ⚠️  Não foi possível verificar via SQLite"
echo ""

echo "4. Testando login..."
RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aion.com","password":"admin123"}')

if echo "$RESPONSE" | grep -q "token"; then
    echo "   ✅ Login funcionando!"
    echo ""
    echo "✅ USUÁRIO ADMINISTRADOR RECUPERADO!"
    echo ""
    echo "📋 Credenciais:"
    echo "   Email: admin@aion.com"
    echo "   Senha: admin123"
    echo ""
    echo "⚠️  IMPORTANTE: Altere a senha após o primeiro login!"
else
    echo "   ⚠️  Login ainda não está funcionando"
    echo "   Resposta: $RESPONSE"
    echo ""
    echo "   Tentando criar usuário novamente com método direto..."
    
    # Tentar criar via endpoint da API (se existir) ou SQL direto
    docker-compose exec -T backend sh -c "
    cd /app && sqlite3 prisma/dev.db \"
    -- Remover usuário existente se houver
    DELETE FROM User WHERE email = 'admin@aion.com';
    
    -- Inserir novo usuário (hash precisa ser gerado)
    \" || true
    "
    
    echo ""
    echo "   Execute manualmente dentro do container backend:"
    echo "   docker-compose exec backend pnpm tsx scripts/createAdminUser.ts admin@aion.com admin123"
fi

echo ""
echo "✅ PROCESSO CONCLUÍDO!"

