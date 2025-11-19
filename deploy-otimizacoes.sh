#!/bin/bash

# Script para atualizar produção com otimizações preventivas

echo "🚀 ATUALIZANDO PRODUÇÃO - OTIMIZAÇÕES PREVENTIVAS"
echo "=================================================="
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
docker-compose logs --tail=50 backend

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
echo "📋 O que foi implementado:"
echo "- Sistema centralizado de tratamento de erros"
echo "- Logger estruturado (JSON em produção)"
echo "- Validação de entrada tipada"
echo "- Retry automático em erros de conexão Prisma"
echo "- Formatação inteligente de erros do banco"
echo "- Middleware global de tratamento de erros"
echo ""
echo "📋 Benefícios:"
echo "- Menos erros em runtime (validação preventiva)"
echo "- Logs estruturados facilitam debugging"
echo "- Resiliência a erros temporários (retry)"
echo "- Mensagens de erro mais claras para usuários"
echo "- Código mais manutenível e padronizado"
echo ""
echo "📋 Próximos passos (opcional):"
echo "1. Aplicar melhorias gradualmente nas rotas existentes"
echo "2. Substituir console.log por logger estruturado"
echo "3. Adicionar validação nas rotas que recebem dados"
echo "4. Ver arquivo OTIMIZACOES.md para exemplos"
echo ""
echo "📋 Monitoramento:"
echo "- Verifique os logs: docker-compose logs -f backend"
echo "- Os logs agora são estruturados em JSON em produção"
echo "- Erros são automaticamente formatados e logados"

