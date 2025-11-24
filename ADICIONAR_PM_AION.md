# Adicionar pm.aion.eng.br ao Caddy

## Configuração Adicionada

Foi adicionada a configuração para `pm.aion.eng.br` no Caddyfile, que faz proxy reverso para a aplicação rodando no host na porta 8080.

## Como Funciona

1. O Caddy recebe requisições HTTPS para `pm.aion.eng.br`
2. O Caddy obtém automaticamente o certificado SSL via Let's Encrypt
3. O Caddy faz proxy reverso para `host.docker.internal:8080` (porta 8080 do host)
4. A aplicação PM recebe as requisições como se fossem diretas

## Estrutura da Configuração

```caddy
pm.aion.eng.br {
    reverse_proxy host.docker.internal:8080 {
        # Headers e timeouts configurados
    }
    
    # Headers de segurança
    # Logs em arquivo separado
    # Compressão habilitada
}
```

## Notas Importantes

### host.docker.internal

O `host.docker.internal` foi configurado no `docker-compose.yml` via `extra_hosts` para funcionar no Linux. Isso permite que o container Caddy acesse serviços rodando no host.

**Se não funcionar**, você pode:

1. **Usar o IP do host diretamente:**
   ```bash
   # Descobrir o IP do host
   ip addr show docker0 | grep inet | awk '{print $2}' | cut -d/ -f1
   # Ou
   hostname -I | awk '{print $1}'
   ```
   
   Então altere no Caddyfile:
   ```caddy
   reverse_proxy <IP_DO_HOST>:8080
   ```

2. **Usar network_mode: "host" (não recomendado - remove isolamento):**
   No docker-compose.yml, altere:
   ```yaml
   caddy:
     network_mode: "host"
   ```
   
   E no Caddyfile use:
   ```caddy
   reverse_proxy 127.0.0.1:8080
   ```

## Aplicar as Mudanças

Após fazer as alterações no servidor:

```bash
cd /opt/apps/app-aion-effort

# 1. Atualizar código
git pull origin main

# 2. Recarregar configuração do Caddy (sem parar)
docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile

# Ou reiniciar o Caddy
docker-compose restart caddy

# 3. Verificar logs
docker-compose logs -f caddy

# 4. Testar
curl -I https://pm.aion.eng.br
```

## Verificar DNS

Certifique-se de que o DNS está configurado:

```bash
# Verificar se o CNAME está correto
dig pm.aion.eng.br

# Deve apontar para o mesmo IP de av.aion.eng.br
```

## Troubleshooting

### Erro: "dial tcp: lookup host.docker.internal"

O `host.docker.internal` não está funcionando. Use uma das alternativas acima.

### Certificado SSL não é gerado

1. Verifique se o DNS está apontando corretamente
2. Verifique se a porta 80 está acessível externamente (necessária para validação Let's Encrypt)
3. Verifique logs: `docker-compose logs caddy | grep -i "certificate\|tls"`

### Aplicação não responde

1. Verifique se a aplicação está rodando na porta 8080:
   ```bash
   netstat -tuln | grep 8080
   # Ou
   ss -tuln | grep 8080
   ```

2. Verifique se a aplicação aceita conexões de fora do localhost (se necessário)

3. Teste acessar diretamente: `curl http://localhost:8080`

4. Verifique logs do Caddy: `docker-compose logs caddy`

## Estrutura Final

- `av.aion.eng.br` → Frontend (container) + Backend API (container)
- `pm.aion.eng.br` → Aplicação PM (host:8080)

Ambos com:
- SSL automático (Let's Encrypt)
- Headers de segurança
- Logs separados
- Compressão habilitada

