# Serviço de Warm-up das APIs

## 📋 Descrição

O serviço de warm-up consulta periodicamente as APIs principais para manter o cache atualizado, garantindo que a aplicação não demore para carregar quando acessada pela primeira vez.

## ⚙️ Como Funciona

1. **Inicialização**: Quando o servidor inicia, aguarda 5 segundos e executa o primeiro warm-up
2. **Execução Periódica**: A cada 1 hora, executa um novo warm-up automático
3. **Rotas Aquecidas**: Faz chamadas HTTP internas para as seguintes rotas:
   - Setores de Investimentos
   - Investimentos
   - Rondas
   - OS Disponíveis (Abertas, Fechadas, Todas)
   - Inventário
   - Disponibilidade Mês a Mês
   - Cronograma
   - Equipamentos Críticos
   - Contratos

## 🔧 Configuração

O serviço está configurado em `src/services/warmupService.ts`:

- **Intervalo**: 1 hora (60 minutos)
- **Timeout por rota**: 30 segundos
- **Modo MOCK**: Desabilitado automaticamente quando `USE_MOCK=true`

## 📊 Logs

O serviço registra logs detalhados:

```
[warmup] 🚀 Serviço de warm-up iniciado (intervalo: 60 minutos)
[warmup] Aquecendo Setores de Investimentos...
[warmup] ✅ Setores de Investimentos aquecido com sucesso (245ms)
[warmup] ✅ Warm-up concluído em 3250ms (11 rotas)
```

## 🚀 Benefícios

1. **Performance**: Cache sempre atualizado = respostas mais rápidas
2. **Experiência do Usuário**: Primeira carga da aplicação é instantânea
3. **Redução de Carga**: APIs são consultadas em horários programados, não sob demanda
4. **Confiabilidade**: Timeout evita que uma rota lenta bloqueie o warm-up

## 🔍 Monitoramento

Para verificar se o warm-up está funcionando:

```bash
# Ver logs do backend
docker-compose logs backend | grep warmup

# Verificar cache populado
docker-compose exec backend pnpm prisma studio
# Navegar até HttpCache para ver os itens em cache
```

## 🛠️ Forçar Warm-up Manual

Se necessário, você pode forçar um warm-up imediato adicionando um endpoint:

```typescript
// Em src/server.ts ou em uma rota admin
app.post('/api/admin/warmup', async (req, res) => {
  const { forceWarmup } = await import('./services/warmupService');
  await forceWarmup();
  res.json({ success: true, message: 'Warm-up executado' });
});
```

## ⚠️ Notas Importantes

- O warm-up só funciona em modo **não-MOCK** (`USE_MOCK=false`)
- As chamadas são feitas via HTTP interno (`localhost`)
- Se uma rota falhar, as outras continuam sendo executadas
- O serviço não bloqueia o startup do servidor

