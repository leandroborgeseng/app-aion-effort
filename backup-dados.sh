#!/bin/bash
# Script de backup dos dados da aplicação
# Uso: ./backup-dados.sh

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "📦 Iniciando backup dos dados da aplicação..."

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script no diretório raiz do projeto!${NC}"
    exit 1
fi

# Criar diretório de backup
BACKUP_DIR="backup-migracao-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}📁 Criando backup em: $BACKUP_DIR${NC}"

# Backup do banco de dados
if [ -f "prisma/dev.db" ]; then
    echo -e "${YELLOW}💾 Fazendo backup do banco de dados...${NC}"
    cp prisma/dev.db "$BACKUP_DIR/dev.db.backup"
    
    # Verificar tamanho
    DB_SIZE=$(du -h "$BACKUP_DIR/dev.db.backup" | cut -f1)
    echo -e "${GREEN}✅ Banco de dados: $DB_SIZE${NC}"
else
    echo -e "${RED}⚠️  Banco de dados não encontrado em prisma/dev.db${NC}"
fi

# Backup dos uploads
if [ -d "uploads" ]; then
    echo -e "${YELLOW}📎 Fazendo backup dos arquivos de upload...${NC}"
    cp -r uploads "$BACKUP_DIR/uploads-backup"
    
    # Verificar tamanho
    UPLOADS_SIZE=$(du -sh "$BACKUP_DIR/uploads-backup" | cut -f1)
    echo -e "${GREEN}✅ Uploads: $UPLOADS_SIZE${NC}"
else
    echo -e "${YELLOW}⚠️  Diretório uploads não encontrado${NC}"
fi

# Criar arquivo compactado
echo -e "${YELLOW}🗜️  Compactando backup...${NC}"
tar -czf "$BACKUP_DIR.tar.gz" -C "$BACKUP_DIR" .
rm -rf "$BACKUP_DIR"

# Verificar arquivo criado
if [ -f "$BACKUP_DIR.tar.gz" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR.tar.gz" | cut -f1)
    echo ""
    echo -e "${GREEN}✅ Backup criado com sucesso!${NC}"
    echo ""
    echo "📊 Informações do backup:"
    echo "   Arquivo: $BACKUP_DIR.tar.gz"
    echo "   Tamanho: $BACKUP_SIZE"
    echo ""
    echo "📋 Próximos passos:"
    echo "   1. Transferir para servidor: scp $BACKUP_DIR.tar.gz usuario@servidor:/tmp/"
    echo "   2. No servidor, descompactar: tar -xzf $BACKUP_DIR.tar.gz"
    echo "   3. Seguir instruções em MIGRACAO_DADOS.md"
else
    echo -e "${RED}❌ Erro ao criar arquivo compactado${NC}"
    exit 1
fi

