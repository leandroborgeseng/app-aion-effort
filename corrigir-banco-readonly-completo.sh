#!/bin/bash

echo "🔧 CORREÇÃO COMPLETA - BANCO READONLY"
echo "======================================"
echo ""

cd /opt/apps/app-aion-effort || exit 1

# Verificar se o banco existe
if [ ! -f "prisma/dev.db" ]; then
    echo "❌ Erro: Banco de dados não encontrado em prisma/dev.db"
    exit 1
fi

echo "1. Verificando situação atual:"
echo "------------------------------"
echo "Permissões do arquivo:"
ls -la prisma/dev.db
echo ""
echo "Permissões do diretório:"
ls -ld prisma/
echo ""

echo "2. Obtendo informações do container:"
echo "-------------------------------------"
CONTAINER_USER=$(docker-compose exec -T backend id -u 2>/dev/null | tr -d '\r\n' || echo "")
CONTAINER_GROUP=$(docker-compose exec -T backend id -g 2>/dev/null | tr -d '\r\n' || echo "")
CONTAINER_USERNAME=$(docker-compose exec -T backend whoami 2>/dev/null | tr -d '\r\n' || echo "")

if [ -n "$CONTAINER_USER" ]; then
    echo "   UID do container: $CONTAINER_USER"
    echo "   GID do container: $CONTAINER_GROUP"
    echo "   Username: $CONTAINER_USERNAME"
else
    echo "   ⚠️  Não foi possível obter informações do container"
    CONTAINER_USER=""
    CONTAINER_GROUP=""
fi
echo ""

echo "3. Ajustando permissões do diretório:"
echo "--------------------------------------"
# Garantir que o diretório é acessível
chmod 755 prisma/ 2>/dev/null || sudo chmod 755 prisma/
echo "   ✅ Diretório prisma/ ajustado para 755"
echo ""

echo "4. Ajustando permissões do banco:"
echo "----------------------------------"
# Tentar com chmod normal primeiro
chmod 666 prisma/dev.db 2>/dev/null || {
    echo "   Tentando com sudo..."
    sudo chmod 666 prisma/dev.db
}
echo "   ✅ Permissões do arquivo ajustadas para 666"
echo ""

echo "5. Ajustando ownership (se necessário):"
echo "---------------------------------------"
if [ -n "$CONTAINER_USER" ] && [ -n "$CONTAINER_GROUP" ]; then
    echo "   Ajustando ownership para $CONTAINER_USER:$CONTAINER_GROUP..."
    chown $CONTAINER_USER:$CONTAINER_GROUP prisma/dev.db 2>/dev/null || \
    sudo chown $CONTAINER_USER:$CONTAINER_GROUP prisma/dev.db 2>/dev/null || \
    echo "   ⚠️  Não foi possível alterar ownership"
    
    chown $CONTAINER_USER:$CONTAINER_GROUP prisma/ 2>/dev/null || \
    sudo chown $CONTAINER_USER:$CONTAINER_GROUP prisma/ 2>/dev/null || \
    echo "   ⚠️  Não foi possível alterar ownership do diretório"
else
    echo "   ⚠️  Pulando ajuste de ownership (não foi possível obter UID/GID)"
fi
echo ""

echo "6. Verificando permissões após ajuste:"
echo "--------------------------------------"
ls -la prisma/dev.db
ls -ld prisma/
echo ""

echo "7. Testando escrita dentro do container:"
echo "----------------------------------------"
TEST_RESULT=$(docker-compose exec -T backend sqlite3 prisma/dev.db "CREATE TABLE IF NOT EXISTS _test_write_$(date +%s) (id INTEGER); SELECT 1;" 2>&1)
if [ $? -eq 0 ]; then
    echo "   ✅ Teste de escrita bem-sucedido"
    # Limpar tabela de teste
    docker-compose exec -T backend sqlite3 prisma/dev.db "DROP TABLE IF EXISTS _test_write_*;" 2>/dev/null
else
    echo "   ❌ Erro no teste de escrita:"
    echo "   $TEST_RESULT"
    echo ""
    echo "   Tentando solução alternativa..."
    echo ""
    echo "8. Solução alternativa - Verificar mount do volume:"
    echo "---------------------------------------------------"
    echo "   Verificando se o volume está montado corretamente..."
    docker-compose exec -T backend ls -la /app/prisma/dev.db 2>&1 | head -2
    echo ""
    echo "   Se o arquivo não existir no caminho esperado, pode ser problema de montagem do volume."
    echo ""
    echo "9. Verificando configuração do docker-compose.yml:"
    echo "---------------------------------------------------"
    grep -A 3 "prisma" docker-compose.yml | head -5
fi
echo ""

echo "10. Verificando se o diretório é acessível para escrita:"
echo "--------------------------------------------------------"
WRITE_TEST=$(docker-compose exec -T backend touch /app/prisma/.write_test 2>&1)
if [ $? -eq 0 ]; then
    echo "   ✅ Diretório é acessível para escrita"
    docker-compose exec -T backend rm -f /app/prisma/.write_test 2>/dev/null
else
    echo "   ❌ Diretório NÃO é acessível para escrita:"
    echo "   $WRITE_TEST"
    echo ""
    echo "   🔧 Tentando corrigir ownership do diretório inteiro..."
    if [ -n "$CONTAINER_USER" ]; then
        sudo chown -R $CONTAINER_USER:$CONTAINER_GROUP prisma/ 2>/dev/null || \
        echo "   ⚠️  Não foi possível alterar ownership recursivo"
    fi
fi
echo ""

echo "11. Reiniciando backend:"
echo "------------------------"
docker-compose restart backend
echo ""

echo "12. Aguardando backend iniciar (20 segundos)..."
sleep 20
echo ""

echo "13. Verificando logs (últimas 30 linhas):"
echo "-----------------------------------------"
docker-compose logs --tail=30 backend | grep -iE "error|erro|readonly|prisma" | tail -10 || echo "   Nenhum erro encontrado nos logs recentes"
echo ""

echo "14. Testando acesso ao banco após reinício:"
echo "--------------------------------------------"
DB_TEST=$(docker-compose exec -T backend sqlite3 prisma/dev.db "SELECT COUNT(*) FROM User;" 2>&1)
if [ $? -eq 0 ]; then
    echo "   ✅ Banco acessível para leitura: $DB_TEST usuários encontrados"
else
    echo "   ❌ Erro ao acessar banco:"
    echo "   $DB_TEST"
fi
echo ""

echo "✅ Correção concluída!"
echo ""
echo "💡 Se o problema persistir:"
echo "   1. Verifique se o filesystem onde está o prisma/ não é readonly"
echo "   2. Verifique se o volume está montado corretamente no docker-compose.yml"
echo "   3. Considere mover o banco para outro local com permissões corretas"
echo ""
echo "📋 Teste o login novamente agora."

