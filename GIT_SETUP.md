# Configuração do Git e Deploy

## Passo 1: Inicializar o Repositório Git (se ainda não foi feito)

```bash
cd /Users/leandroborges/app-aion-effort
git init
git add .
git commit -m "Initial commit"
```

## Passo 2: Criar Repositório no GitHub

1. Acesse https://github.com e crie um novo repositório
2. NÃO inicialize com README, .gitignore ou licença (já temos esses arquivos)

## Passo 3: Conectar ao Repositório Remoto

```bash
git remote add origin https://github.com/SEU_USUARIO/app-aion-effort.git
git branch -M main
git push -u origin main
```

## Passo 4: Verificar Arquivos que NÃO Devem ser Commitados

O arquivo `.gitignore` já está configurado para ignorar:
- `.env` - Variáveis de ambiente (contém senhas e tokens)
- `*.db` - Banco de dados SQLite
- `node_modules/` - Dependências
- `dist/` - Build do frontend

**IMPORTANTE:** Antes de fazer o primeiro commit, verifique:

```bash
# Ver o que será commitado
git status

# Verificar se .env está sendo ignorado
git check-ignore .env
# Deve retornar: .env

# Se .env aparecer no git status, adicione manualmente:
echo ".env" >> .gitignore
```

## Passo 5: Criar Arquivo .env.example (Opcional mas Recomendado)

Crie um arquivo `.env.example` com valores de exemplo (sem senhas reais):

```bash
cat > .env.example << 'EOF'
NODE_ENV=production
PORT=4000
DATABASE_URL=file:./prisma/dev.db
JWT_SECRET=your-secret-key-change-in-production
USE_MOCK=false
EFFORT_BASE_URL=https://sjh.globalthings.net
EFFORT_API_KEY=your-token-here
EOF
```

## Passo 6: Fazer o Commit e Push

```bash
# Adicionar todos os arquivos (exceto os ignorados)
git add .

# Verificar o que será commitado
git status

# Fazer commit
git commit -m "Setup inicial do projeto com Docker"

# Push para o GitHub
git push -u origin main
```

## Passo 7: Deploy em Outra Máquina

Na outra máquina onde você quer fazer o deploy:

```bash
# 1. Clonar o repositório
git clone https://github.com/SEU_USUARIO/app-aion-effort.git
cd app-aion-effort

# 2. Criar arquivo .env com suas configurações
nano .env
# Cole as variáveis de ambiente necessárias

# 3. Build e executar com Docker
docker-compose build
docker-compose up -d

# 4. Executar migrações
docker-compose exec app pnpm prisma:migrate deploy

# 5. Criar usuário admin
docker-compose exec app pnpm create:admin
```

## Checklist Antes de Fazer Push

- [ ] `.env` está no `.gitignore` e não será commitado
- [ ] `prisma/dev.db` está no `.gitignore` e não será commitado
- [ ] `node_modules/` está no `.gitignore`
- [ ] Não há senhas ou tokens reais em arquivos commitados
- [ ] `Dockerfile` e `docker-compose.yml` estão no repositório
- [ ] `README.md` e `DEPLOY.md` estão atualizados

## Arquivos Importantes que DEVEM estar no Repositório

✅ `Dockerfile`
✅ `docker-compose.yml`
✅ `package.json`
✅ `pnpm-lock.yaml`
✅ `tsconfig.json`
✅ `vite.config.ts`
✅ `prisma/schema.prisma`
✅ `src/` (todo o código fonte)
✅ `README.md`
✅ `DEPLOY.md`
✅ `.gitignore`

## Arquivos que NÃO DEVEM estar no Repositório

❌ `.env` (contém senhas e tokens)
❌ `*.db` (banco de dados)
❌ `node_modules/` (dependências)
❌ `dist/` (build do frontend)
❌ `uploads/` (arquivos enviados pelos usuários)

