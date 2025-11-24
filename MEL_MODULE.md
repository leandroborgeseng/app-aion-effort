# 📋 Módulo MEL (Minimum Equipment List)

## Visão Geral

O módulo MEL (Minimum Equipment List) permite gerenciar a quantidade mínima de equipamentos necessários por setor e tipo de equipamento, gerando alertas automáticos quando a disponibilidade fica abaixo do mínimo configurado.

## Funcionalidades

### 1. **Tipos de Equipamento**
- Classificação genérica de equipamentos (ex: "Ventilador Pulmonar", "Monitor Multiparâmetro")
- Mapeamento de modelos específicos da API Effort para tipos genéricos
- Categorização opcional (ex: "Suporte à Vida", "Cirurgia", "Monitoramento")

### 2. **MEL por Setor**
- Configuração de quantidade mínima por setor e tipo de equipamento
- Exemplo: UTI 1 precisa de 2 desfibriladores, 12 monitores, 12 ventiladores

### 3. **Cálculo de Disponibilidade**
- Conta total de equipamentos do tipo no setor
- Identifica equipamentos indisponíveis (com OS corretiva aberta/em andamento)
- Calcula disponíveis = total - indisponíveis

### 4. **Alertas Automáticos**
- Gera alertas quando disponível < mínimo configurado
- Alertas podem ser recalculados manualmente ou via agendador (futuro)

## Estrutura de Dados

### Tabelas Criadas

1. **EquipmentType**: Tipos genéricos de equipamento
2. **EquipmentTypeMapping**: Mapeamento de padrões da API Effort para tipos
3. **SectorMel**: Configuração de MEL por setor e tipo
4. **MelAlert**: Alertas gerados quando disponível < mínimo

## Como Usar

### 1. Executar Migração do Banco de Dados

```bash
pnpm prisma:migrate dev
```

Isso criará as novas tabelas no banco de dados.

### 2. Popular Dados Iniciais (Seed)

```bash
pnpm seed:mel
```

Este comando cria:
- 10 tipos de equipamento comuns (Desfibrilador, Monitor, Ventilador, etc.)
- Mapeamentos de padrões para identificar equipamentos na API Effort
- Exemplos de MEL para setores como UTI 1, UTI 2, Centro Cirúrgico, etc.

### 3. Acessar a Interface

1. Acesse `/mel` no frontend
2. Navegue pelas abas:
   - **Resumo**: Visão geral de setores com MEL e alertas ativos
   - **Por Setor**: Visualizar e configurar MEL de cada setor
   - **Alertas**: Lista de alertas ativos de MEL

### 4. Configurar MEL para um Setor

1. Vá para a aba "Por Setor"
2. Selecione um setor
3. Clique em "Configurar MEL" ou "Editar MEL"
4. Adicione itens:
   - Selecione o tipo de equipamento
   - Defina a quantidade mínima
5. Clique em "Salvar"

### 5. Recalcular Alertas

Após configurar ou atualizar MEL, recalcule os alertas:

1. Clique no botão "Recalcular Alertas" no topo da página
2. Ou faça uma requisição POST para `/api/ecm/mel/recalculate`

## Endpoints da API

### GET `/api/ecm/mel/sector/:sectorId`
Lista MEL configurado para um setor com situação atual.

**Resposta:**
```json
{
  "success": true,
  "sectorId": 1,
  "sectorName": "UTI 1",
  "items": [
    {
      "equipmentTypeId": "...",
      "equipmentTypeName": "Desfibrilador",
      "minimumQuantity": 2,
      "totalNoSetor": 3,
      "indisponiveis": 1,
      "disponiveis": 2,
      "emAlerta": false
    }
  ],
  "totalItems": 1,
  "itemsEmAlerta": 0
}
```

### POST `/api/ecm/mel/sector/:sectorId`
Configura/atualiza MEL de um setor.

**Body:**
```json
{
  "items": [
    {
      "equipmentTypeId": "...",
      "minimumQuantity": 2
    }
  ]
}
```

### DELETE `/api/ecm/mel/sector/:sectorId/equipment-type/:equipmentTypeId`
Remove um item de MEL de um setor.

### GET `/api/ecm/mel/alerts?onlyActive=true`
Lista alertas de MEL.

### POST `/api/ecm/mel/recalculate`
Recalcula todos os alertas de MEL manualmente.

### GET `/api/ecm/mel/summary`
Retorna resumo de MEL para dashboards.

### GET `/api/ecm/mel/equipment-types`
Lista todos os tipos de equipamento disponíveis.

### POST `/api/ecm/mel/equipment-types`
Cria um novo tipo de equipamento.

**Body:**
```json
{
  "name": "Novo Tipo",
  "category": "Categoria",
  "description": "Descrição opcional"
}
```

## Regras de Negócio

### Equipamento Indisponível

Um equipamento é considerado indisponível quando:
1. Status está em: "sucateado", "baixado", "emprestado"
2. OU possui OS aberta/em andamento do tipo corretiva

### Cálculo de Disponibilidade

Para um dado setor e tipo de equipamento:
- **Total no Setor**: Conta equipamentos do tipo no setor (exceto indisponíveis por status)
- **Indisponíveis**: Conta equipamentos com OS bloqueante
- **Disponíveis**: Total - Indisponíveis

### Geração de Alertas

Um alerta é criado/atualizado quando:
- Disponíveis < Mínimo configurado

Um alerta é resolvido quando:
- Disponíveis >= Mínimo configurado

## Mapeamento de Equipamentos

O sistema usa padrões de texto para identificar equipamentos na API Effort:

- **modeloPattern**: Padrão no nome do modelo (ex: "*ventilador*")
- **fabricantePattern**: Padrão no fabricante (opcional)
- **equipamentoPattern**: Padrão no nome do equipamento (opcional)

Exemplo:
- Tipo: "Ventilador Pulmonar"
- Padrões:
  - modeloPattern: "*ventilador*"
  - modeloPattern: "*ventilator*"
  - modeloPattern: "*respirator*"

## Exemplos de Configuração

### UTI 1
- 2 Desfibriladores
- 12 Monitores Multiparâmetro
- 12 Ventiladores Pulmonares
- 20 Bombas de Infusão
- 12 Oxímetros de Pulso

### Centro Cirúrgico
- 4 Aparelhos de Anestesia
- 6 Mesas Cirúrgicas
- 6 Focos Cirúrgicos
- 4 Bisturis Eletrônicos
- 6 Aspiradores Cirúrgicos
- 6 Monitores Multiparâmetro

## Troubleshooting

### Equipamentos não estão sendo identificados

1. Verifique os mapeamentos em `/api/ecm/mel/equipment-types`
2. Confirme que os padrões correspondem aos nomes na API Effort
3. Adicione novos padrões se necessário

### Alertas não estão sendo gerados

1. Execute o recálculo manual: POST `/api/ecm/mel/recalculate`
2. Verifique se há MEL configurado para o setor
3. Verifique se há equipamentos do tipo no setor

### Disponibilidade incorreta

1. Verifique se as OS estão sendo identificadas corretamente
2. Confirme que os status de equipamento estão corretos
3. Verifique os logs do servidor para erros

## Próximos Passos

- [ ] Agendador automático para recalcular alertas periodicamente
- [ ] Notificações por email/SMS quando alertas são gerados
- [ ] Histórico de alertas resolvidos
- [ ] Dashboard com gráficos de disponibilidade ao longo do tempo
- [ ] Exportação de relatórios de MEL

