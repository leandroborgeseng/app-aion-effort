# ⚠️ ATENÇÃO: Porta do Backend Alterada

## Mudança de Porta

O backend do `app-aion-effort` foi alterado da porta **4000** para **5000** para evitar conflito com o `agilepm-api` que já está usando a porta 4000.

## Nova Configuração

- **Backend API**: `http://localhost:5000` (mapeado da porta 4000 interna)
- **Frontend**: `http://localhost:3000` (mapeado da porta 80 interna)

## Aplicar no Servidor

```bash
cd /opt/apps/app-aion-effort

# 1. Atualizar código
git pull origin main

# 2. Recriar serviços
docker-compose down
docker-compose up -d

# 3. Verificar se está funcionando
curl http://localhost:5000/health
curl http://localhost:3000/
```

## Configuração do Nginx

Se estiver usando nginx externo, atualize a configuração:

```nginx
# Backend API - NOVA PORTA 5000
location /api/ {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Frontend - continua na porta 3000
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

## Testar

```bash
# Health check
curl http://localhost:5000/health | jq

# API endpoint
curl http://localhost:5000/api/ecm/lifecycle/mes-a-mes?empresasId=2&periodo=MesCorrente
```

