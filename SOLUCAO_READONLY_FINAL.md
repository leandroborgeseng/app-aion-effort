# ✅ Solução Final Simples - Banco Readonly

## Problema

O erro de readonly persiste mesmo após corrigir ownership. Vamos fazer uma correção mais direta.

## Solução Rápida

Execute no servidor:

```bash
cd /opt/apps/app-aion-effort

# Atualizar código
git pull origin main

# Executar correção simples
chmod +x corrigir-banco-readonly-simples.sh
./corrigir-banco-readonly-simples.sh
```

## Ou execute manualmente:

```bash
cd /opt/apps/app-aion-effort

# 1. Parar backend
docker-compose stop backend

# 2. Remover arquivos auxiliares do SQLite (podem estar bloqueando)
sudo rm -f prisma/dev.db-journal prisma/dev.db-wal prisma/dev.db-shm

# 3. Ajustar modo do banco (se sqlite3 estiver instalado no host)
if command -v sqlite3 &> /dev/null; then
    sqlite3 prisma/dev.db "PRAGMA journal_mode=DELETE;"
fi

# 4. Corrigir ownership e permissões
sudo chown -R 1001:1001 prisma/
sudo chmod 777 prisma/
sudo chmod 666 prisma/dev.db

# 5. Verificar
ls -la prisma/dev.db

# 6. Reiniciar backend
docker-compose start backend

# 7. Aguardar e verificar logs
sleep 30
docker-compose logs --tail=30 backend | grep -i readonly
```

## Comando Único

```bash
cd /opt/apps/app-aion-effort && \
docker-compose stop backend && \
sudo rm -f prisma/dev.db-* && \
sudo chown -R 1001:1001 prisma/ && \
sudo chmod 777 prisma/ && \
sudo chmod 666 prisma/dev.db && \
docker-compose start backend && \
sleep 30 && \
echo "✅ Correção aplicada! Verifique: docker-compose logs backend | grep -i readonly"
```

## Se ainda não funcionar

Pode ser que o problema seja no código do Prisma tentando escrever. Nesse caso, precisamos verificar se há alguma configuração do Prisma que está causando o problema.

## Verificar se funcionou

```bash
# Ver logs
docker-compose logs --tail=50 backend | grep -i "readonly\|error" | tail -10

# Se não aparecer erro de readonly, testar login:
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aion.com","password":"admin123"}'
```

## Próximo Passo se Ainda Falhar

Se o problema persistir, pode ser necessário desabilitar temporariamente o cache HTTP que está tentando escrever no banco. Mas primeiro, vamos testar essa solução mais simples.

