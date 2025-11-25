# Solução Rápida: Conectar pm.aion.eng.br ao agilepm-web

## Problema
O `host.docker.internal` não funciona no Linux. Precisamos conectar o Caddy à mesma rede Docker do `agilepm-web`.

## Solução Rápida (Execute no Servidor)

```bash
cd /opt/apps/app-aion-effort

# 1. Descobrir a rede do agilepm-web
docker inspect agilepm-web --format='{{range $net,$v := .NetworkSettings.Networks}}{{$net}}{{break}}{{end}}'

# 2. Conectar o Caddy à mesma rede (substitua <NOME_DA_REDE> pelo resultado acima)
docker network connect <NOME_DA_REDE> aion-effort-caddy

# 3. Atualizar Caddyfile para usar o nome do container
sed -i 's/host.docker.internal:8080/agilepm-web:80/g' Caddyfile

# 4. Recarregar Caddy
docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile

# 5. Testar
curl -I https://pm.aion.eng.br
```

## Solução Automática

Execute o script que faz tudo automaticamente:

```bash
cd /opt/apps/app-aion-effort
git pull origin main
chmod +x solucao-caddy-agilepm.sh
./solucao-caddy-agilepm.sh
```

## Verificar se Funcionou

```bash
# Ver logs do Caddy
docker-compose logs -f caddy | grep -i "pm.aion\|error"

# Testar acesso
curl -I https://pm.aion.eng.br

# Testar do container Caddy
docker exec aion-effort-caddy wget -O- http://agilepm-web:80
```

