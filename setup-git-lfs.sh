#!/bin/bash
# Script para configurar Git LFS e adicionar dados ao repositório
# Uso: ./setup-git-lfs.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔧 Configurando Git LFS para dados grandes..."

# Verificar se Git LFS está instalado
if ! command -v git-lfs &> /dev/null; then
    echo -e "${RED}❌ Git LFS não está instalado!${NC}"
    echo ""
    echo "Instale Git LFS:"
    echo "  macOS:   brew install git-lfs"
    echo "  Ubuntu:  sudo apt install git-lfs"
    echo "  CentOS:  sudo yum install git-lfs"
    exit 1
fi

# Verificar se está em repositório Git
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Não é um repositório Git!${NC}"
    exit 1
fi

# Inicializar Git LFS
echo -e "${YELLOW}📦 Inicializando Git LFS...${NC}"
git lfs install

# Rastrear arquivos grandes
echo -e "${YELLOW}📝 Configurando rastreamento de arquivos grandes...${NC}"
git lfs track "*.db"
git lfs track "*.db-journal"
git lfs track "uploads/**"

# Adicionar .gitattributes
git add .gitattributes

# Verificar .gitignore
echo -e "${YELLOW}🔍 Verificando .gitignore...${NC}"
if grep -q "^prisma/dev.db$" .gitignore || grep -q "^\*.db$" .gitignore; then
    echo -e "${YELLOW}⚠️  Arquivos estão no .gitignore${NC}"
    echo ""
    echo "Você precisa remover ou comentar estas linhas do .gitignore:"
    echo "  - *.db"
    echo "  - prisma/dev.db"
    echo ""
    read -p "Deseja que eu edite o .gitignore automaticamente? (sim/não): " CONFIRM
    
    if [ "$CONFIRM" = "sim" ] || [ "$CONFIRM" = "s" ] || [ "$CONFIRM" = "yes" ] || [ "$CONFIRM" = "y" ]; then
        # Criar backup do .gitignore
        cp .gitignore .gitignore.backup
        
        # Comentar linhas do banco
        sed -i.bak 's/^\(\*\.db\)$/#\1/' .gitignore
        sed -i.bak 's/^\(prisma\/dev\.db\)$/#\1/' .gitignore
        
        echo -e "${GREEN}✅ .gitignore atualizado (backup em .gitignore.backup)${NC}"
    else
        echo -e "${YELLOW}⚠️  Você precisa editar .gitignore manualmente${NC}"
    fi
fi

# Verificar se banco existe
if [ ! -f "prisma/dev.db" ]; then
    echo -e "${RED}❌ Banco de dados não encontrado em prisma/dev.db${NC}"
    exit 1
fi

# Mostrar tamanho
DB_SIZE=$(du -h prisma/dev.db | cut -f1)
echo -e "${GREEN}📊 Tamanho do banco: $DB_SIZE${NC}"

# Adicionar arquivos
echo -e "${YELLOW}➕ Adicionando arquivos ao Git...${NC}"
git add prisma/dev.db

if [ -d "uploads" ] && [ "$(ls -A uploads 2>/dev/null)" ]; then
    git add uploads/
    echo -e "${GREEN}✅ Uploads adicionados${NC}"
else
    echo -e "${YELLOW}⚠️  Diretório uploads vazio ou não existe${NC}"
fi

# Mostrar status
echo ""
echo -e "${GREEN}✅ Configuração concluída!${NC}"
echo ""
echo "📋 Próximos passos:"
echo "   1. Verificar o que será commitado:"
echo "      git status"
echo ""
echo "   2. Fazer commit:"
echo "      git commit -m 'Add database and uploads using Git LFS'"
echo ""
echo "   3. Fazer push:"
echo "      git push origin main"
echo ""
echo "   4. No servidor, instalar Git LFS e fazer pull:"
echo "      git lfs install"
echo "      git pull origin main"
echo "      git lfs pull"

