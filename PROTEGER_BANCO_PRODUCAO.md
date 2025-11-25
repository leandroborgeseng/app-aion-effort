# Proteger Banco de Dados de Produção

## Objetivo
Garantir que o banco de dados de produção NÃO seja:
- Modificado pelos scripts
- Substituído pelo banco de homologação do GitHub
- Perdido durante atualizações

## Configuração

### 1. `.gitignore` já configurado
O arquivo `.gitignore` já está configurado para **não versionar** o banco:
```
*.db
prisma/dev.db
prisma/dev.db-*
```

✅ **O banco de produção está protegido do Git**

### 2. Script Seguro
Use o script `corrigir-apenas-permissoes-producao.sh` que:
- ✅ NÃO modifica o conteúdo do banco
- ✅ Apenas corrige permissões
- ✅ Faz backup antes de qualquer mudança
- ✅ Verifica que o banco não está no Git
- ✅ Garante que o banco não será substituído

## Comandos

### Corrigir Permissões (SEM modificar dados)
```bash
cd /opt/apps/app-aion-effort
git pull origin main
chmod +x corrigir-apenas-permissoes-producao.sh
./corrigir-apenas-permissoes-producao.sh
```

### Verificar que o banco NÃO está no Git
```bash
# Deve retornar vazio (banco não está sendo rastreado)
git ls-files | grep dev.db

# Se retornar algo, remover sem deletar o arquivo:
git rm --cached prisma/dev.db
```

### Fazer Backup Manual
```bash
cd /opt/apps/app-aion-effort
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)
```

## Garantias

✅ **O banco está no `.gitignore`** - Não será commitado
✅ **O banco está no `.dockerignore`** - Não será copiado para a imagem Docker
✅ **O banco é montado como volume** - Fica apenas no servidor de produção
✅ **Scripts fazem backup antes** - Dados são preservados

## Importante

- ❌ **NUNCA** faça `git add prisma/dev.db`
- ❌ **NUNCA** faça commit do banco
- ❌ **NUNCA** faça rebuild da imagem Docker se o banco estiver dentro dela
- ✅ **SEMPRE** faça backup antes de mudanças
- ✅ **SEMPRE** use o script seguro para corrigir permissões

## Troubleshooting

### Se o banco foi commitado por engano:
```bash
# Remover do Git (mas manter arquivo local)
git rm --cached prisma/dev.db

# Verificar que está no .gitignore
grep "dev.db" .gitignore

# Commit a remoção
git commit -m "chore: remover banco de dados do controle de versão"
```

### Se o banco foi substituído pelo de homologação:
1. Restaurar do backup:
   ```bash
   cp prisma/dev.db.backup.YYYYMMDD_HHMMSS prisma/dev.db
   ```

2. Garantir que está no .gitignore:
   ```bash
   echo "prisma/dev.db" >> .gitignore
   git add .gitignore
   git commit -m "chore: garantir que banco não é versionado"
   ```

## Permissões Recomendadas

Após corrigir permissões:
```bash
# Verificar permissões
ls -la prisma/dev.db

# Deve ser algo como:
# -rw-rw-r-- 1 1001 1001 ... prisma/dev.db
# OU
# -rw-rw-rw- 1 root root ... prisma/dev.db
```

O importante é que o container Docker consiga ler e escrever.

