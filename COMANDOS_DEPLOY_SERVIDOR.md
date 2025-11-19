# Comandos para Deploy no Servidor

## ⚠️ IMPORTANTE: Sempre fazer pull primeiro!

Antes de executar qualquer script, sempre faça pull do Git:

```bash
cd /opt/apps/app-aion-effort
git pull origin main
```

## 🚀 Deploy Completo (RECOMENDADO)

```bash
cd /opt/apps/app-aion-effort

# 1. Pull das mudanças
git pull origin main

# 2. Dar permissão de execução
chmod +x deploy-producao-completo.sh

# 3. Executar
./deploy-producao-completo.sh
```

## 🎯 Deploy Apenas Setores da API

```bash
cd /opt/apps/app-aion-effort

# 1. Pull das mudanças
git pull origin main

# 2. Dar permissão de execução
chmod +x deploy-setores-effort.sh

# 3. Executar
./deploy-setores-effort.sh
```

## 🔧 Deploy Manual (se scripts não funcionarem)

```bash
cd /opt/apps/app-aion-effort

# 1. Pull
git pull origin main

# 2. Verificar último commit
git log --oneline -1

# 3. Parar containers
docker-compose down

# 4. Rebuild backend SEM cache
docker-compose build --no-cache --pull backend

# 5. Rebuild frontend SEM cache (se necessário)
docker-compose build --no-cache --pull frontend

# 6. Subir containers
docker-compose up -d

# 7. Aguardar
sleep 30

# 8. Verificar status
docker-compose ps

# 9. Testar API
curl http://localhost:4000/api/ecm/investments/sectors/list
```

## ✅ Verificar se funcionou

```bash
# Testar API de setores
curl http://localhost:4000/api/ecm/investments/sectors/list | jq .

# Ver logs do backend
docker-compose logs backend | tail -50

# Ver status dos containers
docker-compose ps
```

