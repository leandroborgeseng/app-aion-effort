#!/bin/bash

# Script para atualizar produção com campo setor usando API

echo "🚀 ATUALIZANDO PRODUÇÃO - CAMPO SETOR COM API"
echo "=============================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

# 1. Fazer pull das mudanças
echo "📋 1. Fazendo pull das mudanças..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Erro ao fazer pull. Verifique sua conexão e permissões."
    exit 1
fi

# 2. Parar containers
echo ""
echo "📋 2. Parando containers..."
docker-compose down

# 3. Rebuild do backend (sem cache para garantir atualização)
echo ""
echo "📋 3. Fazendo rebuild do backend..."
docker-compose build --no-cache backend

if [ $? -ne 0 ]; then
    echo "❌ Erro ao fazer build do backend."
    exit 1
fi

# 4. Rebuild do frontend (sem cache para garantir atualização)
echo ""
echo "📋 4. Fazendo rebuild do frontend..."
docker-compose build --no-cache frontend

if [ $? -ne 0 ]; then
    echo "❌ Erro ao fazer build do frontend."
    exit 1
fi

# 5. Subir containers
echo ""
echo "📋 5. Subindo containers..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Erro ao subir containers."
    exit 1
fi

# 6. Aguardar containers estarem prontos
echo ""
echo "📋 6. Aguardando containers estarem prontos..."
sleep 15

# 7. Verificar status
echo ""
echo "📋 7. Verificando status dos containers..."
docker-compose ps

# 8. Verificar logs do backend
echo ""
echo "📋 8. Últimas linhas dos logs do backend:"
docker-compose logs --tail=30 backend

# 9. Verificar logs do frontend
echo ""
echo "📋 9. Últimas linhas dos logs do frontend:"
docker-compose logs --tail=20 frontend

# 10. Verificar saúde dos containers
echo ""
echo "📋 10. Verificando saúde dos containers..."
sleep 5
docker-compose ps

echo ""
echo "=========================================="
echo "✅ ATUALIZAÇÃO CONCLUÍDA!"
echo ""
echo "📋 O que foi atualizado:"
echo "- Campo 'Setor' no formulário de investimentos agora busca da API"
echo "- Melhor tratamento de loading e erros"
echo "- Exibição do ID do setor junto com o nome"
echo "- Cache de 5 minutos para melhor performance"
echo "- Retry automático em caso de erro"
echo ""
echo "📋 Teste:"
echo "1. Acesse: http://189.90.139.222:3000/investimentos"
echo "2. Clique em 'Novo Investimento'"
echo "3. O campo 'Setor' deve mostrar os setores da API"
echo "4. Cada setor mostra o nome e o ID"
echo ""
echo "📋 Se algo não funcionar:"
echo "- Verifique os logs: docker-compose logs -f backend"
echo "- Verifique os logs: docker-compose logs -f frontend"
echo "- Verifique o status: docker-compose ps"
