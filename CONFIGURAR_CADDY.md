# Configuração do Caddy com SSL

Este guia explica como configurar o Caddy como proxy reverso com SSL automático para a aplicação.

## Passos para Configuração

### 1. Configure o domínio no Caddyfile

Edite o arquivo `Caddyfile` e substitua:

```caddyfile
seu-dominio.com
```

Pelo seu domínio real, por exemplo:

```caddyfile
app.aionengenharia.com.br
```

Também configure seu email para receber notificações do Let's Encrypt:

```caddyfile
email seu-email@exemplo.com
```

### 2. Configure o DNS

Configure o DNS do seu domínio para apontar para o IP do servidor:

```
A     seu-dominio.com          -> IP_DO_SERVIDOR
A     www.seu-dominio.com      -> IP_DO_SERVIDOR (opcional)
```

### 3. Remova as portas expostas dos serviços

Os serviços `frontend` e `backend` já estão configurados para não expor portas diretamente (apenas `expose` internamente). O Caddy vai fazer o proxy reverso.

### 4. Inicie os serviços

```bash
cd /opt/apps/app-aion-effort

# Criar diretório para logs do Caddy
mkdir -p logs/caddy

# Subir todos os serviços (incluindo Caddy)
docker-compose up -d

# Verificar se tudo está rodando
docker-compose ps
```

### 5. Verificar logs do Caddy

```bash
# Logs gerais
docker-compose logs -f caddy

# Logs de acesso
tail -f logs/caddy/access.log
```

### 6. Testar acesso

Acesse sua aplicação via HTTPS:
- `https://seu-dominio.com` - Frontend
- `https://seu-dominio.com/api/*` - API Backend

O Caddy vai:
- ✅ Obter certificado SSL automaticamente via Let's Encrypt
- ✅ Renovar automaticamente quando necessário
- ✅ Redirecionar HTTP (porta 80) para HTTPS (porta 443)
- ✅ Fazer proxy reverso para frontend e backend

## Estrutura de URLs

- `https://seu-dominio.com/` → Frontend (aplicação React)
- `https://seu-dominio.com/api/*` → Backend API

## Troubleshooting

### Caddy não inicia

```bash
# Verificar logs
docker-compose logs caddy

# Verificar sintaxe do Caddyfile
docker-compose run --rm caddy caddy validate --config /etc/caddy/Caddyfile
```

### Certificado SSL não é gerado

1. Verifique se o DNS está configurado corretamente
2. Verifique se as portas 80 e 443 estão abertas no firewall
3. Verifique os logs: `docker-compose logs caddy`

### Erro de conexão

1. Verifique se os serviços estão rodando: `docker-compose ps`
2. Verifique se estão na mesma rede: `docker network inspect app-aion-effort_aion-network`
3. Teste conectividade interna: `docker-compose exec caddy ping frontend`

### Desabilitar SSL (apenas para testes)

Para testar sem SSL, use este Caddyfile temporário:

```caddyfile
localhost {
    handle / {
        reverse_proxy frontend:80
    }

    handle /api/* {
        reverse_proxy backend:4000
    }
}
```

## Segurança

O Caddy já inclui headers de segurança:
- HSTS
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy

Você pode adicionar mais headers de segurança no `Caddyfile` se necessário.

## Backup dos Certificados

Os certificados SSL são salvos no volume `caddy_data`. Para fazer backup:

```bash
docker run --rm -v app-aion-effort_caddy_data:/data -v $(pwd):/backup alpine tar czf /backup/caddy-data-backup.tar.gz -C /data .
```

Para restaurar:

```bash
docker run --rm -v app-aion-effort_caddy_data:/data -v $(pwd):/backup alpine tar xzf /backup/caddy-data-backup.tar.gz -C /data
```

