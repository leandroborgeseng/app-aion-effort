# 🔧 Troubleshooting Completo - Problemas de Login

## 📋 Diagnóstico Rápido

### 1. Verificar todos os usuários

```bash
pnpm tsx scripts/diagnosticoLogin.ts
```

### 2. Diagnosticar um usuário específico

```bash
pnpm tsx scripts/diagnosticoLogin.ts seu-email@exemplo.com
```

### 3. Verificar usuários bloqueados

```bash
sqlite3 prisma/dev.db "SELECT email, loginAttempts, lockedUntil FROM User WHERE lockedUntil IS NOT NULL AND lockedUntil > datetime('now');"
```

## ❌ Problemas Comuns e Soluções

### Problema 1: "Email ou senha incorretos"

**Causas possíveis:**
- Email digitado incorretamente
- Senha digitada incorretamente
- Usuário não existe no banco

**Soluções:**
1. Verificar se o usuário existe:
   ```bash
   pnpm tsx scripts/diagnosticoLogin.ts seu-email@exemplo.com
   ```

2. Verificar email (case-insensitive, mas verificar espaços):
   - Certifique-se de não ter espaços antes/depois do email
   - Use letras minúsculas

3. Resetar senha (se for admin ou souber a senha antiga):
   - Faça login com outra conta admin
   - Vá em "Usuários" → Editar usuário → Alterar senha

### Problema 2: "Conta bloqueada"

**Sintomas:**
- Mensagem: "Conta bloqueada. Tente novamente em X minuto(s)"
- Usuário tem `lockedUntil` no futuro

**Solução:**
```bash
# Desbloquear usuário
pnpm unlock:user seu-email@exemplo.com

# Ou manualmente no banco:
sqlite3 prisma/dev.db "UPDATE User SET loginAttempts = 0, lockedUntil = NULL WHERE email = 'seu-email@exemplo.com';"
```

### Problema 3: "Usuário inativo"

**Sintomas:**
- Mensagem: "Usuário inativo"
- Campo `active = 0` no banco

**Solução:**
```bash
# Ativar usuário
sqlite3 prisma/dev.db "UPDATE User SET active = 1 WHERE email = 'seu-email@exemplo.com';"
```

### Problema 4: "Muitas tentativas de login"

**Sintomas:**
- Rate limiter bloqueando por IP
- Mensagem: "Muitas tentativas de login. Aguarde alguns minutos"

**Soluções:**
1. Aguardar 15 minutos
2. Tentar de outro dispositivo/rede
3. Verificar logs do servidor para ver o rate limiter

### Problema 5: "Erro de conexão"

**Sintomas:**
- Mensagem: "Erro de conexão. Verifique sua internet"
- Não consegue se conectar ao backend

**Soluções:**
1. Verificar se o backend está rodando:
   ```bash
   # Local
   curl http://localhost:4000/health
   
   # Produção
   curl http://seu-servidor:4000/health
   ```

2. Verificar logs do backend:
   ```bash
   # Local
   tail -f logs/*.log
   
   # Produção (Docker)
   docker-compose logs -f backend
   ```

3. Verificar variáveis de ambiente:
   - `JWT_SECRET` configurado?
   - `DATABASE_URL` apontando para o banco correto?

### Problema 6: Problemas após replicação do banco

**Sintomas:**
- Funcionava antes, parou depois de replicar banco
- Erro ao fazer login

**Soluções:**
1. Verificar permissões do banco:
   ```bash
   ls -la prisma/dev.db
   chmod 664 prisma/dev.db
   ```

2. Verificar se o banco está corrompido:
   ```bash
   sqlite3 prisma/dev.db "PRAGMA integrity_check;"
   ```

3. Verificar se as tabelas existem:
   ```bash
   sqlite3 prisma/dev.db ".tables"
   ```

4. Recriar usuário admin (se necessário):
   ```bash
   pnpm create:admin
   ```

## 🔍 Verificações Detalhadas

### Verificar logs do backend durante tentativa de login

1. Abra o terminal do backend
2. Tente fazer login
3. Veja os logs que aparecem:
   - `[auth:login] 📥 Requisição de login recebida`
   - `[auth:login] 👤 Usuário encontrado`
   - `[auth:login] 🔐 Verificando senha...`
   - `[auth:login] ❌` ou `✅`

### Verificar no navegador (DevTools)

1. Abra DevTools (F12)
2. Vá em "Network" (Rede)
3. Tente fazer login
4. Veja a requisição `/api/auth/login`:
   - Status code (200 = OK, 401 = não autorizado, etc.)
   - Response (mensagem de erro)

### Verificar localStorage

1. Abra DevTools (F12)
2. Vá em "Application" → "Local Storage"
3. Verifique:
   - `auth_token` existe?
   - `user` existe e tem dados corretos?

**Para limpar e tentar novamente:**
```javascript
localStorage.clear();
location.reload();
```

## 🛠️ Scripts Úteis

### Listar todos os usuários com status

```bash
pnpm tsx scripts/diagnosticoLogin.ts
```

### Diagnosticar usuário específico

```bash
pnpm tsx scripts/diagnosticoLogin.ts email@exemplo.com
```

### Desbloquear usuário

```bash
pnpm unlock:user email@exemplo.com
```

### Criar novo usuário admin

```bash
pnpm create:admin
```

### Resetar senha manualmente (se souber o hash bcrypt)

```bash
sqlite3 prisma/dev.db "UPDATE User SET password = 'novo_hash_bcrypt' WHERE email = 'email@exemplo.com';"
```

**⚠️ NOTA:** Você precisa gerar o hash bcrypt da nova senha. Use uma ferramenta online ou:

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('novaSenha123', 10).then(h => console.log(h));"
```

## 🔐 Resetar Senha (Método Recomendado)

Se você tem acesso a outro usuário admin:

1. Faça login com conta admin
2. Vá em "Usuários"
3. Encontre o usuário
4. Clique em "Editar"
5. Clique em "Alterar Senha"
6. Digite a nova senha

Se você NÃO tem acesso admin, mas tem acesso ao servidor:

1. Use o script de diagnóstico para verificar o usuário
2. Desbloqueie o usuário (se bloqueado)
3. Recrie o usuário admin:
   ```bash
   pnpm create:admin
   ```

## 📞 Checklist de Diagnóstico

Use este checklist para diagnosticar problemas:

- [ ] Verificar se o usuário existe no banco
- [ ] Verificar se o usuário está ativo (`active = 1`)
- [ ] Verificar se o usuário não está bloqueado (`lockedUntil`)
- [ ] Verificar tentativas de login (`loginAttempts < 5`)
- [ ] Verificar se o backend está rodando
- [ ] Verificar logs do backend durante tentativa de login
- [ ] Verificar resposta da API no DevTools (Network)
- [ ] Verificar se não há erro de conexão
- [ ] Verificar se o email está correto (sem espaços)
- [ ] Verificar se a senha está correta
- [ ] Limpar localStorage e tentar novamente
- [ ] Verificar permissões do banco de dados (após replicação)

## 🚨 Problema Ainda Não Resolvido?

Se nada funcionar:

1. **Coletar informações:**
   - Email do usuário
   - Mensagem de erro exata
   - Logs do backend (últimas 50 linhas)
   - Resposta da API (Network tab do DevTools)
   - Status do usuário no banco (usando script de diagnóstico)

2. **Verificar configurações:**
   - Variáveis de ambiente (`.env`)
   - Versão do banco de dados
   - Logs do servidor

3. **Último recurso:**
   - Fazer backup do banco
   - Recriar usuário admin
   - Verificar integridade do banco

