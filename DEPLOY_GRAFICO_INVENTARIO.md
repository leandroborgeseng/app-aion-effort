# Deploy - Gráfico de Custo por Setor no Inventário

## 📋 O que foi alterado

- ✅ Adicionado gráfico de barras mostrando os **Top 10 Setores por Custo de Substituição**
- ✅ Gráfico aparece na página de Inventário
- ✅ Valores formatados em R$ (BRL)
- ✅ Cores diferenciadas para os 3 primeiros setores
- ✅ Tooltip com valores completos

## 🚀 Deploy no Servidor

### Opção 1: Script Automatizado (Recomendado)

```bash
cd /opt/apps/app-aion-effort
git pull origin main
./deploy-grafico-inventario.sh
```

### Opção 2: Manual

```bash
cd /opt/apps/app-aion-effort

# 1. Atualizar código
git pull origin main

# 2. Parar containers
docker-compose stop frontend backend

# 3. Rebuild do frontend (onde está o gráfico)
docker-compose build --no-cache frontend

# 4. Iniciar containers
docker-compose up -d frontend backend

# 5. Verificar status
docker-compose ps
```

## ✅ Verificação

1. Acesse: `http://seu-servidor:3000`
2. Faça login
3. Navegue até **Inventário**
4. Verifique se o gráfico **"Top 10 Setores por Custo de Substituição"** aparece acima dos gráficos de pizza

## 🔍 Troubleshooting

### Gráfico não aparece

```bash
# Verificar logs do frontend
docker-compose logs -f frontend

# Verificar se há erros no console do navegador (F12)
```

### Containers não iniciam

```bash
# Verificar status
docker-compose ps

# Ver logs completos
docker-compose logs backend
docker-compose logs frontend

# Rebuild completo se necessário
docker-compose down
docker-compose build --no-cache frontend backend
docker-compose up -d
```

### Dados não aparecem no gráfico

- Verifique se há equipamentos com `ValorDeSubstituicao` preenchido
- Verifique se há setores cadastrados nos equipamentos
- O gráfico só aparece se houver dados válidos

## 📝 Notas

- O gráfico usa `recharts` (já instalado)
- Os dados são calculados em tempo real a partir dos equipamentos carregados
- O gráfico é responsivo e se adapta ao tamanho da tela
- Valores são formatados automaticamente (R$ k para milhares, R$ M para milhões)

