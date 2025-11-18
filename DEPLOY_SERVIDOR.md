# Deploy no Servidor - Guia Completo

Este guia explica como fazer o deploy da aplicação Aion Effort em um servidor usando Docker.

## Pré-requisitos no Servidor

- Docker instalado (versão 20.10 ou superior)
- Docker Compose instalado (versão 2.0 ou superior)
- Git instalado
- Acesso SSH ao servidor
- Porta 4000 (ou outra configurada) liberada no firewall

## Passo 1: Conectar ao Servidor

```bash
ssh usuario@seu-servidor.com
# ou
ssh usuario@IP_DO_SERVIDOR
```

## Passo 2: Instalar Docker (se não estiver instalado)

### Ubuntu/Debian:
```bash
# Atualizar pacotes
sudo apt update
sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Adicionar usuário ao grupo docker (para não precisar sudo)
sudo usermod -aG docker $USER
# Depois faça logout e login novamente
```

### CentOS/RHEL:
```bash
# Instalar Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
```

## Passo 3: Criar Diretório da Aplicação

```bash
# Criar diretório (ajuste o caminho conforme necessário)
mkdir -p /opt/aion-effort
cd /opt/aion-effort
# ou
mkdir -p ~/aion-effort
cd ~/aion-effort
```

## Passo 4: Clonar o Repositório

```bash
# Clonar do GitHub
git clone https://github.com/leandroborgeseng/app-aion-effort.git .

# Ou se já tiver o diretório criado:
cd /opt/aion-effort
git clone https://github.com/leandroborgeseng/app-aion-effort.git .
```

## Passo 5: Configurar Variáveis de Ambiente

```bash
# Criar arquivo .env
nano .env
# ou
vi .env
```

Cole o conteúdo mínimo necessário (ajuste conforme sua configuração):

```env
# Configuração da Aplicação
NODE_ENV=production
PORT=4000
USE_MOCK=false
FRONTEND_URL=http://SEU_IP_OU_DOMINIO:4000

# Banco de Dados (SQLite)
DATABASE_URL=file:./prisma/dev.db

# Segurança - ALTERE ESTA CHAVE!
JWT_SECRET=GERE_UMA_CHAVE_SECRETA_FORTE_AQUI

# API Effort/PowerBI
EFFORT_BASE_URL=https://sjh.globalthings.net
EFFORT_API_KEY=seu-token-aqui

# Adicione os outros tokens conforme necessário (veja API_TOKENS.md)
API_PBI_REL_CRONO_MANU=seu-token
API_PBI_TIP_MANU=seu-token
# ... etc
```

**Gerar JWT_SECRET seguro:**
```bash
# No servidor, gere uma chave aleatória:
openssl rand -base64 32
# Use o resultado como JWT_SECRET
```

## Passo 6: Criar Diretórios Necessários

```bash
# Criar diretórios para volumes persistentes
mkdir -p prisma uploads/contracts

# Ajustar permissões
chmod -R 755 prisma uploads
```

## Passo 7: Build e Executar

```bash
# Build da imagem Docker
docker-compose build

# Iniciar a aplicação em background
docker-compose up -d

# Ver logs para verificar se está funcionando
docker-compose logs -f
# Pressione Ctrl+C para sair dos logs
```

## Passo 8: Executar Migrações e Criar Admin

```bash
# Executar migrações do banco de dados
docker-compose exec app pnpm prisma:migrate deploy

# Criar usuário administrador
docker-compose exec app pnpm create:admin
```

## Passo 9: Verificar se Está Funcionando

```bash
# Verificar status do container
docker-compose ps

# Verificar health check
curl http://localhost:4000/health
# Deve retornar: {"ok":true,"mock":false}

# Ver logs
docker-compose logs app
```

## Passo 10: Configurar Firewall (se necessário)

### UFW (Ubuntu):
```bash
sudo ufw allow 4000/tcp
sudo ufw reload
```

### Firewalld (CentOS/RHEL):
```bash
sudo firewall-cmd --permanent --add-port=4000/tcp
sudo firewall-cmd --reload
```

## Atualizar a Aplicação (Deploy Contínuo)

Quando houver novas atualizações:

```bash
cd /opt/aion-effort  # ou onde você colocou o projeto

# Parar a aplicação
docker-compose down

# Atualizar código do GitHub
git pull origin main

# Rebuild (pode usar --no-cache se houver problemas)
docker-compose build

# Iniciar novamente
docker-compose up -d

# Executar migrações se houver novas
docker-compose exec app pnpm prisma:migrate deploy

# Ver logs
docker-compose logs -f
```

