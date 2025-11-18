# Deploy Rápido no Servidor

Guia rápido para fazer deploy no servidor em 5 minutos.

## Passos Rápidos

### 1. Conectar ao servidor
```bash
ssh usuario@seu-servidor.com
```

### 2. Instalar Docker (se necessário)
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. Clonar e configurar
```bash
mkdir -p ~/aion-effort && cd ~/aion-effort
git clone https://github.com/leandroborgeseng/app-aion-effort.git .
nano .env  # Configure as variáveis de ambiente
```

### 4. Executar deploy
```bash
chmod +x deploy.sh
./deploy.sh
```

### 5. Criar usuário admin
```bash
docker-compose exec app pnpm create:admin
```

## Arquivo .env Mínimo

```env
NODE_ENV=production
PORT=4000
USE_MOCK=false
FRONTEND_URL=http://SEU_IP:4000
DATABASE_URL=file:./prisma/dev.db
JWT_SECRET=$(openssl rand -base64 32)
EFFORT_BASE_URL=https://sjh.globalthings.net
EFFORT_API_KEY=seu-token-aqui
```

## Comandos Úteis

```bash
# Ver logs
docker-compose logs -f

# Parar
docker-compose down

# Reiniciar
docker-compose restart

# Atualizar (após git pull)
./deploy.sh
```

📖 **Guia completo:** Veja `DEPLOY_SERVIDOR.md` para instruções detalhadas.

