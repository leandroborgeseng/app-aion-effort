#!/bin/bash

# Script para corrigir problema de banco somente leitura

echo "🔧 CORRIGINDO BANCO SOMENTE LEITURA"
echo "===================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

# 1. Parar backend
echo "📋 1. Parando backend..."
docker-compose stop backend

# 2. Verificar e corrigir permissões no HOST
echo ""
echo "📋 2. Corrigindo permissões no HOST..."
mkdir -p prisma

if [ ! -f "prisma/dev.db" ]; then
    echo "   Criando arquivo dev.db..."
    touch prisma/dev.db
fi

# Corrigir permissões
chmod 666 prisma/dev.db
chmod 777 prisma  # Dar permissão total ao diretório também

# Verificar propriedade
OWNER=$(stat -f%Su prisma/dev.db 2>/dev/null || stat -c%U prisma/dev.db 2>/dev/null || echo "unknown")
echo "   Proprietário: $OWNER"
echo "   Permissões: $(stat -f%A prisma/dev.db 2>/dev/null || stat -c%a prisma/dev.db 2>/dev/null)"

# 3. Remover container para forçar recriação do volume
echo ""
echo "📋 3. Removendo container para recriar volume..."
docker-compose rm -f backend

# 4. Criar arquivo dentro do container antes de iniciar
echo ""
echo "📋 4. Criando arquivo dentro do container..."
docker-compose run --rm --no-deps -u root backend sh -c "
    mkdir -p /app/prisma && \
    touch /app/prisma/dev.db && \
    chmod 666 /app/prisma/dev.db && \
    chmod 777 /app/prisma && \
    chown -R nodejs:nodejs /app/prisma
" 2>&1 || echo "Erro ao criar arquivo (pode ser normal)"

# 5. Iniciar backend
echo ""
echo "📋 5. Iniciando backend..."
docker-compose up -d backend

# 6. Aguardar backend estar pronto
echo ""
echo "📋 6. Aguardando backend estar pronto..."
sleep 5

# 7. Verificar permissões dentro do container
echo ""
echo "📋 7. Verificando permissões dentro do container..."
docker-compose exec -T backend ls -la /app/prisma/dev.db 2>&1

# 8. Tentar corrigir permissões dentro do container como root
echo ""
echo "📋 8. Corrigindo permissões dentro do container..."
docker-compose exec -T --user root backend chmod 666 /app/prisma/dev.db 2>&1
docker-compose exec -T --user root backend chmod 777 /app/prisma 2>&1
docker-compose exec -T --user root backend chown nodejs:nodejs /app/prisma/dev.db 2>&1

# 9. Verificar propriedade final
echo ""
echo "📋 9. Verificando propriedade final..."
docker-compose exec -T backend ls -la /app/prisma/dev.db

# 10. Testar escrita
echo ""
echo "📋 10. Testando escrita..."
docker-compose exec -T backend touch /app/prisma/test-write.txt 2>&1 && \
    echo "✅ Escrita funcionou!" && \
    docker-compose exec -T backend rm /app/prisma/test-write.txt || \
    echo "❌ Erro ao escrever"

# 11. Reiniciar backend
echo ""
echo "📋 11. Reiniciando backend..."
docker-compose restart backend

echo ""
echo "=========================================="
echo "✅ Correção concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Verifique os logs: docker-compose logs -f backend"
echo "2. Teste o login: curl -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@aion.com\",\"password\":\"admin123\"}'"

