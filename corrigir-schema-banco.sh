#!/bin/bash

echo "🔧 CORRIGINDO SCHEMA DO BANCO DE DADOS"
echo "======================================"
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "Problema identificado:"
echo "  - O banco de dados está desatualizado"
echo "  - Falta a coluna 'phone' na tabela User"
echo ""

echo "1. Verificando colunas atuais da tabela User..."
echo "------------------------------------------------"
sqlite3 prisma/dev.db ".schema User" 2>/dev/null | head -20
echo ""

echo "2. Parando backend..."
docker-compose stop backend
echo ""

echo "3. Executando prisma db push para atualizar o schema..."
echo "--------------------------------------------------------"
docker-compose run --rm backend pnpm prisma:db:push 2>&1 | tail -30
echo ""

if [ $? -eq 0 ]; then
    echo "✅ Schema atualizado com sucesso!"
else
    echo "⚠️  Erro ao atualizar schema. Tentando alternativa..."
    echo ""
    echo "4. Alternativa: Adicionar coluna manualmente via SQL..."
    echo "-------------------------------------------------------"
    
    # Verificar se a coluna phone já existe
    HAS_PHONE=$(sqlite3 prisma/dev.db "PRAGMA table_info(User);" 2>/dev/null | grep -c "phone" || echo "0")
    
    if [ "$HAS_PHONE" -eq "0" ]; then
        echo "   Adicionando coluna phone..."
        sqlite3 prisma/dev.db "ALTER TABLE User ADD COLUMN phone TEXT;" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "   ✅ Coluna phone adicionada!"
        else
            echo "   ❌ Erro ao adicionar coluna"
        fi
    else
        echo "   ✅ Coluna phone já existe"
    fi
fi

echo ""

echo "5. Verificando schema atualizado..."
echo "-----------------------------------"
sqlite3 prisma/dev.db "PRAGMA table_info(User);" 2>/dev/null | grep -E "phone|email|name" || echo "   Tabela User não encontrada"
echo ""

echo "6. Reiniciando backend..."
docker-compose start backend
echo ""

echo "7. Aguardando backend iniciar (30 segundos)..."
sleep 30
echo ""

echo "8. Verificando logs (buscando erro de phone)..."
ERRORS=$(docker-compose logs --tail=50 backend 2>/dev/null | grep -i "phone.*does not exist" | wc -l)
if [ "$ERRORS" -eq 0 ]; then
    echo "   ✅ Nenhum erro de coluna phone encontrado!"
else
    echo "   ⚠️  Ainda há $ERRORS erros relacionados à coluna phone"
fi
echo ""

echo "✅ Correção concluída!"
echo ""
echo "💡 Agora teste o login:"
echo "   curl -X POST http://localhost:4000/api/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"admin@aion.com\",\"password\":\"admin123\"}'"

