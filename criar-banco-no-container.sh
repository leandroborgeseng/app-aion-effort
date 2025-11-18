#!/bin/bash

# Script para garantir que o banco de dados seja criado corretamente no container

echo "🔧 Criando banco de dados no container..."
echo ""

cd /opt/apps/app-aion-effort || exit 1

# 1. Garantir que o arquivo existe no host
echo "📋 1. Preparando arquivo no host..."
mkdir -p prisma
if [ ! -f "prisma/dev.db" ]; then
    echo "   Criando arquivo vazio..."
    touch prisma/dev.db
fi
chmod 666 prisma/dev.db
chmod 755 prisma

# 2. Parar o backend temporariamente
echo ""
echo "📋 2. Parando backend..."
docker-compose stop backend

# 3. Verificar se o arquivo está acessível
echo ""
echo "📋 3. Verificando acesso ao arquivo..."
if [ -f "prisma/dev.db" ]; then
    SIZE=$(stat -f%z prisma/dev.db 2>/dev/null || stat -c%s prisma/dev.db 2>/dev/null || echo "0")
    echo "   Arquivo existe no host: $SIZE bytes"
else
    echo "   ❌ Arquivo não existe no host!"
    exit 1
fi

# 4. Iniciar backend novamente
echo ""
echo "📋 4. Iniciando backend..."
docker-compose up -d backend

# 5. Aguardar backend estar pronto
echo ""
echo "📋 5. Aguardando backend estar pronto..."
sleep 5

# 6. Verificar se o arquivo está acessível dentro do container
echo ""
echo "📋 6. Verificando acesso dentro do container..."
docker-compose exec -T backend ls -la /app/prisma/dev.db 2>&1

# 7. Criar schema do banco se necessário
echo ""
echo "📋 7. Criando schema do banco de dados..."
docker-compose exec -T backend pnpm prisma db push 2>&1

# 8. Verificar variável DATABASE_URL
echo ""
echo "📋 8. Verificando DATABASE_URL..."
docker-compose exec -T backend printenv DATABASE_URL

# 9. Testar acesso ao banco
echo ""
echo "📋 9. Testando acesso ao banco..."
docker-compose exec -T backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => {
    console.log('✅ Conexão com banco bem-sucedida!');
    return prisma.\$disconnect();
  })
  .catch((err) => {
    console.error('❌ Erro ao conectar:', err.message);
    process.exit(1);
  });
" 2>&1

echo ""
echo "=========================================="
echo "✅ Processo concluído!"
echo ""
echo "📋 Próximos passos:"
echo "1. Verifique os logs: docker-compose logs -f backend"
echo "2. Teste o login: curl -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@aion.com\",\"password\":\"admin123\"}'"

