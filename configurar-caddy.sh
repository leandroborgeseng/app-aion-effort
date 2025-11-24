#!/bin/bash

echo "🔧 CONFIGURAÇÃO DO CADDY COM SSL"
echo "=================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

# Verificar se já existe Caddyfile
if [ ! -f Caddyfile ]; then
    echo "❌ Caddyfile não encontrado! Execute git pull primeiro."
    exit 1
fi

echo "1. Configurando domínio no Caddyfile..."
echo ""

# Solicitar domínio
read -p "Digite o domínio da aplicação (ex: app.aionengenharia.com.br): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domínio não pode ser vazio!"
    exit 1
fi

# Solicitar email
read -p "Digite seu email para certificados SSL (Let's Encrypt): " EMAIL

if [ -z "$EMAIL" ]; then
    echo "⚠️  Email não fornecido. Usando padrão: admin@example.com"
    EMAIL="admin@example.com"
fi

echo ""
echo "2. Atualizando Caddyfile..."
echo "   Domínio: $DOMAIN"
echo "   Email: $EMAIL"
echo ""

# Backup do Caddyfile original
cp Caddyfile Caddyfile.backup

# Atualizar domínio e email no Caddyfile
sed -i "s/seu-dominio.com/$DOMAIN/g" Caddyfile
sed -i "s/seu-email@exemplo.com/$EMAIL/g" Caddyfile

echo "✅ Caddyfile atualizado!"
echo ""

echo "3. Criando diretório para logs..."
mkdir -p logs/caddy
echo "✅ Diretório criado!"
echo ""

echo "4. Validando configuração do Caddyfile..."
docker run --rm -v "$(pwd)/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile

if [ $? -ne 0 ]; then
    echo "❌ Erro na validação do Caddyfile!"
    echo "   Restaurando backup..."
    mv Caddyfile.backup Caddyfile
    exit 1
fi

echo "✅ Configuração válida!"
echo ""

echo "5. Parando serviços antigos (se estiverem rodando)..."
docker-compose stop frontend backend 2>/dev/null
echo ""

echo "6. Subindo serviços com Caddy..."
docker-compose up -d caddy frontend backend

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Serviços iniciados!"
    echo ""
    echo "7. Verificando status dos serviços..."
    sleep 5
    docker-compose ps
    echo ""
    echo "✅ CONFIGURAÇÃO CONCLUÍDA!"
    echo ""
    echo "📋 PRÓXIMOS PASSOS:"
    echo ""
    echo "1. Configure o DNS do seu domínio para apontar para este servidor:"
    echo "   A     $DOMAIN    -> $(curl -s ifconfig.me 2>/dev/null || echo 'IP_DO_SERVIDOR')"
    echo ""
    echo "2. Aguarde a propagação do DNS (pode levar alguns minutos)"
    echo ""
    echo "3. Acesse sua aplicação:"
    echo "   https://$DOMAIN"
    echo ""
    echo "4. O Caddy vai obter o certificado SSL automaticamente na primeira requisição"
    echo ""
    echo "📝 LOGS:"
    echo "   docker-compose logs -f caddy"
    echo ""
    echo "🔍 VERIFICAR STATUS:"
    echo "   docker-compose ps"
    echo ""
else
    echo "❌ Erro ao iniciar serviços!"
    echo "   Verifique os logs: docker-compose logs"
    exit 1
fi

