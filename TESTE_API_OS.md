# 🧪 Guia de Teste da API de Ordens de Serviço (Effort)

## 📋 Informações da API

- **URL Base**: `https://sjh.globalthings.net`
- **Endpoint**: `/api/pbi/v1/listagem_analitica_das_os_resumida`
- **Método**: `GET`
- **Autenticação**: Header `X-API-KEY`

## 🔑 Como obter o token

O token pode estar em uma dessas variáveis de ambiente:
- `EFFORT_API_KEY` (token genérico)
- `API_PBI_REL_OS_ANALITICO_RESUMIDO` (token específico para este endpoint)

Verifique seu arquivo `.env` ou execute:
```bash
grep -E "EFFORT_API_KEY|API_PBI_REL_OS_ANALITICO" .env
```

## 🚀 Comandos curl prontos para usar

### 1. Teste Básico (Ano Corrente, 10 itens)

```bash
curl -X GET "https://sjh.globalthings.net/api/pbi/v1/listagem_analitica_das_os_resumida?tipoManutencao=Todos&periodo=AnoCorrente&pagina=0&qtdPorPagina=10" \
  -H "X-API-KEY: SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json"
```

**Parâmetros:**
- `tipoManutencao=Todos` - Todos os tipos de manutenção
- `periodo=AnoCorrente` - Apenas o ano atual
- `pagina=0` - Primeira página (começa em 0)
- `qtdPorPagina=10` - 10 itens por página

### 2. Com filtro de data (último ano)

```bash
curl -X GET "https://sjh.globalthings.net/api/pbi/v1/listagem_analitica_das_os_resumida?tipoManutencao=Todos&periodo=Todos&dataInicio=2024-01-15&dataFim=2025-01-15&pagina=0&qtdPorPagina=10" \
  -H "X-API-KEY: SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json"
```

**Parâmetros:**
- `periodo=Todos` - Todos os períodos (mas filtra por data)
- `dataInicio=2024-01-15` - Data de início (formato: YYYY-MM-DD)
- `dataFim=2025-01-15` - Data de fim (formato: YYYY-MM-DD)

### 3. Ver apenas o status HTTP (rápido)

```bash
curl -X GET "https://sjh.globalthings.net/api/pbi/v1/listagem_analitica_das_os_resumida?tipoManutencao=Todos&periodo=AnoCorrente&pagina=0&qtdPorPagina=1" \
  -H "X-API-KEY: SEU_TOKEN_AQUI" \
  -w "\nStatus HTTP: %{http_code}\nTempo: %{time_total}s\n" \
  -o /dev/null -s
```

### 4. Com formatação JSON bonita (requer `jq`)

```bash
curl -X GET "https://sjh.globalthings.net/api/pbi/v1/listagem_analitica_das_os_resumida?tipoManutencao=Todos&periodo=AnoCorrente&pagina=0&qtdPorPagina=5" \
  -H "X-API-KEY: SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  | jq '.'
```

### 5. Ver apenas o primeiro item (para debug)

```bash
curl -X GET "https://sjh.globalthings.net/api/pbi/v1/listagem_analitica_das_os_resumida?tipoManutencao=Todos&periodo=AnoCorrente&pagina=0&qtdPorPagina=1" \
  -H "X-API-KEY: SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  | jq '.[0]' 2>/dev/null || echo "Resposta não é um array JSON"
```

## 📝 Valores possíveis para `periodo`

- `Todos` - Todos os períodos
- `SemanaAtual` - Semana atual
- `MesAtual` - Mês atual
- `MesCorrente` - Mês corrente
- `MesAnterior` - Mês anterior
- `AnoAtual` - Ano atual
- `AnoCorrente` - Ano corrente ⭐ (recomendado)
- `AnoAnterior` - Ano anterior
- `DoisAnosAtuais` - Dois anos atuais
- `DoisAnosCorrente` - Dois anos corrente

## 🔍 Exemplo completo com variável de ambiente

