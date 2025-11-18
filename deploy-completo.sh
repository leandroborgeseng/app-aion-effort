#!/bin/bash
# Script completo de deploy no servidor
# Uso: ./deploy-completo.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Iniciando deploy completo da aplicação..."

# Verificar se está no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Erro: docker-compose.yml não encontrado!${NC}"
    echo "Execute este script no diretório raiz do projeto."
    exit 1
fi

# 1. Buscar atualizações do Git
echo ""
echo -e "${YELLOW}📥 Buscando atualizações do Git...${NC}"
if [ -d ".git" ]; then
    git pull origin main || echo -e "${YELLOW}⚠️  Não foi possível fazer pull (continuando...)${NC}"
else
    echo -e "${YELLOW}⚠️  Não é um repositório Git${NC}"
fi

# 2. Verificar arquivo .env
echo ""
echo -e "${YELLOW}🔍 Verificando arquivo .env...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Arquivo .env não encontrado!${NC}"
    if [ -f "ENV_TEMPLATE.txt" ]; then
        echo "Criando .env a partir do template..."
        cp ENV_TEMPLATE.txt .env
        echo -e "${YELLOW}⚠️  Configure o arquivo .env antes de continuar!${NC}"
        echo "Execute: nano .env"
        exit 1
    else
        echo -e "${RED}❌ Template ENV_TEMPLATE.txt também não encontrado!${NC}"
        exit 1
    fi
fi

# 3. Criar diretórios necessários
echo ""
echo -e "${YELLOW}📁 Criando diretórios necessários...${NC}"
mkdir -p prisma uploads/contracts
chmod -R 755 prisma uploads 2>/dev/null || true

# 4. Parar containers existentes
echo ""
echo -e "${YELLOW}⏹️  Parando containers existentes...${NC}"
docker-compose down || true

# 5. Build da imagem
echo ""
echo -e "${YELLOW}🔨 Fazendo build da imagem Docker...${NC}"
docker-compose build

# 6. Iniciar aplicação
echo ""
echo -e "${YELLOW}▶️  Iniciando aplicação...${NC}"
docker-compose up -d

# 7. Aguardar aplicação iniciar
echo ""
echo -e "${YELLOW}⏳ Aguardando aplicação iniciar...${NC}"
sleep 15

# 8. Verificar se container está rodando
echo ""
echo -e "${YELLOW}🔍 Verificando status do container...${NC}"
if ! docker-compose ps | grep -q "Up"; then
    echo -e "${RED}❌ Container não está rodando!${NC}"
    echo "Verificando logs..."
    docker-compose logs --tail=50
    exit 1
fi

# 9. Executar migrações
echo ""
echo -e "${YELLOW}🗄️  Executando migrações do banco de dados...${NC}"
docker-compose exec -T app pnpm prisma:migrate deploy || echo -e "${YELLOW}⚠️  Migrações podem já estar aplicadas${NC}"

# 10. Verificar health check
echo ""
echo -e "${YELLOW}🏥 Verificando health check...${NC}"
sleep 5
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check OK!${NC}"
else
    echo -e "${YELLOW}⚠️  Health check não respondeu (aplicação pode estar iniciando ainda)${NC}"
fi

# 11. Mostrar status final
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
echo "  4. Acessar aplicação: http://SEU_IP:4000"

