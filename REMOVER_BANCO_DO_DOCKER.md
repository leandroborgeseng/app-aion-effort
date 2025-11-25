# Remover Banco de Dados da Imagem Docker

## Objetivo
O banco de dados não deve fazer parte da imagem Docker, apenas ser montado como volume do host.

## Mudanças Necessárias

### 1. Verificar Dockerfile.backend

O Dockerfile **não deve copiar** o arquivo `prisma/dev.db`. Ele pode copiar:
- ✅ `prisma/schema.prisma` (schema, não o banco)
- ✅ Estrutura do diretório prisma (para gerar Prisma Client)
- ❌ `prisma/dev.db` (arquivo do banco - NÃO copiar!)

### 2. Garantir que docker-compose.yml monta como volume

```yaml
services:
  backend:
    volumes:
      - ./prisma:/app/prisma:rw  # ✅ Monta diretório do host
```

### 3. Ajustar .dockerignore

Adicionar ao `.dockerignore`:
```
prisma/dev.db
prisma/dev.db-journal
prisma/dev.db-wal
prisma/dev.db-shm
```

### 4. Script de Correção

O script `corrigir-permissoes-banco-producao.sh` já:
- Remove arquivos auxiliares do SQLite
- Ajusta permissões do diretório prisma
- Garante que o banco está gravável
- Testa criando usuário admin

## Comandos para Aplicar

```bash
# 1. Verificar se o banco está sendo copiado no Dockerfile
grep -n "COPY.*prisma" Dockerfile.backend

# 2. Garantir que .dockerignore exclui o banco
echo "prisma/dev.db*" >> .dockerignore

# 3. Rebuild da imagem backend (sem o banco)
docker-compose build --no-cache backend

# 4. Corrigir permissões no host
./corrigir-permissoes-banco-producao.sh
```

## Verificar se Está Funcionando

```bash
# Verificar que o banco do host é usado (não da imagem)
docker-compose exec backend ls -la /app/prisma/dev.db

# Verificar que modificações no host aparecem no container
touch prisma/test.txt
docker-compose exec backend ls -la /app/prisma/test.txt

# Remover teste
rm prisma/test.txt
```

## Importante

- O banco de dados deve existir **apenas no host** (não na imagem)
- A imagem Docker só contém o schema e o Prisma Client
- O volume monta o diretório `prisma/` do host no container
- Permissões devem permitir escrita pelo usuário do container (geralmente UID 1001)

