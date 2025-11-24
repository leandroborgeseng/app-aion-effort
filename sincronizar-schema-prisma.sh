#!/bin/bash

echo "🔧 SINCRONIZANDO SCHEMA DO PRISMA COM O BANCO"
echo "============================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "Este script vai atualizar o banco de dados para corresponder ao schema do Prisma."
echo "Isso criará tabelas faltantes e adicionará colunas que estão no schema mas não no banco."
echo ""

read -p "Continuar? (s/N): " confirm
if [[ ! $confirm =~ ^[Ss]$ ]]; then
    echo "Cancelado."
    exit 0
fi

echo ""

echo "1. Parando backend..."
docker-compose stop backend
echo ""

echo "2. Executando prisma db push para sincronizar schema..."
echo "--------------------------------------------------------"
echo "⚠️  Isso pode demorar alguns minutos..."
docker-compose run --rm backend pnpm prisma:db:push 2>&1 | tee /tmp/prisma-db-push.log

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Schema sincronizado com sucesso!"
    
    # Verificar se criou tabelas importantes
    echo ""
    echo "3. Verificando tabelas criadas..."
    echo "----------------------------------"
    TABLES=$(sqlite3 prisma/dev.db ".tables" 2>/dev/null)
    
    if echo "$TABLES" | grep -q "SectorMel"; then
        echo "   ✅ Tabela SectorMel existe"
    else
        echo "   ⚠️  Tabela SectorMel não encontrada"
    fi
    
    if echo "$TABLES" | grep -q "User"; then
        echo "   ✅ Tabela User existe"
        
        # Verificar coluna phone
        HAS_PHONE=$(sqlite3 prisma/dev.db "PRAGMA table_info(User);" 2>/dev/null | grep -c "phone" || echo "0")
        if [ "$HAS_PHONE" -gt "0" ]; then
            echo "   ✅ Coluna phone existe na tabela User"
        else
            echo "   ⚠️  Coluna phone ainda não existe"
        fi
    fi
else
    echo ""
    echo "❌ Erro ao sincronizar schema"
    echo "   Verifique os logs acima"
    echo "   Log completo salvo em: /tmp/prisma-db-push.log"
    exit 1
fi

echo ""

echo "4. Ajustando permissões do banco..."
sudo chown -R 1001:1001 prisma/
sudo chmod 666 prisma/dev.db
sudo chmod 777 prisma/
echo ""

echo "5. Reiniciando backend..."
docker-compose start backend
echo ""

echo "6. Aguardando backend iniciar (30 segundos)..."
sleep 30
echo ""

echo "✅ Sincronização concluída!"
echo ""
echo "💡 Agora teste novamente a página MEL."

