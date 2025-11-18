# Guia de Migração de Dados - Teste para Produção

Este guia explica como migrar todos os dados da aplicação de teste para produção.

## O que será migrado

1. **Banco de Dados SQLite** (`prisma/dev.db`)
   - Usuários
   - Investimentos
   - Contratos de Manutenção
   - Rondas de Setor
   - Flags de Equipamentos
   - KPIs de Equipamentos
   - Alertas
   - Configurações do Sistema
   - Sessões (opcional - pode ser ignorado)

2. **Arquivos de Upload** (`uploads/contracts/`)
   - Arquivos PDF/documentos dos contratos

## Passo 1: Preparar Backup na Máquina de Teste

### Opção A: Backup Manual (Recomendado)

```bash
# Na máquina de teste
cd /caminho/do/projeto/teste

# Criar diretório de backup
mkdir -p backup-migracao-$(date +%Y%m%d)
cd backup-migracao-$(date +%Y%m%d)

# Fazer backup do banco de dados
cp ../prisma/dev.db ./dev.db.backup

# Fazer backup dos uploads
cp -r ../uploads ./uploads-backup

# Verificar tamanho dos arquivos
du -sh dev.db.backup
du -sh uploads-backup

# Criar arquivo compactado (opcional mas recomendado)
tar -czf backup-completo-$(date +%Y%m%d-%H%M%S).tar.gz dev.db.backup uploads-backup

# Verificar o arquivo criado
ls -lh backup-completo-*.tar.gz
```

### Opção B: Usar Script Automatizado

Execute o script `backup-dados.sh` (será criado abaixo):

```bash
chmod +x backup-dados.sh
./backup-dados.sh
```

## Passo 2: Transferir Dados para o Servidor de Produção

### Opção A: Usar SCP (Recomendado)

```bash
# Da máquina de teste, transferir para o servidor
scp backup-completo-YYYYMMDD-HHMMSS.tar.gz usuario@servidor-producao:/tmp/

# Ou transferir arquivos individuais
scp prisma/dev.db usuario@servidor-producao:/tmp/dev.db.backup
scp -r uploads usuario@servidor-producao:/tmp/uploads-backup
```

### Opção B: Usar rsync (Melhor para grandes volumes)

```bash
# Transferir banco de dados
rsync -avz --progress prisma/dev.db usuario@servidor-producao:/tmp/dev.db.backup

# Transferir uploads
rsync -avz --progress uploads/ usuario@servidor-producao:/tmp/uploads-backup/
```

### Opção C: Usar Git (apenas para banco pequeno - NÃO recomendado)

⚠️ **ATENÇÃO:** Não commite o banco de dados no Git! Use apenas para transferência temporária se necessário.

## Passo 3: Restaurar Dados no Servidor de Produção

### Conectar ao servidor

```bash
ssh usuario@servidor-producao
```

### Parar a aplicação

```bash
cd /opt/aion-effort  # ou onde está o projeto
docker-compose down
```

### Fazer backup do banco atual (segurança)

```bash
# Criar backup do banco atual (caso precise reverter)
cp prisma/dev.db prisma/dev.db.backup-antes-migracao-$(date +%Y%m%d-%H%M%S)
```

### Restaurar banco de dados

```bash
# Se transferiu arquivo compactado, descompactar primeiro
cd /tmp
tar -xzf backup-completo-YYYYMMDD-HHMMSS.tar.gz

# Copiar banco de dados
cp dev.db.backup /opt/aion-effort/prisma/dev.db

# Ajustar permissões
chmod 644 /opt/aion-effort/prisma/dev.db
chown $USER:$USER /opt/aion-effort/prisma/dev.db
```

### Restaurar arquivos de upload

```bash
# Copiar arquivos de contratos
cp -r uploads-backup/contracts/* /opt/aion-effort/uploads/contracts/

# Ajustar permissões
chmod -R 755 /opt/aion-effort/uploads
chown -R $USER:$USER /opt/aion-effort/uploads
```

### Executar migrações (se necessário)

```bash
cd /opt/aion-effort
docker-compose up -d
docker-compose exec app pnpm prisma:migrate deploy
```

### Verificar integridade

```bash
# Verificar se banco está acessível
docker-compose exec app node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.count().then(c => console.log('Usuários:', c)).finally(() => prisma.\$disconnect())"

# Verificar arquivos de upload
ls -lh uploads/contracts/
```

## Passo 4: Reiniciar Aplicação

```bash
docker-compose restart
docker-compose logs -f
```

## Scripts Auxiliares

### Script de Backup (backup-dados.sh)

Veja o arquivo `backup-dados.sh` criado abaixo.

### Script de Restauração (restore-dados.sh)

Veja o arquivo `restore-dados.sh` criado abaixo.

## Verificação Pós-Migração

Após migrar, verifique:

1. **Usuários:**
   ```bash
   docker-compose exec app pnpm create:admin
   # Verificar se consegue fazer login
   ```

2. **Investimentos:**
   - Acesse a página de investimentos
   - Verifique se os dados aparecem

3. **Contratos:**
   - Acesse a página de contratos
   - Verifique se os arquivos PDF estão acessíveis

4. **Rondas:**
   - Acesse a página de rondas
   - Verifique se os dados aparecem

## Troubleshooting

### Erro: "Database is locked"

```bash
# Parar aplicação completamente
docker-compose down

# Verificar processos usando o banco
lsof prisma/dev.db

# Aguardar alguns segundos e tentar novamente
```

### Erro: "Permission denied"

```bash
# Ajustar permissões
sudo chown -R $USER:$USER prisma/ uploads/
chmod -R 755 prisma/ uploads/
```

### Banco de dados corrompido

```bash
# Restaurar backup anterior
cp prisma/dev.db.backup-antes-migracao-YYYYMMDD-HHMMSS prisma/dev.db

# Ou restaurar do backup de teste novamente
```

### Arquivos de upload não aparecem

```bash
# Verificar permissões
ls -la uploads/contracts/

# Verificar se arquivos foram copiados
find uploads/contracts/ -type f

# Verificar logs do container
docker-compose logs app | grep -i upload
```

## Limpeza Após Migração

Após confirmar que tudo está funcionando:

```bash
# Remover arquivos temporários no servidor
rm -rf /tmp/dev.db.backup /tmp/uploads-backup /tmp/backup-completo-*.tar.gz

# Manter backup de segurança por alguns dias
# Depois pode remover:
# rm prisma/dev.db.backup-antes-migracao-*
```

## Checklist de Migração

- [ ] Backup criado na máquina de teste
- [ ] Dados transferidos para servidor de produção
- [ ] Backup de segurança do banco atual criado
- [ ] Banco de dados restaurado
- [ ] Arquivos de upload restaurados
- [ ] Permissões ajustadas
- [ ] Migrações executadas
- [ ] Aplicação reiniciada
- [ ] Login testado
- [ ] Dados verificados (investimentos, contratos, rondas)
- [ ] Arquivos de upload acessíveis
- [ ] Backup de segurança mantido

## Notas Importantes

1. **Sessões:** As sessões de usuário não serão migradas (usuários precisarão fazer login novamente)

2. **Cache:** O cache HTTP não precisa ser migrado (será reconstruído automaticamente)

3. **Logs:** Os logs de requisições não precisam ser migrados

4. **Segurança:** Certifique-se de que o arquivo `.env` no servidor de produção tem configurações corretas (especialmente `JWT_SECRET`)

5. **Backup:** Sempre mantenha um backup do banco de produção antes de fazer qualquer alteração

