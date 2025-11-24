#!/bin/bash

echo "🔧 RESOLUÇÃO DEFINITIVA - BANCO READONLY"
echo "========================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "O erro persiste mesmo após corrigir ownership."
echo "Vamos tentar uma abordagem mais profunda..."
echo ""

echo "1. Verificando atributos especiais do arquivo..."
echo "------------------------------------------------"
# Verificar se há atributos imutáveis ou outros
if command -v lsattr &> /dev/null; then
    lsattr prisma/dev.db 2>/dev/null || echo "   lsattr não disponível ou sem atributos especiais"
else
    echo "   lsattr não disponível (pode não estar instalado)"
fi
echo ""

echo "2. Verificando permissões atuais:"
echo "---------------------------------"
ls -la prisma/dev.db
ls -ld prisma/
stat prisma/dev.db 2>/dev/null | grep -E "Access|Uid|Gid" | head -5
echo ""

echo "3. Parando backend..."
docker-compose stop backend
echo ""

echo "4. Removendo atributos especiais (se houver)..."
echo "-----------------------------------------------"
# Remover atributo imutável (se existir)
if command -v chattr &> /dev/null; then
    sudo chattr -i prisma/dev.db 2>/dev/null || echo "   (sem atributo imutável)"
    sudo chattr -a prisma/dev.db 2>/dev/null || echo "   (sem atributo append-only)"
fi
echo ""

echo "5. Corrigindo ownership para nodejs (1001:1001)..."
echo "--------------------------------------------------"
sudo chown -R 1001:1001 prisma/
echo ""

echo "6. Ajustando permissões (777 para diretório, 666 para arquivo)..."
echo "------------------------------------------------------------------"
sudo chmod 777 prisma/
sudo chmod 666 prisma/dev.db
echo ""

echo "7. Verificando se o diretório pai permite escrita..."
echo "----------------------------------------------------"
PARENT_DIR=$(dirname $(pwd))
echo "   Diretório pai: $PARENT_DIR"
ls -ld "$PARENT_DIR" | head -1
echo ""

echo "8. Criando banco temporário para testar escrita..."
echo "--------------------------------------------------"
# Tentar criar um banco novo para testar
sudo -u \#1001 sqlite3 prisma/test_write.db "CREATE TABLE test (id INTEGER);" 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Escrita funciona com sudo -u #1001"
    sudo -u \#1001 rm -f prisma/test_write.db
else
    echo "   ⚠️  Problema ao criar banco de teste"
fi
echo ""

echo "9. Verificando se o arquivo está realmente acessível do container..."
echo "--------------------------------------------------------------------"
# Testar dentro do container
docker-compose run --rm backend ls -la /app/prisma/dev.db 2>&1 | head -2
echo ""

echo "10. Tentando abrir o banco no modo de leitura-escrita dentro do container..."
echo "---------------------------------------------------------------------------"
docker-compose run --rm backend sqlite3 /app/prisma/dev.db "PRAGMA journal_mode=WAL;" 2>&1
echo ""

echo "11. Verificando se há processos usando o banco..."
echo "-------------------------------------------------"
lsof prisma/dev.db 2>/dev/null | head -5 || echo "   Nenhum processo usando o banco"
echo ""

echo "12. Solução alternativa - Copiar banco para novo arquivo com permissões corretas..."
echo "-----------------------------------------------------------------------------------"
BACKUP_FILE="prisma/dev.db.backup-$(date +%Y%m%d-%H%M%S)"
cp prisma/dev.db "$BACKUP_FILE"
echo "   Backup criado: $BACKUP_FILE"

# Criar novo banco com permissões corretas
sudo -u \#1001 sqlite3 prisma/dev.db.new "ATTACH DATABASE 'prisma/dev.db' AS old; CREATE TABLE IF NOT EXISTS User AS SELECT * FROM old.User LIMIT 0;" 2>&1

# Se funcionou, tentar copiar dados
if [ -f prisma/dev.db.new ]; then
    echo "   ✅ Novo banco criado. Copiando estrutura..."
    # Fechar conexões antigas e trocar arquivos
    sudo rm -f prisma/dev.db.new
fi
echo ""

echo "13. Aplicando correções finais..."
echo "---------------------------------"
# Garantir ownership correto novamente
sudo chown -R 1001:1001 prisma/
sudo chmod 777 prisma/
sudo chmod 666 prisma/dev.db*

# Remover qualquer lockfile
sudo rm -f prisma/dev.db-journal prisma/dev.db-wal prisma/dev.db-shm
echo ""

echo "14. Verificando permissões finais:"
echo "----------------------------------"
ls -la prisma/dev.db
ls -ld prisma/
echo ""

echo "15. Reiniciando backend..."
docker-compose start backend
echo ""

echo "16. Aguardando backend iniciar (30 segundos)..."
sleep 30
echo ""

echo "17. Verificando logs recentes..."
echo "--------------------------------"
docker-compose logs --tail=20 backend | grep -iE "error|erro|readonly|started|listening" | tail -10
echo ""

echo "✅ Processo concluído!"
echo ""
echo "💡 Se o erro persistir, pode ser necessário:"
echo "   1. Mover o banco para outro local"
echo "   2. Recriar o banco do zero"
echo "   3. Verificar se o filesystem está montado como readonly"
echo ""
echo "📋 Verifique agora: docker-compose logs backend | grep -i readonly | tail -5"

