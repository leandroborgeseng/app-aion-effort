# Deploy Completo - Git → Servidor → Docker

Guia completo para fazer deploy da aplicação no servidor usando Git e Docker.

## Passo 1: Preparar e Enviar para o Git (Máquina Local)

### 1.1 Verificar mudanças

```bash
cd /Users/leandroborges/app-aion-effort
git status
```

### 1.2 Adicionar arquivos ao Git

```bash
# Adicionar todos os arquivos novos/modificados
git add .

# Se quiser incluir o banco de dados (opcional):
# git add -f prisma/dev.db
# git add uploads/

# Verificar o que será commitado
git status
```

### 1.3 Fazer commit

```bash
git commit -m "Atualização: preparar deploy no servidor"
```

### 1.4 Enviar para o GitHub

```bash
git push origin main
```

## Passo 2: No Servidor - Buscar Atualizações

### 2.1 Conectar ao servidor

```bash
ssh root@srv-leandro
# ou
ssh usuario@IP_DO_SERVIDOR
```

### 2.2 Ir para o diretório do projeto

```bash
cd /opt/apps/app-aion-effort
```

### 2.3 Buscar atualizações do Git

```bash
# Verificar status atual
git status

# Buscar atualizações
git pull origin main

# Se houver conflitos, resolver:
# git stash
# git pull origin main
# git stash pop
```

### 2.4 Verificar arquivos atualizados

```bash
# Verificar se arquivos importantes estão presentes
ls -la
ls -la prisma/
ls -la uploads/ 2>/dev/null || echo "Uploads não existe ainda"
```

## Passo 3: Configurar Variáveis de Ambiente

### 3.1 Criar/Atualizar arquivo .env

```bash
# Se não existir, criar baseado no template
if [ ! -f .env ]; then
    cp ENV_TEMPLATE.txt .env
    echo "Arquivo .env criado. Configure as variáveis!"
fi

# Editar .env
nano .env
# ou
vi .env
```

**Configurações mínimas necessárias:**

```env
NODE_ENV=production
PORT=4000
USE_MOCK=false
FRONTEND_URL=http://SEU_IP_OU_DOMINIO:4000
DATABASE_URL=file:./prisma/dev.db
JWT_SECRET=GERE_UMA_CHAVE_FORTE_AQUI
EFFORT_BASE_URL=https://sjh.globalthings.net
EFFORT_API_KEY=seu-token-aqui
```

**Gerar JWT_SECRET seguro:**
```bash
openssl rand -base64 32
```

### 3.2 Verificar se .env está configurado

```bash
# Verificar se arquivo existe e tem conteúdo
cat .env | grep -v "^#" | grep -v "^$" | head -5
```

## Passo 4: Preparar Docker

### 4.1 Verificar se Docker está instalado

```bash
docker --version
docker-compose --version
```

Se não estiver instalado, instalar:
```bash
# Ubuntu/Debian
apt update
apt install docker.io docker-compose -y
systemctl start docker
systemctl enable docker
```

### 4.2 Criar diretórios necessários

```bash
# Criar diretórios para volumes persistentes
mkdir -p prisma uploads/contracts

# Ajustar permissões
chmod -R 755 prisma uploads
```

## Passo 5: Build e Executar com Docker

### 5.1 Parar containers existentes (se houver)

```bash
docker-compose down
```

### 5.2 Build da imagem Docker

```bash
# Build da imagem
docker-compose build

# Se houver problemas, fazer rebuild completo:
# docker-compose build --no-cache
```

### 5.3 Iniciar aplicação

```bash
# Iniciar em background
docker-compose up -d

# Ver logs em tempo real
docker-compose logs -f
# Pressione Ctrl+C para sair dos logs
```

### 5.4 Verificar status

```bash
# Ver status dos containers
docker-compose ps

# Verificar se está rodando
docker ps | grep aion-effort
```

## Passo 6: Executar Migrações e Configurações

### 6.1 Executar migrações do banco

```bash
# Executar migrações
docker-compose exec app pnpm prisma:migrate deploy

# Se der erro, tentar:
# docker-compose exec app pnpm prisma:generate
# docker-compose exec app pnpm prisma:migrate deploy
```

