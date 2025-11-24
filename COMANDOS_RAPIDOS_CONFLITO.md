# 🚀 Comandos Rápidos para Resolver Conflito do Banco

## Execute estes comandos no servidor:

```bash
cd /opt/apps/app-aion-effort

# 1. Descartar mudanças locais no banco (backup já foi feito antes)
git checkout -- prisma/dev.db

# 2. Limpar arquivos temporários do SQLite
rm -f prisma/dev.db-journal prisma/dev.db-wal prisma/dev.db-shm

# 3. Fazer pull novamente
git pull origin main

# 4. Continuar com o deploy
./deploy-producao.sh
```

## Ou use o script automático:

```bash
cd /opt/apps/app-aion-effort
./resolver-conflicto-banco.sh
```