```bash
# Definir o token
export EFFORT_API_KEY="seu_token_aqui"

# Executar o teste
curl -X GET "https://sjh.globalthings.net/api/pbi/v1/listagem_analitica_das_os_resumida?tipoManutencao=Todos&periodo=AnoCorrente&pagina=0&qtdPorPagina=10" \
  -H "X-API-KEY: ${EFFORT_API_KEY}" \
  -H "Content-Type: application/json" \
  | jq '.'
```

## 🛠️ Usando o script automatizado

O arquivo `test-api-os.sh` contém vários testes automatizados:

```bash
# Tornar executável (se ainda não for)
chmod +x test-api-os.sh

# Definir o token
export EFFORT_API_KEY="seu_token_aqui"

# Executar todos os testes
./test-api-os.sh
```

## 📊 Interpretando a resposta

### Resposta de sucesso (200)
```json
[
  {
    "OS": "12345",
    "CodigoSerialOS": 12345,
    "Abertura": "2025-01-10T10:00:00",
    "DataAbertura": "2025-01-10",
    "Fechamento": "2025-01-12T15:30:00",
    "DataFechamento": "2025-01-12",
    "SituacaoDaOS": "Fechada",
    "Situacao": "Fechada",
    "Setor": "UTI 1",
    "Equipamento": "Desfibrilador",
    ...
  }
]
```

### Erros comuns

**401 Unauthorized**
- Token inválido ou ausente
- Verifique o header `X-API-KEY`

**403 Forbidden**
- Token sem permissão para este endpoint
- Verifique se está usando o token correto

**404 Not Found**
- URL incorreta
- Verifique a URL base e o endpoint

**500 Internal Server Error**
- Erro no servidor Effort
- Pode ser temporário, tente novamente

**Resposta vazia `[]`**
- Não há OS no período especificado
- Tente outro período ou remover filtros

## 💡 Dicas de debug

1. **Verificar conectividade:**
   ```bash
   curl -I https://sjh.globalthings.net
   ```

2. **Ver headers completos:**
   ```bash
   curl -v -X GET "https://sjh.globalthings.net/api/pbi/v1/listagem_analitica_das_os_resumida?tipoManutencao=Todos&periodo=AnoCorrente&pagina=0&qtdPorPagina=1" \
     -H "X-API-KEY: SEU_TOKEN_AQUI"
   ```

3. **Salvar resposta em arquivo:**
   ```bash
   curl -X GET "https://sjh.globalthings.net/api/pbi/v1/listagem_analitica_das_os_resumida?tipoManutencao=Todos&periodo=AnoCorrente&pagina=0&qtdPorPagina=10" \
     -H "X-API-KEY: SEU_TOKEN_AQUI" \
     -o resposta.json
   
   # Ver o arquivo
   cat resposta.json | jq '.'
   ```

4. **Contar quantas OS foram retornadas:**
   ```bash
   curl -X GET "https://sjh.globalthings.net/api/pbi/v1/listagem_analitica_das_os_resumida?tipoManutencao=Todos&periodo=AnoCorrente&pagina=0&qtdPorPagina=100" \
     -H "X-API-KEY: SEU_TOKEN_AQUI" \
     | jq 'length'
   ```

## 🎯 Teste recomendado para começar

```bash
# 1. Verificar se a API responde
curl -X GET "https://sjh.globalthings.net/api/pbi/v1/listagem_analitica_das_os_resumida?tipoManutencao=Todos&periodo=AnoCorrente&pagina=0&qtdPorPagina=1" \
  -H "X-API-KEY: SEU_TOKEN_AQUI" \
  -w "\nStatus: %{http_code}\n" \
  -o /dev/null -s

# 2. Se retornar 200, ver os dados
curl -X GET "https://sjh.globalthings.net/api/pbi/v1/listagem_analitica_das_os_resumida?tipoManutencao=Todos&periodo=AnoCorrente&pagina=0&qtdPorPagina=5" \
  -H "X-API-KEY: SEU_TOKEN_AQUI" \
  | jq '.'
```

