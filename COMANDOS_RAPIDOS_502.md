# Comandos Rápidos para Resolver Erro 502 no pm.aion.eng.br

## Problema
O Caddy está retornando erro 502, o que significa que não consegue conectar ao `agilepm-web`.

## Solução Manual Rápida

Execute estes comandos no servidor:

```bash
cd /opt/apps/app-aion-effort

# 1. Descobrir a rede do agilepm-web
AGILEPM_NETWORK=$(docker inspect agilepm-web --format='{{range $net,$v := .NetworkSettings.Networks}}{{$net}}{{break}}{{end}}')
echo "Rede: $AGILEPM_NETWORK"

# 2. Conectar Caddy à mesma rede
docker network connect $AGILEPM_NETWORK aion-effort-caddy

# 3. Atualizar Caddyfile
sed -i 's/host.docker.internal:8080/agilepm-web:80/g' Caddyfile

# 4. Recarregar Caddy
docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile

# 5. Testar
curl -I https://pm.aion.eng.br
```

## Solução Automática

```bash
cd /opt/apps/app-aion-effort
git pull origin main
./resolver-502-pm.sh
```

O script testa múltiplos métodos e usa o que funcionar.

## Verificar Logs

```bash
# Ver erros do Caddy
docker-compose logs caddy | grep -i "pm.aion\|502\|error"

# Testar acesso do Caddy ao agilepm-web
docker exec aion-effort-caddy wget -O- http://agilepm-web:80

# Ver redes do Caddy
docker inspect aion-effort-caddy | grep -A 10 Networks

# Ver redes do agilepm-web
docker inspect agilepm-web | grep -A 10 Networks
```

