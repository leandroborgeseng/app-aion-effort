#!/bin/bash

# Script para corrigir problemas de conectividade do Caddy

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔧 CORRIGINDO CONECTIVIDADE DO CADDY"
echo "===================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

# 1. Verificar se containers estão na mesma rede
echo -e "${BLUE}1. Verificando redes dos containers...${NC}"

BACKEND_NETWORKS=$(docker inspect --format='{{range $net, $conf := .NetworkSettings.Networks}}{{$net}} {{end}}' aion-effort-backend 2>/dev/null || echo "")
FRONTEND_NETWORKS=$(docker inspect --format='{{range $net, $conf := .NetworkSettings.Networks}}{{$net}} {{end}}' aion-effort-frontend 2>/dev/null || echo "")
CADDY_NETWORKS=$(docker inspect --format='{{range $net, $conf := .NetworkSettings.Networks}}{{$net}} {{end}}' aion-effort-caddy 2>/dev/null || echo "")

echo -e "   Backend redes: $BACKEND_NETWORKS"
echo -e "   Frontend redes: $FRONTEND_NETWORKS"
echo -e "   Caddy redes: $CADDY_NETWORKS"

# Verificar se todos estão na mesma rede principal
if echo "$BACKEND_NETWORKS" | grep -q "app-aion-effort_aion-network" && \
   echo "$FRONTEND_NETWORKS" | grep -q "app-aion-effort_aion-network" && \
   echo "$CADDY_NETWORKS" | grep -q "app-aion-effort_aion-network"; then
    echo -e "   ${GREEN}✅ Todos estão na mesma rede principal${NC}"
else
    echo -e "   ${YELLOW}⚠️  Containers podem não estar na mesma rede${NC}"
fi
echo ""

# 2. Testar resolução DNS do Caddy
echo -e "${BLUE}2. Testando resolução DNS do Caddy...${NC}"

# Testar se Caddy consegue resolver backend
CADDY_DNS_BACKEND=$(docker exec aion-effort-caddy nslookup backend 2>/dev/null | grep -q "Name:" && echo "OK" || echo "FAILED")
CADDY_DNS_FRONTEND=$(docker exec aion-effort-caddy nslookup frontend 2>/dev/null | grep -q "Name:" && echo "OK" || echo "FAILED")

if [ "$CADDY_DNS_BACKEND" = "OK" ]; then
    echo -e "   ${GREEN}✅ Caddy resolve 'backend'${NC}"
else
    echo -e "   ${RED}❌ Caddy não resolve 'backend'${NC}"
    echo -e "   ${YELLOW}Tentando usar nome completo do container...${NC}"
    
    # Verificar se nome completo funciona
    CADDY_DNS_BACKEND_FULL=$(docker exec aion-effort-caddy nslookup aion-effort-backend 2>/dev/null | grep -q "Name:" && echo "OK" || echo "FAILED")
    
    if [ "$CADDY_DNS_BACKEND_FULL" = "OK" ]; then
        echo -e "   ${GREEN}✅ Caddy resolve 'aion-effort-backend'${NC}"
        echo -e "   ${YELLOW}⚠️  Será necessário atualizar Caddyfile para usar nomes completos${NC}"
    fi
fi

if [ "$CADDY_DNS_FRONTEND" = "OK" ]; then
    echo -e "   ${GREEN}✅ Caddy resolve 'frontend'${NC}"
else
    echo -e "   ${RED}❌ Caddy não resolve 'frontend'${NC}"
fi
echo ""

# 3. Verificar conectividade TCP
echo -e "${BLUE}3. Testando conectividade TCP...${NC}"

