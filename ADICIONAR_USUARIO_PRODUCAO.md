# 🔧 Adicionar Usuário na Produção

## Problema Identificado

O usuário `leandro.borges@aion.eng.br` existe no banco **local**, mas **não existe** no banco de **produção**.

## Solução Rápida

### Opção 1: Usar um usuário existente (temporário)

Você pode fazer login com um dos usuários que já existem na produção:

- **Email:** `admin@aion.com` ou `admin@teste.com`
- **Senha:** (você precisa saber a senha)

### Opção 2: Adicionar o usuário na produção (Recomendado)

#### Método A: Usando Script Node.js (Mais Seguro)

No servidor de produção, execute:

```bash
cd /opt/apps/app-aion-effort

# 1. Fazer pull do código atualizado
git pull origin main

# 2. Adicionar o usuário (você precisará escolher uma senha)
pnpm tsx scripts/adicionarUsuarioProducao.ts leandro.borges@aion.eng.br SUA_SENHA_AQUI "Leandro Borges" admin

# Exemplo:
# pnpm tsx scripts/adicionarUsuarioProducao.ts leandro.borges@aion.eng.br minhaSenha123 "Leandro Borges" admin
```

#### Método B: Usando SQL direto (Rápido)

No servidor de produção, execute:

```bash
cd /opt/apps/app-aion-effort

# Opção 1: Usar o hash do banco local (manter senha original)
sqlite3 prisma/dev.db "INSERT INTO User (id, email, name, password, role, active, canImpersonate, loginAttempts, lockedUntil, createdAt, updatedAt) VALUES ('cmialo5je0000s5ofpexp2i2r', 'leandro.borges@aion.eng.br', 'Leandro Borges', '\$2b\$10\$xwEyGdljbR6ix1k6fbtDv.j4qmYmcgMskeizLR7RmgRffr4pDOy1i', 'admin', 1, 1, 0, NULL, datetime('now'), datetime('now'));"

# Opção 2: Verificar se já existe antes de inserir
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
```

#### Método C: Atualizar senha de um usuário existente

Se você quer usar o `admin@aion.com` ou `admin@teste.com`, pode resetar a senha:

```bash
# Gerar hash de nova senha (local)
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('novaSenha123', 10).then(h => console.log(h));"

# Atualizar no banco de produção (copiar o hash gerado)
sqlite3 prisma/dev.db "UPDATE User SET password = 'HASH_GERADO_AQUI' WHERE email = 'admin@aion.com';"
```

## Verificar se Funcionou

```bash
# Verificar se o usuário foi adicionado
sqlite3 prisma/dev.db "SELECT email, name, role, active FROM User WHERE email = 'leandro.borges@aion.eng.br';"

# Deve mostrar:
# leandro.borges@aion.eng.br|Leandro Borges|admin|1
```

## Reiniciar Backend

Após adicionar o usuário, reinicie o backend:

```bash
docker-compose restart backend
```

## Fazer Login

1. Acesse a aplicação
2. Use o email: `leandro.borges@aion.eng.br`
3. Use a senha que você configurou

## Nota Importante

**Se você usar o hash do banco local** (método B), a senha será a mesma do banco local. Se você não souber qual é, use o **Método A** para criar uma nova senha.

## Script Completo de Resolução

```bash
#!/bin/bash
# Execute no servidor de produção

cd /opt/apps/app-aion-effort

echo "🔧 Adicionando usuário leandro.borges@aion.eng.br na produção..."

# 1. Verificar se já existe
EXISTS=$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM User WHERE email = 'leandro.borges@aion.eng.br';")

if [ "$EXISTS" = "1" ]; then
    echo "✅ Usuário já existe no banco!"
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
    
    echo "✅ Usuário adicionado!"
fi

# 3. Verificar
echo ""
echo "📋 Verificando usuário:"
sqlite3 prisma/dev.db "SELECT email, name, role, active FROM User WHERE email = 'leandro.borges@aion.eng.br';"

# 4. Reiniciar backend
echo ""
echo "🔄 Reiniciando backend..."
docker-compose restart backend

echo ""
echo "✅ Concluído! Agora você pode fazer login com:"
echo "   Email: leandro.borges@aion.eng.br"
echo "   Senha: (a mesma do banco local, ou crie uma nova usando o script)"
```

Salve como `adicionar-usuario-producao.sh`, dê permissão de execução e execute:

```bash
chmod +x adicionar-usuario-producao.sh
./adicionar-usuario-producao.sh
```

