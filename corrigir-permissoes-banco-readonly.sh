#!/bin/bash

echo "🔧 CORRIGINDO PERMISSÕES DO BANCO DE DADOS"
echo "=========================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

# Verificar se o banco existe
if [ ! -f "prisma/dev.db" ]; then
    echo "❌ Erro: Banco de dados não encontrado em prisma/dev.db"
    exit 1
fi

echo "1. Verificando permissões atuais:"
echo "---------------------------------"
ls -la prisma/dev.db
echo ""

echo "2. Ajustando permissões do banco:"
echo "---------------------------------"
# Dar permissão de leitura e escrita para o proprietário e grupo
chmod 664 prisma/dev.db

# Se estiver usando Docker, garantir que o diretório também tem permissões corretas
chmod 755 prisma/

# Verificar se precisa ajustar ownership (se o usuário do container for diferente)
# Obter o usuário do container backend
CONTAINER_USER=$(docker-compose exec -T backend id -u 2>/dev/null | tr -d '\r' || echo "")
CONTAINER_GROUP=$(docker-compose exec -T backend id -g 2>/dev/null | tr -d '\r' || echo "")

if [ -n "$CONTAINER_USER" ] && [ -n "$CONTAINER_GROUP" ]; then
    echo "   Usuário do container: $CONTAINER_USER:$CONTAINER_GROUP"
    echo "   Ajustando ownership para container..."
    chown $CONTAINER_USER:$CONTAINER_GROUP prisma/dev.db 2>/dev/null || \
    sudo chown $CONTAINER_USER:$CONTAINER_GROUP prisma/dev.db 2>/dev/null || \
    echo "   ⚠️  Não foi possível alterar ownership (pode precisar de sudo)"
else
    echo "   ⚠️  Não foi possível detectar usuário do container"
fi

echo ""

echo "3. Verificando permissões após ajuste:"
echo "--------------------------------------"
ls -la prisma/dev.db
echo ""

echo "4. Verificando se o banco está acessível dentro do container:"
echo "-------------------------------------------------------------"
docker-compose exec -T backend sqlite3 prisma/dev.db "PRAGMA integrity_check;" 2>&1 | head -5
echo ""

echo "5. Testando escrita no banco (criar tabela temporária):"
echo "--------------------------------------------------------"
docker-compose exec -T backend sqlite3 prisma/dev.db "CREATE TABLE IF NOT EXISTS _test_write (id INTEGER); DROP TABLE IF EXISTS _test_write;" 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Banco está acessível para escrita"
else
    echo "   ❌ Ainda há problemas de escrita"
    echo ""
    echo "   Tentando com permissões mais amplas..."
    chmod 666 prisma/dev.db
    echo "   Permissões ajustadas para 666 (leitura/escrita para todos)"
fi
echo ""

echo "6. Reiniciando backend para aplicar mudanças:"
echo "---------------------------------------------"
docker-compose restart backend
echo ""

echo "7. Aguardando backend iniciar (15 segundos)..."
sleep 15
echo ""

echo "8. Verificando se backend iniciou corretamente:"
echo "-----------------------------------------------"
docker-compose ps backend
echo ""

echo "9. Testando health check:"
echo "-------------------------"
HEALTH=$(curl -s http://localhost:4000/health 2>/dev/null)
if [ -n "$HEALTH" ]; then
    echo "   ✅ Health check OK: $HEALTH"
else
    echo "   ⚠️  Health check não respondeu"
fi
echo ""

echo "✅ Correção concluída!"
echo ""
echo "💡 Agora tente fazer login novamente."
echo ""
echo "📋 Se ainda houver problemas, verifique:"
echo "   1. Permissões do diretório prisma/: ls -ld prisma/"
echo "   2. Permissões do arquivo: ls -l prisma/dev.db"
echo "   3. Logs do backend: docker-compose logs --tail=50 backend"
echo "   4. Ownership do arquivo pode precisar ser do usuário do container"

