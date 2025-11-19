# Como Verificar e Fazer Deploy em Produção

## 🔍 Verificar se o código foi atualizado

Execute no servidor:

```bash
cd /opt/apps/app-aion-effort

# 1. Verificar último commit
git log --oneline -5

# 2. Verificar se há mudanças não aplicadas
git status

# 3. Verificar diferenças com o remoto
git fetch origin
git log HEAD..origin/main --oneline
```

## 🚀 Deploy Completo (RECOMENDADO)

Use o script completo que faz tudo automaticamente:

```bash
cd /opt/apps/app-aion-effort
chmod +x deploy-producao-completo.sh
./deploy-producao-completo.sh
```

Este script:
- ✅ Verifica status do Git
- ✅ Faz pull das mudanças
- ✅ Para containers
- ✅ Limpa imagens antigas
- ✅ Rebuild COMPLETO sem cache
- ✅ Sobe containers
- ✅ Verifica saúde
- ✅ Testa endpoints
- ✅ Mostra logs detalhados

## 🔧 Deploy Manual (se o script falhar)

```bash
cd /opt/apps/app-aion-effort

# 1. Pull do Git
git pull origin main

# 2. Verificar se houve mudanças
git log --oneline -1

# 3. Parar containers
docker-compose down

# 4. Remover containers antigos
docker-compose rm -f

# 5. Rebuild backend (SEM CACHE)
docker-compose build --no-cache --pull backend

# 6. Rebuild frontend (SEM CACHE)
docker-compose build --no-cache --pull frontend

# 7. Subir containers
docker-compose up -d

# 8. Aguardar
sleep 30

# 9. Verificar status
docker-compose ps

# 10. Ver logs
docker-compose logs --tail=50 backend
docker-compose logs --tail=30 frontend
```

## 🐛 Troubleshooting

### Problema: "Nothing to commit, working tree clean"
**Solução:** O código já está atualizado localmente. Faça pull:
```bash
git pull origin main
```

### Problema: Containers não sobem
**Solução:** Verificar logs e limpar tudo:
```bash
docker-compose down
docker system prune -f
docker-compose build --no-cache
docker-compose up -d
```

### Problema: Build falha
**Solução:** Verificar logs detalhados:
```bash
docker-compose build --no-cache backend 2>&1 | tee build.log
# Verificar build.log para erros
```

### Problema: Código não atualiza
**Solução:** Forçar rebuild completo:
```bash
docker-compose down
docker rmi $(docker images -q app-aion-effort*) || true
docker-compose build --no-cache --pull
docker-compose up -d
```

## ✅ Verificar se funcionou

1. **Testar API de setores:**
```bash
curl http://localhost:4000/api/ecm/investments/sectors/list
```

2. **Verificar no navegador:**
- Acesse: http://189.90.139.222:3000/investimentos
- Clique em "Novo Investimento"
- O campo "Setor" deve mostrar os setores da API

3. **Verificar logs:**
```bash
docker-compose logs backend | grep -i "setor\|sector"
docker-compose logs frontend | tail -50
```

## 📋 Checklist de Deploy

- [ ] Git pull executado com sucesso
- [ ] Último commit mostra as mudanças esperadas
- [ ] Containers foram parados
- [ ] Build foi feito SEM cache (--no-cache)
- [ ] Containers subiram com sucesso
- [ ] Containers estão "healthy"
- [ ] API de setores responde
- [ ] Frontend carrega corretamente
- [ ] Campo Setor mostra os setores da API

