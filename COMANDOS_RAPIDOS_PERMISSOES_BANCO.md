# Corrigir Permissões do Banco de Dados

## Problema
O banco de dados está em modo readonly (`attempt to write a readonly database`).

## Solução Rápida

Execute no servidor:

```bash
cd /opt/apps/app-aion-effort

# Método 1: Usando o script (RECOMENDADO)
./corrigir-permissoes-banco-producao.sh

# Método 2: Comandos manuais
docker-compose stop backend

# Remover arquivos auxiliares do SQLite
rm -f prisma/dev.db-journal prisma/dev.db-wal prisma/dev.db-shm

# Ajustar permissões
chmod 775 prisma/
chmod 664 prisma/dev.db

# Verificar usuário do container
BACKEND_USER_ID=$(docker-compose exec -T backend id -u)
echo "Usuário do container: $BACKEND_USER_ID"

# Ajustar ownership (se necessário)
chown -R ${BACKEND_USER_ID}:${BACKEND_USER_ID} prisma/

# Reiniciar backend
docker-compose up -d backend

# Testar criação de usuário admin
docker-compose exec backend pnpm tsx scripts/createAdminUser.ts admin@aion.com admin123
```

## Permissões Recomendadas

### Para desenvolvimento/teste:
```bash
chmod 777 prisma/
chmod 666 prisma/dev.db
```

### Para produção (mais seguro):
```bash
# Identificar usuário do container
BACKEND_USER_ID=$(docker-compose exec -T backend id -u)
BACKEND_GROUP_ID=$(docker-compose exec -T backend id -g)

# Ajustar ownership
chown -R ${BACKEND_USER_ID}:${BACKEND_GROUP_ID} prisma/

# Ajustar permissões
chmod 755 prisma/
chmod 664 prisma/dev.db
```

## Verificar Permissões

```bash
# Ver permissões do diretório
ls -ld prisma/

# Ver permissões do banco
ls -l prisma/dev.db

# Verificar se o container consegue escrever
docker-compose exec backend touch /app/prisma/test-write.txt && \
  docker-compose exec backend rm /app/prisma/test-write.txt && \
  echo "✅ Container consegue escrever"
```

## Troubleshooting

### Se ainda estiver readonly:

1. **Verificar montagem do volume no docker-compose.yml:**
   ```yaml
   volumes:
     - ./prisma:/app/prisma:rw  # Deve ter :rw (read-write)
   ```

2. **Verificar se o diretório está montado corretamente:**
   ```bash
   docker-compose exec backend ls -la /app/prisma/
   ```

3. **Forçar permissões amplas (temporário):**
   ```bash
   sudo chmod 777 prisma/
   sudo chmod 666 prisma/dev.db
   ```

4. **Verificar logs do backend:**
   ```bash
   docker-compose logs backend | grep -i "readonly\|permission\|error"
   ```

## Configuração no docker-compose.yml

Certifique-se de que o volume está montado como **read-write**:

```yaml
services:
  backend:
    volumes:
      - ./prisma:/app/prisma:rw  # ✅ :rw permite escrita
```

Se estiver apenas como `:ro` (read-only), mude para `:rw`.

