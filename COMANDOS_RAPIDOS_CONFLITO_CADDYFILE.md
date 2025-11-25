# Resolver Conflito no Caddyfile

## Problema
O git pull está falhando porque há mudanças locais no Caddyfile.

## Solução Rápida

Execute estes comandos no servidor:

```bash
cd /opt/apps/app-aion-effort

# 1. Fazer backup do Caddyfile local
cp Caddyfile Caddyfile.backup.$(date +%Y%m%d_%H%M%S)

# 2. Descartar mudanças locais
git checkout -- Caddyfile

# 3. Fazer pull
git pull origin main

# 4. Verificar configuração
grep -A 3 "pm.aion.eng.br" Caddyfile | grep "reverse_proxy"

# 5. Garantir que está usando agilepm-web:80
sed -i 's/host.docker.internal:8080/agilepm-web:80/g' Caddyfile

# 6. Reiniciar Caddy
docker-compose stop caddy
docker-compose up -d caddy

# 7. Testar
sleep 5
curl -I https://pm.aion.eng.br
```

## Ou use o script automático

```bash
cd /opt/apps/app-aion-effort
chmod +x resolver-conflito-caddyfile.sh
./resolver-conflito-caddyfile.sh
```

