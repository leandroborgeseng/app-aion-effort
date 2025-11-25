# Como Configurar pm.aion.eng.br no Caddy

## Situação Atual

O container `agilepm-web` está rodando em outra rede Docker e expõe a porta 8080 no host. O Caddy precisa acessá-lo para fazer proxy reverso.

## Opções de Configuração

### Opção 1: Via host.docker.internal:8080 (RECOMENDADO)

Como o `agilepm-web` está mapeando a porta 8080 do container para 8080 do host, podemos usar `host.docker.internal:8080`.

**Caddyfile atualizado:**
```caddy
pm.aion.eng.br {
    reverse_proxy host.docker.internal:8080 {
        # ... configurações
    }
}
```

### Opção 2: Conectar Caddy à rede do agilepm

Se a Opção 1 não funcionar, você pode conectar o Caddy à mesma rede Docker do agilepm.

**1. Descobrir a rede do agilepm:**
```bash
docker inspect agilepm-web | grep -A 20 Networks
# Ou
docker network ls
docker network inspect bridge  # Rede padrão
```

**2. Conectar o Caddy à rede:**
```bash
# Parar o Caddy temporariamente
docker-compose stop caddy

# Conectar à rede do agilepm (exemplo: bridge)
docker network connect bridge aion-effort-caddy

# Reiniciar o Caddy
docker-compose start caddy
```

**3. Atualizar Caddyfile para usar o nome do container:**
```caddy
pm.aion.eng.br {
    reverse_proxy agilepm-web:80 {
        # ... configurações
    }
}
```

## Scripts Disponíveis

### `verificar-caddy-pm.sh`
Verifica se a configuração está funcionando:
```bash
cd /opt/apps/app-aion-effort
./verificar-caddy-pm.sh
```

### `ajustar-caddy-pm.sh`
Ajusta automaticamente a configuração:
```bash
cd /opt/apps/app-aion-effort
./ajustar-caddy-pm.sh
```

## Aplicar Mudanças

```bash
cd /opt/apps/app-aion-effort

# 1. Atualizar código
git pull origin main

# 2. Recarregar configuração do Caddy
docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile

# OU reiniciar o Caddy
docker-compose restart caddy

# 3. Verificar logs
docker-compose logs -f caddy | grep -i "pm.aion\|error"

# 4. Testar
curl -I https://pm.aion.eng.br
```

## Troubleshooting

### Erro: "dial tcp: lookup host.docker.internal"

Se `host.docker.internal` não funcionar no Linux:

1. **Usar IP do host diretamente:**
   ```bash
   # Descobrir IP do host
   ip addr show docker0 | grep inet | awk '{print $2}' | cut -d/ -f1
   # Ou
   hostname -I | awk '{print $1}'
   ```
   
   Atualizar Caddyfile:
   ```caddy
   reverse_proxy <IP_DO_HOST>:8080
   ```

2. **Usar network_mode: host (não recomendado):**
   No docker-compose.yml:
   ```yaml
   caddy:
     network_mode: "host"
   ```
   
   No Caddyfile:
   ```caddy
   reverse_proxy 127.0.0.1:8080
   ```

### Verificar se o agilepm-web está acessível

```bash
# Do host
curl http://localhost:8080

# Do container Caddy
docker exec aion-effort-caddy wget -O- http://host.docker.internal:8080

# Ou se conectou à mesma rede
docker exec aion-effort-caddy wget -O- http://agilepm-web:80
```

### Ver logs detalhados

```bash
# Logs do Caddy
docker-compose logs -f caddy

# Testar certificado SSL
curl -vI https://pm.aion.eng.br

# Ver configuração atual do Caddy
docker exec aion-effort-caddy caddy validate --config /etc/caddy/Caddyfile
```

