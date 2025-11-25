# Comandos para Gerenciar Senha de Usuário

## Alterar Senha

### Método 1: Script Bash (RECOMENDADO)
```bash
cd /opt/apps/app-aion-effort

# Alterar senha do leandro.borges@aion.eng.br
./alterar-senha-usuario.sh leandro.borges@aion.eng.br nova_senha_aqui

# Ou com outro email
./alterar-senha-usuario.sh outro@email.com senha123
```

### Método 2: Executar dentro do container
```bash
cd /opt/apps/app-aion-effort

docker-compose exec backend pnpm tsx scripts/alterarSenhaUsuario.ts leandro.borges@aion.eng.br nova_senha_aqui
```

### Método 3: SQL direto (apenas se necessário)
```bash
# Gerar hash da senha primeiro
docker-compose exec backend node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('nova_senha_aqui', 10, (err, hash) => {
  if (err) {
    console.error('Erro:', err);
    process.exit(1);
  }
  console.log('Hash:', hash);
  console.log('\\nExecute no SQLite:');
  console.log('UPDATE User SET password = \"' + hash + '\" WHERE email = \"leandro.borges@aion.eng.br\";');
});
"

# Depois execute o UPDATE no SQLite
docker-compose exec backend sqlite3 /app/prisma/dev.db "UPDATE User SET password = 'HASH_AQUI' WHERE email = 'leandro.borges@aion.eng.br';"
```

## Ver Informações do Usuário

### Método 1: Script Bash
```bash
cd /opt/apps/app-aion-effort

# Ver informações do leandro.borges@aion.eng.br
./ver-usuario.sh leandro.borges@aion.eng.br

# Ou com outro email
./ver-usuario.sh outro@email.com
```

### Método 2: Executar dentro do container
```bash
cd /opt/apps/app-aion-effort

docker-compose exec backend pnpm tsx scripts/verUsuario.ts leandro.borges@aion.eng.br
```

### Método 3: SQL direto
```bash
# Ver usuário
docker-compose exec backend sqlite3 /app/prisma/dev.db "
SELECT 
  email,
  name,
  role,
  active,
  loginAttempts,
  lockedUntil,
  lastLogin,
  createdAt
FROM User 
WHERE email = 'leandro.borges@aion.eng.br';
"

# Ver hash da senha (não mostra a senha, apenas confirma que existe)
docker-compose exec backend sqlite3 /app/prisma/dev.db "
SELECT 
  email,
  length(password) as hash_length,
  substr(password, 1, 20) || '...' as hash_preview
FROM User 
WHERE email = 'leandro.borges@aion.eng.br';
"
```

## Exemplos Práticos

### 1. Alterar senha do leandro.borges@aion.eng.br
```bash
./alterar-senha-usuario.sh leandro.borges@aion.eng.br senha123
```

### 2. Ver informações do usuário antes de alterar
```bash
./ver-usuario.sh leandro.borges@aion.eng.br
```

### 3. Resetar tentativas de login (desbloquear)
```bash
docker-compose exec backend sqlite3 /app/prisma/dev.db "
UPDATE User 
SET loginAttempts = 0, lockedUntil = NULL 
WHERE email = 'leandro.borges@aion.eng.br';
"
```

### 4. Ativar/Desativar usuário
```bash
# Ativar
docker-compose exec backend sqlite3 /app/prisma/dev.db "
UPDATE User 
SET active = 1 
WHERE email = 'leandro.borges@aion.eng.br';
"

# Desativar
docker-compose exec backend sqlite3 /app/prisma/dev.db "
UPDATE User 
SET active = 0 
WHERE email = 'leandro.borges@aion.eng.br';
"
```

## Segurança

⚠️ **IMPORTANTE:**
- As senhas são armazenadas como **hash bcrypt** (não é possível ver a senha original)
- Para alterar a senha, você precisa criar um novo hash
- Use os scripts TypeScript para garantir que o hash seja gerado corretamente
- Não compartilhe senhas em texto claro

## Troubleshooting

### Erro: "Usuário não encontrado"
```bash
# Listar todos os usuários
docker-compose exec backend sqlite3 /app/prisma/dev.db "SELECT email, name, role FROM User;"

# Verificar email exato (case sensitive)
docker-compose exec backend sqlite3 /app/prisma/dev.db "SELECT email FROM User WHERE email LIKE '%leandro%';"
```

### Erro: "Container não está rodando"
```bash
# Iniciar backend
docker-compose up -d backend

# Aguardar inicializar
sleep 10
```

### Erro ao executar script TypeScript
```bash
# Verificar se o script existe
docker-compose exec backend ls -la scripts/alterarSenhaUsuario.ts

# Verificar logs do container
docker-compose logs backend | tail -50
```

