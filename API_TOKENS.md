# Configuração de Tokens de API

Este documento descreve como configurar os tokens de API para cada endpoint do PowerBI/Effort.

## Variáveis de Ambiente

Cada endpoint requer um token específico. Configure as seguintes variáveis no arquivo `.env`:

```env
# URL Base da API Effort/PowerBI
EFFORT_BASE_URL=https://sjh.globalthings.net

# Token Genérico (fallback caso algum token específico não esteja configurado)
EFFORT_API_KEY=your-generic-api-key-here

# Tokens Específicos por Endpoint
API_PBI_REL_CRONO_MANU=364c3a59-c2fe-4bf9-83db-05d0be8604f3
API_PBI_TIP_MANU=2d9b3530-6251-4582-a695-78525c2a6638
API_PBI_REL_OS_ANALITICO=eef00891-6e7e-463f-802a-5f8997bd9ef6
API_PBI_REL_EQUIPAMENTOS=a2e17293-6fa9-419d-aa46-aa60d7270fd7
API_PBI_REL_TMEF=592f42ea-f8a2-485d-97ea-066167caeb03
API_PBI_REL_TPM=a3334250-b891-408a-b972-9ea5b82e2ce8
API_PBI_REL_DISP_EQUIPAMENTO=0f2d6e2d-a437-45db-ba5c-6d4ed27aaacc
API_PBI_REL_DISP_EQUIPAMENTO_MES=2f5749b4-92a4-491b-a15c-bfce75871d6b
API_PBI_MONITOR_REACAO=a8ef213d-0855-4cbb-aa45-07a191a094cc
API_PBI_MONITOR_ATENDIMENTO=22c02c8d-ce6a-4106-9f77-a7e3acd2c4dc
API_PBI_ANEXOS_EQUIPAMENTO=8ceace83-c78c-4bd4-8e64-a9467b1e7b1f
API_PBI_ANEXOS_OS=4877b643-c07e-41df-b87c-67e6bec0d425
API_PBI_REL_OS_ANALITICO_RESUMIDO=684d9802-9662-4a15-8650-67bbe831f14a
API_PBI_OFICINA=4a884654-cdbf-473e-a63d-84af91ac030f
```

## Mapeamento de Endpoints para Tokens

| Endpoint | Variável de Ambiente | Token |
|----------|---------------------|-------|
| `/api/pbi/v1/cronograma` | `API_PBI_REL_CRONO_MANU` | `364c3a59-c2fe-4bf9-83db-05d0be8604f3` |
| `/api/pbi/v1/tipo_manutencao` | `API_PBI_TIP_MANU` | `2d9b3530-6251-4582-a695-78525c2a6638` |
| `/api/pbi/v1/listagem_analitica_das_os_resumida` | `API_PBI_REL_OS_ANALITICO_RESUMIDO` | `684d9802-9662-4a15-8650-67bbe831f14a` |
| `/api/pbi/v1/equipamentos` | `API_PBI_REL_EQUIPAMENTOS` | `a2e17293-6fa9-419d-aa46-aa60d7270fd7` |
| `/api/pbi/v1/tempo_medio_entre_falhas` | `API_PBI_REL_TMEF` | `592f42ea-f8a2-485d-97ea-066167caeb03` |
| `/api/pbi/v1/tempo_de_parada_medio` | `API_PBI_REL_TPM` | `a3334250-b891-408a-b972-9ea5b82e2ce8` |
| `/api/pbi/v1/disponibilidade_equipamento` | `API_PBI_REL_DISP_EQUIPAMENTO` | `0f2d6e2d-a437-45db-ba5c-6d4ed27aaacc` |
| `/api/pbi/v1/disponibilidade_equipamento_mes_a_mes` | `API_PBI_REL_DISP_EQUIPAMENTO_MES` | `2f5749b4-92a4-491b-a15c-bfce75871d6b` |
| `/api/pbi/v1/anexos_equipamento` | `API_PBI_ANEXOS_EQUIPAMENTO` | `8ceace83-c78c-4bd4-8e64-a9467b1e7b1f` |
| `/api/pbi/v1/anexos_os` | `API_PBI_ANEXOS_OS` | `4877b643-c07e-41df-b87c-67e6bec0d425` |
| `/api/pbi/v1/oficina` | `API_PBI_OFICINA` | `4a884654-cdbf-473e-a63d-84af91ac030f` |

## Como Funciona

O sistema automaticamente detecta qual endpoint está sendo chamado e usa o token apropriado. Se um token específico não estiver configurado, o sistema usa o token genérico (`EFFORT_API_KEY`) como fallback.

## Headers

- A maioria dos endpoints usa o header `X-API-KEY`
- O endpoint `/api/pbi/v1/oficina` usa o header `API-KEY`

O sistema gerencia isso automaticamente.

