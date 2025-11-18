# Deploy com Dois Containers

A aplicação agora está separada em dois containers:

- **Backend**: Express API na porta 4000
- **Frontend**: Nginx servindo arquivos estáticos na porta 3000

## Arquitetura

```
┌─────────────────┐         ┌─────────────────┐
│   Frontend      │         │    Backend      │
│   (Nginx)       │────────▶│   (Express)     │
│   Porta 3000    │  Proxy  │   Porta 4000    │
└─────────────────┘         └─────────────────┘
```

## Como fazer deploy

### 1. No servidor, fazer pull das mudanças

```bash
cd /opt/apps/app-aion-effort
git pull origin main
```

### 2. Parar containers antigos (se existirem)

```bash
docker-compose down
```

### 3. Build e start dos novos containers

```bash
docker-compose build --no-cache
docker-compose up -d
```

### 4. Verificar se estão rodando

```bash
docker-compose ps
```

Você deve ver dois containers:
- `aion-effort-backend` (porta 4000)
- `aion-effort-frontend` (porta 3000)

### 5. Verificar logs

```bash
# Logs do backend
docker-compose logs -f backend

# Logs do frontend
docker-compose logs -f frontend

# Logs de ambos
docker-compose logs -f
```

## Acessar a aplicação

- **Frontend**: `http://SEU_IP:3000`
- **Backend API**: `http://SEU_IP:4000`
- **Health Check Backend**: `http://SEU_IP:4000/health`
- **Health Check Frontend**: `http://SEU_IP:3000/health`

## Como funciona

1. O usuário acessa `http://SEU_IP:3000`
2. O Nginx serve os arquivos estáticos do frontend (HTML, CSS, JS)
3. Quando o frontend faz requisições para `/api/*`, o Nginx faz proxy para o backend em `http://backend:4000`
4. O backend processa as requisições e retorna os dados

## Variáveis de ambiente

O arquivo `.env` deve conter:

```env
NODE_ENV=production
PORT=4000
USE_MOCK=false
FRONTEND_URL=http://localhost:3000
DATABASE_URL=file:./prisma/dev.db
JWT_SECRET=sua-chave-secreta-aqui
```

## Troubleshooting

### Frontend não carrega

```bash
# Verificar se o container está rodando
docker-compose ps frontend

# Verificar logs
docker-compose logs frontend

# Verificar se os arquivos foram buildados
docker-compose exec frontend ls -la /usr/share/nginx/html
```

### Backend não responde

```bash
# Verificar se o container está rodando
docker-compose ps backend

# Verificar logs
docker-compose logs backend

# Testar health check
curl http://localhost:4000/health
```

### API não funciona

```bash
# Verificar se o proxy está configurado corretamente
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf

# Testar proxy diretamente
curl http://localhost:3000/api/health
```

### Rebuild completo

Se precisar fazer rebuild completo:

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Vantagens desta arquitetura

1. **Separação de responsabilidades**: Backend e frontend são independentes
2. **Melhor performance**: Nginx é otimizado para servir arquivos estáticos
3. **Escalabilidade**: Pode escalar backend e frontend independentemente
4. **Debug mais fácil**: Logs separados facilitam identificação de problemas
5. **Deploy independente**: Pode atualizar frontend sem afetar backend e vice-versa

