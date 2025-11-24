#!/bin/bash
# Script para adicionar o usuário leandro.borges@aion.eng.br na produção
# Execute no servidor de produção

cd /opt/apps/app-aion-effort

echo "🔧 Adicionando usuário leandro.borges@aion.eng.br na produção..."
echo ""

# 1. Verificar se já existe
EXISTS=$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM User WHERE email = 'leandro.borges@aion.eng.br';")

if [ "$EXISTS" = "1" ]; then
    echo "✅ Usuário já existe no banco!"
    sqlite3 prisma/dev.db "SELECT email, name, role, active FROM User WHERE email = 'leandro.borges@aion.eng.br';"
else
    echo "➕ Usuário não encontrado. Adicionando..."
    
    # 2. Adicionar usuário usando o hash do banco local
    sqlite3 prisma/dev.db << 'EOF'
    INSERT INTO User (id, email, name, password, role, active, canImpersonate, loginAttempts, lockedUntil, createdAt, updatedAt)
    SELECT 
      'cmialo5je0000s5ofpexp2i2r',
      'leandro.borges@aion.eng.br',
      'Leandro Borges',
      '$2b$10$xwEyGdljbR6ix1k6fbtDv.j4qmYmcgMskeizLR7RmgRffr4pDOy1i',
      'admin',
      1,
      1,
      0,
      NULL,
      datetime('now'),
      datetime('now')
    WHERE NOT EXISTS (SELECT 1 FROM User WHERE email = 'leandro.borges@aion.eng.br');
EOF
    
    if [ $? -eq 0 ]; then
        echo "✅ Usuário adicionado com sucesso!"
    else
        echo "❌ Erro ao adicionar usuário!"
        exit 1
    fi
fi

# 3. Verificar
echo ""
echo "📋 Verificando usuário:"
sqlite3 prisma/dev.db "SELECT email, name, role, active, loginAttempts FROM User WHERE email = 'leandro.borges@aion.eng.br';"

# 4. Reiniciar backend
echo ""
echo "🔄 Reiniciando backend..."
docker-compose restart backend

# 5. Aguardar inicialização
echo "⏳ Aguardando backend iniciar (10 segundos)..."
sleep 10

# 6. Verificar status
echo ""
echo "📊 Status do backend:"
docker-compose ps backend

echo ""
echo "✅ Concluído!"
echo ""
echo "💡 Agora você pode fazer login com:"
echo "   Email: leandro.borges@aion.eng.br"
echo "   Senha: (a mesma que você usa no ambiente local)"
echo ""
echo "⚠️  Se a senha não funcionar, você pode resetá-la usando:"
echo "   pnpm tsx scripts/adicionarUsuarioProducao.ts leandro.borges@aion.eng.br NOVA_SENHA \"Leandro Borges\" admin"

