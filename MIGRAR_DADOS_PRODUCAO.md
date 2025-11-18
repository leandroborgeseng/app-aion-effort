# Migrar Dados para Produção

## Opção 1: Copiar banco de dados completo (mais rápido)

### No ambiente de desenvolvimento:

```bash
# 1. Fazer backup do banco de desenvolvimento
cp prisma/dev.db prisma/dev.db.backup

# 2. Comprimir o banco (opcional, para facilitar transferência)
tar -czf dev.db.tar.gz prisma/dev.db
```

### No servidor de produção:

```bash
cd /opt/apps/app-aion-effort

# 1. Parar o backend
docker-compose stop backend

# 2. Fazer backup do banco atual (caso precise reverter)
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)

# 3. Copiar o banco do desenvolvimento
# Opção A: Via SCP (do seu computador local)
scp prisma/dev.db root@SEU_IP:/opt/apps/app-aion-effort/prisma/dev.db

# Opção B: Via Git (se o banco não for muito grande)
# Adicionar temporariamente ao git (não recomendado para produção)
git add prisma/dev.db
git commit -m "Backup: banco de dados de desenvolvimento"
git push origin main

# No servidor:
git pull origin main

# 4. Ajustar permissões
chmod 666 prisma/dev.db

# 5. Reiniciar o backend
docker-compose start backend
```

## Opção 2: Configurar variáveis de ambiente para APIs

### 1. Criar arquivo .env no servidor

```bash
cd /opt/apps/app-aion-effort

# Copiar template
cp ENV_TEMPLATE.txt .env

# Editar o arquivo .env com seus tokens reais
nano .env
```

### 2. Configurar variáveis no docker-compose.yml

O docker-compose.yml precisa ler as variáveis do .env. Verifique se está configurado:

```yaml
environment:
  - EFFORT_BASE_URL=${EFFORT_BASE_URL}
  - EFFORT_API_KEY=${EFFORT_API_KEY}
  - API_PBI_REL_CRONO_MANU=${API_PBI_REL_CRONO_MANU}
  # ... outras variáveis
```

### 3. Reiniciar containers

```bash
docker-compose down
docker-compose up -d
```

## Opção 3: Migrar dados específicos (mais seguro)

Se você tem dados importantes no banco de desenvolvimento:

```bash
# No ambiente de desenvolvimento, exportar dados
docker-compose exec backend pnpm migrate:investments

# No servidor, importar dados
docker-compose exec backend pnpm migrate:investments
```

## Verificar se APIs estão funcionando

```bash
# Ver logs do backend
docker-compose logs -f backend

# Testar uma chamada de API
curl http://localhost:4000/api/ecm/lifecycle/mes-a-mes
```

## Checklist

- [ ] Banco de dados copiado para produção
- [ ] Arquivo .env configurado com tokens reais
- [ ] docker-compose.yml atualizado para usar variáveis do .env
- [ ] Containers reiniciados
- [ ] APIs testadas e funcionando
- [ ] Dados aparecendo na interface

