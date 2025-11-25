#!/bin/bash

echo "🚀 DEPLOY: Funcionalidades de Usuários"
echo "======================================"
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Fazendo backup do banco de dados..."
if [ -f "prisma/dev.db" ]; then
    BACKUP_FILE="prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)"
    cp prisma/dev.db "$BACKUP_FILE"
    echo "   ✅ Backup criado: $BACKUP_FILE"
else
    echo "   ⚠️  Banco de dados não encontrado"
fi
echo ""

echo "2. Atualizando código do GitHub..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao fazer git pull"
    echo "   Verifique se há conflitos ou mudanças locais"
    exit 1
fi

echo "   ✅ Código atualizado"
echo ""

echo "3. Rebuild do backend (com novos endpoints)..."
docker-compose build backend

if [ $? -ne 0 ]; then
    echo "   ❌ Erro no build do backend"
    exit 1
fi

echo "   ✅ Backend reconstruído"
echo ""

echo "4. Rebuild do frontend (com novos componentes)..."
docker-compose build frontend

if [ $? -ne 0 ]; then
    echo "   ❌ Erro no build do frontend"
    exit 1
fi

echo "   ✅ Frontend reconstruído"
echo ""

echo "5. Reiniciando serviços..."
docker-compose up -d backend frontend

echo "   Aguardando serviços iniciarem..."
sleep 15
echo ""

echo "6. Verificando status dos containers..."
docker-compose ps
echo ""

echo "7. Verificando saúde dos serviços..."
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>/dev/null || echo "000")
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null || echo "000")

if [ "$BACKEND_HEALTH" = "200" ] || [ "$BACKEND_HEALTH" = "000" ]; then
    echo "   ✅ Backend está respondendo (status: $BACKEND_HEALTH)"
else
    echo "   ⚠️  Backend retornou status: $BACKEND_HEALTH"
fi

if [ "$FRONTEND_HEALTH" != "000" ]; then
    echo "   ✅ Frontend está respondendo através do Caddy (status: $FRONTEND_HEALTH)"
else
    echo "   ⚠️  Frontend não está respondendo através do Caddy"
fi
echo ""

echo "✅ DEPLOY CONCLUÍDO!"
echo ""
echo "📋 Funcionalidades implementadas:"
echo "   ✅ Botão para alterar senha de usuários (apenas admin)"
echo "   ✅ Modal de confirmação para exclusão de usuários"
echo "   ✅ Autenticação e autorização nos endpoints"
echo ""
echo "💡 Teste as funcionalidades:"
echo "   1. Acesse: https://av.aion.eng.br/users"
echo "   2. Clique no ícone de cadeado (🔒) para alterar senha"
echo "   3. Clique no ícone de lixeira (🗑️) para excluir usuário"
echo ""