# Testar se Caddy consegue conectar ao backend
CADDY_CONNECT_BACKEND=$(docker exec aion-effort-caddy wget -O- -T 3 http://backend:4000/health 2>/dev/null && echo "OK" || echo "FAILED")
if [ "$CADDY_CONNECT_BACKEND" = "OK" ]; then
    echo -e "   ${GREEN}✅ Caddy conecta ao backend:4000${NC}"
else
    echo -e "   ${RED}❌ Caddy não conecta ao backend:4000${NC}"
    
    # Tentar com nome completo
    CADDY_CONNECT_BACKEND_FULL=$(docker exec aion-effort-caddy wget -O- -T 3 http://aion-effort-backend:4000/health 2>/dev/null && echo "OK" || echo "FAILED")
    if [ "$CADDY_CONNECT_BACKEND_FULL" = "OK" ]; then
        echo -e "   ${GREEN}✅ Caddy conecta ao aion-effort-backend:4000${NC}"
        echo -e "   ${YELLOW}⚠️  Precisamos atualizar Caddyfile${NC}"
        USE_FULL_NAMES=true
    else
        USE_FULL_NAMES=false
    fi
fi

# Testar frontend
CADDY_CONNECT_FRONTEND=$(docker exec aion-effort-caddy wget -O- -T 3 http://frontend:80/health 2>/dev/null && echo "OK" || echo "FAILED")
if [ "$CADDY_CONNECT_FRONTEND" = "OK" ]; then
    echo -e "   ${GREEN}✅ Caddy conecta ao frontend:80${NC}"
else
    echo -e "   ${YELLOW}⚠️  Frontend health não responde (pode ser normal)${NC}"
    
    # Tentar com nome completo
    CADDY_CONNECT_FRONTEND_FULL=$(docker exec aion-effort-caddy wget -O- -T 3 http://aion-effort-frontend:80/ 2>/dev/null && echo "OK" || echo "FAILED")
    if [ "$CADDY_CONNECT_FRONTEND_FULL" = "OK" ]; then
        echo -e "   ${GREEN}✅ Caddy conecta ao aion-effort-frontend:80${NC}"
        if [ "$USE_FULL_NAMES" != "true" ]; then
            USE_FULL_NAMES=true
        fi
    fi
fi
echo ""

# 4. Verificar Caddyfile atual
echo -e "${BLUE}4. Verificando Caddyfile...${NC}"
if grep -q "reverse_proxy backend:4000" Caddyfile; then
    echo -e "   ${GREEN}✅ Caddyfile usa 'backend:4000'${NC}"
elif grep -q "reverse_proxy aion-effort-backend:4000" Caddyfile; then
    echo -e "   ${YELLOW}⚠️  Caddyfile já usa nome completo${NC}"
else
    echo -e "   ${YELLOW}⚠️  Configuração não encontrada${NC}"
fi

if grep -q "reverse_proxy frontend:80" Caddyfile; then
    echo -e "   ${GREEN}✅ Caddyfile usa 'frontend:80'${NC}"
fi
echo ""

# 5. Atualizar Caddyfile se necessário
if [ "$USE_FULL_NAMES" = "true" ] && grep -q "reverse_proxy backend:4000" Caddyfile; then
    echo -e "${BLUE}5. Atualizando Caddyfile para usar nomes completos...${NC}"
    
    # Fazer backup
    cp Caddyfile Caddyfile.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "   ${GREEN}✅ Backup criado${NC}"
    
    # Substituir backend por nome completo
    sed -i 's/reverse_proxy backend:4000/reverse_proxy aion-effort-backend:4000/g' Caddyfile
    sed -i 's/reverse_proxy frontend:80/reverse_proxy aion-effort-frontend:80/g' Caddyfile
    
    echo -e "   ${GREEN}✅ Caddyfile atualizado${NC}"
    echo ""
    
    # 6. Recarregar Caddy
    echo -e "${BLUE}6. Recarregando Caddy...${NC}"
    
    # Validar Caddyfile primeiro
    CADDY_VALIDATE=$(docker exec aion-effort-caddy caddy validate --config /etc/caddy/Caddyfile 2>&1)
    if echo "$CADDY_VALIDATE" | grep -q "Valid configuration"; then
        echo -e "   ${GREEN}✅ Caddyfile válido${NC}"
        
        # Recarregar configuração
        docker exec aion-effort-caddy caddy reload --config /etc/caddy/Caddyfile 2>&1 || {
            echo -e "   ${YELLOW}⚠️  Reload falhou, reiniciando Caddy...${NC}"
            docker-compose restart caddy
        }
        
        echo -e "   ${GREEN}✅ Caddy recarregado${NC}"
    else
        echo -e "   ${RED}❌ Caddyfile inválido${NC}"
        echo "$CADDY_VALIDATE"
        echo -e "   ${YELLOW}Restaurando backup...${NC}"
        mv Caddyfile.backup.* Caddyfile 2>/dev/null || true
        exit 1
    fi
else
    echo -e "${BLUE}5. Caddyfile não precisa ser atualizado${NC}"
fi
echo ""

# 7. Aguardar e testar novamente
echo -e "${BLUE}7. Aguardando estabilização (10 segundos)...${NC}"
sleep 10
echo ""

# 8. Teste final
echo -e "${BLUE}8. Testando conectividade final...${NC}"

FINAL_BACKEND_TEST=$(docker exec aion-effort-caddy wget -O- -T 5 http://aion-effort-backend:4000/health 2>/dev/null | grep -q '"ok":true' && echo "OK" || echo "FAILED")
if [ "$FINAL_BACKEND_TEST" = "OK" ]; then
    echo -e "   ${GREEN}✅ Caddy consegue acessar backend health endpoint${NC}"
else
    # Tentar com nome curto também
    FINAL_BACKEND_TEST2=$(docker exec aion-effort-caddy wget -O- -T 5 http://backend:4000/health 2>/dev/null | grep -q '"ok":true' && echo "OK" || echo "FAILED")
    if [ "$FINAL_BACKEND_TEST2" = "OK" ]; then
        echo -e "   ${GREEN}✅ Caddy consegue acessar backend (nome curto funciona)${NC}"
    else
        echo -e "   ${RED}❌ Caddy ainda não consegue acessar backend${NC}"
        echo -e "   ${YELLOW}Verificando logs do Caddy...${NC}"
        docker logs --tail=10 aion-effort-caddy | grep -E "(error|backend|4000)" || echo "   Nenhum erro específico encontrado"
    fi
fi

FINAL_EXTERNAL_TEST=$(curl -s -o /dev/null -w "%{http_code}" -k https://av.aion.eng.br/api/health 2>/dev/null || echo "000")
if [ "$FINAL_EXTERNAL_TEST" = "200" ]; then
    echo -e "   ${GREEN}✅ Aplicação acessível externamente (HTTP $FINAL_EXTERNAL_TEST)${NC}"
elif [ "$FINAL_EXTERNAL_TEST" = "503" ]; then
    echo -e "   ${YELLOW}⚠️  Aplicação retorna 503 (serviço indisponível)${NC}"
elif [ "$FINAL_EXTERNAL_TEST" = "502" ]; then
    echo -e "   ${RED}❌ Gateway retorna 502 (bad gateway)${NC}"
else
    echo -e "   ${YELLOW}⚠️  Status externo: HTTP $FINAL_EXTERNAL_TEST${NC}"
fi
echo ""

echo "===================================="
echo -e "${BLUE}📋 RESUMO${NC}"
echo "===================================="

if [ "$FINAL_EXTERNAL_TEST" = "200" ]; then
    echo -e "${GREEN}✅ Problema resolvido! Aplicação está acessível.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Alguns problemas podem persistir.${NC}"
    echo ""
    echo -e "${BLUE}💡 Próximos passos:${NC}"
    echo "   1. Verificar logs: docker-compose logs -f caddy"
    echo "   2. Verificar rede: docker network inspect app-aion-effort_aion-network"
    echo "   3. Executar diagnóstico: ./diagnosticar-producao.sh"
    exit 1
fi

