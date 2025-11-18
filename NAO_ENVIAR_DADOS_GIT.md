# ⚠️ NÃO Envie Dados para o Git!

## Por que NÃO fazer isso?

### 1. **Tamanho do Repositório**
- Seu banco de dados tem **18MB** (e pode crescer muito mais)
- Git não é eficiente para arquivos binários grandes
- Cada commit aumenta o tamanho do repositório permanentemente
- Pull/Push ficam muito lentos

### 2. **Dados Sensíveis**
- O banco pode conter informações sensíveis (senhas, dados pessoais)
- Mesmo que você remova depois, ficam no histórico do Git
- Risco de segurança

### 3. **Conflitos**
- Múltiplos desenvolvedores podem causar conflitos no banco
- Difícil resolver merge de arquivos binários

### 4. **Já está no .gitignore**
- O arquivo `.gitignore` já está configurado para ignorar:
  - `*.db` (todos os bancos de dados)
  - `prisma/dev.db` (banco específico)
  - `uploads/` (arquivos enviados)

## ✅ Forma CORRETA de Migrar Dados

Use os scripts de backup/restore que criamos:

### Opção 1: Scripts Automatizados (Recomendado)

**Na máquina de teste:**
```bash
./backup-dados.sh
# Cria: backup-migracao-YYYYMMDD-HHMMSS.tar.gz
```

**Transferir para servidor:**
```bash
scp backup-migracao-*.tar.gz usuario@servidor:/tmp/
```

**No servidor:**
```bash
cp /tmp/backup-migracao-*.tar.gz .
./restore-dados.sh backup-migracao-*.tar.gz
```

### Opção 2: Transferência Direta

**Na máquina de teste:**
```bash
# Compactar dados
tar -czf dados-backup.tar.gz prisma/dev.db uploads/
```

**Transferir:**
```bash
scp dados-backup.tar.gz usuario@servidor:/tmp/
```

**No servidor:**
```bash
cd /opt/aion-effort
docker-compose down
tar -xzf /tmp/dados-backup.tar.gz
docker-compose up -d
docker-compose exec app pnpm prisma:migrate deploy
```

## 🔍 Verificar o que está no Git

Para verificar se algum dado foi commitado por engano:

```bash
# Verificar se há arquivos .db no histórico
git log --all --full-history -- "*.db"

# Verificar tamanho do repositório
du -sh .git

# Ver o que está sendo rastreado
git ls-files | grep -E "(\.db|uploads)"
```

Se encontrar arquivos que não deveriam estar:

```bash
# Remover do Git (mas manter localmente)
git rm --cached prisma/dev.db
git rm --cached -r uploads/

# Commit a remoção
git commit -m "Remove arquivos de dados do Git"

# Verificar .gitignore está correto
cat .gitignore | grep -E "(\.db|uploads)"
```

## 📋 Checklist

- [ ] `.gitignore` está configurado corretamente
- [ ] Banco de dados NÃO está no Git
- [ ] Uploads NÃO estão no Git
- [ ] Use scripts de backup/restore para migração
- [ ] Dados são transferidos via SCP/rsync, não Git

## 💡 Dica: Git LFS (se realmente precisar)

Se por algum motivo específico você PRECISAR versionar dados grandes, use Git LFS:

```bash
# Instalar Git LFS
git lfs install

# Rastrear arquivos grandes
git lfs track "*.db"
git lfs track "uploads/**"

# Adicionar .gitattributes
echo "*.db filter=lfs diff=lfs merge=lfs -text" >> .gitattributes
```

**MAS:** Isso ainda não é recomendado para dados de produção. Use apenas se realmente necessário e com muito cuidado.

## 🎯 Resumo

❌ **NÃO faça:**
- `git add prisma/dev.db`
- `git add uploads/`
- Commitar dados no Git

✅ **FAÇA:**
- Use `backup-dados.sh` para criar backup
- Transfira via SCP/rsync
- Use `restore-dados.sh` no servidor
- Mantenha dados fora do Git

