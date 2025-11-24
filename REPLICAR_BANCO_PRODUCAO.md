# 📦 Replicar Banco de Dados para Produção

## ✅ Status

O banco de dados local (`prisma/dev.db`) foi enviado para o GitHub e pode ser replicado na produção.

## 🚀 Como Replicar o Banco na Produção

### Passo 1: Fazer Pull do Banco de Dados

No servidor de produção, execute:

```bash
cd /opt/apps/app-aion-effort

# 1. Fazer pull do banco de dados
git pull origin main

# 2. Verificar se o banco foi baixado
ls -lh prisma/dev.db

# 3. Verificar permissões
chmod 664 prisma/dev.db
chown $USER:$USER prisma/dev.db
```

### Passo 2: Reiniciar os Containers

Após atualizar o banco, reinicie os containers para garantir que usem o novo banco:

```bash
# Opção 1: Reiniciar apenas o backend (mais rápido)
docker-compose restart backend

# Opção 2: Reiniciar tudo (mais seguro)
docker-compose down
docker-compose up -d
```

### Passo 3: Verificar se Funcionou

```bash
# 1. Verificar se o container está rodando
docker-compose ps

# 2. Ver logs do backend
docker-compose logs backend | tail -20

# 3. Testar a API
curl http://localhost:4000/health
```

## 📋 Script Completo de Replicação

Crie um script `replicar-banco.sh` no servidor:

```bash
#!/bin/bash

echo "🔄 Replicando banco de dados da produção..."

cd /opt/apps/app-aion-effort

# 1. Fazer backup do banco atual (por segurança)
if [ -f prisma/dev.db ]; then
    echo "📦 Fazendo backup do banco atual..."
    cp prisma/dev.db prisma/dev.db.backup-$(date +%Y%m%d-%H%M%S)
fi

# 2. Fazer pull
echo "⬇️  Fazendo pull do banco..."
git pull origin main

# 3. Verificar se o banco foi baixado
if [ ! -f prisma/dev.db ]; then
    echo "❌ Erro: Banco de dados não encontrado após pull!"
    exit 1
fi

# 4. Ajustar permissões
echo "🔧 Ajustando permissões..."
chmod 664 prisma/dev.db
chown $USER:$USER prisma/dev.db

# 5. Reiniciar backend
echo "🔄 Reiniciando backend..."
docker-compose restart backend

# 6. Aguardar inicialização
echo "⏳ Aguardando inicialização (10 segundos)..."
sleep 10

# 7. Verificar status
echo "✅ Verificando status..."
docker-compose ps backend

echo ""
echo "✅ Replicação concluída!"
echo "📋 Para ver os logs: docker-compose logs -f backend"
```

Para usar o script:

```bash
chmod +x replicar-banco.sh
./replicar-banco.sh
```

## ⚠️ Importante

### Antes de Replicar

1. **Fazer backup do banco atual em produção:**
   ```bash
   cp prisma/dev.db prisma/dev.db.backup-$(date +%Y%m%d-%H%M%S)
   ```

2. **Verificar se há dados importantes em produção** que não estão no banco local

3. **Fazer o pull fora do horário de pico** para evitar interrupções

### Após Replicar

1. **Verificar se o backend iniciou corretamente**
2. **Testar login e funcionalidades principais**
3. **Verificar se os dados foram replicados corretamente**

## 🔄 Atualizar Banco no Git (do Local para Produção)

Sempre que você fizer mudanças no banco local e quiser replicar:

```bash
# No seu ambiente local
cd /Users/leandroborges/app-aion-effort

# 1. Adicionar o banco modificado
git add prisma/dev.db

# 2. Fazer commit
git commit -m "feat: atualizar banco de dados local"

# 3. Fazer push
git push origin main

# 4. Na produção, fazer pull
ssh usuario@servidor-producao
cd /opt/apps/app-aion-effort
git pull origin main
docker-compose restart backend
```

## 📊 Tamanho do Banco

O banco atual tem aproximadamente **43MB**. Isso é aceitável para o Git, mas se o banco crescer muito (>100MB), considere:

1. **Usar Git LFS (Large File Storage)**
2. **Limpar dados antigos do banco**
3. **Usar um sistema de backup alternativo**

## 🔍 Troubleshooting

### Banco não foi baixado

```bash
# Verificar se está no Git
git ls-files | grep dev.db

# Forçar download
git pull origin main --force
```

### Permissões incorretas

```bash
# Ajustar permissões
chmod 664 prisma/dev.db
chown $USER:$USER prisma/dev.db

# Se ainda não funcionar
sudo chmod 664 prisma/dev.db
sudo chown $USER:$USER prisma/dev.db
```

### Erro ao acessar o banco

```bash
# Verificar se o arquivo existe
ls -la prisma/dev.db

# Verificar permissões
stat prisma/dev.db

# Ver logs do backend
docker-compose logs backend | grep -i "database\|prisma\|error"
```

## 📝 Notas

- O banco `dev.db-journal` é ignorado pelo Git (arquivo temporário do SQLite)
- Sempre faça backup antes de substituir o banco em produção
- Considere usar um processo de migração mais robusto no futuro

