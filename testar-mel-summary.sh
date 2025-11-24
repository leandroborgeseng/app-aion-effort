#!/bin/bash

echo "🔍 TESTANDO ENDPOINT DE MEL SUMMARY"
echo "==================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Verificando se o endpoint está acessível..."
echo "-----------------------------------------------"
HEALTH=$(curl -s http://localhost:4000/health)
echo "   Health check: $HEALTH"
echo ""

echo "2. Verificando se a tabela SectorMel existe no banco..."
echo "-------------------------------------------------------"
HAS_TABLE=$(sqlite3 prisma/dev.db ".tables" 2>/dev/null | grep -c "SectorMel" || echo "0")
if [ "$HAS_TABLE" -gt "0" ]; then
    echo "   ✅ Tabela SectorMel existe"
    
    # Contar registros
    COUNT=$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM SectorMel;" 2>/dev/null || echo "0")
    echo "   Total de regras MEL: $COUNT"
else
    echo "   ❌ Tabela SectorMel NÃO existe!"
    echo "   Precisa executar migrations do Prisma"
fi
echo ""

echo "3. Verificando estrutura da tabela SectorMel..."
echo "------------------------------------------------"
sqlite3 prisma/dev.db ".schema SectorMel" 2>/dev/null | head -20 || echo "   Erro ao verificar schema"
echo ""

echo "4. Verificando logs do backend ao acessar /api/ecm/mel/summary..."
echo "-----------------------------------------------------------------"
echo "   (Execute uma requisição manualmente e veja os logs abaixo)"
echo ""

echo "5. Testando endpoint diretamente (sem autenticação primeiro)..."
echo "---------------------------------------------------------------"
# Tentar sem token (deve retornar 401)
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/ecm/mel/summary)
echo "   Status code (sem auth): $RESPONSE"
echo ""

echo "6. Verificando se Prisma consegue ler a tabela SectorMel..."
echo "------------------------------------------------------------"
docker-compose exec backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.sectorMel.findMany({ take: 1 })
  .then(mels => {
    console.log('✅ Prisma consegue ler SectorMel');
    console.log('   Total encontrado:', mels.length);
    prisma.\$disconnect();
  })
  .catch(e => {
    console.error('❌ Erro no Prisma:', e.message);
    console.error('   Código:', e.code);
    prisma.\$disconnect();
    process.exit(1);
  });
" 2>&1
echo ""

echo "✅ Testes concluídos!"
echo ""
echo "💡 Para ver logs em tempo real quando acessar a página MEL:"
echo "   docker-compose logs -f backend | grep -i mel"

