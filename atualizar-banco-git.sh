#!/bin/bash

# Script para atualizar banco de dados do Git no servidor

set -e

echo "=========================================="
echo "Atualizando banco de dados do Git"
echo "=========================================="

cd /opt/apps/app-aion-effort

# 1. Fazer backup do banco local (se existir)
if [ -f "prisma/dev.db" ]; then
    echo ""
    echo "1. Fazendo backup do banco local..."
    BACKUP_NAME="prisma/dev.db.backup.local.$(date +%Y%m%d_%H%M%S)"
    cp prisma/dev.db "$BACKUP_NAME"
    echo "✅ Backup criado: $BACKUP_NAME"
fi

# 2. Stash ou remover mudanças locais do banco
echo ""
echo "2. Preparando para atualizar do Git..."
git stash push -m "Backup banco local antes de atualizar do Git" prisma/dev.db 2>/dev/null || true

# 3. Fazer pull
echo ""
echo "3. Fazendo pull do Git..."
git pull origin main

# 4. Verificar se banco foi atualizado
echo ""
echo "4. Verificando banco atualizado..."
if [ -f "prisma/dev.db" ]; then
    DB_SIZE=$(du -h prisma/dev.db | cut -f1)
    echo "✅ Banco atualizado: $DB_SIZE"
else
    echo "⚠️  Banco não encontrado após pull"
    exit 1
fi

# 5. Ajustar permissões
echo ""
echo "5. Ajustando permissões..."
chmod 666 prisma/dev.db
echo "✅ Permissões ajustadas"

# 6. Reiniciar backend
echo ""
echo "6. Reiniciando backend..."
docker-compose restart backend
echo "✅ Backend reiniciado"

echo ""
echo "=========================================="
echo "Banco atualizado com sucesso!"
echo "=========================================="
echo ""
echo "Próximos passos:"
echo "  1. Configurar .env com tokens: nano .env"
echo "  2. Reiniciar containers: docker-compose down && docker-compose up -d"
echo ""