## Script de Deploy Automatizado

Crie um arquivo `deploy.sh` para facilitar:

```bash
#!/bin/bash
set -e

echo "🚀 Iniciando deploy..."

# Parar containers
echo "⏹️  Parando containers..."
docker-compose down

# Atualizar código
echo "📥 Atualizando código..."
git pull origin main

# Build
echo "🔨 Fazendo build..."
docker-compose build

# Iniciar
echo "▶️  Iniciando aplicação..."
docker-compose up -d

# Migrações
echo "🗄️  Executando migrações..."
docker-compose exec -T app pnpm prisma:migrate deploy

echo "✅ Deploy concluído!"
echo "📊 Verificando status..."
docker-compose ps
```

Tornar executável:
```bash
chmod +x deploy.sh
```

Usar:
```bash
./deploy.sh
```

## Configurar Nginx como Proxy Reverso (Recomendado)

Para usar HTTPS e domínio personalizado:

### 1. Instalar Nginx:
```bash
sudo apt install nginx  # Ubuntu/Debian
# ou
sudo yum install nginx  # CentOS/RHEL
```

### 2. Configurar Nginx:

Crie `/etc/nginx/sites-available/aion-effort`:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
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
}
```

### 3. Ativar configuração:
```bash
sudo ln -s /etc/nginx/sites-available/aion-effort /etc/nginx/sites-enabled/
sudo nginx -t  # Testar configuração
sudo systemctl reload nginx
```

### 4. Configurar HTTPS com Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx  # Ubuntu/Debian
sudo certbot --nginx -d seu-dominio.com
```

## Backup do Banco de Dados

### Criar backup:
```bash
# Backup manual
cp prisma/dev.db prisma/dev.db.backup-$(date +%Y%m%d-%H%M%S)

# Ou usando Docker
docker-compose exec app cp prisma/dev.db prisma/dev.db.backup
```

### Restaurar backup:
```bash
# Parar aplicação
docker-compose down

# Restaurar arquivo
cp prisma/dev.db.backup-YYYYMMDD-HHMMSS prisma/dev.db

# Iniciar novamente
docker-compose up -d
```

## Monitoramento e Logs

### Ver logs em tempo real:
```bash
docker-compose logs -f app
```

### Ver últimas 100 linhas:
```bash
docker-compose logs --tail=100 app
```

### Verificar uso de recursos:
```bash
docker stats aion-effort-app
```

## Troubleshooting

### Container não inicia:
```bash
# Ver logs detalhados
docker-compose logs app

# Verificar se a porta está em uso
sudo netstat -tulpn | grep 4000
# ou
sudo ss -tulpn | grep 4000
```

### Erro de permissões:
```bash
# Ajustar permissões
sudo chown -R $USER:$USER prisma/ uploads/
chmod -R 755 prisma/ uploads/
```

### Rebuild completo:
```bash
# Parar e remover tudo
docker-compose down -v
docker rmi aion-effort-app

# Rebuild do zero
docker-compose build --no-cache
docker-compose up -d
```

### Verificar variáveis de ambiente:
```bash
docker-compose exec app env | grep -E 'DATABASE_URL|JWT_SECRET|PORT|EFFORT'
```

### Container reiniciando constantemente:
```bash
# Ver logs para identificar erro
docker-compose logs app

# Verificar health check
docker-compose exec app curl http://localhost:4000/health
```

## Comandos Úteis

```bash
# Parar aplicação
docker-compose down

# Parar e remover volumes (CUIDADO: apaga banco de dados!)
docker-compose down -v

# Reiniciar aplicação
docker-compose restart

# Ver status
docker-compose ps

# Acessar shell do container
docker-compose exec app sh

# Executar comando específico
docker-compose exec app pnpm create:admin
```

## Segurança em Produção

⚠️ **IMPORTANTE:**

1. ✅ Use HTTPS (configure certificado SSL)
2. ✅ Altere o `JWT_SECRET` para uma chave forte e única
3. ✅ Configure firewall adequadamente
4. ✅ Mantenha Docker e dependências atualizadas
5. ✅ Faça backups regulares do banco de dados
6. ✅ Use senhas fortes para acesso SSH
7. ✅ Configure rate limiting adequado
8. ✅ Monitore logs regularmente

## Próximos Passos

- [ ] Configurar domínio personalizado
- [ ] Configurar HTTPS/SSL
- [ ] Configurar backup automático
- [ ] Configurar monitoramento (ex: PM2, New Relic)
- [ ] Configurar CI/CD (GitHub Actions, GitLab CI)

