#!/bin/bash

# Script para visualizar informações de um usuário

EMAIL="${1:-leandro.borges@aion.eng.br}"

echo "👤 VISUALIZANDO USUÁRIO"
echo "======================"
echo ""
echo "Email: $EMAIL"
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "Buscando informações do usuário..."
echo ""

docker-compose exec -T backend pnpm tsx scripts/verUsuario.ts "$EMAIL"

