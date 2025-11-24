# 🚀 Guia de Deploy em Produção

## ✅ Status Atual

**Último commit enviado para o GitHub:**
```
feat: implementar filtros de personificação e melhorias no sistema
```

**Mudanças principais:**
- Filtro de personificação funcionando no Dashboard e página OS
- Correção de nomes de setores na personificação
- Menu lateral responsivo para desktop e mobile
- Melhorias de contraste em inputs e labels
- Sistema de ajuda integrado (HelpModal)
- Filtros de investimentos corrigidos

## 📋 Pré-requisitos para Deploy

1. **Acesso SSH ao servidor de produção**
2. **Docker e Docker Compose instalados**
3. **Repositório Git clonado no servidor**
4. **Variáveis de ambiente configuradas (.env)**

## 🔧 Passo a Passo para Deploy

### Opção 1: Deploy Automático (Recomendado)

No servidor de produção, execute:

```bash
# 1. Conectar no servidor
ssh usuario@seu-servidor

# 2. Ir para o diretório do projeto
cd /opt/apps/app-aion-effort  # ou o caminho onde está o projeto

# 3. Fazer pull das mudanças
git pull origin main

# 4. Executar script de deploy
chmod +x deploy-producao-completo.sh
./deploy-producao-completo.sh
```

### Opção 2: Deploy Manual

Se o script automático não funcionar, execute manualmente:

```bash
# 1. Fazer pull
cd /opt/apps/app-aion-effort
git pull origin main

# 2. Verificar último commit
git log --oneline -1

# 3. Parar containers
docker-compose down

# 4. Rebuild backend (sem cache para garantir atualização)
docker-compose build --no-cache backend

# 5. Rebuild frontend (sem cache)
docker-compose build --no-cache frontend

# 6. Subir containers
docker-compose up -d

# 7. Aguardar inicialização
sleep 30

# 8. Verificar status
docker-compose ps

# 9. Ver logs
docker-compose logs -f backend
```

## ✅ Verificações Pós-Deploy

Após o deploy, verifique:

### 1. Status dos Containers
```bash
docker-compose ps
```

Ambos os containers devem estar com status `healthy` ou `Up`.

### 2. Testar API Backend
```bash
curl http://localhost:4000/health
```

Deve retornar: `{"ok":true,"mock":false}`

### 3. Testar API de Setores
```bash
curl http://localhost:4000/api/ecm/investments/sectors/list
```

### 4. Testar Frontend
Acesse no navegador: `http://seu-servidor:3000`

### 5. Testar Filtros de Personificação
1. Faça login como admin
2. Personifique um usuário com setores específicos
3. Verifique se o Dashboard mostra apenas equipamentos dos setores do usuário
4. Verifique se a página OS mostra apenas OS dos setores do usuário

## 🔍 Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
docker-compose logs backend
docker-compose logs frontend

# Verificar se porta está em uso
netstat -tulpn | grep 4000
netstat -tulpn | grep 3000
```

### Erro de permissões no banco

```bash
# Ajustar permissões
chmod 664 prisma/dev.db
chown $USER:$USER prisma/dev.db
```

### Rebuild completo

```bash
# Parar tudo
docker-compose down -v

# Remover imagens antigas
docker rmi aion-effort-backend aion-effort-frontend 2>/dev/null || true

# Rebuild do zero
docker-compose build --no-cache
docker-compose up -d
```

## 📝 Checklist de Deploy

- [ ] Código commitado e enviado para GitHub
- [ ] Pull feito no servidor de produção
- [ ] Containers parados (`docker-compose down`)
- [ ] Rebuild feito (`docker-compose build --no-cache`)
- [ ] Containers iniciados (`docker-compose up -d`)
- [ ] Status dos containers verificado
- [ ] Health check passou
- [ ] Testado login e personificação
- [ ] Testado filtros no Dashboard
- [ ] Testado filtros na página OS
- [ ] Logs verificados (sem erros críticos)

## 🎯 URLs de Produção

Baseado no script de deploy, as URLs prováveis são:
- **Frontend**: `http://189.90.139.222:3000`
- **Backend API**: `http://189.90.139.222:4000`

## ⚠️ Importante

1. **Sempre fazer backup** antes de deploy:
   ```bash
   cp prisma/dev.db prisma/dev.db.backup-$(date +%Y%m%d-%H%M%S)
   ```

2. **Verificar variáveis de ambiente** no servidor:
   ```bash
   docker-compose exec backend env | grep -E 'DATABASE_URL|JWT_SECRET|USE_MOCK'
   ```

3. **Executar migrações** se houver mudanças no schema:
   ```bash
   docker-compose exec backend pnpm prisma:db:push
   ```

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs: `docker-compose logs -f`
2. Verifique o último commit: `git log --oneline -1`
3. Verifique status: `docker-compose ps`
4. Teste manualmente os endpoints da API

