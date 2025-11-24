#!/bin/bash
# Script SIMPLES para adicionar usuário usando apenas SQL (sem pnpm/node)
# Execute no servidor de produção

cd /opt/apps/app-aion-effort || exit 1

echo "🔧 Adicionando usuário leandro.borges@aion.eng.br na produção..."
echo ""

# Verificar se o banco existe
if [ ! -f "prisma/dev.db" ]; then
    echo "❌ Erro: Banco de dados não encontrado em prisma/dev.db"
    exit 1
fi

# Verificar se sqlite3 está instalado
if ! command -v sqlite3 &> /dev/null; then
    echo "❌ Erro: sqlite3 não está instalado"
    echo "Instale com: apt-get install sqlite3"
    exit 1
fi

# Verificar se já existe
EXISTS=$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM User WHERE email = 'leandro.borges@aion.eng.br';" 2>/dev/null)

if [ "$EXISTS" = "1" ]; then
    echo "✅ Usuário já existe no banco!"
    echo ""
    echo "📋 Dados do usuário:"
    sqlite3 prisma/dev.db "SELECT email, name, role, active, loginAttempts FROM User WHERE email = 'leandro.borges@aion.eng.br';" 2>/dev/null
    echo ""
    echo "💡 Se precisar resetar a senha, execute:"
    echo "   sqlite3 prisma/dev.db \"UPDATE User SET password = '\$2b\$10\$...' WHERE email = 'leandro.borges@aion.eng.br';\""
else
    echo "➕ Usuário não encontrado. Adicionando..."
    echo ""
    
    # Adicionar usuário
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

# Verificar novamente
echo ""
echo "📋 Verificando usuário:"
sqlite3 prisma/dev.db "SELECT email, name, role, active, loginAttempts, lockedUntil FROM User WHERE email = 'leandro.borges@aion.eng.br';" 2>/dev/null

# Verificar se está usando Docker
if command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
    echo ""
    echo "🔄 Reiniciando backend (Docker)..."
    docker-compose restart backend 2>/dev/null || echo "⚠️  Não foi possível reiniciar via docker-compose. Reinicie manualmente."
else
    echo ""
    echo "⚠️  Docker Compose não encontrado. Reinicie o backend manualmente."
fi

echo ""
echo "✅ Concluído!"
echo ""
echo "💡 Agora você pode fazer login com:"
echo "   Email: leandro.borges@aion.eng.br"
echo "   Senha: (a mesma que você usa no ambiente local)"
echo ""

