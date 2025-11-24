#!/bin/bash

echo "🔧 CORREÇÃO SIMPLES - BANCO READONLY"
echo "===================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Parando backend..."
docker-compose stop backend
echo ""

echo "2. Removendo arquivos auxiliares do SQLite (journal, wal, shm)..."
sudo rm -f prisma/dev.db-journal prisma/dev.db-wal prisma/dev.db-shm
echo "   ✅ Arquivos auxiliares removidos"
echo ""

echo "3. Verificando se sqlite3 está disponível no host..."
if command -v sqlite3 &> /dev/null; then
    echo "   ✅ sqlite3 encontrado no host"
    
    echo "4. Ajustando modo do banco (fora do container)..."
    sqlite3 prisma/dev.db "PRAGMA journal_mode=DELETE;" 2>&1
    echo ""
    
    echo "5. Verificando permissões do arquivo..."
    sqlite3 prisma/dev.db "PRAGMA integrity_check;" 2>&1 | head -1
    echo ""
else
    echo "   ⚠️  sqlite3 não encontrado no host"
    echo "   Pulando ajuste de modo do banco"
fi

echo "6. Ajustando ownership e permissões..."
sudo chown -R 1001:1001 prisma/
sudo chmod 777 prisma/
sudo chmod 666 prisma/dev.db
echo ""

echo "7. Verificando permissões finais:"
ls -la prisma/dev.db
ls -ld prisma/
echo ""

echo "8. Reiniciando backend..."
docker-compose start backend
echo ""

echo "9. Aguardando backend iniciar (30 segundos)..."
sleep 30
echo ""

echo "10. Verificando logs (buscando erros de readonly)..."
ERRORS=$(docker-compose logs --tail=50 backend 2>/dev/null | grep -i "readonly" | wc -l)
if [ "$ERRORS" -eq 0 ]; then
    echo "   ✅ Nenhum erro de readonly encontrado nos logs recentes!"
else
    echo "   ⚠️  Ainda há $ERRORS erros de readonly nos logs"
    echo "   Últimos erros:"
    docker-compose logs --tail=100 backend 2>/dev/null | grep -i "readonly" | tail -3
fi
echo ""

echo "11. Testando health check..."
HEALTH=$(curl -s http://localhost:4000/health 2>/dev/null)
if [ -n "$HEALTH" ]; then
    echo "   ✅ Backend está respondendo: $HEALTH"
else
    echo "   ⚠️  Backend não respondeu ao health check"
fi
echo ""

echo "✅ Correção concluída!"
echo ""
echo "💡 Agora teste o login:"
echo "   curl -X POST http://localhost:4000/api/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"admin@aion.com\",\"password\":\"admin123\"}'"

