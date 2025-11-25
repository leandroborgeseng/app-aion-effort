# Backend Offline - Comandos Rápidos

## Problema
O backend não está respondendo, causando erro "Unexpected end of JSON input" no login.

## Solução Rápida

### 1. Verificar e Reiniciar Backend

```bash
cd /opt/apps/app-aion-effort

# Ver status
docker-compose ps

# Se backend não estiver rodando, iniciar
docker-compose up -d backend

# Aguardar inicialização
sleep 10

# Verificar logs
docker-compose logs backend | tail -30
```

### 2. Verificar Saúde do Backend

```bash
# Testar dentro do container
docker-compose exec backend curl -s http://localhost:4000/health

# Deve retornar algo como: {"status":"ok"} ou similar
```

### 3. Reiniciar Todos os Serviços

```bash
# Reiniciar tudo
docker-compose restart

# Ou recriar containers
docker-compose up -d --force-recreate
```

### 4. Verificar Erros

```bash
# Ver erros recentes
docker-compose logs backend | grep -iE "error|erro|exception|fatal" | tail -20

# Ver todos os logs
docker-compose logs backend | tail -50
```

### 5. Testar Login Diretamente

```bash
# Testar login dentro do container
docker-compose exec backend curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"leandro.borges@aion.eng.br","password":"sua_senha"}'

# Deve retornar JSON com token ou erro JSON válido
```

### 6. Verificar Caddy

```bash
# Ver se Caddy está roteando corretamente
docker-compose logs caddy | tail -20

# Testar através do Caddy
curl -v http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@teste.com","password":"teste"}'
```

## Diagnóstico Completo

Use o script de diagnóstico:

```bash
cd /opt/apps/app-aion-effort
git pull origin main
chmod +x diagnosticar-login-completo.sh
./diagnosticar-login-completo.sh
```

## Problemas Comuns

### Backend não inicia

```bash
# Ver logs detalhados
docker-compose logs backend

# Verificar se há erro no código
docker-compose exec backend node -v
docker-compose exec backend pnpm -v

# Tentar rebuild
docker-compose build backend
docker-compose up -d backend
```

### Backend inicia mas não responde

```bash
# Verificar se o processo está rodando
docker-compose exec backend ps aux | grep node

# Verificar porta
docker-compose exec backend netstat -tlnp | grep 4000

# Verificar variáveis de ambiente
docker-compose exec backend env | grep -E "PORT|DATABASE|JWT"
```

### Caddy não está roteando para o backend

```bash
# Verificar configuração do Caddy
cat Caddyfile | grep -A 10 "/api"

# Verificar se Caddy pode acessar o backend
docker-compose exec caddy wget -O- http://backend:4000/health

# Reiniciar Caddy
docker-compose restart caddy
```

## Solução Rápida Completa

```bash
cd /opt/apps/app-aion-effort

# Parar tudo
docker-compose down

# Iniciar tudo novamente
docker-compose up -d

# Aguardar
sleep 15

# Verificar status
docker-compose ps

# Testar
curl -s http://localhost/api/health
```

