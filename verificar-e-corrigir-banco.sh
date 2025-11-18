#!/bin/bash

# Script para verificar e corrigir problemas com o banco de dados

echo "🔍 Verificando banco de dados..."

cd /opt/apps/app-aion-effort || exit 1

# 1. Verificar se o diretório prisma existe
if [ ! -d "prisma" ]; then
    echo "📁 Criando diretório prisma..."
    mkdir -p prisma
fi

# 2. Verificar se o arquivo existe
if [ ! -f "prisma/dev.db" ]; then
    echo "📄 Arquivo dev.db não existe. Criando arquivo vazio..."
    touch prisma/dev.db
fi

# 3. Corrigir permissões
echo "🔐 Corrigindo permissões..."
chmod 666 prisma/dev.db
chmod 755 prisma

# 4. Verificar tamanho do arquivo
SIZE=$(stat -f%z prisma/dev.db 2>/dev/null || stat -c%s prisma/dev.db 2>/dev/null || echo "0")
echo "📊 Tamanho do arquivo: $SIZE bytes"

# 5. Verificar se o arquivo está acessível dentro do container
echo "🐳 Verificando acesso dentro do container..."
docker-compose exec -T backend ls -la /app/prisma/dev.db 2>/dev/null || echo "⚠️  Arquivo não encontrado no container"

# 6. Verificar variável de ambiente DATABASE_URL
echo "🔧 Verificando DATABASE_URL..."
docker-compose exec -T backend printenv DATABASE_URL || echo "⚠️  DATABASE_URL não definida"

# 7. Tentar criar o schema se o banco estiver vazio
if [ "$SIZE" -eq "0" ]; then
    echo "📋 Banco vazio detectado. Criando schema..."
    docker-compose exec -T backend pnpm prisma db push || echo "⚠️  Erro ao criar schema"
fi

echo ""
echo "✅ Verificação concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Reinicie o backend: docker-compose restart backend"
echo "2. Verifique os logs: docker-compose logs -f backend"
echo "3. Teste o login: curl -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@aion.com\",\"password\":\"admin123\"}'"

