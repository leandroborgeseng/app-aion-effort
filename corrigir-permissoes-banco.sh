#!/bin/bash

# Script para corrigir permissões do banco de dados

echo "🔧 Corrigindo permissões do banco de dados..."
echo ""

cd /opt/apps/app-aion-effort || exit 1

# 1. Garantir que o arquivo existe
if [ ! -f "prisma/dev.db" ]; then
    echo "📄 Criando arquivo dev.db..."
    touch prisma/dev.db
fi

# 2. Corrigir permissões no HOST
echo "🔐 Corrigindo permissões no host..."
chmod 666 prisma/dev.db
chmod 755 prisma

# Verificar permissões
PERMS=$(stat -f%A prisma/dev.db 2>/dev/null || stat -c%a prisma/dev.db 2>/dev/null || echo "???")
echo "   Permissões no host: $PERMS"

# 3. Parar backend temporariamente
echo ""
echo "🛑 Parando backend..."
docker-compose stop backend

# 4. Verificar permissões dentro do container (quando estiver rodando)
echo ""
echo "🐳 Verificando permissões dentro do container..."
docker-compose start backend
sleep 3

# 5. Verificar e corrigir permissões dentro do container
echo ""
echo "🔧 Corrigindo permissões dentro do container..."
docker-compose exec -T backend chmod 666 /app/prisma/dev.db 2>&1 || echo "Erro ao alterar permissões (pode ser normal se já estiver correto)"

# 6. Verificar propriedade do arquivo
echo ""
echo "👤 Verificando propriedade do arquivo..."
docker-compose exec -T backend ls -la /app/prisma/dev.db

# 7. Testar escrita
echo ""
echo "✍️  Testando escrita no banco..."
docker-compose exec -T backend touch /app/prisma/test-write.txt 2>&1 && \
    echo "✅ Escrita funcionou!" && \
    docker-compose exec -T backend rm /app/prisma/test-write.txt || \
    echo "❌ Erro ao escrever"

# 8. Reiniciar backend
echo ""
echo "🔄 Reiniciando backend..."
docker-compose restart backend

echo ""
echo "=========================================="
echo "✅ Correção concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Verifique os logs: docker-compose logs -f backend"
echo "2. Teste o login novamente"

