# ⚠️ Erro 503 - API Effort Indisponível

## Problema Identificado

A **API Effort externa** (`https://sjh.globalthings.net`) está retornando **HTTP 503 (Service Unavailable)** para todas as requisições.

### Logs Indicam:

```
[effortClient] Erro na resposta: {
  status: 503,
  statusText: 'Service Unavailable',
  url: '/api/pbi/v1/listagem_analitica_das_os_resumida',
  ...
}
```

## Causa

O servidor da API Effort (`Microsoft-HTTPAPI/2.0`) está temporariamente indisponível. Isso **NÃO é um problema do código** da aplicação - é uma indisponibilidade do serviço externo.

## Solução Implementada

Melhoramos o tratamento de erros para:

1. ✅ Detectar erros 503 da API Effort
2. ✅ Retornar mensagens mais claras ao usuário
3. ✅ Retornar HTTP 503 (não 500) quando a API externa está indisponível
4. ✅ Informar que é um problema temporário da API externa

## Mensagem para o Usuário

Agora quando a API Effort estiver indisponível, o usuário verá:

> "A API Effort está temporariamente indisponível. Por favor, tente novamente em alguns instantes."

## O Que Fazer

### Imediato
- **Não há nada a fazer no código** - o problema é da API externa
- Aguardar a API Effort voltar a funcionar
- Os usuários verão mensagens mais claras informando que é um problema temporário

### Quando a API Voltar
- A aplicação vai funcionar normalmente automaticamente
- Não é necessário reiniciar ou fazer nenhuma ação

### Verificar Status da API Effort

```bash
# Testar conectividade com a API Effort
curl -I https://sjh.globalthings.net/api/pbi/v1/equipamentos

# Ou dentro do container backend
docker exec aion-effort-backend curl -I https://sjh.globalthings.net/api/pbi/v1/equipamentos
```

## Melhorias Implementadas

### Backend
- ✅ Detecção automática de erros 503 da API Effort
- ✅ Retorno de HTTP 503 quando API externa está indisponível
- ✅ Mensagens claras sobre indisponibilidade temporária

### Frontend
- ✅ Mensagens de erro mais claras
- ✅ Botão "Tentar novamente" funcional
- ✅ Identificação de erros de API externa

## Status Atual

- ✅ Backend funcionando corretamente
- ✅ Tratamento de erros melhorado
- ❌ API Effort externa retornando 503 (problema externo)

## Próximos Passos

1. Monitorar quando a API Effort voltar a funcionar
2. Testar novamente quando a API estiver disponível
3. Verificar se há necessidade de fallback/cache para períodos de indisponibilidade

