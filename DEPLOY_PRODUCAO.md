# 🚀 Guia de Deploy para Produção

## Deploy Rápido (Recomendado)

Execute o script automatizado:

```bash
cd /opt/apps/app-aion-effort
chmod +x deploy-producao.sh
./deploy-producao.sh
```

## Deploy Manual (Passo a Passo)

Se preferir fazer manualmente ou se o script falhar:

### 1. Conectar ao servidor

```bash
ssh seu-usuario@seu-servidor
cd /opt/apps/app-aion-effort
```

### 2. Fazer backup do banco de dados

```bash
# Backup do banco
cp prisma/dev.db "prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)"
```

### 3. Atualizar código do GitHub

```bash
git fetch origin
git pull origin main
```

### 4. Sincronizar schema do banco (se necessário)

Se houver mudanças no `prisma/schema.prisma`:

```bash
docker-compose run --rm backend pnpm prisma:db:push
```

### 5. Rebuildar containers (se necessário)

Se houver mudanças em `Dockerfile`, `package.json` ou `pnpm-lock.yaml`:

```bash
# Rebuild backend
docker-compose build backend

# Rebuild frontend (se necessário)
docker-compose build frontend
```

### 6. Reiniciar serviços

```bash
docker-compose restart backend frontend
```

### 7. Verificar saúde dos serviços

```bash
# Ver status
docker-compose ps

# Ver logs
docker-compose logs --tail=50 backend
docker-compose logs --tail=50 frontend
```

### 8. Testar aplicação

Acesse: `https://av.aion.eng.br`

## Troubleshooting

### Problema: Erro ao fazer git pull

```bash
# Se houver conflitos locais
git stash
git pull origin main
git stash pop
```

### Problema: Serviços não iniciam

```bash
# Ver logs detalhados
docker-compose logs backend
docker-compose logs frontend

# Verificar se há erros no banco
docker-compose exec backend pnpm prisma db push --skip-generate
```

### Problema: Banco de dados read-only

```bash
# Corrigir permissões
sudo chown -R 1001:1001 prisma/
sudo chmod 666 prisma/dev.db
sudo chmod 755 prisma/

# Remover arquivos auxiliares do SQLite
rm -f prisma/dev.db-journal prisma/dev.db-wal prisma/dev.db-shm

# Reiniciar backend
docker-compose restart backend
```

### Problema: Rollback

Se precisar reverter as mudanças:

```bash
# Restaurar código
git reset --hard HEAD@{1}

# Restaurar banco (se necessário)
cp prisma/dev.db.backup.* prisma/dev.db

# Reiniciar serviços
docker-compose restart backend frontend
```

## Checklist Pós-Deploy

- [ ] Aplicação acessível via HTTPS
- [ ] Login funcionando
- [ ] Criar novo usuário funcionando
- [ ] Setores mostrando nomes corretos
- [ ] Nenhum erro no console do navegador
- [ ] Nenhum erro nos logs do backend

## Contato

Em caso de problemas, verifique:
1. Logs dos containers: `docker-compose logs -f`
2. Status dos containers: `docker-compose ps`
3. Conectividade do banco: `docker-compose exec backend ls -la /app/prisma/`
