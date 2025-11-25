# 🔧 Comandos Rápidos: Resolver Container Frontend Corrompido

## Problema
Erro `KeyError: 'ContainerConfig'` ao tentar recriar o container frontend após rebuild.

## Solução Rápida

### Opção 1: Usar o script automatizado (RECOMENDADO)
```bash
cd /opt/apps/app-aion-effort
chmod +x resolver-frontend-corrompido.sh
./resolver-frontend-corrompido.sh
```

### Opção 2: Comandos manuais

#### 1. Parar e remover container corrompido
```bash
cd /opt/apps/app-aion-effort
docker-compose stop frontend
docker rm -f aion-effort-frontend
```

#### 2. Remover imagem antiga
```bash
docker rmi app-aion-effort_frontend
# ou
docker images | grep frontend
docker rmi <IMAGE_ID>
```

#### 3. Rebuild completo
```bash
docker-compose build --no-cache frontend
```

#### 4. Criar e iniciar novo container
```bash
docker-compose up -d frontend
```

#### 5. Verificar status
```bash
docker-compose ps frontend
docker-compose logs --tail=50 frontend
```

## Verificação

```bash
# Ver status
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f frontend

# Testar health check
docker inspect --format='{{.State.Health.Status}}' aion-effort-frontend
```

## Se ainda não funcionar

```bash
# Remover todos os containers frontend
docker ps -a | grep frontend | awk '{print $1}' | xargs docker rm -f

# Remover todas as imagens frontend
docker images | grep frontend | awk '{print $3}' | xargs docker rmi -f

# Limpar volumes órfãos (cuidado!)
docker volume prune -f

# Rebuild completo do zero
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

