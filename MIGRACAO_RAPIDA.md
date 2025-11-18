# Migração Rápida de Dados

Guia rápido para migrar dados de teste para produção em 3 passos.

## Passo 1: Backup na Máquina de Teste

```bash
# Na máquina de teste
cd /caminho/do/projeto
chmod +x backup-dados.sh
./backup-dados.sh
```

Isso criará um arquivo `backup-migracao-YYYYMMDD-HHMMSS.tar.gz`

## Passo 2: Transferir para Servidor

```bash
# Da máquina de teste, transferir para servidor
scp backup-migracao-*.tar.gz usuario@servidor:/tmp/
```

## Passo 3: Restaurar no Servidor

```bash
# Conectar ao servidor
ssh usuario@servidor

# Ir para o diretório do projeto
cd /opt/aion-effort  # ou onde está o projeto

# Copiar backup para o diretório do projeto
cp /tmp/backup-migracao-*.tar.gz .

# Restaurar
chmod +x restore-dados.sh
./restore-dados.sh backup-migracao-*.tar.gz
```

## Verificação

```bash
# Ver logs
docker-compose logs -f

# Testar login
docker-compose exec app pnpm create:admin
```

📖 **Guia completo:** Veja `MIGRACAO_DADOS.md` para instruções detalhadas.

