#!/bin/bash

# Script completo de diagnóstico do banco de dados

echo "🔍 DIAGNÓSTICO COMPLETO DO BANCO DE DADOS"
echo "=========================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

# 1. Verificar no HOST
echo "📋 1. VERIFICAÇÃO NO HOST:"
echo "---------------------------"
echo "Diretório atual: $(pwd)"
echo ""

if [ -d "prisma" ]; then
    echo "✅ Diretório prisma existe"
    ls -la prisma/ | head -10
else
    echo "❌ Diretório prisma NÃO existe"
    mkdir -p prisma
    echo "📁 Diretório prisma criado"
fi

echo ""
if [ -f "prisma/dev.db" ]; then
    echo "✅ Arquivo prisma/dev.db existe"
    SIZE=$(stat -f%z prisma/dev.db 2>/dev/null || stat -c%s prisma/dev.db 2>/dev/null || echo "0")
    PERMS=$(stat -f%A prisma/dev.db 2>/dev/null || stat -c%a prisma/dev.db 2>/dev/null || echo "???")
    echo "   Tamanho: $SIZE bytes"
    echo "   Permissões: $PERMS"
else
    echo "❌ Arquivo prisma/dev.db NÃO existe"
    touch prisma/dev.db
    chmod 666 prisma/dev.db
    echo "📄 Arquivo criado com permissões 666"
fi

chmod 755 prisma
chmod 666 prisma/dev.db 2>/dev/null || true

echo ""
echo "📋 2. VERIFICAÇÃO DENTRO DO CONTAINER:"
echo "---------------------------------------"

# Verificar se o container está rodando
if ! docker-compose ps backend | grep -q "Up"; then
    echo "❌ Container backend não está rodando!"
    exit 1
fi

echo "✅ Container backend está rodando"
echo ""

# Verificar diretório prisma no container
echo "Verificando /app/prisma no container:"
docker-compose exec -T backend ls -la /app/prisma/ 2>&1 || echo "Erro ao listar diretório"

echo ""
echo "Verificando arquivo dev.db no container:"
docker-compose exec -T backend ls -la /app/prisma/dev.db 2>&1 || echo "Arquivo não encontrado"

echo ""
echo "Verificando permissões do arquivo:"
docker-compose exec -T backend stat /app/prisma/dev.db 2>&1 || echo "Erro ao verificar estatísticas"

echo ""
echo "📋 3. VERIFICAÇÃO DE VARIÁVEIS DE AMBIENTE:"
echo "-------------------------------------------"
echo "DATABASE_URL no container:"
docker-compose exec -T backend printenv DATABASE_URL || echo "DATABASE_URL não definida"

echo ""
echo "📋 4. TESTE DE ESCRITA NO CONTAINER:"
echo "-------------------------------------"
echo "Tentando criar arquivo de teste..."
docker-compose exec -T backend touch /app/prisma/test-write.txt 2>&1 && \
    echo "✅ Escrita funcionou!" && \
    docker-compose exec -T backend rm /app/prisma/test-write.txt || \
    echo "❌ Erro ao escrever no diretório"

echo ""
echo "📋 5. VERIFICAÇÃO DO PRISMA:"
echo "----------------------------"
echo "Tentando executar prisma db push..."
docker-compose exec -T backend pnpm prisma db push 2>&1 | head -20

echo ""
echo "📋 6. VERIFICAÇÃO DO VOLUME:"
echo "----------------------------"
echo "Verificando montagem do volume:"
docker inspect aion-effort-backend | grep -A 10 "Mounts" | head -15

echo ""
echo "=========================================="
echo "✅ DIAGNÓSTICO CONCLUÍDO"
echo ""
echo "💡 Se o arquivo não existe no container, execute:"
echo "   docker-compose exec backend pnpm prisma db push"
echo ""
echo "💡 Se as permissões estão erradas, execute:"
echo "   chmod 666 prisma/dev.db"
echo "   docker-compose restart backend"

