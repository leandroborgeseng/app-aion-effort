#!/bin/bash

echo "🔧 RESOLVENDO CONFLITO DO BANCO DE DADOS"
echo "========================================"
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Verificando se há backup recente..."
if [ -f "prisma/dev.db.backup."* ]; then
    LATEST_BACKUP=$(ls -t prisma/dev.db.backup.* 2>/dev/null | head -1)
    echo "   ✅ Backup encontrado: $LATEST_BACKUP"
else
    echo "   ⚠️  Nenhum backup encontrado, criando backup agora..."
    BACKUP_FILE="prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)"
    if [ -f "prisma/dev.db" ]; then
        cp prisma/dev.db "$BACKUP_FILE"
        echo "   ✅ Backup criado: $BACKUP_FILE"
    fi
fi
echo ""

echo "2. Verificando status do Git..."
git status prisma/dev.db
echo ""

echo "3. Descartando mudanças locais no banco de dados..."
echo "   (O banco será regenerado pelo Prisma se necessário)"
git checkout -- prisma/dev.db 2>/dev/null || echo "   ⚠️  Arquivo já está no estado correto ou não existe"

# Também limpar arquivos temporários do SQLite
echo "   Limpando arquivos temporários do SQLite..."
rm -f prisma/dev.db-journal prisma/dev.db-wal prisma/dev.db-shm
echo "   ✅ Mudanças locais descartadas"
echo ""

echo "4. Fazendo pull do repositório..."
git pull origin main

if [ $? -ne 0 ]; then
    echo ""
    echo "   ❌ Erro ao fazer pull. Tentando forçar..."
    echo "   (Isso vai descartar QUALQUER mudança local no banco)"
    read -p "   Deseja continuar? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        git fetch origin
        git reset --hard origin/main
        echo "   ✅ Código atualizado forçadamente"
    else
        echo "   ❌ Operação cancelada"
        exit 1
    fi
else
    echo "   ✅ Código atualizado com sucesso"
fi
echo ""

echo "5. Verificando se o banco precisa ser sincronizado..."
if docker-compose ps backend | grep -q "Up"; then
    echo "   Backend está rodando, verificando schema..."
    docker-compose exec -T backend pnpm prisma:db:push
    if [ $? -eq 0 ]; then
        echo "   ✅ Schema sincronizado"
    else
        echo "   ⚠️  Erro ao sincronizar schema (pode ser normal se não houver mudanças)"
    fi
else
    echo "   ⚠️  Backend não está rodando. Execute o sync manualmente depois:"
    echo "   docker-compose run --rm backend pnpm prisma:db:push"
fi
echo ""

echo "✅ CONFLITO RESOLVIDO!"
echo ""
echo "💡 Próximos passos:"
echo "   1. Continue com o deploy: ./deploy-producao.sh"
echo "   2. Ou reinicie os serviços: docker-compose restart backend frontend"

