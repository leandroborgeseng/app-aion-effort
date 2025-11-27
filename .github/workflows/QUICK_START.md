# ⚡ Quick Start - CI/CD

## 🚀 Configuração Rápida (5 minutos)

### 1. Configurar Secrets no GitHub

Vá em: `https://github.com/SEU_USUARIO/SEU_REPO/settings/secrets/actions`

Adicione:
- `SSH_PRIVATE_KEY` - Sua chave privada SSH
- `SSH_HOST` - IP do servidor (ex: `192.168.1.100`)
- `SSH_USER` - Usuário SSH (ex: `root`)
- `DEPLOY_PATH` - Caminho do projeto (ex: `/opt/apps/app-aion-effort`)

### 2. Gerar Chave SSH (se necessário)

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions
ssh-copy-id -i ~/.ssh/github_actions.pub root@seu-servidor
cat ~/.ssh/github_actions  # Copie e cole em SSH_PRIVATE_KEY
```

### 3. Testar

Faça um commit e push para `main`:
```bash
git commit --allow-empty -m "test: testar CI/CD"
git push origin main
```

Verifique em: `https://github.com/SEU_USUARIO/SEU_REPO/actions`

## 📋 O que acontece agora?

✅ **Push para qualquer branch** → CI valida código
✅ **Push para `main`** → Deploy automático para produção
✅ **Abrir PR** → Validação extra + verificação de arquivos sensíveis
✅ **GitHub Actions UI** → Deploy manual disponível

## 🎯 Próximos Passos

1. Configure branch protection (recomendado)
2. Adicione testes automatizados (opcional)
3. Configure notificações (Slack, Email, etc.)

---

**Pronto!** 🎉 Seu CI/CD está configurado.

