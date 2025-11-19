#!/bin/bash

# Script para atualizar produção com filtros de OS e botões de atualizar

echo "🚀 ATUALIZANDO PRODUÇÃO - FILTROS DE OS E BOTÕES DE ATUALIZAR"
echo "=============================================================="
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
echo "- Filtros de OS: Abertas, Fechadas e Todas"
echo "- Botão para atualizar lista de investimentos"
echo "- Botão para atualizar lista de OS"
echo "- Melhorias na interface de rondas"
echo ""
echo "📋 Teste:"
echo "1. Acesse a página de Rondas"
echo "2. Clique em 'Nova Ronda' ou 'Editar' uma ronda existente"
echo "3. Selecione um setor"
echo "4. Use os botões 'Abertas', 'Fechadas' ou 'Todas' para filtrar OS"
echo "5. Use o botão 'Atualizar' para recarregar investimentos"
echo "6. Use o ícone de refresh para recarregar OS"

