# 🚀 Guia de Configuração CI/CD

Este documento descreve como configurar o pipeline de CI/CD usando GitHub Actions.

## 📋 Visão Geral

O projeto possui 4 workflows principais:

1. **CI** (`ci.yml`) - Validação e build em cada push/PR
2. **CD Produção** (`cd-producao.yml`) - Deploy automático para produção no push em `main`
3. **Validação de PR** (`pr-validation.yml`) - Validações extras para Pull Requests
4. **Deploy Manual** (`manual-deploy.yml`) - Deploy manual via GitHub Actions UI

## 🔧 Configuração Inicial

### 1. Configurar Secrets no GitHub

Acesse: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

Adicione os seguintes secrets:

| Secret | Descrição | Exemplo |
|--------|-----------|---------|
| `SSH_PRIVATE_KEY` | Chave privada SSH para acesso ao servidor | Conteúdo de `~/.ssh/id_rsa` |
| `SSH_HOST` | IP ou hostname do servidor de produção | `192.168.1.100` ou `srv-leandro` |
| `SSH_USER` | Usuário SSH | `root` ou `deploy` |
| `DEPLOY_PATH` | Caminho do projeto no servidor | `/opt/apps/app-aion-effort` |

### 2. Gerar Chave SSH

Se ainda não tiver uma chave SSH para deploy:

```bash
# Gerar chave SSH (no seu computador local)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# Copiar chave pública para o servidor
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub root@seu-servidor

# Copiar chave privada para GitHub Secrets
cat ~/.ssh/github_actions_deploy
# Copie todo o conteúdo e cole em SSH_PRIVATE_KEY no GitHub
```

⚠️ **IMPORTANTE**: Nunca commite a chave privada no repositório!

### 3. Testar Conectividade SSH

No servidor, verifique se o usuário SSH pode executar os comandos necessários:

```bash
# Testar acesso
ssh root@seu-servidor "echo 'Conexão OK'"

# Verificar permissões
ssh root@seu-servidor "cd /opt/apps/app-aion-effort && pwd"
```

## 🔄 Fluxo de CI/CD

### Fluxo Automático (Push para `main`)

```
Push para main
    ↓
[CI] Validar código
    ↓
[CI] Build Backend e Frontend
    ↓
[CD] Deploy para Produção
    ↓
[CD] Verificar serviços
    ↓
✅ Deploy concluído
```

### Fluxo de Pull Request

```
Abrir PR
    ↓
[CI] Validar código
    ↓
[PR Validation] Verificar mudanças
    ↓
[PR Validation] Verificar arquivos sensíveis
    ↓
✅ PR aprovada para merge
```

### Deploy Manual

1. Acesse: `Actions` → `Deploy Manual (Workflow Dispatch)`
2. Clique em `Run workflow`
3. Selecione:
   - **Environment**: `production`
   - **Force Rebuild**: `true` (para rebuild completo) ou `false` (apenas restart)
4. Clique em `Run workflow`

## 📊 Monitoramento

### Ver Status dos Workflows

1. Acesse a aba `Actions` no GitHub
2. Veja o status de cada workflow
3. Clique em um workflow para ver logs detalhados

### Logs no Servidor

Após o deploy, você pode verificar os logs diretamente no servidor:

```bash
# Logs do backend
docker-compose logs -f backend

# Logs do frontend
docker-compose logs -f frontend

# Status dos serviços
docker-compose ps
```

## 🛠️ Troubleshooting

### Erro: "Permission denied (publickey)"

**Causa**: Chave SSH não configurada corretamente.

**Solução**:
1. Verifique se `SSH_PRIVATE_KEY` está configurado corretamente no GitHub
2. Teste a chave manualmente: `ssh -i ~/.ssh/chave_privada root@servidor`
3. Verifique se a chave pública está no `~/.ssh/authorized_keys` do servidor

### Erro: "Deploy failed"

**Causa**: Erro durante o deploy no servidor.

**Solução**:
1. Verifique os logs do workflow no GitHub Actions
2. SSH no servidor e execute manualmente: `cd /opt/apps/app-aion-effort && ./deploy-producao.sh`
3. Verifique logs: `docker-compose logs backend frontend`

### Erro: "ContainerConfig"

**Causa**: Container Docker corrompido.

**Solução**: Execute no servidor:
```bash
cd /opt/apps/app-aion-effort
./resolver-backend-corrompido.sh
# ou
./resolver-frontend-corrompido.sh
```

### Deploy muito lento

**Causa**: Rebuild completo desnecessário.

**Solução**: O workflow detecta automaticamente mudanças e só faz rebuild quando necessário. Se quiser forçar rebuild, use o deploy manual com `force_rebuild: true`.

## 🔒 Segurança

### Boas Práticas

1. ✅ **Use secrets** para dados sensíveis (chaves SSH, tokens, etc.)
2. ✅ **Nunca commite** `.env`, chaves privadas, ou dados sensíveis
3. ✅ **Use branch protection** para `main` (requer aprovação antes de merge)
4. ✅ **Revise PRs** antes de fazer merge
5. ✅ **Monitore logs** após cada deploy

### Branch Protection (Recomendado)

Configure no GitHub:
1. `Settings` → `Branches` → `Add rule`
2. Branch name: `main`
3. Marque:
   - ✅ Require a pull request before merging
   - ✅ Require approvals: 1
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging

## 📝 Personalização

### Adicionar Testes Automatizados

Se você adicionar testes no futuro, modifique `.github/workflows/ci.yml`:

```yaml
- name: 🧪 Executar testes
  run: pnpm test

- name: 📊 Cobertura de código
  run: pnpm test:coverage
```

### Adicionar Linting/Formatting

Se você adicionar ESLint/Prettier:

```yaml
- name: 🔍 Executar ESLint
  run: pnpm lint

- name: 🎨 Verificar formatação
  run: pnpm format:check
```

### Adicionar Ambiente de Staging

Crie um novo workflow `.github/workflows/cd-staging.yml` similar ao de produção, mas:
- Deploy para um servidor de staging
- Trigger em push para branch `develop`
- Use secrets separados (`SSH_HOST_STAGING`, etc.)

## 📚 Recursos Adicionais

- [Documentação GitHub Actions](https://docs.github.com/en/actions)
- [SSH Agent Action](https://github.com/marketplace/actions/ssh-agent)
- [Docker Compose no CI/CD](https://docs.docker.com/compose/ci/)

## ✅ Checklist de Configuração

- [ ] Secrets configurados no GitHub
- [ ] Chave SSH gerada e adicionada ao servidor
- [ ] Conectividade SSH testada
- [ ] Workflow CI testado (fazer um commit de teste)
- [ ] Deploy automático testado (push em `main`)
- [ ] Deploy manual testado
- [ ] Branch protection configurado (recomendado)
- [ ] Equipe notificada sobre o novo processo

---

**Última atualização**: $(date)

