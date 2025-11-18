# Instalar Git LFS no Servidor

## Instalação no Servidor Linux

### Ubuntu/Debian:

```bash
# Atualizar pacotes
apt update

# Instalar Git LFS
apt install git-lfs -y

# Verificar instalação
git lfs version
```

### CentOS/RHEL:

```bash
# Instalar Git LFS
yum install git-lfs -y

# Verificar instalação
git lfs version
```

### Se não estiver disponível nos repositórios:

```bash
# Baixar e instalar manualmente
curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash
apt install git-lfs -y

# Ou para CentOS/RHEL:
curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.rpm.sh | bash
yum install git-lfs -y
```

## Depois de Instalar

```bash
# Inicializar Git LFS no repositório
cd /opt/apps/app-aion-effort
git lfs install

# Fazer pull
git pull origin main

# Baixar arquivos grandes
git lfs pull

# Verificar se arquivos foram baixados
ls -lh prisma/dev.db
```

## Alternativa: Sem Git LFS (Mais Simples)

Se você não quiser instalar Git LFS, pode commitar os arquivos diretamente:

### Na sua máquina local:

```bash
# 1. Editar .gitignore - comentar linhas do banco:
nano .gitignore
# Comentar: *.db e prisma/dev.db

# 2. Adicionar arquivos
git add -f prisma/dev.db
git add uploads/

# 3. Commit e push
git commit -m "Add database and uploads"
git push origin main
```

### No servidor:

```bash
# Simplesmente fazer pull (sem Git LFS)
cd /opt/apps/app-aion-effort
git pull origin main

# Verificar se arquivos estão presentes
ls -lh prisma/dev.db

# Reiniciar aplicação
docker-compose restart
```

## Qual Escolher?

- **Git LFS:** Melhor para arquivos grandes, mas requer instalação
- **Commit direto:** Mais simples, mas pode deixar o repositório pesado

Para 18MB, commit direto funciona bem se você não se importa com o tamanho do repositório.

