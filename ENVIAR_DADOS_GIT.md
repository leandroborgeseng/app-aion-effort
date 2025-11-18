# Enviar Dados pelo Git - Guia

Este guia explica como enviar o banco de dados e uploads pelo Git (não recomendado, mas possível).

## ⚠️ Avisos Importantes

1. **Tamanho:** Seu banco tem 18MB - isso pode tornar o repositório pesado
2. **Histórico:** Dados ficam permanentemente no histórico do Git
3. **Segurança:** Certifique-se de que não há dados sensíveis
4. **Performance:** Pull/Push podem ficar mais lentos

## Opção 1: Git LFS (Recomendado para arquivos grandes)

Git LFS (Large File Storage) é melhor para arquivos grandes:

### Instalar Git LFS

```bash
# macOS
brew install git-lfs

# Linux
sudo apt install git-lfs  # Ubuntu/Debian
# ou
sudo yum install git-lfs  # CentOS/RHEL

# Windows
# Baixar de: https://git-lfs.github.com/
```

### Configurar Git LFS

```bash
# Inicializar Git LFS no repositório
git lfs install

# Rastrear arquivos grandes
git lfs track "*.db"
git lfs track "*.db-journal"
git lfs track "uploads/**"

# Adicionar .gitattributes ao Git
git add .gitattributes
git commit -m "Configure Git LFS for database and uploads"
```

### Remover do .gitignore

Edite `.gitignore` e comente ou remova as linhas:

```bash
# Database
# *.db          # Comentar esta linha
# *.db-journal  # Comentar esta linha
# prisma/dev.db # Comentar esta linha
```

### Adicionar e commitar

```bash
# Adicionar banco de dados
git add prisma/dev.db

# Adicionar uploads (se houver)
git add uploads/

# Commit
git commit -m "Add database and uploads to repository"

# Push
git push origin main
```

## Opção 2: Commit Direto (Apenas se dados forem muito pequenos)

Se você realmente quer commitar diretamente (não recomendado para 18MB):

### Remover do .gitignore

Edite `.gitignore` e comente as linhas do banco:

```bash
# Database
# *.db          # Comentar
# *.db-journal  # Comentar  
# prisma/dev.db # Comentar
```

### Adicionar ao Git

```bash
# Forçar adicionar (mesmo que esteja no .gitignore)
git add -f prisma/dev.db
git add uploads/

# Verificar o que será commitado
git status

# Commit
git commit -m "Add database and uploads"

# Push
git push origin main
```

## No Servidor - Fazer Pull

```bash
# Conectar ao servidor
ssh usuario@servidor

# Ir para o projeto
cd /opt/aion-effort

# Se usar Git LFS, instalar no servidor primeiro
git lfs install

# Fazer pull
git pull origin main

# Se usar Git LFS, baixar arquivos grandes
git lfs pull

# Verificar se arquivos estão presentes
ls -lh prisma/dev.db
ls -lh uploads/

# Reiniciar aplicação
docker-compose restart
```

## Verificar Tamanho do Repositório

```bash
# Tamanho do repositório
du -sh .git

# Tamanho de arquivos grandes
git lfs ls-files  # Se usar Git LFS
```

## Reverter (se mudar de ideia)

Se você quiser remover os dados do Git depois:

```bash
# Remover do Git (mas manter localmente)
git rm --cached prisma/dev.db
git rm --cached -r uploads/

# Restaurar .gitignore
# Descomentar as linhas do banco

# Commit
git commit -m "Remove database and uploads from Git"

# Push
git push origin main

# Limpar histórico (CUIDADO - reescreve histórico)
# git filter-branch --force --index-filter \
#   "git rm --cached --ignore-unmatch prisma/dev.db" \
#   --prune-empty --tag-name-filter cat -- --all
```

## Checklist

- [ ] Decidir entre Git LFS ou commit direto
- [ ] Instalar Git LFS (se escolher essa opção)
- [ ] Configurar Git LFS (se necessário)
- [ ] Editar .gitignore para permitir arquivos
- [ ] Adicionar arquivos ao Git
- [ ] Fazer commit
- [ ] Fazer push
- [ ] No servidor: fazer pull
- [ ] Verificar se arquivos estão presentes
- [ ] Reiniciar aplicação

## Recomendação Final

Para 18MB, recomendo:
1. **Git LFS** se você realmente precisa versionar os dados
2. **Scripts de backup/restore** se você só quer migrar uma vez

Mas se você realmente quer usar Git, Git LFS é a melhor opção.

