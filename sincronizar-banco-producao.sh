#!/bin/bash

echo "🔧 SINCRONIZANDO BANCO DE DADOS COM SCHEMA DO PRISMA"
echo "===================================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "Problema: O banco está faltando tabelas (MelAlert, SectorMel, etc.)"
echo ""

echo "1. Verificando tabelas existentes no banco..."
echo "----------------------------------------------"
sqlite3 prisma/dev.db ".tables" 2>/dev/null
echo ""

echo "2. Parando backend..."
docker-compose stop backend
echo ""

echo "3. Executando prisma db push para criar tabelas faltantes..."
echo "------------------------------------------------------------"
echo "⚠️  Isso vai criar todas as tabelas faltantes conforme o schema."
echo "   Pode demorar alguns minutos..."
echo ""

docker-compose run --rm backend pnpm prisma:db:push 2>&1 | tee /tmp/prisma-sync.log

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Schema sincronizado com sucesso!"
    
    echo ""
    echo "4. Verificando tabelas criadas..."
    echo "----------------------------------"
    TABLES=$(sqlite3 prisma/dev.db ".tables" 2>/dev/null)
    echo "$TABLES"
    echo ""
    
    # Verificar tabelas importantes do MEL
    if echo "$TABLES" | grep -q "MelAlert"; then
        echo "   ✅ Tabela MelAlert criada"
    else
        echo "   ❌ Tabela MelAlert ainda não existe"
    fi
    
    if echo "$TABLES" | grep -q "SectorMel"; then
        echo "   ✅ Tabela SectorMel existe"
    else
        echo "   ❌ Tabela SectorMel não encontrada"
    fi
    
    if echo "$TABLES" | grep -q "User"; then
        echo "   ✅ Tabela User existe"
    fi
    
    if echo "$TABLES" | grep -q "Session"; then
        echo "   ✅ Tabela Session existe"
    fi
    
    if echo "$TABLES" | grep -q "PurchaseRequest"; then
        echo "   ✅ Tabela PurchaseRequest existe"
    fi
else
    echo ""
    echo "❌ Erro ao sincronizar schema"
    echo "   Log completo em: /tmp/prisma-sync.log"
    echo ""
    echo "   Verificando se é problema de permissões..."
    ls -la prisma/dev.db
    exit 1
fi

echo ""

echo "5. Ajustando permissões do banco..."
sudo chown -R 1001:1001 prisma/
sudo chmod 666 prisma/dev.db
sudo chmod 777 prisma/
echo ""

echo "6. Removendo arquivos auxiliares do SQLite..."
sudo rm -f prisma/dev.db-journal prisma/dev.db-wal prisma/dev.db-shm
echo ""

echo "7. Reiniciando backend..."
docker-compose start backend
echo ""

echo "8. Aguardando backend iniciar (30 segundos)..."
sleep 30
echo ""

echo "9. Verificando logs (buscando erros de tabelas faltantes)..."
ERRORS=$(docker-compose logs --tail=50 backend 2>/dev/null | grep -iE "does not exist|table.*not exist" | wc -l)
if [ "$ERRORS" -eq 0 ]; then
    echo "   ✅ Nenhum erro de tabela faltante encontrado!"
else
    echo "   ⚠️  Ainda há $ERRORS erros relacionados a tabelas faltantes"
    echo "   Últimos erros:"
    docker-compose logs --tail=100 backend 2>/dev/null | grep -iE "does not exist|table.*not exist" | tail -3
fi
echo ""

echo "✅ Sincronização concluída!"
echo ""
echo "💡 Agora teste novamente a página MEL."

