#!/bin/bash

# Script para verificar e corrigir problemas com o banco de dados

set -e

echo "=========================================="
echo "Verificando banco de dados"
echo "=========================================="

cd /opt/apps/app-aion-effort

# 1. Verificar se banco existe no host
echo ""
echo "1. Verificando banco no host..."
if [ -f "prisma/dev.db" ]; then
    DB_SIZE=$(du -h prisma/dev.db | cut -f1)
    DB_PERM=$(ls -l prisma/dev.db | awk '{print $1, $3, $4}')
    echo "✅ Banco existe: $DB_SIZE"
    echo "   Permissões: $DB_PERM"
else
    echo "❌ Banco não encontrado em prisma/dev.db"
    exit 1
fi

# 2. Verificar permissões
echo ""
echo "2. Ajustando permissões..."
chmod 666 prisma/dev.db
chown root:root prisma/dev.db 2>/dev/null || true
echo "✅ Permissões ajustadas"

# 3. Verificar se banco existe dentro do container
echo ""
echo "3. Verificando banco dentro do container..."
docker-compose exec backend ls -la /app/prisma/dev.db || echo "⚠️  Banco não encontrado no container"

# 4. Verificar variável DATABASE_URL
echo ""
echo "4. Verificando DATABASE_URL no container..."
docker-compose exec backend env | grep DATABASE_URL || echo "⚠️  DATABASE_URL não encontrada"

# 5. Tentar criar admin novamente
echo ""
echo "5. Tentando criar usuário admin..."
docker-compose exec backend pnpm create:admin

echo ""
echo "=========================================="
echo "Verificação concluída!"
echo "=========================================="

