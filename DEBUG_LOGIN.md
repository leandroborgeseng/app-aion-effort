# Debug do Login

## Passos para diagnosticar o problema de login

### 1. Verificar logs do backend

```bash
# Ver logs em tempo real do backend
docker-compose logs -f backend

# Ou ver últimas 50 linhas
docker-compose logs --tail=50 backend
```

### 2. Verificar logs do frontend (console do navegador)

1. Abra o navegador em `http://SEU_IP:3000`
2. Abra o Console do Desenvolvedor (F12 → Console)
3. Tente fazer login
4. Veja os logs que aparecem no console

### 3. Verificar se a requisição está chegando no backend

```bash
# Testar login diretamente no backend
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aion.com","password":"admin123"}'
```

### 4. Verificar se o proxy do nginx está funcionando

```bash
# Testar login via proxy do frontend
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aion.com","password":"admin123"}'
```

### 5. Verificar se o usuário admin existe

```bash
# Entrar no container do backend
docker exec -it aion-effort-backend bash

# Executar script para criar/verificar admin
pnpm create:admin

# Sair do container
exit
```

### 6. Verificar CORS

Se houver erro de CORS no console do navegador, verifique:
- O `FRONTEND_URL` no `.env` está correto?
- O CORS no backend está configurado para aceitar requisições do frontend?

### 7. Verificar resposta da API

No console do navegador, após tentar fazer login, verifique:
- A requisição aparece na aba Network?
- Qual é o status code da resposta?
- Qual é o conteúdo da resposta?

## Problemas comuns

### Problema 1: Erro 404 - Rota não encontrada
**Causa:** Proxy do nginx não está funcionando
**Solução:** Verificar configuração do nginx.conf

### Problema 2: Erro 401 - Não autorizado
**Causa:** Credenciais incorretas ou usuário não existe
**Solução:** Criar usuário admin novamente

### Problema 3: Erro CORS
**Causa:** Backend não está aceitando requisições do frontend
**Solução:** Verificar FRONTEND_URL e configuração de CORS

### Problema 4: Resposta sem token
**Causa:** Backend retornou erro ou resposta em formato diferente
**Solução:** Verificar logs do backend e estrutura da resposta

## Enviar informações para debug

Execute e envie:

```bash
# 1. Logs do backend
docker-compose logs --tail=50 backend

# 2. Teste direto do backend
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aion.com","password":"admin123"}'

# 3. Teste via proxy
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aion.com","password":"admin123"}'
```

E também:
- Screenshot do console do navegador (F12 → Console)
- Screenshot da aba Network mostrando a requisição de login

