# ✅ Checklist para Deploy em Produção

## 🔧 Configurações Necessárias

### 1. Variáveis de Ambiente (.env)

Certifique-se de que todas as variáveis estão configuradas no servidor:

```env
# Ambiente
NODE_ENV=production
USE_MOCK=false
PORT=4000

# Banco de Dados
DATABASE_URL=file:/app/prisma/dev.db

# JWT Secret (IMPORTANTE: use um valor seguro e único)
JWT_SECRET=sua-chave-secreta-muito-segura-aqui

# API Effort
EFFORT_BASE_URL=https://sjh.globalthings.net
EFFORT_API_KEY=seu-token-effort

# Tokens PowerBI (todos os endpoints necessários)
API_PBI_REL_CRONO_MANU=seu-token
API_PBI_TIP_MANU=seu-token
API_PBI_REL_OS_ANALITICO=seu-token
API_PBI_REL_OS_ANALITICO_RESUMIDO=seu-token
API_PBI_REL_EQUIPAMENTOS=seu-token
API_PBI_REL_TMEF=seu-token
API_PBI_REL_TPM=seu-token
API_PBI_REL_DISP_EQUIPAMENTO=seu-token
API_PBI_REL_DISP_EQUIPAMENTO_MES=seu-token
API_PBI_MONITOR_REACAO=seu-token
API_PBI_MONITOR_ATENDIMENTO=seu-token
API_PBI_ANEXOS_EQUIPAMENTO=seu-token
API_PBI_ANEXOS_OS=seu-token
API_PBI_OFICINA=seu-token

# Frontend
FRONTEND_URL=https://av.aion.eng.br
```

### 2. Caddyfile

Verificar se o Caddyfile está configurado corretamente:

- ✅ Domínio: `av.aion.eng.br`
- ✅ Proxy reverso para backend (`/api/*` → `backend:4000`)
- ✅ Proxy reverso para frontend (`/` → `frontend:80`)
- ✅ Uploads (`/uploads/*` → `backend:4000`)
- ✅ SSL automático habilitado

### 3. Permissões do Banco de Dados

```bash
# Garantir que o banco tem permissões corretas
chmod 664 prisma/dev.db
chmod 755 prisma/
chown -R 1001:1001 prisma/
```

## 🔍 Verificações Pré-Deploy

### Banco de Dados

- [ ] Banco de dados existe e está acessível
- [ ] Schema do Prisma está sincronizado (`prisma db push`)
- [ ] Há backup do banco antes do deploy
- [ ] Usuário admin existe e funciona

### Docker

- [ ] Docker e Docker Compose instalados
- [ ] Portas 80 e 443 disponíveis
- [ ] Espaço em disco suficiente
- [ ] Containers podem acessar a rede

### Código

- [ ] Código atualizado do repositório (`git pull`)
- [ ] Nenhuma funcionalidade de IA ativa (removida)
- [ ] Build do frontend funciona localmente
- [ ] Testes básicos passam

## 🚀 Processo de Deploy

### 1. Backup

```bash
cd /opt/apps/app-aion-effort
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)
```

### 2. Atualizar Código

```bash
git pull origin main
```

### 3. Verificar Mudanças no Schema

Se houver mudanças em `prisma/schema.prisma`:

```bash
docker-compose run --rm backend pnpm prisma:db:push
```

### 4. Rebuild (se necessário)

Se houver mudanças em:
- Código do frontend (`src/web/`)
- Código do backend (`src/routes/`, `src/services/`)
- Dockerfiles
- `package.json` ou dependências

```bash
docker-compose build backend frontend
```

### 5. Reiniciar Serviços

```bash
docker-compose restart backend frontend caddy
```

### 6. Verificar Saúde

```bash
# Verificar containers rodando
docker-compose ps

# Verificar logs
docker-compose logs --tail=50 backend
docker-compose logs --tail=50 frontend
docker-compose logs --tail=50 caddy

# Testar backend
curl http://localhost:4000/health

# Testar frontend (via Caddy)
curl -k https://av.aion.eng.br/health
```

