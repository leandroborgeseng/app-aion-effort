#!/bin/bash

echo "🚀 INICIANDO APLICAÇÃO COM CADDY (SSL Automático)"
echo "=================================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "📋 Configuração:"
echo "   Domínio: av.aion.eng.br"
echo "   Email SSL: admin@aion.eng.br"
echo "   Portas: 80 (HTTP) e 443 (HTTPS)"
echo ""

# Verificar se Caddyfile existe
if [ ! -f Caddyfile ]; then
    echo "❌ Caddyfile não encontrado! Execute git pull primeiro."
    exit 1
fi

# Validar Caddyfile
echo "1. Validando Caddyfile..."
docker run --rm -v "$(pwd)/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Erro na validação do Caddyfile!"
    exit 1
fi

echo "✅ Caddyfile válido!"
echo ""

# Criar diretório de logs
echo "2. Criando diretório de logs..."
mkdir -p logs/caddy
echo "✅ Diretório criado!"
echo ""

# Parar serviços antigos se existirem
echo "3. Parando serviços antigos (se existirem)..."
docker-compose stop 2>/dev/null || true
echo ""

# Verificar se as portas 80 e 443 estão livres
echo "4. Verificando portas 80 e 443..."
if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "   ⚠️  Porta 80 já está em uso!"
    echo "   Verificando qual processo está usando..."
    lsof -Pi :80 -sTCP:LISTEN
    read -p "   Deseja continuar mesmo assim? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

if lsof -Pi :443 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "   ⚠️  Porta 443 já está em uso!"
    echo "   Verificando qual processo está usando..."
    lsof -Pi :443 -sTCP:LISTEN
    read -p "   Deseja continuar mesmo assim? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

echo "✅ Portas verificadas!"
echo ""

# Subir serviços
echo "5. Subindo serviços..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Erro ao iniciar serviços!"
    exit 1
fi

echo "✅ Serviços iniciados!"
echo ""

# Aguardar serviços iniciarem
echo "6. Aguardando serviços iniciarem (15 segundos)..."
sleep 15
echo ""

# Verificar status
echo "7. Verificando status dos serviços..."
docker-compose ps
echo ""

# Verificar logs do Caddy
echo "8. Últimas linhas dos logs do Caddy:"
docker-compose logs --tail=20 caddy
echo ""

echo "✅ CONFIGURAÇÃO CONCLUÍDA!"
echo ""
echo "📋 INFORMAÇÕES IMPORTANTES:"
echo ""
echo "🌐 Acesse sua aplicação:"
echo "   https://av.aion.eng.br"
echo ""
echo "📝 IMPORTANTE:"
echo "   - Certifique-se de que o DNS está apontando para este servidor:"
echo "     A     av.aion.eng.br    -> $(curl -s ifconfig.me 2>/dev/null || echo 'IP_DO_SERVIDOR')"
echo ""
echo "   - O Caddy vai obter o certificado SSL automaticamente"
echo "     na primeira requisição HTTPS (pode levar alguns segundos)"
echo ""
echo "   - Certifique-se de que as portas 80 e 443 estão abertas"
echo "     no firewall do servidor"
echo ""
echo "📊 COMANDOS ÚTEIS:"
echo "   Ver logs do Caddy:    docker-compose logs -f caddy"
echo "   Ver logs do backend:  docker-compose logs -f backend"
echo "   Ver logs do frontend: docker-compose logs -f frontend"
echo "   Ver status:           docker-compose ps"
echo "   Parar tudo:           docker-compose down"
echo ""

