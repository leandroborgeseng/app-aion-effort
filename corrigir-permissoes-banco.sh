#!/bin/bash

# Script para corrigir permissões do banco de dados (readonly database)

set -e

echo "🔧 CORRIGINDO PERMISSÕES DO BANCO DE DADOS"
echo "=========================================="
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar se estamos no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Erro: docker-compose.yml não encontrado!${NC}"
    exit 1
fi

# 1. Parar containers
echo -e "${YELLOW}🛑 1. Parando containers...${NC}"
docker-compose stop backend || true
echo -e "${GREEN}✅ Containers parados${NC}"
echo ""

# 2. Verificar se banco existe
echo -e "${YELLOW}🗄️  2. Verificando banco de dados...${NC}"
if [ -f "prisma/dev.db" ]; then
    echo -e "${GREEN}✅ Banco encontrado${NC}"
    ls -lh prisma/dev.db
else
    echo -e "${YELLOW}⚠️  Banco não encontrado, será criado${NC}"
fi
echo ""

# 3. Corrigir permissões do diretório prisma
echo -e "${YELLOW}🔐 3. Corrigindo permissões do diretório prisma...${NC}"
chmod 777 prisma 2>/dev/null || {
    echo -e "${RED}❌ Erro ao ajustar permissões do diretório${NC}"
    echo "Tentando com sudo..."
    sudo chmod 777 prisma || {
        echo -e "${RED}❌ Erro mesmo com sudo${NC}"
        exit 1
    }
}
echo -e "${GREEN}✅ Permissões do diretório ajustadas${NC}"
echo ""

# 4. Corrigir permissões do banco
echo -e "${YELLOW}🔐 4. Corrigindo permissões do banco de dados...${NC}"
if [ -f "prisma/dev.db" ]; then
    chmod 666 prisma/dev.db 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Tentando com sudo...${NC}"
        sudo chmod 666 prisma/dev.db || {
            echo -e "${RED}❌ Erro ao ajustar permissões do banco${NC}"
            exit 1
        }
    }
    echo -e "${GREEN}✅ Permissões do banco ajustadas${NC}"
    ls -lh prisma/dev.db
else
    echo -e "${YELLOW}⚠️  Banco não existe ainda, será criado${NC}"
fi
echo ""

# 5. Verificar propriedade do arquivo
echo -e "${YELLOW}👤 5. Verificando propriedade do arquivo...${NC}"
WHOAMI=$(whoami)
echo "Usuário atual: $WHOAMI"
ls -l prisma/dev.db 2>/dev/null || echo "Banco ainda não existe"
echo ""

# 6. Ajustar propriedade se necessário (opcional)
if [ -f "prisma/dev.db" ]; then
    echo -e "${YELLOW}🔧 6. Ajustando propriedade do arquivo...${NC}"
    # Tentar ajustar propriedade para o usuário atual
    sudo chown $WHOAMI:$WHOAMI prisma/dev.db 2>/dev/null || echo "Não foi possível ajustar propriedade (ok)"
    sudo chown -R $WHOAMI:$WHOAMI prisma/ 2>/dev/null || echo "Não foi possível ajustar propriedade do diretório (ok)"
    echo -e "${GREEN}✅ Propriedade ajustada${NC}"
    echo ""
fi

# 7. Verificar permissões dentro do container
echo -e "${YELLOW}🐳 7. Verificando permissões dentro do container...${NC}"
docker-compose start backend || docker-compose up -d backend
sleep 5

# Verificar se consegue escrever no banco
docker-compose exec -T backend ls -la /app/prisma/dev.db 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Banco não encontrado no container, será criado${NC}"
}

# Verificar usuário do container
CONTAINER_USER=$(docker-compose exec -T backend whoami 2>/dev/null || echo "nodejs")
echo "Usuário do container: $CONTAINER_USER"
echo ""

# 8. Ajustar permissões para o usuário do container
echo -e "${YELLOW}🔧 8. Ajustando permissões para o usuário do container...${NC}"
if [ -f "prisma/dev.db" ]; then
    # Tentar ajustar para que qualquer usuário possa escrever
    sudo chmod 666 prisma/dev.db || chmod 666 prisma/dev.db
    sudo chmod 777 prisma || chmod 777 prisma
    echo -e "${GREEN}✅ Permissões ajustadas para escrita${NC}"
fi
echo ""

# 9. Reiniciar backend
echo -e "${YELLOW}🔄 9. Reiniciando backend...${NC}"
docker-compose restart backend || docker-compose up -d backend
sleep 10
echo -e "${GREEN}✅ Backend reiniciado${NC}"
echo ""

# 10. Verificar se consegue escrever agora
echo -e "${YELLOW}🧪 10. Testando escrita no banco...${NC}"
sleep 5
if docker-compose exec -T backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT 1\`.then(() => {
  console.log('✅ Leitura OK');
  return prisma.\$executeRaw\`CREATE TABLE IF NOT EXISTS test_write (id INTEGER)\`;
}).then(() => {
  console.log('✅ Escrita OK');
  return prisma.\$executeRaw\`DROP TABLE IF EXISTS test_write\`;
}).then(() => {
  console.log('✅ Drop OK');
  prisma.\$disconnect();
}).catch(e => {
  console.error('❌ Erro:', e.message);
  prisma.\$disconnect();
  process.exit(1);
});
" 2>&1; then
    echo -e "${GREEN}✅ Banco de dados funcionando corretamente!${NC}"
else
    echo -e "${RED}❌ Ainda há problemas com o banco${NC}"
    echo ""
    echo "Tente manualmente:"
    echo "  sudo chmod 666 prisma/dev.db"
    echo "  sudo chmod 777 prisma"
    echo "  sudo chown -R \$(whoami):\$(whoami) prisma/"
fi
echo ""

# 11. Criar usuário admin
echo -e "${YELLOW}👤 11. Criando/atualizando usuário admin...${NC}"
docker-compose exec -T backend pnpm create:admin || {
    echo -e "${YELLOW}⚠️  Erro ao criar admin, tentando método alternativo...${NC}"
    docker-compose exec backend tsx scripts/createAdminUser.ts || {
        echo -e "${RED}❌ Erro ao criar usuário admin${NC}"
    }
}
echo ""

echo -e "${GREEN}✅ Correção de permissões concluída!${NC}"
echo ""
echo "📋 Próximos passos:"
echo "  1. Tente fazer login novamente"
echo "  2. Credenciais: admin@aion.com / admin123"
echo ""
echo "🔍 Se ainda não funcionar:"
echo "  docker-compose logs -f backend"
echo "  docker-compose exec backend ls -la /app/prisma/dev.db"
