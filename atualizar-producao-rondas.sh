#!/bin/bash

# Script para atualizar produção com as correções de permissões de rondas

echo "🚀 ATUALIZANDO PRODUÇÃO - CORREÇÕES DE PERMISSÕES DE RONDAS"
echo "============================================================"
echo ""

cd /opt/apps/app-aion-effort || exit 1

# 1. Fazer pull das mudanças
echo "📋 1. Fazendo pull das mudanças..."
git pull origin main

# 2. Rebuild do backend
echo ""
echo "📋 2. Fazendo rebuild do backend..."
docker-compose build --no-cache backend

# 3. Rebuild do frontend
echo ""
echo "📋 3. Fazendo rebuild do frontend..."
docker-compose build --no-cache frontend

# 4. Parar containers
echo ""
echo "📋 4. Parando containers..."
docker-compose down

# 5. Subir containers
echo ""
echo "📋 5. Subindo containers..."
docker-compose up -d

# 6. Aguardar containers estarem prontos
echo ""
echo "📋 6. Aguardando containers estarem prontos..."
sleep 10

# 7. Verificar status
echo ""
echo "📋 7. Verificando status dos containers..."
docker-compose ps

# 8. Verificar logs do backend
echo ""
echo "📋 8. Últimas linhas dos logs do backend:"
docker-compose logs --tail=20 backend

echo ""
echo "=========================================="
echo "✅ ATUALIZAÇÃO CONCLUÍDA!"
echo ""
echo "📋 O que foi atualizado:"
echo "- Verificação de permissões nas rotas de criar, atualizar e deletar rondas"
echo "- Apenas admin e gerente podem modificar rondas"
echo "- Mensagens de erro claras quando usuário não tem permissão"
echo "- Tratamento de erro 403 no frontend"
echo ""
echo "📋 Teste:"
echo "1. Tente atualizar uma ronda personificando um usuário comum"
echo "2. Deve aparecer mensagem: 'Você não tem permissão para atualizar rondas...'"

