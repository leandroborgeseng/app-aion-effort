#!/bin/bash

echo "🔧 CONFIGURANDO BANCO DE DADOS EXTERNO (NÃO DOCKER)"
echo "==================================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Atualizando código do GitHub..."
git pull origin main
echo ""

echo "2. Verificando .dockerignore..."
if grep -q "prisma/dev.db" .dockerignore 2>/dev/null; then
    echo "   ✅ Banco de dados já está no .dockerignore"
else
    echo "   ⚠️  Adicionando banco ao .dockerignore..."
    cat >> .dockerignore << 'EOF'

# Banco de dados SQLite - não deve fazer parte da imagem Docker
prisma/dev.db
prisma/dev.db-journal
prisma/dev.db-wal
prisma/dev.db-shm
prisma/*.db
prisma/*.db-journal
prisma/*.db-wal
prisma/*.db-shm
EOF
    echo "   ✅ Banco adicionado ao .dockerignore"
fi
echo ""

echo "3. Parando containers..."
docker-compose stop backend
echo "   ✅ Containers parados"
echo ""

echo "4. Verificando arquivo do banco no host..."
if [ ! -f "prisma/dev.db" ]; then
    echo "   ⚠️  Banco de dados não encontrado no host!"
    echo "   Criando diretório e arquivo vazio..."
    mkdir -p prisma
    touch prisma/dev.db
    echo "   ✅ Banco criado no host"
else
    echo "   ✅ Banco encontrado no host: $(ls -lh prisma/dev.db | awk '{print $5}')"
fi
echo ""

echo "5. Removendo arquivos auxiliares do SQLite..."
rm -f prisma/dev.db-journal
rm -f prisma/dev.db-wal
rm -f prisma/dev.db-shm
echo "   ✅ Arquivos auxiliares removidos"
echo ""

echo "6. Verificando usuário do container backend..."
BACKEND_USER_ID=$(docker-compose exec -T backend id -u 2>/dev/null | tr -d '\r' || echo "1001")
BACKEND_GROUP_ID=$(docker-compose exec -T backend id -g 2>/dev/null | tr -d '\r' || echo "1001")
echo "   Usuário do container: $BACKEND_USER_ID"
echo "   Grupo do container: $BACKEND_GROUP_ID"
echo ""

echo "7. Ajustando permissões do diretório prisma..."
# Criar diretório se não existir
mkdir -p prisma

# Dar permissão de escrita para o grupo e outros (temporariamente para garantir funcionamento)
chmod 775 prisma/ 2>/dev/null || chmod 777 prisma/

# Ajustar permissões do banco
chmod 664 prisma/dev.db 2>/dev/null || chmod 666 prisma/dev.db

echo "   ✅ Permissões ajustadas"
echo ""

echo "8. Tentando ajustar ownership (se possível)..."
# Tentar ajustar para o usuário do container
if [ -n "$BACKEND_USER_ID" ] && [ "$BACKEND_USER_ID" != "root" ]; then
    chown -R ${BACKEND_USER_ID}:${BACKEND_GROUP_ID} prisma/ 2>/dev/null || {
        echo "   ⚠️  Não foi possível ajustar ownership, usando permissões amplas"
        chmod 777 prisma/
        chmod 666 prisma/dev.db
    }
else
    echo "   ⚠️  Usuário do container não identificado, usando permissões amplas"
    chmod 777 prisma/
    chmod 666 prisma/dev.db
fi
echo ""

echo "9. Rebuild da imagem backend (sem o banco de dados)..."
docker-compose build --no-cache backend
echo "   ✅ Imagem reconstruída"
echo ""

echo "10. Iniciando backend..."
docker-compose up -d backend
echo "   Aguardando backend inicializar..."
sleep 10
echo ""

echo "11. Verificando que o banco do host está sendo usado..."
if docker-compose exec -T backend test -f /app/prisma/dev.db; then
    echo "   ✅ Container acessa o banco do host"
    
    # Verificar tamanho para confirmar que é o mesmo arquivo
    HOST_SIZE=$(stat -c%s prisma/dev.db 2>/dev/null || stat -f%z prisma/dev.db 2>/dev/null)
    CONTAINER_SIZE=$(docker-compose exec -T backend stat -c%s /app/prisma/dev.db 2>/dev/null || echo "0")
    
    if [ "$HOST_SIZE" = "$CONTAINER_SIZE" ]; then
        echo "   ✅ Tamanhos correspondem - mesmo arquivo"
    else
        echo "   ⚠️  Tamanhos diferentes (pode ser normal em primeira execução)"
    fi
else
    echo "   ⚠️  Container não vê o banco ainda (pode precisar de mais tempo)"
fi
echo ""

echo "12. Testando escrita no banco (criando usuário admin)..."
docker-compose exec -T backend pnpm tsx scripts/createAdminUser.ts admin@aion.com admin123 "Administrador" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "   ✅ SUCESSO! Banco de dados está gravável!"
    echo ""
    echo "13. Ajustando permissões finais para produção..."
    
    # Permissões mais restritivas para produção (se possível)
    chmod 775 prisma/ 2>/dev/null || true
    chmod 664 prisma/dev.db 2>/dev/null || true
    
    echo "   ✅ Permissões de produção configuradas"
else
    echo ""
    echo "   ❌ Erro ao escrever no banco"
    echo ""
    echo "   Tentando permissões mais amplas..."
    chmod 777 prisma/
    chmod 666 prisma/dev.db
    
    echo "   Tentando novamente..."
    sleep 3
    docker-compose exec -T backend pnpm tsx scripts/createAdminUser.ts admin@aion.com admin123 "Administrador" 2>&1
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "   ✅ Funcionou com permissões amplas"
        echo "   ⚠️  ATENÇÃO: Permissões estão muito amplas (777/666)"
        echo "   Considere ajustar após verificar que tudo funciona"
    else
        echo ""
        echo "   ❌ Ainda não funcionou. Verifique os logs:"
        echo "   docker-compose logs backend | tail -50"
    fi
fi

echo ""
echo "✅ PROCESSO CONCLUÍDO!"
echo ""
echo "📋 Resumo:"
echo "   - Banco de dados está no HOST (não na imagem Docker)"
echo "   - Permissões do diretório: $(ls -ld prisma | awk '{print $1}')"
echo "   - Permissões do banco: $(ls -l prisma/dev.db | awk '{print $1}')"
echo "   - Ownership: $(ls -ld prisma | awk '{print $3":"$4}')"
echo ""
echo "💡 Para verificar:"
echo "   ls -la prisma/"
echo "   docker-compose exec backend ls -la /app/prisma/"
echo ""

