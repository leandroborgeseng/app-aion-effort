# Deploy - Atualização de Investimentos

Este guia explica como atualizar a aplicação na produção com as mudanças relacionadas aos investimentos e setores.

## Mudanças Incluídas

- ✅ Setores agora vêm diretamente da API Effort (sem mapeamento)
- ✅ Filtro do gráfico aplicado na tabela de investimentos
- ✅ Seção "Setores Disponíveis" removida da página
- ✅ Correção de erro de inicialização de setores

## Passo a Passo para Deploy

### Opção 1: Usando o Script Automatizado (Recomendado)

1. **Conecte-se ao servidor:**
```bash
ssh usuario@seu-servidor.com
```

2. **Navegue até o diretório do projeto:**
```bash
cd /opt/apps/app-aion-effort
# ou o caminho onde está o projeto
```

3. **Execute o script de deploy:**
```bash
./deploy-producao-investments.sh
```

O script fará automaticamente:
- ✅ Git pull para atualizar o código
- ✅ Parar os containers
- ✅ Rebuild sem cache (garante atualização completa)
- ✅ Subir os containers novamente
- ✅ Verificar o status

### Opção 2: Deploy Manual

Se preferir fazer manualmente:

```bash
# 1. Atualizar código
git pull origin main

# 2. Parar containers
docker-compose down

# 3. Rebuild sem cache
docker-compose build --no-cache backend frontend

# 4. Subir containers
docker-compose up -d

# 5. Verificar status
docker-compose ps

# 6. Ver logs (opcional)
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Verificação Pós-Deploy

1. **Verificar se os containers estão rodando:**
```bash
docker-compose ps
```

Deve mostrar:
- `aion-effort-backend` - Status: Up (healthy)
- `aion-effort-frontend` - Status: Up (healthy)

2. **Testar a aplicação:**
- Acesse: `http://seu-servidor:3000`
- Faça login
- Vá para a página de Investimentos
- Verifique se:
  - Os setores aparecem nos dropdowns
  - O gráfico funciona
  - O filtro do gráfico aplica na tabela

3. **Verificar logs em caso de problemas:**
```bash
# Logs do backend
docker-compose logs -f backend

# Logs do frontend
docker-compose logs -f frontend

# Últimas 100 linhas
docker-compose logs --tail=100 backend
```

## Rollback (Se Necessário)

Se algo der errado, você pode voltar para a versão anterior:

```bash
# 1. Voltar para commit anterior
git log --oneline -5  # Ver últimos commits
git checkout <hash-do-commit-anterior>

# 2. Rebuild e restart
docker-compose down
docker-compose build --no-cache backend frontend
docker-compose up -d
```

## Troubleshooting

### Erro: "Cannot access 'sectors' before initialization"
- ✅ **Corrigido** - A ordem das queries foi ajustada

### Setores não aparecem
- Verifique se a API Effort está acessível
- Verifique os logs do backend: `docker-compose logs backend | grep sectors`

### Filtro não funciona na tabela
- Limpe o cache do navegador (Ctrl+Shift+R)
- Verifique o console do navegador (F12)

### Containers não sobem
- Verifique se as portas 3000 e 4000 estão livres
- Verifique logs: `docker-compose logs`

## Suporte

Em caso de problemas, verifique:
1. Logs dos containers
2. Status dos containers (`docker-compose ps`)
3. Conectividade com a API Effort
4. Variáveis de ambiente no arquivo `.env`

