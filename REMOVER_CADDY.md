# Remoção do Caddy - Configuração Simplificada

## Mudanças Realizadas

O Caddy foi removido do `docker-compose.yml` e os serviços agora são expostos diretamente em portas:

- **Backend**: Porta `4000`
- **Frontend**: Porta `3000`

## Aplicar Mudanças no Servidor

```bash
cd /opt/apps/app-aion-effort

# 1. Atualizar código
git pull origin main

# 2. Executar script de remoção (opcional, se quiser remover container existente)
./remover-caddy.sh

# OU fazer manualmente:

# 3. Parar e remover Caddy
docker-compose stop caddy
docker-compose rm -f caddy

# 4. Recriar serviços com nova configuração
docker-compose down
docker-compose up -d

# 5. Verificar status
docker-compose ps

# 6. Testar acesso
curl http://localhost:4000/health
curl http://localhost:3000/
```

## Portas Expostas

- **Backend API**: `http://localhost:4000`
  - Health check: `http://localhost:4000/health`
  - API: `http://localhost:4000/api/*`

- **Frontend**: `http://localhost:3000`
  - Aplicação React: `http://localhost:3000/`

## Configuração do Nginx Externo

Agora você pode configurar o nginx externo para fazer proxy reverso:

### Exemplo de configuração Nginx:

```nginx
# Backend API
location /api/ {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Frontend
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

## Arquivos Alterados

- ✅ `docker-compose.yml` - Removido serviço caddy, expostas portas diretamente
- ✅ `remover-caddy.sh` - Script para remover Caddy e aplicar mudanças

## Arquivos Mantidos (não deletados)

Os seguintes arquivos relacionados ao Caddy foram mantidos para referência futura:
- `Caddyfile` - Pode ser usado como referência para configuração nginx
- Scripts de diagnóstico do Caddy - Mantidos para histórico

## Verificação Pós-Deploy

```bash
# Verificar containers
docker-compose ps

# Testar backend
curl http://localhost:4000/health | jq

# Testar frontend
curl -I http://localhost:3000/

# Ver logs
docker-compose logs -f backend frontend
```

## Benefícios

- ✅ Configuração mais simples
- ✅ Menos componentes para gerenciar
- ✅ Mais controle sobre proxy reverso (nginx)
- ✅ Debug mais fácil (acesso direto às portas)

