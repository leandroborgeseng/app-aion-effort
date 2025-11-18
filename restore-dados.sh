#!/bin/bash
# Script de restauração dos dados no servidor de produção
# Uso: ./restore-dados.sh [caminho-do-backup]

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKUP_FILE="${1:-backup-migracao-*.tar.gz}"

echo "🔄 Iniciando restauração dos dados..."

# Verificar se está no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Erro: Execute este script no diretório raiz do projeto!${NC}"
    exit 1
fi

# Verificar se arquivo de backup existe
if [ ! -f "$BACKUP_FILE" ] && [ ! -d "backup-temp" ]; then
    echo -e "${RED}❌ Erro: Arquivo de backup não encontrado!${NC}"
    echo "Uso: ./restore-dados.sh [caminho-do-backup.tar.gz]"
    exit 1
fi

# Confirmar ação
echo -e "${YELLOW}⚠️  ATENÇÃO: Esta operação irá substituir os dados atuais!${NC}"
read -p "Deseja continuar? (sim/não): " CONFIRM

if [ "$CONFIRM" != "sim" ] && [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "yes" ] && [ "$CONFIRM" != "y" ]; then
    echo "Operação cancelada."
    exit 0
fi

# Parar aplicação
echo -e "${YELLOW}⏹️  Parando aplicação...${NC}"
docker-compose down || true

# Fazer backup de segurança do banco atual
if [ -f "prisma/dev.db" ]; then
    BACKUP_SAFE="prisma/dev.db.backup-antes-restore-$(date +%Y%m%d-%H%M%S)"
    echo -e "${YELLOW}💾 Criando backup de segurança do banco atual...${NC}"
    cp prisma/dev.db "$BACKUP_SAFE"
    echo -e "${GREEN}✅ Backup de segurança criado: $BACKUP_SAFE${NC}"
fi

# Descompactar backup se necessário
if [ -f "$BACKUP_FILE" ]; then
    echo -e "${YELLOW}📦 Descompactando backup...${NC}"
    mkdir -p backup-temp
    tar -xzf "$BACKUP_FILE" -C backup-temp
    BACKUP_SOURCE="backup-temp"
else
    BACKUP_SOURCE="."
fi

# Restaurar banco de dados
if [ -f "$BACKUP_SOURCE/dev.db.backup" ]; then
    echo -e "${YELLOW}💾 Restaurando banco de dados...${NC}"
    cp "$BACKUP_SOURCE/dev.db.backup" prisma/dev.db
    chmod 644 prisma/dev.db
    echo -e "${GREEN}✅ Banco de dados restaurado${NC}"
else
    echo -e "${RED}⚠️  Arquivo de backup do banco não encontrado${NC}"
fi

# Restaurar uploads
if [ -d "$BACKUP_SOURCE/uploads-backup" ]; then
    echo -e "${YELLOW}📎 Restaurando arquivos de upload...${NC}"
    mkdir -p uploads/contracts
    cp -r "$BACKUP_SOURCE/uploads-backup/contracts"/* uploads/contracts/ 2>/dev/null || true
    chmod -R 755 uploads
    echo -e "${GREEN}✅ Arquivos de upload restaurados${NC}"
else
    echo -e "${YELLOW}⚠️  Diretório de uploads não encontrado no backup${NC}"
fi

# Limpar arquivos temporários
if [ -d "backup-temp" ]; then
    rm -rf backup-temp
fi

# Executar migrações
echo -e "${YELLOW}🗄️  Executando migrações do banco de dados...${NC}"
docker-compose up -d
sleep 5
docker-compose exec -T app pnpm prisma:migrate deploy || echo -e "${YELLOW}⚠️  Migrações podem já estar aplicadas${NC}"

# Verificar integridade
echo -e "${YELLOW}🔍 Verificando integridade...${NC}"
sleep 3

# Testar conexão com banco
if docker-compose exec -T app node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => { console.log('✅ Conexão com banco OK'); return prisma.user.count(); }).then(c => console.log('📊 Usuários encontrados:', c)).catch(e => console.error('❌ Erro:', e.message)).finally(() => prisma.\$disconnect())" 2>/dev/null; then
    echo -e "${GREEN}✅ Banco de dados acessível${NC}"
else
    echo -e "${RED}⚠️  Erro ao verificar banco de dados${NC}"
fi

echo ""
echo -e "${GREEN}✅ Restauração concluída!${NC}"
echo ""
echo "📋 Próximos passos:"
echo "   1. Verificar logs: docker-compose logs -f"
echo "   2. Testar login: docker-compose exec app pnpm create:admin"
echo "   3. Acessar aplicação e verificar dados"
echo ""
echo "💾 Backup de segurança mantido em: $BACKUP_SAFE"

