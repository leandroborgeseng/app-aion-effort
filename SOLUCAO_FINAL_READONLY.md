# 🔧 Solução Final - Erro Readonly Persistente

## Problema

Mesmo após corrigir ownership e permissões, o erro persiste:
```
SqliteError { extended_code: 1544, message: Some("attempt to write a readonly database") }
```

## Solução Alternativa - Recriar Banco com Permissões Corretas

Se todas as tentativas anteriores falharam, vamos recriar o banco:

```bash
cd /opt/apps/app-aion-effort

# 1. Fazer backup completo
BACKUP_DIR="backup-banco-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp prisma/dev.db "$BACKUP_DIR/"
echo "✅ Backup salvo em: $BACKUP_DIR/"

# 2. Parar backend
docker-compose stop backend

# 3. Extrair dados do banco antigo
sqlite3 prisma/dev.db ".dump" > "$BACKUP_DIR/dump.sql"

# 4. Remover banco antigo
sudo rm -f prisma/dev.db prisma/dev.db-*

# 5. Criar novo banco dentro do container com ownership correto
docker-compose run --rm backend sqlite3 /app/prisma/dev.db ".read /dev/stdin" < "$BACKUP_DIR/dump.sql"

# 6. Ajustar ownership
sudo chown -R 1001:1001 prisma/
sudo chmod 666 prisma/dev.db
sudo chmod 777 prisma/

# 7. Reiniciar backend
docker-compose start backend
```

## Solução Mais Simples - Desabilitar Cache HTTP Temporariamente

Se o problema é apenas com o cache HTTP, podemos desabilitá-lo temporariamente:

1. Verificar onde está o código de cache HTTP
2. Comentar temporariamente as operações de escrita no cache
3. Isso permitirá que o sistema funcione enquanto resolvemos o problema de permissões

## Verificar Filesystem Readonly

```bash
# Verificar se o mount point está readonly
mount | grep "$(df prisma/dev.db | tail -1 | awk '{print $1}')"

# Verificar se o diretório tem permissão de escrita
touch prisma/.test_write && rm prisma/.test_write && echo "✅ Diretório permite escrita" || echo "❌ Diretório readonly"
```

## Solução de Último Recurso - Mover Banco para /tmp

Se o problema for do filesystem, mover para /tmp:

```bash
cd /opt/apps/app-aion-effort

# 1. Parar backend
docker-compose stop backend

# 2. Mover banco para /tmp
sudo mv prisma/dev.db /tmp/dev.db
sudo chown 1001:1001 /tmp/dev.db
sudo chmod 666 /tmp/dev.db

# 3. Criar symlink
sudo ln -s /tmp/dev.db prisma/dev.db

# 4. Atualizar docker-compose.yml para montar /tmp
# Ou ajustar DATABASE_URL no .env para apontar para /tmp/dev.db

# 5. Reiniciar
docker-compose start backend
```

## Diagnosticar Mais

Execute e compartilhe a saída:

```bash
cd /opt/apps/app-aion-effort

echo "=== INFORMAÇÕES DO SISTEMA ==="
echo "Permissões do arquivo:"
stat prisma/dev.db

echo ""
echo "Permissões do diretório:"
stat prisma/

echo ""
echo "Mount info:"
df -h prisma/dev.db
mount | grep $(df prisma/dev.db | tail -1 | awk '{print $1}')

echo ""
echo "Atributos do arquivo:"
lsattr prisma/dev.db 2>/dev/null || echo "lsattr não disponível"

echo ""
echo "Teste de escrita no diretório:"
touch prisma/.test && rm prisma/.test && echo "OK" || echo "FALHOU"

echo ""
echo "Dentro do container:"
docker-compose run --rm backend ls -la /app/prisma/dev.db
docker-compose run --rm backend touch /app/prisma/.test && \
docker-compose run --rm backend rm /app/prisma/.test && \
echo "Container consegue escrever" || echo "Container NÃO consegue escrever"
```

