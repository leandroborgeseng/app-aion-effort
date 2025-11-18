# Passo a Passo - Deploy Completo

## 🖥️ NA SUA MÁQUINA LOCAL

### 1. Adicionar arquivos ao Git

```bash
cd /Users/leandroborges/app-aion-effort

# Adicionar todos os arquivos novos
git add .

# Verificar o que será commitado
git status
```

### 2. Fazer commit

```bash
git commit -m "Preparar deploy completo no servidor"
```

### 3. Enviar para GitHub

```bash
git push origin main
```

## 🖥️ NO SERVIDOR

### 1. Conectar ao servidor

```bash
ssh root@srv-leandro
```

### 2. Ir para o diretório do projeto

```bash
cd /opt/apps/app-aion-effort
```

### 3. Buscar atualizações do Git

```bash
git pull origin main
```

### 4. Copiar script de deploy (se ainda não estiver)

```bash
# Verificar se script existe
ls -la deploy-completo.sh

# Se não existir, copiar do Git (já deve estar após git pull)
chmod +x deploy-completo.sh
```

### 5. Configurar arquivo .env (se ainda não fez)

```bash
# Verificar se .env existe
ls -la .env

# Se não existir, criar a partir do template
cp ENV_TEMPLATE.txt .env

# Editar .env
nano .env
```

**Configurações mínimas no .env:**
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

### 6. Executar deploy automatizado

```bash
# Executar script de deploy
./deploy-completo.sh
```

**OU fazer manualmente:**

```bash
# Parar containers
docker-compose down

# Build
docker-compose build

# Iniciar
docker-compose up -d

# Aguardar iniciar
sleep 15

# Migrações
docker-compose exec app pnpm prisma:migrate deploy

# Criar admin
docker-compose exec app pnpm create:admin
```

### 7. Verificar se está funcionando

```bash
# Ver status
docker-compose ps

# Ver logs
docker-compose logs -f

# Health check
curl http://localhost:4000/health
```

### 8. Acessar aplicação

Abra no navegador: `http://SEU_IP_DO_SERVIDOR:4000`

## ✅ Checklist Final

- [ ] Arquivos commitados e enviados para Git
- [ ] Git pull executado no servidor
- [ ] Arquivo .env configurado
- [ ] Script deploy-completo.sh executado
- [ ] Container rodando (docker-compose ps)
- [ ] Health check OK (curl http://localhost:4000/health)
- [ ] Migrações executadas
- [ ] Usuário admin criado
- [ ] Aplicação acessível no navegador

## 🆘 Problemas Comuns

### Git pull falha
```bash
git stash
git pull origin main
git stash pop
```

### Docker não está instalado
```bash
apt update
apt install docker.io docker-compose -y
systemctl start docker
```

### Porta 4000 em uso
```bash
# Ver o que está usando
lsof -i :4000
# Parar processo ou mudar porta no docker-compose.yml
```

### Container não inicia
```bash
# Ver logs
docker-compose logs app

# Verificar .env
cat .env
```

