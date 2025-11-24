# Configuração do Caddy para av.aion.eng.br

## Configuração Completa

O Caddy já está configurado para o domínio `av.aion.eng.br` com SSL automático via Let's Encrypt.

### Arquivos Criados

- `Caddyfile` - Configuração do Caddy
- `docker-compose.yml` - Serviço Caddy adicionado
- `iniciar-com-caddy.sh` - Script de inicialização

### Passos para Configuração no Servidor

#### 1. Atualizar o código

```bash
cd /opt/apps/app-aion-effort
git pull origin main
```

#### 2. Verificar DNS

Certifique-se de que o DNS está configurado:

```
A     av.aion.eng.br    -> IP_DO_SERVIDOR
```

Para verificar:
```bash
dig av.aion.eng.br
# ou
nslookup av.aion.eng.br
```

#### 3. Verificar Portas

Certifique-se de que as portas 80 e 443 estão abertas:

```bash
# Verificar se estão abertas
sudo ufw status
# ou
sudo iptables -L -n | grep -E '80|443'

# Se necessário, abrir portas
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

#### 4. Parar Serviços Antigos

Se os serviços estiverem rodando nas portas 3000 e 4000 diretamente:

```bash
docker-compose down
```

#### 5. Iniciar com Caddy

```bash
# Opção 1: Usar script automatizado
./iniciar-com-caddy.sh

# Opção 2: Iniciar manualmente
mkdir -p logs/caddy
docker-compose up -d
```

#### 6. Verificar Logs

```bash
# Ver logs do Caddy
docker-compose logs -f caddy

# Ver status de todos os serviços
docker-compose ps
```

### Estrutura de URLs

Após a configuração:

- `https://av.aion.eng.br/` → Frontend (aplicação React)
- `https://av.aion.eng.br/api/*` → Backend API
- `http://av.aion.eng.br/*` → Redireciona automaticamente para HTTPS

### O que o Caddy faz

✅ **SSL Automático**: Obtém e renova certificados SSL via Let's Encrypt automaticamente
✅ **Redirecionamento HTTP → HTTPS**: Redireciona todas as requisições HTTP para HTTPS
✅ **Proxy Reverso**: Encaminha requisições para frontend e backend
✅ **Headers de Segurança**: Adiciona headers de segurança automaticamente
✅ **Compressão**: Comprime respostas automaticamente (gzip/zstd)
✅ **Logs**: Registra todas as requisições em `logs/caddy/access.log`

### Troubleshooting

#### Certificado SSL não é gerado

1. Verifique se o DNS está apontando corretamente:
   ```bash
   dig av.aion.eng.br
   ```

2. Verifique se as portas 80 e 443 estão abertas no firewall

3. Verifique os logs do Caddy:
   ```bash
   docker-compose logs caddy | grep -i "acme\|certificate\|ssl"
   ```

#### Erro 502 Bad Gateway

1. Verifique se os serviços estão rodando:
   ```bash
   docker-compose ps
   ```

2. Verifique se os serviços estão na mesma rede:
   ```bash
   docker network inspect app-aion-effort_aion-network
   ```

3. Teste conectividade interna:
   ```bash
   docker-compose exec caddy ping frontend
   docker-compose exec caddy ping backend
   ```

#### Porta já em uso

Se outra aplicação está usando as portas 80/443:

1. Identifique o processo:
   ```bash
   sudo lsof -i :80
   sudo lsof -i :443
   ```

2. Pare o processo ou configure para usar outras portas

### Voltar para configuração sem Caddy

Se precisar voltar para a configuração anterior (sem Caddy):

1. Edite `docker-compose.yml` e:
   - Remova o serviço `caddy`
   - Adicione novamente `ports: - "3000:80"` no frontend
   - Adicione novamente `ports: - "4000:4000"` no backend

2. Reinicie:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Backup dos Certificados SSL

Os certificados SSL são salvos no volume Docker `caddy_data`. Para fazer backup:

```bash
docker run --rm \
  -v app-aion-effort_caddy_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/caddy-ssl-backup.tar.gz -C /data .
```

### Restaurar Certificados

```bash
docker run --rm \
  -v app-aion-effort_caddy_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/caddy-ssl-backup.tar.gz -C /data
```