### 6.2 Criar usuário administrador

```bash
# Criar usuário admin
docker-compose exec app pnpm create:admin

# Seguir as instruções na tela
```

## Passo 7: Verificar se Está Funcionando

### 7.1 Health check

```bash
# Verificar health check
curl http://localhost:4000/health

# Deve retornar: {"ok":true,"mock":false}
```

### 7.2 Ver logs

```bash
# Ver logs recentes
docker-compose logs --tail=50 app

# Ver logs em tempo real
docker-compose logs -f app
```

### 7.3 Testar acesso

```bash
# Verificar porta
netstat -tulpn | grep 4000
# ou
ss -tulpn | grep 4000
```

## Passo 8: Configurar Firewall (se necessário)

```bash
# UFW (Ubuntu)
ufw allow 4000/tcp
ufw reload

# Firewalld (CentOS/RHEL)
firewall-cmd --permanent --add-port=4000/tcp
firewall-cmd --reload
```

## Script Completo de Deploy

Crie um arquivo `deploy-completo.sh` no servidor:

```bash
#!/bin/bash
set -e

echo "🚀 Iniciando deploy completo..."

cd /opt/apps/app-aion-effort

# 1. Buscar atualizações
echo "📥 Buscando atualizações do Git..."
git pull origin main

# 2. Parar containers
echo "⏹️  Parando containers..."
docker-compose down

# 3. Build
echo "🔨 Fazendo build..."
docker-compose build

# 4. Iniciar
echo "▶️  Iniciando aplicação..."
docker-compose up -d

# 5. Aguardar iniciar
echo "⏳ Aguardando aplicação iniciar..."
sleep 10

# 6. Migrações
echo "🗄️  Executando migrações..."
docker-compose exec -T app pnpm prisma:migrate deploy || true

# 7. Verificar
echo "🔍 Verificando status..."
docker-compose ps

echo "✅ Deploy concluído!"
echo "📊 Ver logs: docker-compose logs -f"
```

Tornar executável:
```bash
chmod +x deploy-completo.sh
```

Usar:
```bash
./deploy-completo.sh
```

## Troubleshooting

### Erro: "Cannot connect to Docker daemon"

```bash
# Verificar se Docker está rodando
systemctl status docker

# Iniciar Docker
systemctl start docker
```

### Erro: "Permission denied" ao executar Docker

```bash
# Adicionar usuário ao grupo docker
usermod -aG docker $USER
# Fazer logout e login novamente
```

### Erro: "Port 4000 already in use"

```bash
# Verificar o que está usando a porta
lsof -i :4000
# ou
netstat -tulpn | grep 4000

# Parar processo ou mudar porta no docker-compose.yml
```

### Container não inicia

```bash
# Ver logs detalhados
docker-compose logs app

# Verificar variáveis de ambiente
docker-compose exec app env | grep -E 'DATABASE_URL|JWT_SECRET|PORT'
```

### Banco de dados não encontrado

```bash
# Verificar se arquivo existe
ls -lh prisma/dev.db

# Se não existir, criar diretório e arquivo vazio (será criado pelo Prisma)
mkdir -p prisma
touch prisma/dev.db
chmod 644 prisma/dev.db
```

## Checklist Completo

- [ ] Arquivos commitados e enviados para Git
- [ ] Git pull executado no servidor
- [ ] Arquivo .env configurado no servidor
- [ ] Docker instalado e rodando
- [ ] Diretórios criados (prisma, uploads)
- [ ] Build da imagem executado
- [ ] Container iniciado
- [ ] Migrações executadas
- [ ] Usuário admin criado
- [ ] Health check funcionando
- [ ] Aplicação acessível na porta 4000
- [ ] Firewall configurado (se necessário)

## Comandos Rápidos de Referência

```bash
# Ver status
docker-compose ps

# Ver logs
docker-compose logs -f app

# Reiniciar
docker-compose restart

# Parar
docker-compose down

# Rebuild completo
docker-compose build --no-cache
docker-compose up -d

# Acessar shell do container
docker-compose exec app sh

# Executar comando no container
docker-compose exec app pnpm create:admin
```

