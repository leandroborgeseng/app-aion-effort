# Configurar Produção - Dados e APIs

## Passo 1: Copiar banco de dados do desenvolvimento

### No seu computador (desenvolvimento):

```bash
cd /Users/leandroborges/app-aion-effort

# Verificar tamanho do banco
ls -lh prisma/dev.db

# Copiar para o servidor via SCP
scp prisma/dev.db root@SEU_IP:/tmp/dev.db
```

### No servidor:

```bash
cd /opt/apps/app-aion-effort

# Fazer pull das mudanças
git pull origin main

# Executar script de migração
chmod +x migrar-banco-producao.sh
./migrar-banco-producao.sh
```

## Passo 2: Configurar variáveis de ambiente (APIs)

### No servidor:

```bash
cd /opt/apps/app-aion-effort

# 1. Copiar template
cp ENV_TEMPLATE.txt .env

# 2. Editar o arquivo .env com seus tokens reais
nano .env
# ou
vi .env
```

### Editar o arquivo .env:

Substitua os valores placeholder pelos seus tokens reais:

```env
# API EFFORT/POWERBI - CONFIGURAÇÃO BASE
EFFORT_BASE_URL=https://sjh.globalthings.net
EFFORT_API_KEY=SEU_TOKEN_AQUI

# API EFFORT/POWERBI - TOKENS ESPECÍFICOS POR ENDPOINT
API_PBI_REL_CRONO_MANU=seu-token-aqui
API_PBI_TIP_MANU=seu-token-aqui
# ... etc
```

**Importante:** Use os mesmos tokens que você usa no ambiente de desenvolvimento!

## Passo 3: Reiniciar containers

```bash
cd /opt/apps/app-aion-effort

# Reiniciar para carregar novas variáveis de ambiente
docker-compose down
docker-compose up -d

# Verificar logs
docker-compose logs -f backend
```

## Passo 4: Verificar se está funcionando

```bash
# Testar API diretamente
curl http://localhost:4000/api/ecm/lifecycle/mes-a-mes

# Ver logs do backend
docker-compose logs --tail=50 backend
```

## Resumo rápido

```bash
# 1. No desenvolvimento: copiar banco
scp prisma/dev.db root@SEU_IP:/tmp/dev.db

# 2. No servidor: migrar banco e configurar
cd /opt/apps/app-aion-effort
git pull origin main
./migrar-banco-producao.sh

# 3. Configurar .env com tokens reais
cp ENV_TEMPLATE.txt .env
nano .env  # Editar com seus tokens

# 4. Reiniciar
docker-compose down
docker-compose up -d
```

## Verificar se dados aparecem

1. Acesse `http://SEU_IP:3000`
2. Faça login com `admin@aion.com` / `admin123`
3. Verifique se os dados aparecem nas páginas

## Troubleshooting

### APIs não funcionam

```bash
# Verificar se variáveis estão sendo carregadas
docker-compose exec backend env | grep API_PBI

# Ver logs de erro
docker-compose logs backend | grep -i error
```

### Banco de dados vazio

```bash
# Verificar se banco foi copiado
ls -lh prisma/dev.db

# Verificar tamanho (deve ser maior que alguns KB)
du -h prisma/dev.db
```

