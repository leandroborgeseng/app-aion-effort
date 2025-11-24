# 🔧 Troubleshooting - Problemas de Login

## Problemas Comuns e Soluções

### 1. ❌ "Muitas tentativas de login. Tente novamente em 15 minutos"

**Causa:** O rate limiter bloqueou seu IP após 5 tentativas falhadas.

**Soluções:**

#### Opção A: Desbloquear usuário no banco de dados
```bash
# Desbloquear um usuário específico
pnpm unlock:user email@exemplo.com
```

#### Opção B: Aguardar 15 minutos
O bloqueio por IP expira automaticamente após 15 minutos.

#### Opção C: Reiniciar o servidor (desenvolvimento)
Se estiver em desenvolvimento, reinicie o servidor para limpar o cache do rate limiter:
```bash
# Parar o servidor (Ctrl+C) e iniciar novamente
pnpm dev
```

### 2. ❌ "Email ou senha incorretos"

**Verificações:**

1. **Verificar se o usuário existe:**
   ```bash
   # Criar/atualizar usuário admin
   pnpm create:admin
   
   # Ou criar múltiplos usuários de teste
   pnpm seed:users
   ```

2. **Verificar credenciais padrão:**
   - Admin padrão: `admin@aion.com` / `admin123`
   - Usuários de teste: `admin@teste.com` / `senha123`

3. **Resetar senha:**
   ```bash
   # Resetar senha de um usuário específico
   pnpm create:admin email@exemplo.com nova-senha "Nome do Usuário"
   ```

### 3. ❌ "Usuário inativo"

**Solução:**
Ativar o usuário manualmente no banco ou criar um novo usuário ativo:
```bash
pnpm create:admin email@exemplo.com senha "Nome"
```

### 4. ❌ Login não redireciona após sucesso

**Possíveis causas:**

1. **Problema com o contexto do usuário:**
   - Verifique o console do navegador (F12) para erros
   - Limpe o localStorage: `localStorage.clear()` no console

2. **Problema com rotas protegidas:**
   - Verifique se o token está sendo salvo: `localStorage.getItem('auth_token')`
   - Verifique se o usuário está sendo salvo: `localStorage.getItem('user')`

3. **Problema de redirecionamento:**
   - Tente acessar diretamente: `http://localhost:5173/dashboard`
   - Se funcionar, o problema é no redirecionamento após login

### 5. 🔍 Debug - Verificar Logs

**No Backend (terminal do servidor):**
Procure por logs que começam com `[auth:login]`:
- `📥 Requisição de login recebida` - Requisição chegou
- `👤 Usuário encontrado` - Usuário existe no banco
- `🔐 Verificando senha` - Verificando credenciais
- `✅ Login bem-sucedido` - Login funcionou
- `❌` - Indica erros

**No Frontend (console do navegador - F12):**
Procure por logs que começam com `[LoginPage]`:
- `Tentando fazer login com:` - Início da tentativa
- `Resposta do servidor:` - Resposta recebida
- `Login bem-sucedido` - Sucesso
- `Erro no login:` - Erros

### 6. 🛠️ Comandos Úteis

```bash
# Criar usuário admin
pnpm create:admin

# Criar múltiplos usuários de teste
pnpm seed:users

# Desbloquear usuário
pnpm unlock:user email@exemplo.com

# Verificar banco de dados (SQLite)
sqlite3 prisma/dev.db "SELECT email, active, loginAttempts, lockedUntil FROM User;"

# Limpar todas as tentativas de login
sqlite3 prisma/dev.db "UPDATE User SET loginAttempts = 0, lockedUntil = NULL;"
```

### 7. 🔄 Reset Completo (Último Recurso)

Se nada funcionar, faça um reset completo:

```bash
# 1. Parar servidor (Ctrl+C)

# 2. Limpar banco de dados (CUIDADO: apaga todos os dados!)
rm prisma/dev.db

# 3. Recriar banco
pnpm prisma:migrate deploy

# 4. Criar usuário admin
pnpm create:admin

# 5. Reiniciar servidor
pnpm dev
```

## 📋 Checklist de Diagnóstico

Antes de reportar um problema, verifique:

- [ ] Servidor está rodando? (`pnpm dev` ou `pnpm real`)
- [ ] Frontend está rodando? (`pnpm web`)
- [ ] Usuário existe no banco? (`pnpm create:admin` para criar)
- [ ] Usuário está ativo? (verificar no banco)
- [ ] Conta não está bloqueada? (`pnpm unlock:user email@exemplo.com`)
- [ ] Rate limiter não está bloqueando? (aguardar 15 min ou reiniciar servidor)
- [ ] Console do navegador mostra erros? (F12)
- [ ] Terminal do servidor mostra erros?

## 🆘 Ainda com Problemas?

1. **Verifique os logs:**
   - Backend: Terminal onde roda `pnpm dev`
   - Frontend: Console do navegador (F12)

2. **Teste com usuário recém-criado:**
   ```bash
   pnpm create:admin teste@teste.com teste123 "Usuário Teste"
   ```
   Tente fazer login com essas credenciais.

3. **Verifique o banco de dados:**
   ```bash
   sqlite3 prisma/dev.db "SELECT * FROM User WHERE email = 'seu-email@exemplo.com';"
   ```

4. **Limpe o localStorage:**
   No console do navegador:
   ```javascript
   localStorage.clear()
   location.reload()
   ```

