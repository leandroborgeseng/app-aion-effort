#!/bin/bash

# Script para corrigir problemas de acesso ao banco de dados no Docker

echo "🔧 Corrigindo acesso ao banco de dados..."

cd /opt/apps/app-aion-effort || exit 1

# 1. Verificar se o arquivo existe
if [ ! -f "prisma/dev.db" ]; then
    echo "⚠️  Arquivo prisma/dev.db não existe. Criando..."
    mkdir -p prisma
    touch prisma/dev.db
fi

# 2. Corrigir permissões
echo "🔐 Corrigindo permissões..."
chmod 666 prisma/dev.db
chmod 755 prisma

# 3. Verificar se o diretório prisma existe dentro do container
echo "📦 Verificando container..."
docker-compose exec -T backend ls -la /app/prisma/ || echo "Diretório prisma não existe no container"

# 4. Criar diretório prisma dentro do container se não existir
echo "📁 Criando diretório prisma no container se necessário..."
docker-compose exec -T backend mkdir -p /app/prisma || true

# 5. Verificar permissões dentro do container
echo "🔐 Verificando permissões dentro do container..."
docker-compose exec -T backend ls -la /app/prisma/dev.db || echo "Arquivo não encontrado no container"

# 6. Reiniciar backend
echo "🔄 Reiniciando backend..."
docker-compose restart backend

echo "✅ Correção concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Verifique os logs: docker-compose logs -f backend"
echo "2. Teste o acesso: docker-compose exec backend pnpm prisma db push"

