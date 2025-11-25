#!/bin/bash

echo "🔧 CORRIGINDO PERMISSÕES DO BANCO DE DADOS"
echo "=========================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Parando container backend..."
docker-compose stop backend
echo "   ✅ Backend parado"
echo ""

echo "2. Verificando arquivo do banco..."
if [ ! -f "prisma/dev.db" ]; then
    echo "   ⚠️  Banco de dados não encontrado!"
    echo "   Criando banco de dados vazio..."
    
    # Criar diretório se não existir
    mkdir -p prisma
    
    # Criar banco vazio (o Prisma vai criar a estrutura depois)
    touch prisma/dev.db
    echo "   ✅ Banco criado"
else
    echo "   ✅ Banco encontrado: $(ls -lh prisma/dev.db | awk '{print $5}')"
fi
echo ""

echo "3. Removendo arquivos auxiliares do SQLite (podem causar problemas)..."
rm -f prisma/dev.db-journal
rm -f prisma/dev.db-wal
rm -f prisma/dev.db-shm
echo "   ✅ Arquivos auxiliares removidos"
echo ""

echo "4. Verificando usuário do container backend..."
BACKEND_USER_ID=$(docker-compose exec -T backend id -u 2>/dev/null | tr -d '\r' || echo "1001")
BACKEND_GROUP_ID=$(docker-compose exec -T backend id -g 2>/dev/null | tr -d '\r' || echo "1001")
echo "   Usuário do container: $BACKEND_USER_ID"
echo "   Grupo do container: $BACKEND_GROUP_ID"
echo ""

echo "5. Ajustando ownership do diretório prisma..."
# Usar ownership do usuário root primeiro para garantir permissões
chown -R root:root prisma/
echo "   ✅ Ownership ajustado para root:root temporariamente"
echo ""

echo "6. Ajustando permissões do diretório prisma..."
chmod -R 755 prisma/
echo "   ✅ Permissões do diretório ajustadas (755)"
echo ""

echo "7. Ajustando permissões do arquivo do banco..."
chmod 664 prisma/dev.db 2>/dev/null || chmod 644 prisma/dev.db
echo "   ✅ Permissões do banco ajustadas (664/644)"
echo ""

echo "8. Ajustando ownership para o usuário do container (se possível)..."
# Tentar ajustar para o usuário do container, mas se não funcionar, deixar como root
if [ -n "$BACKEND_USER_ID" ] && [ "$BACKEND_USER_ID" != "root" ]; then
    chown -R ${BACKEND_USER_ID}:${BACKEND_GROUP_ID} prisma/ 2>/dev/null || {
        echo "   ⚠️  Não foi possível ajustar para usuário do container, mantendo root"
        # Se não conseguir, ajustar pelo menos as permissões para grupo e outros
        chmod 777 prisma/ 2>/dev/null
        chmod 666 prisma/dev.db 2>/dev/null
    }
else
    # Se não conseguir identificar o usuário, usar permissões amplas temporariamente
    echo "   ⚠️  Usuário do container não identificado, usando permissões amplas"
    chmod 777 prisma/ 2>/dev/null
    chmod 666 prisma/dev.db 2>/dev/null
fi
echo ""

echo "9. Verificando permissões finais..."
ls -la prisma/dev.db 2>/dev/null || echo "   ⚠️  Arquivo não encontrado"
echo ""

echo "10. Verificando se o diretório prisma está acessível..."
if [ -r prisma ] && [ -w prisma ]; then
    echo "   ✅ Diretório prisma é legível e gravável"
else
    echo "   ⚠️  Problemas de permissão no diretório"
    chmod 777 prisma/ 2>/dev/null
fi
echo ""

echo "11. Iniciando backend para testar..."
docker-compose up -d backend
sleep 5
echo "   ✅ Backend iniciado"
echo ""

echo "12. Testando escrita no banco (criando usuário admin)..."
sleep 3

docker-compose exec -T backend pnpm tsx scripts/createAdminUser.ts admin@aion.com admin123 "Administrador" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "   ✅ SUCESSO! Banco de dados está gravável!"
    echo ""
    echo "13. Ajustando permissões finais para produção..."
    
    # Em produção, podemos usar um usuário específico ou manter permissões amplas
    # Dependendo da política de segurança
    echo "   Definindo permissões para leitura/escrita do container..."
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
    docker-compose exec -T backend pnpm tsx scripts/createAdminUser.ts admin@aion.com admin123 "Administrador" 2>&1
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "   ✅ Funcionou com permissões amplas"
        echo "   ⚠️  ATENÇÃO: Permissões estão muito amplas (777/666)"
        echo "   Ajuste conforme sua política de segurança após testar"
    fi
fi

echo ""
echo "✅ PROCESSO CONCLUÍDO!"
echo ""
echo "📋 Resumo:"
echo "   - Banco de dados: prisma/dev.db"
echo "   - Permissões do diretório: $(ls -ld prisma | awk '{print $1}')"
echo "   - Permissões do banco: $(ls -l prisma/dev.db | awk '{print $1}')"
echo "   - Ownership: $(ls -ld prisma | awk '{print $3":"$4}')"
echo ""
echo "💡 Para verificar permissões:"
echo "   ls -la prisma/"
echo ""

