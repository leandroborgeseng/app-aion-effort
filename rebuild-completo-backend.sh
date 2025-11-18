#!/bin/bash

# Script para fazer rebuild completo do backend e garantir acesso ao banco

echo "🔧 REBUILD COMPLETO DO BACKEND"
echo "=============================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

# 1. Fazer pull das mudanças
echo "📋 1. Fazendo pull das mudanças..."
git pull origin main

# 2. Garantir que o banco existe e tem permissões corretas
echo ""
echo "📋 2. Preparando banco de dados..."
mkdir -p prisma
if [ ! -f "prisma/dev.db" ]; then
    echo "   Criando arquivo vazio..."
    touch prisma/dev.db
fi
chmod 666 prisma/dev.db
chmod 755 prisma
echo "   ✅ Permissões configuradas"

# 3. Parar containers
echo ""
echo "📋 3. Parando containers..."
docker-compose down

# 4. Remover imagem antiga do backend
echo ""
echo "📋 4. Removendo imagem antiga do backend..."
docker rmi app-aion-effort_backend:latest 2>/dev/null || echo "   Imagem não encontrada (ok)"

# 5. Rebuild completo do backend
echo ""
echo "📋 5. Fazendo rebuild completo do backend..."
docker-compose build --no-cache backend

# 6. Subir containers
echo ""
echo "📋 6. Subindo containers..."
docker-compose up -d

# 7. Aguardar backend estar pronto
echo ""
echo "📋 7. Aguardando backend estar pronto..."
sleep 10

# 8. Verificar se o arquivo está acessível dentro do container
echo ""
echo "📋 8. Verificando acesso ao banco dentro do container..."
docker-compose exec -T backend ls -la /app/prisma/dev.db 2>&1

# 9. Verificar DATABASE_URL
echo ""
echo "📋 9. Verificando DATABASE_URL..."
docker-compose exec -T backend printenv DATABASE_URL

# 10. Criar schema se necessário
echo ""
echo "📋 10. Criando schema do banco de dados..."
docker-compose exec -T backend pnpm prisma db push 2>&1

# 11. Verificar logs
echo ""
echo "📋 11. Últimas linhas dos logs do backend:"
docker-compose logs --tail=20 backend

echo ""
echo "=========================================="
echo "✅ REBUILD CONCLUÍDO!"
echo ""
echo "📋 Próximos passos:"
echo "1. Verifique os logs completos: docker-compose logs -f backend"
echo "2. Se o erro persistir, execute: ./diagnostico-banco-completo.sh"
echo "3. Teste o login: curl -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@aion.com\",\"password\":\"admin123\"}'"

