#!/bin/bash

# Script para migrar banco de dados de desenvolvimento para produção

set -e

echo "=========================================="
echo "Migração de Banco de Dados para Produção"
echo "=========================================="

# Verificar se está no servidor
if [ ! -d "/opt/apps/app-aion-effort" ]; then
    echo "⚠️  Este script deve ser executado no servidor de produção"
    echo "Para migrar do desenvolvimento, use:"
    echo "  1. No desenvolvimento: scp prisma/dev.db usuario@servidor:/tmp/"
    echo "  2. No servidor: cp /tmp/dev.db /opt/apps/app-aion-effort/prisma/dev.db"
    exit 1
fi

cd /opt/apps/app-aion-effort

# 1. Parar backend
echo ""
echo "1. Parando backend..."
docker-compose stop backend

# 2. Fazer backup do banco atual
echo ""
echo "2. Fazendo backup do banco atual..."
if [ -f "prisma/dev.db" ]; then
    BACKUP_NAME="prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)"
    cp prisma/dev.db "$BACKUP_NAME"
    echo "✅ Backup criado: $BACKUP_NAME"
else
    echo "⚠️  Banco atual não encontrado (primeira migração)"
fi

# 3. Verificar se há arquivo para restaurar
echo ""
echo "3. Verificando arquivo de banco para restaurar..."
if [ -f "/tmp/dev.db" ]; then
    echo "✅ Arquivo encontrado em /tmp/dev.db"
    cp /tmp/dev.db prisma/dev.db
    chmod 666 prisma/dev.db
    echo "✅ Banco restaurado"
elif [ -f "prisma/dev.db.backup" ]; then
    echo "✅ Backup encontrado localmente"
    cp prisma/dev.db.backup prisma/dev.db
    chmod 666 prisma/dev.db
    echo "✅ Banco restaurado do backup local"
else
    echo "⚠️  Nenhum arquivo de banco encontrado para restaurar"
    echo "   Coloque o arquivo dev.db em /tmp/dev.db ou prisma/dev.db.backup"
    exit 1
fi

# 4. Reiniciar backend
echo ""
echo "4. Reiniciando backend..."
docker-compose start backend

# 5. Aguardar backend iniciar
echo ""
echo "5. Aguardando backend iniciar..."
sleep 10

# 6. Verificar saúde
echo ""
echo "6. Verificando saúde do backend..."
if curl -s http://localhost:4000/health > /dev/null; then
    echo "✅ Backend está saudável"
else
    echo "⚠️  Backend pode não estar respondendo ainda"
fi

echo ""
echo "=========================================="
echo "Migração concluída!"
echo "=========================================="
echo ""
echo "Próximos passos:"
echo "  1. Verificar logs: docker-compose logs -f backend"
echo "  2. Testar API: curl http://localhost:4000/api/ecm/lifecycle/mes-a-mes"
echo "  3. Acessar aplicação: http://SEU_IP:3000"
echo ""

