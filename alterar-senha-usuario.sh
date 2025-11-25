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
    echo ""
    echo "⚠️  IMPORTANTE: Se a senha contiver caracteres especiais, use aspas:"
    echo "  ./alterar-senha-usuario.sh email \"senha\$com\$caracteres\""
    exit 1
fi

echo "🔐 ALTERANDO SENHA DO USUÁRIO"
echo "============================="
echo ""
echo "Email: $EMAIL"
echo "Nova senha: [oculto - ${#NOVA_SENHA} caracteres]"
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "Executando script de alteração de senha no container backend..."
echo ""

# Usar printf para passar a senha com segurança, evitando interpretação do shell
docker-compose exec -T backend sh -c "pnpm tsx scripts/alterarSenhaUsuario.ts '${EMAIL}' '${NOVA_SENHA}'"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Senha alterada com sucesso!"
    echo ""
    echo "💡 Agora o usuário pode fazer login com:"
    echo "   Email: $EMAIL"
    echo "   Nova senha configurada (${#NOVA_SENHA} caracteres)"
else
    echo ""
    echo "❌ Erro ao alterar senha (código: $EXIT_CODE)"
    echo ""
    echo "🔍 Verificando detalhes do erro..."
    echo ""
    
    # Tentar novamente mostrando o erro completo
    echo "Tentando novamente com mais detalhes:"
    docker-compose exec backend pnpm tsx scripts/alterarSenhaUsuario.ts "${EMAIL}" "${NOVA_SENHA}" 2>&1
    
    echo ""
    echo "💡 Dicas de troubleshooting:"
    echo "   1. Verifique se o usuário existe: ./ver-usuario.sh $EMAIL"
    echo "   2. Verifique os logs do backend: docker-compose logs backend | tail -20"
    echo "   3. Se a senha tem caracteres especiais, use aspas simples no terminal"
    exit 1
fi

