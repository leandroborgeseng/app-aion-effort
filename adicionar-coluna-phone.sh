#!/bin/bash

echo "🔧 ADICIONANDO COLUNA 'phone' AO BANCO"
echo "======================================"
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "Problema: A coluna 'phone' não existe na tabela User no banco de produção"
echo ""

echo "1. Verificando se a coluna já existe..."
echo "----------------------------------------"
HAS_PHONE=$(sqlite3 prisma/dev.db "PRAGMA table_info(User);" 2>/dev/null | grep -c "phone" || echo "0")
if [ "$HAS_PHONE" -gt "0" ]; then
    echo "   ✅ Coluna phone já existe!"
    echo ""
    echo "2. Verificando schema atual:"
    sqlite3 prisma/dev.db "PRAGMA table_info(User);" 2>/dev/null | grep -E "phone|email|name" || echo "   Erro ao verificar"
    exit 0
fi
echo ""

echo "2. Parando backend..."
docker-compose stop backend
echo ""

echo "3. Adicionando coluna phone à tabela User..."
echo "--------------------------------------------"
sqlite3 prisma/dev.db "ALTER TABLE User ADD COLUMN phone TEXT;" 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Coluna phone adicionada com sucesso!"
else
    echo "   ❌ Erro ao adicionar coluna"
    exit 1
fi
echo ""

echo "4. Verificando se a coluna foi adicionada..."
echo "--------------------------------------------"
sqlite3 prisma/dev.db "PRAGMA table_info(User);" 2>/dev/null | grep "phone"
if [ $? -eq 0 ]; then
    echo "   ✅ Coluna phone confirmada no banco!"
else
    echo "   ❌ Coluna não encontrada após adição"
    exit 1
fi
echo ""

echo "5. Reiniciando backend..."
docker-compose start backend
echo ""

echo "6. Aguardando backend iniciar (30 segundos)..."
sleep 30
echo ""

echo "7. Verificando logs (buscando erro de phone)..."
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

