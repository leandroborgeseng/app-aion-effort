# Configuração Rápida do Caddy para av.aion.eng.br

## ✅ Tudo já está configurado!

O Caddy já está configurado para o domínio `av.aion.eng.br` com:
- ✅ SSL automático via Let's Encrypt
- ✅ Proxy reverso para frontend e backend
- ✅ Redirecionamento HTTP → HTTPS
- ✅ Headers de segurança

## 🚀 Passos para Ativar no Servidor

### 1. Atualizar código

```bash
cd /opt/apps/app-aion-effort
git pull origin main
```

### 2. Verificar DNS

O DNS deve apontar para o servidor:

```bash
# Verificar IP atual do servidor
curl ifconfig.me

# Verificar DNS
dig av.aion.eng.br
```

O DNS deve retornar o IP do seu servidor.

### 3. Abrir Portas no Firewall

```bash
# Se estiver usando UFW
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# Verificar status
sudo ufw status
```

### 4. Parar serviços antigos (se necessário)

Se os serviços estiverem rodando nas portas 3000 e 4000:

```bash
docker-compose down
```

### 5. Iniciar com Caddy

```bash
# Usar script automatizado
./iniciar-com-caddy.sh

# OU iniciar manualmente
mkdir -p logs/caddy
docker-compose up -d
```

### 6. Verificar status

```bash
# Ver status dos serviços
docker-compose ps

# Ver logs do Caddy
docker-compose logs -f caddy
```

## 🌐 Acessar a Aplicação

Após iniciar, acesse:

- **Frontend**: `https://av.aion.eng.br`
- **API**: `https://av.aion.eng.br/api/*`

O Caddy vai:
1. Obter certificado SSL automaticamente na primeira requisição (pode levar 10-30 segundos)
2. Redirecionar automaticamente HTTP → HTTPS
3. Fazer proxy reverso para frontend e backend

## 📋 Verificação

### Verificar se o Caddy está rodando

```bash
docker-compose ps caddy
```

### Verificar se obteve certificado SSL

```bash
docker-compose logs caddy | grep -i "certificate\|acme\|ssl"
```

### Testar acesso

```bash
# Testar HTTP (deve redirecionar para HTTPS)
curl -I http://av.aion.eng.br

# Testar HTTPS
curl -I https://av.aion.eng.br
```

## 🔧 Troubleshooting

### Erro: "Porta 80/443 já em uso"

```bash
# Ver qual processo está usando
sudo lsof -i :80
sudo lsof -i :443

# Parar processo (se for outro serviço web)
sudo systemctl stop nginx  # ou apache2, etc.
```

### Certificado SSL não é gerado

1. Verifique DNS: `dig av.aion.eng.br`
2. Verifique se as portas estão abertas: `sudo ufw status`
3. Verifique logs: `docker-compose logs caddy | grep -i "acme"`

### 502 Bad Gateway

1. Verifique se os serviços estão rodando:
   ```bash
   docker-compose ps
   ```

2. Verifique logs:
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   ```

## 📊 Comandos Úteis

```bash
# Ver logs em tempo real
docker-compose logs -f caddy

# Reiniciar tudo
docker-compose restart

# Parar tudo
docker-compose down

# Ver status
docker-compose ps

# Verificar certificados SSL
docker-compose exec caddy ls -la /data/caddy/certificates/
```

## 🔐 Segurança

O Caddy já configura automaticamente:
- ✅ HSTS (Strict-Transport-Security)
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ X-XSS-Protection
- ✅ Referrer-Policy

## 📝 Notas Importantes

1. **Primeira vez**: O certificado SSL pode levar 10-30 segundos para ser obtido
2. **DNS**: Aguarde propagação do DNS antes de iniciar (pode levar alguns minutos)
3. **Portas**: Certifique-se de que 80 e 443 estão abertas no firewall
4. **Backup**: Os certificados SSL são salvos no volume `caddy_data` automaticamente

## ✅ Tudo Pronto!

Após seguir esses passos, sua aplicação estará disponível em:
- **https://av.aion.eng.br**

Com SSL automático e renovação automática de certificados! 🎉

