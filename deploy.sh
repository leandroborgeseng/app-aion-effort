#!/bin/bash
# Script de deploy automatizado para servidor
# Uso: ./deploy.sh

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy da aplicação Aion Effort..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Erro: docker-compose.yml não encontrado!${NC}"
    echo "Execute este script no diretório raiz do projeto."
    exit 1
fi

# Verificar se .env existe
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Aviso: Arquivo .env não encontrado!${NC}"
    echo "Criando .env a partir do exemplo..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  IMPORTANTE: Configure o arquivo .env antes de continuar!${NC}"
        exit 1
    else
        echo -e "${RED}❌ Erro: .env.example não encontrado!${NC}"
        exit 1
    fi
fi

# Parar containers existentes
echo -e "${YELLOW}⏹️  Parando containers existentes...${NC}"
docker-compose down || true

# Atualizar código do Git (se estiver em repositório Git)
if [ -d ".git" ]; then
    echo -e "${YELLOW}📥 Atualizando código do repositório...${NC}"
    git pull origin main || echo -e "${YELLOW}⚠️  Não foi possível atualizar do Git (continuando...)${NC}"
fi

# Build da imagem
echo -e "${YELLOW}🔨 Fazendo build da imagem Docker...${NC}"
docker-compose build

# Criar diretórios necessários
echo -e "${YELLOW}📁 Criando diretórios necessários...${NC}"
mkdir -p prisma uploads/contracts
chmod -R 755 prisma uploads 2>/dev/null || true

# Iniciar aplicação
echo -e "${YELLOW}▶️  Iniciando aplicação...${NC}"
docker-compose up -d

# Aguardar aplicação iniciar
echo -e "${YELLOW}⏳ Aguardando aplicação iniciar...${NC}"
sleep 10

# Verificar se container está rodando
if ! docker-compose ps | grep -q "Up"; then
    echo -e "${RED}❌ Erro: Container não está rodando!${NC}"
    echo "Verificando logs..."
    docker-compose logs --tail=50
    exit 1
fi

# Executar migrações
echo -e "${YELLOW}🗄️  Executando migrações do banco de dados...${NC}"
docker-compose exec -T app pnpm prisma:migrate deploy || echo -e "${YELLOW}⚠️  Migrações podem já estar aplicadas${NC}"

# Verificar health check
echo -e "${YELLOW}🏥 Verificando health check...${NC}"
sleep 5
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check OK!${NC}"
else
    echo -e "${YELLOW}⚠️  Health check não respondeu (aplicação pode estar iniciando ainda)${NC}"
fi

# Mostrar status
echo ""
echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo ""
echo "📊 Status dos containers:"
docker-compose ps
echo ""
echo "📝 Últimas linhas dos logs:"
docker-compose logs --tail=20
echo ""
echo "🌐 Aplicação disponível em: http://localhost:4000"
echo ""
echo "📋 Próximos passos:"
echo "  1. Criar usuário admin: docker-compose exec app pnpm create:admin"
echo "  2. Ver logs: docker-compose logs -f"
echo "  3. Verificar status: docker-compose ps"