## ✅ Testes Pós-Deploy

### Funcionalidades Críticas

- [ ] Login funciona (admin@aion.com / admin123)
- [ ] Dashboard carrega dados
- [ ] Lista de usuários funciona
- [ ] Criar novo usuário funciona
- [ ] Alterar senha de usuário funciona (admin)
- [ ] Página de rondas funciona
- [ ] Criar/editar ronda funciona
- [ ] Inventário carrega equipamentos
- [ ] Filtros funcionam corretamente

### API Endpoints

- [ ] `GET /api/auth/login` - Login
- [ ] `GET /api/users` - Listar usuários
- [ ] `GET /api/ecm/rounds` - Listar rondas
- [ ] `GET /api/ecm/investments` - Listar investimentos
- [ ] `GET /api/ecm/lifecycle/inventario` - Inventário

### Frontend

- [ ] Página inicial carrega
- [ ] Assets (JS/CSS) carregam corretamente
- [ ] Rotas funcionam (sem erro 404)
- [ ] Imagens e ícones aparecem

### SSL/Caddy

- [ ] HTTPS funciona (certificado válido)
- [ ] Redirecionamento HTTP → HTTPS funciona
- [ ] Domínio `av.aion.eng.br` resolve corretamente

## 🐛 Problemas Conhecidos e Soluções

### Problema: Banco de dados readonly

**Solução:**
```bash
chmod 664 prisma/dev.db
chmod 755 prisma/
chown -R 1001:1001 prisma/
rm -f prisma/dev.db-journal prisma/dev.db-wal prisma/dev.db-shm
docker-compose restart backend
```

### Problema: Frontend em branco

**Solução:**
```bash
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Problema: Containers não sobem

**Solução:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Problema: Erro 500 no login

**Verificar:**
- Permissões do banco
- Logs do backend: `docker-compose logs backend | grep error`
- JWT_SECRET configurado

### Problema: Usuários desaparecem da lista

**Solução:**
- Verificar logs do backend para erros no endpoint `/api/users`
- Verificar se o banco está acessível
- Verificar permissões do arquivo do banco

## 📋 Script de Deploy Automatizado

Use o script `deploy-producao.sh` que já faz a maior parte do trabalho:

```bash
cd /opt/apps/app-aion-effort
chmod +x deploy-producao.sh
./deploy-producao.sh
```

## 🔒 Segurança

### Checklist de Segurança

- [ ] JWT_SECRET é uma string longa e aleatória (não o padrão)
- [ ] Senha padrão do admin foi alterada
- [ ] Portas expostas são apenas 80 e 443 (via Caddy)
- [ ] SSL/HTTPS configurado e funcionando
- [ ] Arquivo `.env` não está no Git (já está no .gitignore)
- [ ] Backups regulares do banco de dados
- [ ] Logs não expõem informações sensíveis

## 📝 Notas Importantes

1. **Não commitar o `.env`** - sempre usar `.env.example` como template
2. **Fazer backup antes de mudanças** - especialmente no banco
3. **Testar localmente primeiro** - se possível, antes de produção
4. **Monitorar logs** - especialmente nas primeiras horas após deploy
5. **Funcionalidade de IA removida** - não está ativa, pode ser implementada no futuro

## 🆘 Suporte

Se encontrar problemas:

1. Verificar logs: `docker-compose logs -f [servico]`
2. Verificar saúde: `docker-compose ps`
3. Verificar recursos: `docker stats`
4. Verificar espaço em disco: `df -h`
5. Consultar documentação de troubleshooting específica

## 📚 Documentação Relacionada

- `IA_RESUMOS_RONDAS.md` - Documentação sobre IA (para implementação futura)
- `CADDY_SETUP.md` - Configuração do Caddy
- `TROUBLESHOOTING_CADDY.md` - Solução de problemas do Caddy
- `deploy-producao.sh` - Script de deploy automatizado

