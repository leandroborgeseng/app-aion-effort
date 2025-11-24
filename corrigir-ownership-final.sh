#!/bin/bash

echo "🔧 CORRIGINDO OWNERSHIP DO BANCO"
echo "================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "Problema identificado:"
echo "  - Arquivo pertence a: root:root"
echo "  - Container roda como: 1001:1001 (nodejs)"
echo "  - Por isso não consegue escrever"
echo ""

echo "1. Parando backend..."
docker-compose stop backend
echo ""

echo "2. Corrigindo ownership para 1001:1001 (nodejs)..."
sudo chown -R 1001:1001 prisma/
echo ""

echo "3. Ajustando permissões..."
sudo chmod 755 prisma/
sudo chmod 666 prisma/dev.db
echo ""

echo "4. Verificando permissões após correção:"
ls -la prisma/dev.db
ls -ld prisma/
echo ""

echo "5. Testando escrita dentro do container..."
docker-compose run --rm backend touch /app/prisma/.test_write 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Teste de escrita bem-sucedido!"
    docker-compose run --rm backend rm /app/prisma/.test_write 2>/dev/null
else
    echo "   ❌ Ainda há problema de permissão"
    echo "   Verificando novamente..."
    ls -la prisma/ | head -5
fi
echo ""

echo "6. Reiniciando backend..."
docker-compose start backend
echo ""

echo "7. Aguardando backend iniciar (20 segundos)..."
sleep 20
echo ""

echo "8. Verificando logs (últimas 30 linhas)..."
docker-compose logs --tail=30 backend | grep -iE "error|erro|readonly" | tail -10 || echo "   ✅ Nenhum erro de readonly nos logs recentes"
echo ""

echo "✅ Correção concluída!"
echo ""
echo "💡 Teste o login agora. O erro de readonly deve estar resolvido."

