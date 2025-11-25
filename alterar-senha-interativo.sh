#!/bin/bash

# Script interativo para alterar senha (melhor para senhas com caracteres especiais)

EMAIL="${1:-leandro.borges@aion.eng.br}"

echo "🔐 ALTERAR SENHA DE USUÁRIO (Modo Interativo)"
echo "=============================================="
echo ""
echo "Email: $EMAIL"
echo ""
echo "Digite a nova senha (a senha não será exibida na tela):"
read -s NOVA_SENHA
echo ""

if [ -z "$NOVA_SENHA" ]; then
    echo "❌ Senha não pode estar vazia!"
    exit 1
fi

echo "Confirme a senha:"
read -s CONFIRMA_SENHA
echo ""

if [ "$NOVA_SENHA" != "$CONFIRMA_SENHA" ]; then
    echo "❌ As senhas não coincidem!"
    exit 1
fi

echo ""
echo "Alterando senha..."
echo ""

cd /opt/apps/app-aion-effort || exit 1

# Passar a senha de forma segura
docker-compose exec -T backend sh -c "pnpm tsx scripts/alterarSenhaUsuario.ts '${EMAIL}' '${NOVA_SENHA}'"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Senha alterada com sucesso!"
else
    echo ""
    echo "❌ Erro ao alterar senha"
    exit 1
fi

