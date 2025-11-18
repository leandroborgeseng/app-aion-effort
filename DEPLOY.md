# Guia de Deploy - Aion Effort

Este guia explica como fazer o deploy da aplicação Aion Effort em outra máquina usando Docker.

## Pré-requisitos

- Docker instalado (versão 20.10 ou superior)
- Docker Compose instalado (versão 2.0 ou superior)
- Git instalado
- Acesso ao repositório GitHub

## Passo 1: Clonar o Repositório

Na máquina onde você quer fazer o deploy:

```bash
# Clonar o repositório
git clone https://github.com/SEU_USUARIO/app-aion-effort.git
cd app-aion-effort
```

## Passo 2: Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```bash
# Copiar o arquivo de exemplo
cp .env.example .env

# Editar o arquivo .env com suas configurações
nano .env  # ou use seu editor preferido
```

**Importante:** Configure pelo menos estas variáveis:

```env
# Segurança - ALTERE ESTA CHAVE!
JWT_SECRET=sua-chave-secreta-forte-aqui-use-um-gerador-de-chaves

# Banco de Dados
DATABASE_URL=file:./prisma/dev.db

# API Effort (se não usar modo mock)
USE_MOCK=false
EFFORT_BASE_URL=https://sjh.globalthings.net
EFFORT_API_KEY=seu-token-aqui

# Porta da aplicação
PORT=4000
FRONTEND_URL=http://localhost:4000
```

Veja `API_TOKENS.md` para a lista completa de tokens necessários.

## Passo 3: Build e Execução com Docker

### Opção A: Usando Docker Compose (Recomendado)

```bash
# Build da imagem
docker-compose build

# Iniciar a aplicação em background
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar a aplicação
docker-compose down
```

### Opção B: Usando Docker diretamente

```bash
# Build da imagem
docker build -t aion-effort-app .

# Executar o container
docker run -d \
  --name aion-effort-app \
  -p 4000:4000 \
  --env-file .env \
  -v $(pwd)/prisma/dev.db:/app/prisma/dev.db \
  -v $(pwd)/uploads:/app/uploads \
  aion-effort-app

# Ver logs
docker logs -f aion-effort-app

# Parar o container
docker stop aion-effort-app
docker rm aion-effort-app
```

## Passo 4: Executar Migrações do Banco de Dados

Após iniciar o container pela primeira vez, execute as migrações:

```bash
# Usando Docker Compose
docker-compose exec app pnpm prisma:migrate deploy

# Ou usando Docker diretamente
docker exec aion-effort-app pnpm prisma:migrate deploy
```

## Passo 5: Criar Usuário Administrador

Crie um usuário administrador inicial:

```bash
# Usando Docker Compose
docker-compose exec app pnpm create:admin

# Ou usando Docker diretamente
docker exec -it aion-effort-app pnpm create:admin
```

## Passo 6: Verificar se Está Funcionando

Acesse a aplicação em: `http://localhost:4000`

Verifique o health check:
```bash
curl http://localhost:4000/health
```

Deve retornar: `{"ok":true,"mock":false}`

## Atualizando a Aplicação

Quando houver novas atualizações no repositório:

```bash
# Parar a aplicação
docker-compose down

# Atualizar o código
git pull origin main  # ou sua branch principal

# Rebuild da imagem
docker-compose build --no-cache

# Iniciar novamente
docker-compose up -d

# Executar migrações se houver novas
docker-compose exec app pnpm prisma:migrate deploy
```

## Configuração de Produção

### Alterar Porta

Edite o `docker-compose.yml`:

```yaml
ports:
  - "8080:4000"  # Porta externa:porta interna
```

E atualize `FRONTEND_URL` no `.env`:
```env
FRONTEND_URL=http://seu-dominio.com:8080
```

### Usar Banco de Dados PostgreSQL (Opcional)

Se preferir usar PostgreSQL ao invés de SQLite:

1. Configure o `DATABASE_URL` no `.env`:
```env
DATABASE_URL=postgresql://usuario:senha@postgres:5432/aion_effort
```

2. Adicione um serviço PostgreSQL no `docker-compose.yml`:
```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: usuario
      POSTGRES_PASSWORD: senha
      POSTGRES_DB: aion_effort
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  app:
    # ... configuração existente ...
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### Configurar HTTPS (Recomendado para Produção)

Use um proxy reverso como Nginx ou Traefik na frente da aplicação. Exemplo com Nginx:

```nginx
server {
    listen 443 ssl;
    server_name seu-dominio.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Backup do Banco de Dados

O banco SQLite está em `./prisma/dev.db`. Para fazer backup:

```bash
# Copiar o arquivo
cp prisma/dev.db prisma/dev.db.backup-$(date +%Y%m%d)

# Ou usando Docker
docker-compose exec app cp prisma/dev.db prisma/dev.db.backup
```

## Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
docker-compose logs app

# Verificar se a porta está em uso
netstat -tulpn | grep 4000
# ou
lsof -i :4000
```

### Erro de permissões

```bash
# Ajustar permissões dos volumes
sudo chown -R $USER:$USER prisma/
sudo chown -R $USER:$USER uploads/
```

### Rebuild completo

```bash
# Parar e remover tudo
docker-compose down -v
docker rmi aion-effort-app

# Rebuild do zero
docker-compose build --no-cache
docker-compose up -d
```

### Verificar variáveis de ambiente

```bash
# Ver variáveis do container
docker-compose exec app env | grep -E 'DATABASE_URL|JWT_SECRET|PORT'
```

## Estrutura de Arquivos Importantes

- `Dockerfile` - Configuração do build da imagem Docker
- `docker-compose.yml` - Configuração do Docker Compose
- `.env` - Variáveis de ambiente (NÃO commitar no Git!)
- `.env.example` - Exemplo de variáveis de ambiente
- `.gitignore` - Arquivos ignorados pelo Git
- `prisma/dev.db` - Banco de dados SQLite (NÃO commitar no Git!)

## Segurança

⚠️ **IMPORTANTE:**

1. **NUNCA** commite o arquivo `.env` no Git
2. **SEMPRE** altere o `JWT_SECRET` em produção
3. Use senhas fortes para o banco de dados
4. Configure firewall adequadamente
5. Use HTTPS em produção
6. Mantenha o Docker e dependências atualizadas

## Suporte

Para mais informações, consulte:
- `README.md` - Documentação geral
- `README.DOCKER.md` - Guia detalhado do Docker
- `API_TOKENS.md` - Configuração de tokens da API

