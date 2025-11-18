#!/bin/bash

# Script para verificar e criar usuário admin se necessário

set -e

echo "=========================================="
echo "Verificando e criando usuário admin"
echo "=========================================="

cd /opt/apps/app-aion-effort

# Verificar se backend está rodando
if ! docker-compose ps backend | grep -q "Up"; then
    echo "⚠️  Backend não está rodando. Iniciando..."
    docker-compose start backend
    sleep 5
fi

# Tentar criar usuário admin
echo ""
echo "Criando usuário admin..."
echo "Email: admin@aion.com"
echo "Senha: admin123"
echo ""

docker-compose exec backend pnpm create:admin

echo ""
echo "=========================================="
echo "Usuário admin criado/atualizado!"
echo "=========================================="
echo ""
echo "Credenciais:"
echo "  Email: admin@aion.com"
echo "  Senha: admin123"
echo ""
echo "Acesse: http://SEU_IP:3000"
echo ""

