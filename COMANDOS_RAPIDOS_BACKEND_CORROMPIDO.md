# 🔧 Comandos Rápidos: Resolver Container Backend Corrompido

## Problema
Erro `KeyError: 'ContainerConfig'` ao tentar recriar o container backend.

## Solução Rápida

### Opção 1: Usar o script automatizado (RECOMENDADO)
```bash
cd /opt/apps/app-aion-effort
chmod +x resolver-backend-corrompido.sh
./resolver-backend-corrompido.sh
```

### Opção 2: Comandos manuais

#### 1. Parar e remover container corrompido
```bash
cd /opt/apps/app-aion-effort
docker-compose stop backend
docker rm -f aion-effort-backend 58b68f58b28c_aion-effort-backend
docker-compose rm -f backend
```

#### 2. Remover imagem antiga
```bash
docker rmi app-aion-effort_backend
# ou encontrar e remover por ID
docker images | grep backend
docker rmi <IMAGE_ID>
```

#### 3. Rebuild completo
```bash
docker-compose build --no-cache backend
```

#### 4. Criar e iniciar novo container
```bash
docker-compose up -d backend
```

#### 5. Verificar status
```bash
docker-compose ps backend
docker-compose logs --tail=50 backend
```

## Verificação

```bash
# Ver status
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f backend

# Testar health check
curl http://localhost:4000/health
```

## Se ainda não funcionar

```bash
# Remover todos os containers backend
docker ps -a | grep backend | awk '{print $1}' | xargs docker rm -f

# Remover todas as imagens backend
docker images | grep backend | awk '{print $3}' | xargs docker rmi -f

# Limpar volumes órfãos (cuidado!)
docker volume prune -f

# Rebuild completo do zero
docker-compose build --no-cache backend
docker-compose up -d backend
```

