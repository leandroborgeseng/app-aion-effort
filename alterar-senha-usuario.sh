#!/bin/bash

# Script para alterar senha de usuário no banco de dados

EMAIL="${1:-leandro.borges@aion.eng.br}"
NOVA_SENHA="${2}"

if [ -z "$NOVA_SENHA" ]; then
    echo "🔐 ALTERAR SENHA DE USUÁRIO"
    echo "==========================="
    echo ""
    echo "Uso: ./alterar-senha-usuario.sh <email> <nova-senha>"
    echo ""
    echo "Exemplo:"
    echo "  ./alterar-senha-usuario.sh leandro.borges@aion.eng.br minhasenha123"
    echo ""
    echo "Se não informar o email, usará: leandro.borges@aion.eng.br"
    exit 1
fi

echo "🔐 ALTERANDO SENHA DO USUÁRIO"
echo "============================="
echo ""
echo "Email: $EMAIL"
echo "Nova senha: [oculto]"
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "Executando script de alteração de senha no container backend..."
echo ""

docker-compose exec -T backend pnpm tsx scripts/alterarSenhaUsuario.ts "$EMAIL" "$NOVA_SENHA"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Senha alterada com sucesso!"
    echo ""
    echo "💡 Agora o usuário pode fazer login com:"
    echo "   Email: $EMAIL"
    echo "   Senha: $NOVA_SENHA"
else
    echo ""
    echo "❌ Erro ao alterar senha"
    exit 1
fi

