# Troubleshooting - Deploy não Atualizou

## Problemas Comuns e Soluções

### 1. Mudanças não foram commitadas e enviadas para o Git

**Verificar:**
```bash
git status
git log --oneline -5
```

**Solução:**
```bash
# Se houver mudanças não commitadas:
git add src/web/routes/InvestmentsPage.tsx
git add src/routes/investments.ts
git add src/routes/config.ts
git add src/routes/lifecycle.ts
git add src/routes/critical.ts
git commit -m "Fix: setores da API Effort e filtros de investimentos"
git push origin main
```

### 2. Servidor não fez git pull corretamente

**No servidor, verificar:**
```bash
cd /opt/apps/app-aion-effort  # ou caminho do projeto
git status
git log --oneline -5
```

**Solução:**
```bash
# Forçar pull
git fetch origin
git reset --hard origin/main
git pull origin main
```

### 3. Docker não reconstruiu os containers

**Verificar:**
```bash
docker-compose ps
docker images | grep app-aion-effort
```

**Solução:**
```bash
# Parar tudo
docker-compose down

# Remover imagens antigas
docker rmi app-aion-effort_backend app-aion-effort_frontend 2>/dev/null || true

# Rebuild FORÇADO sem cache
docker-compose build --no-cache --pull backend frontend

# Subir novamente
docker-compose up -d

# Verificar logs
docker-compose logs -f backend
```

### 4. Cache do navegador

**Solução:**
- Limpar cache do navegador (Ctrl+Shift+Del)
- Hard refresh (Ctrl+Shift+R ou Cmd+Shift+R)
- Abrir em aba anônima/privada

### 5. Frontend não foi reconstruído

**Verificar se o frontend tem as mudanças:**
```bash
# No servidor
docker-compose exec frontend ls -la /usr/share/nginx/html/
docker-compose exec frontend cat /usr/share/nginx/html/index.html | head -20
```

**Solução:**
```bash
# Rebuild completo do frontend
docker-compose down frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### 6. Verificar se as mudanças estão no código

**No servidor, verificar arquivo:**
```bash
# Verificar se a ordem das queries está correta
docker-compose exec backend cat /app/src/web/routes/InvestmentsPage.tsx | grep -A 10 "Buscar setores"
```

**Deve mostrar:**
```typescript
// Buscar setores disponíveis da API do Effort PRIMEIRO
const { data: sectorsData, ... } = useQuery(...)
const sectors = sectorsData?.sectors || [];

// Buscar investimentos DEPOIS dos setores
const { data: investments, ... } = useQuery(...)
```

## Script de Deploy Completo e Forçado

Crie este script no servidor como `deploy-forcado.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 DEPLOY FORÇADO - Removendo tudo e reconstruindo do zero"
echo "=========================================================="

cd /opt/apps/app-aion-effort  # Ajuste o caminho

# 1. Atualizar código
echo "📥 1. Atualizando código..."
git fetch origin
git reset --hard origin/main
git pull origin main

# 2. Parar e remover tudo
echo "🛑 2. Parando e removendo containers..."
docker-compose down --remove-orphans -v

# 3. Remover imagens antigas
echo "🗑️  3. Removendo imagens antigas..."
docker rmi app-aion-effort_backend app-aion-effort_frontend 2>/dev/null || true
docker system prune -f

# 4. Rebuild completo SEM CACHE
echo "🔨 4. Rebuild completo (sem cache)..."
docker-compose build --no-cache --pull backend frontend

# 5. Subir containers
echo "⬆️  5. Subindo containers..."
docker-compose up -d

# 6. Aguardar
echo "⏳ 6. Aguardando containers iniciarem..."
sleep 15

# 7. Verificar status
echo "📊 7. Status dos containers:"
docker-compose ps

# 8. Verificar logs
echo ""
echo "📋 Últimas linhas dos logs do backend:"
docker-compose logs --tail=20 backend

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "🔍 Para ver logs em tempo real:"
echo "  docker-compose logs -f backend"
echo "  docker-compose logs -f frontend"
```

## Verificação Final

Após o deploy, verificar:

1. **Containers rodando:**
```bash
docker-compose ps
# Deve mostrar ambos como "Up (healthy)"
```

2. **Código atualizado:**
```bash
docker-compose exec backend cat /app/src/web/routes/InvestmentsPage.tsx | grep "PRIMEIRO" | head -1
# Deve mostrar o comentário "PRIMEIRO"
```

3. **API funcionando:**
```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/ecm/investments/sectors/list | jq '.total'
# Deve retornar número de setores
```

4. **Frontend atualizado:**
- Acesse a aplicação
- Abra DevTools (F12)
- Vá para Network
- Recarregue a página
- Verifique se os arquivos JS têm timestamp recente

## Se ainda não funcionar

1. **Verificar logs completos:**
```bash
docker-compose logs backend > backend.log 2>&1
docker-compose logs frontend > frontend.log 2>&1
cat backend.log | tail -50
```

2. **Verificar se o código está correto no container:**
```bash
docker-compose exec backend ls -la /app/src/web/routes/
docker-compose exec backend grep -n "PRIMEIRO" /app/src/web/routes/InvestmentsPage.tsx
```

3. **Reiniciar completamente:**
```bash
docker-compose down
docker system prune -a -f  # CUIDADO: remove todas as imagens não usadas
docker-compose build --no-cache backend frontend
docker-compose up -d
```

