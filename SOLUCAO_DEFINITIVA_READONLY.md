# ✅ Solução Definitiva - Banco Readonly

## Problema

O banco de dados está como somente leitura, causando erro:
```
SqliteError { extended_code: 1544, message: Some("attempt to write a readonly database") }
```

## Solução Rápida - Comando Único

Execute este comando completo no servidor:

```bash
cd /opt/apps/app-aion-effort && \
git pull origin main && \
chmod +x corrigir-banco-readonly-completo.sh && \
./corrigir-banco-readonly-completo.sh
```

## Solução Manual Passo a Passo

### 1. Parar o backend
```bash
cd /opt/apps/app-aion-effort
docker-compose stop backend
```

### 2. Obter usuário do container
```bash
# Ver UID/GID do container
docker-compose exec backend id
# Exemplo de saída: uid=1000(node) gid=1000(node)
```

### 3. Corrigir ownership e permissões
```bash
# Substitua 1000:1000 pelos valores obtidos acima
UID=1000
GID=1000

# Corrigir ownership do diretório inteiro
sudo chown -R $UID:$GID prisma/

# Corrigir permissões
sudo chmod 755 prisma/
sudo chmod 666 prisma/dev.db

# Verificar
ls -la prisma/dev.db
ls -ld prisma/
```

### 4. Verificar se o diretório permite escrita
```bash
# Testar dentro do container
docker-compose run --rm backend touch /app/prisma/.test_write && \
docker-compose run --rm backend rm /app/prisma/.test_write && \
echo "✅ Diretório permite escrita"
```

### 5. Reiniciar backend
```bash
docker-compose start backend
sleep 20
docker-compose logs --tail=30 backend | grep -i error
```

## Solução Alternativa - Se nada funcionar

### Opção 1: Recriar banco com permissões corretas

```bash
cd /opt/apps/app-aion-effort

# 1. Fazer backup
cp prisma/dev.db prisma/dev.db.backup-$(date +%Y%m%d-%H%M%S)

# 2. Parar backend
docker-compose stop backend

# 3. Remover banco
rm prisma/dev.db

# 4. Recriar banco dentro do container (com ownership correto)
docker-compose run --rm backend sqlite3 /app/prisma/dev.db "CREATE TABLE IF NOT EXISTS User (id TEXT PRIMARY KEY);"

# 5. Restaurar dados do backup
sqlite3 prisma/dev.db.backup-* ".backup prisma/dev.db"

# 6. Ajustar permissões
UID=$(docker-compose run --rm backend id -u | tr -d '\r')
GID=$(docker-compose run --rm backend id -g | tr -d '\r')
sudo chown $UID:$GID prisma/dev.db
sudo chmod 666 prisma/dev.db

# 7. Reiniciar
docker-compose start backend
```

### Opção 2: Mover banco para dentro do container

Se o problema persistir, pode ser o volume mount. Nesse caso, precisaríamos mudar a estratégia, mas isso é mais complexo.

## Comando Único - Solução Rápida

```bash
cd /opt/apps/app-aion-effort && \
docker-compose stop backend && \
UID=$(docker-compose run --rm backend id -u 2>/dev/null | tr -d '\r\n' || echo "1000") && \
GID=$(docker-compose run --rm backend id -g 2>/dev/null | tr -d '\r\n' || echo "1000") && \
sudo chown -R $UID:$GID prisma/ && \
sudo chmod 755 prisma/ && \
sudo chmod 666 prisma/dev.db && \
docker-compose start backend && \
sleep 20 && \
echo "✅ Correção aplicada. Verifique os logs: docker-compose logs backend"
```

## Verificar se Funcionou

```bash
# 1. Ver logs (não deve ter erro de readonly)
docker-compose logs --tail=50 backend | grep -i "readonly\|error.*write"

# 2. Testar escrita no banco
docker-compose exec backend sqlite3 prisma/dev.db "CREATE TABLE IF NOT EXISTS _test (id INTEGER); DROP TABLE _test;"

# 3. Testar login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aion.com","password":"admin123"}'
```

## Se ainda não funcionar

Execute e compartilhe:

```bash
cd /opt/apps/app-aion-effort

# Informações do sistema
echo "=== INFORMAÇÕES DO SISTEMA ==="
echo "Permissões do arquivo:"
ls -la prisma/dev.db
echo ""
echo "Permissões do diretório:"
ls -ld prisma/
echo ""
echo "UID/GID do container:"
docker-compose exec backend id
echo ""
echo "Teste de escrita no diretório:"
docker-compose exec backend touch /app/prisma/.write_test 2>&1 && \
docker-compose exec backend rm /app/prisma/.write_test 2>&1 || \
echo "FALHOU"
echo ""
echo "Mount do volume:"
docker inspect aion-effort-backend | grep -A 10 "Mounts" | grep prisma
```

