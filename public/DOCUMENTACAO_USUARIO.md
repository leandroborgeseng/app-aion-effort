# Documentação do Sistema - Aion Engenharia

## Índice

1. [Introdução](#introdução)
2. [Acesso ao Sistema](#acesso-ao-sistema)
3. [Dashboard](#dashboard)
4. [Inventário](#inventário)
5. [Ordens de Serviço (OS)](#ordens-de-serviço-os)
6. [Cronograma](#cronograma)
7. [Rondas Semanais](#rondas-semanais)
8. [Investimentos](#investimentos)
9. [Contratos](#contratos)
10. [MEL - Lista Mínima de Equipamentos](#mel---lista-mínima-de-equipamentos)
11. [Solicitações de Compra](#solicitações-de-compra)
12. [Equipamentos Críticos e SLA](#equipamentos-críticos-e-sla)
13. [Alertas do Sistema](#alertas-do-sistema)
14. [Configurações](#configurações)
15. [Permissões e Usuários](#permissões-e-usuários)
16. [Atalhos de Teclado](#atalhos-de-teclado)

---

## Introdução

O sistema Aion Engenharia é uma plataforma completa para gestão de equipamentos médicos, desenvolvida especificamente para hospitais e instituições de saúde. O sistema permite:

- Gestão completa do inventário de equipamentos médicos
- Acompanhamento de ordens de serviço (manutenção)
- Monitoramento de disponibilidade e indicadores críticos
- Gestão de investimentos e contratos
- Rondas semanais para acompanhamento de manutenção
- Controle de MEL (Lista Mínima de Equipamentos)
- Gestão de solicitações de compra

O sistema integra-se com a API Effort para sincronização automática de dados de equipamentos e ordens de serviço.

---

## Acesso ao Sistema

### Login

1. Acesse a URL do sistema fornecida pela equipe de TI
2. Na tela de login, informe:
   - **Email**: Seu endereço de email cadastrado
   - **Senha**: Sua senha de acesso
3. Clique em "Entrar"

### Recuperação de Senha

Em caso de esquecimento de senha, entre em contato com o administrador do sistema.

### Navegação

O sistema possui um menu lateral (à esquerda) com todos os módulos disponíveis. No mobile, o menu pode ser aberto através do botão de menu no topo.

---

## Dashboard

### Visão Geral

O Dashboard é a tela inicial do sistema e oferece uma visão consolidada de todos os indicadores importantes:

#### **Indicadores Principais**

- **Disponibilidade de Equipamentos**: Percentual de equipamentos disponíveis no período
- **Equipamentos em Manutenção**: Quantidade de equipamentos atualmente em manutenção
- **Alertas Críticos**: Equipamentos críticos com problemas ou em situação de risco

#### **Componentes do Dashboard**

1. **Gráfico de Disponibilidade**
   - Exibe a distribuição de equipamentos por status (Disponível, Em Manutenção, Indisponível)
   - Atualizado em tempo real conforme a sincronização com a API Effort

2. **Equipamentos em Manutenção**
   - Lista os equipamentos que estão atualmente em manutenção
   - Mostra informações como Tag, Equipamento, Setor e OS vinculada
   - Clique em um equipamento para ver mais detalhes

3. **Últimas Rondas Semanais**
   - Exibe as 5 rondas semanais mais recentes
   - Mostra setor, data e responsável
   - Clique para acessar os detalhes da ronda

4. **Próximas Manutenções do Cronograma**
   - Exibe as próximas manutenções preventivas agendadas
   - Organizado por data
   - Permite visualizar detalhes do cronograma

5. **Investimentos Recentes**
   - Lista os investimentos mais recentes
   - Mostra título, valor estimado e status
   - Link direto para a página de investimentos

#### **Filtros**

O Dashboard respeita as permissões do usuário, mostrando apenas os setores aos quais o usuário tem acesso.

---

## Inventário

### Descrição

O módulo de Inventário é o coração do sistema, permitindo visualizar e gerenciar todos os equipamentos médicos cadastrados.

### Funcionalidades Principais

#### **Visualização de Equipamentos**

- **Lista Completa**: Visualize todos os equipamentos do hospital
- **Filtros Avançados**: Filtre por setor, criticidade, tipo, fabricante, modelo, etc.
- **Busca**: Busque equipamentos por Tag, nome, modelo ou fabricante
- **Ordenação**: Ordene por qualquer coluna (Tag, Setor, Idade, etc.)

#### **Informações Exibidas**

Para cada equipamento, você pode visualizar:

- **Tag**: Identificador único do equipamento
- **Nome/Descrição**: Nome completo do equipamento
- **Fabricante**: Fabricante do equipamento
- **Modelo**: Modelo específico
- **Setor**: Setor onde o equipamento está localizado
- **Idade**: Idade do equipamento (calculada automaticamente)
- **Status**: Disponível, Em Manutenção, Indisponível
- **Criticidade**: Crítico, Monitorado, Normal
- **Data de EOL/EOS**: End of Life / End of Service
- **Validade ANVISA**: Data de validade do registro ANVISA

#### **Filtros Disponíveis**

1. **Por Setor**: Filtre equipamentos por setor específico
2. **Por Criticidade**: Crítico, Monitorado ou Normal
3. **Por Tipo de Equipamento**: Tipo específico (ex: Monitor, Ventilador)
4. **Por Fabricante**: Filtre por fabricante
5. **Por Modelo**: Filtre por modelo específico
6. **Por Idade**: 
   - 0-2 anos
   - 2-5 anos
   - 5-10 anos
   - Mais de 10 anos
7. **ANVISA Vencida**: Mostrar apenas equipamentos com ANVISA vencida
8. **EOL Próximo**: Equipamentos próximos do fim de vida útil
9. **EOS Próximo**: Equipamentos próximos do fim de suporte

#### **Ações Disponíveis**

- **Visualizar Detalhes**: Clique em um equipamento para ver informações completas
- **Editar Flags**: Marcar equipamentos como críticos, monitorados, ou com necessidade de substituição
- **Exportar**: Exportar lista filtrada para Excel ou CSV
- **Salvar Filtros**: Salve filtros frequentes para reutilização rápida
- **Compartilhar Filtros**: Compartilhe filtros com outros usuários através de link

#### **Gráficos e Estatísticas**

- **Distribuição por Setor**: Gráfico de pizza mostrando a quantidade de equipamentos por setor
- **Distribuição por Criticidade**: Visualização da distribuição de criticidade
- **Distribuição por Idade**: Gráfico de barras mostrando a idade dos equipamentos
- **Status de Disponibilidade**: Percentual de equipamentos disponíveis vs. em manutenção

#### **Flags de Equipamento**

Você pode marcar equipamentos com flags especiais:

- **Crítico**: Equipamento essencial para operação do setor
- **Monitorado**: Equipamento que requer monitoramento especial
- **Substituição**: Equipamento marcado para substituição
- **Inspecionado**: Marca quando o equipamento foi inspecionado
- **EOL/EOS**: Defina datas de fim de vida útil e fim de suporte
- **ANVISA**: Registre número e validade do registro ANVISA

---

## Ordens de Serviço (OS)

### Descrição

O módulo de Ordens de Serviço permite acompanhar todas as ordens de serviço (manutenções) abertas no sistema.

### Funcionalidades Principais

#### **Visualização de OS**

- **Lista de Equipamentos com OS Abertas**: Visualize equipamentos que possuem OS em aberto
- **Agrupamento**: Equipamentos são agrupados automaticamente
- **Detalhes da OS**: Para cada equipamento, veja todas as OS abertas vinculadas

#### **Informações Exibidas**

Para cada OS, você pode visualizar:

- **Código da OS**: Código único da ordem de serviço
- **Equipamento**: Nome do equipamento vinculado
- **Tag**: Tag do equipamento
- **Setor**: Setor onde o equipamento está localizado
- **Situação**: Aberta ou Fechada
- **Data de Abertura**: Quando a OS foi aberta
- **Tipo de Manutenção**: Corretiva ou Preventiva
- **Oficina**: Oficina responsável pela manutenção

#### **Funcionalidades Especiais**

1. **Comentários e Vínculo com Solicitações de Compra**:
   - Clique em uma OS para abrir o modal de detalhes
   - Adicione comentários sobre a OS
   - Vincule a OS a uma solicitação de compra (se necessário)

2. **Visualização Gráfica**:
   - Gráfico de linha mostrando a evolução do número de OS abertas ao longo do tempo
   - Permite identificar tendências e padrões

3. **Estatísticas**:
   - Total de equipamentos com OS abertas
   - Filtros por período e situação

#### **Filtros**

- **Por Situação**: Todas, Abertas ou Fechadas
- **Por Setor**: Filtre por setor específico
- **Por Período**: Selecione um período específico

---

## Cronograma

### Descrição

O módulo de Cronograma permite visualizar e gerenciar as manutenções preventivas agendadas em uma visualização matricial organizada por setor e mês.

### Funcionalidades Principais

#### **Visualização do Cronograma**

O cronograma é exibido em formato de **matriz Setor x Mês**, facilitando a visualização de todas as manutenções previstas:

- **Eixo Vertical**: Setores
- **Eixo Horizontal**: Meses do ano
- **Células da Matriz**: Indicam quais tipos de manutenção serão executados em cada setor em cada mês

#### **Informações Exibidas**

Para cada manutenção preventiva:

- **Data Prevista (Próxima Realização)**: Data em que a manutenção está agendada
- **Equipamento**: Nome e Tag do equipamento
- **Setor**: Setor onde o equipamento está localizado
- **Tipo de Manutenção**: Tipo específico de manutenção preventiva
- **Data da Última Realização**: Quando a última manutenção deste tipo foi realizada

#### **Funcionalidades**

1. **Matriz Setor x Mês**:
   - Visualização clara de quando cada tipo de manutenção ocorrerá
   - Fácil identificação de períodos com maior carga de manutenções
   - Identificação de setores com muitas manutenções em um mês

2. **Filtros**:
   - **Período**: Selecione a data de início e fim do período a visualizar
   - **Setor**: Filtre por setor específico (ou veja todos)
   - **Atualização**: Botão para atualizar os dados do cronograma

3. **Estatísticas**:
   - Contagem de tipos de manutenção
   - Distribuição de manutenções por tipo

4. **Visualização de Tipos**:
   - Cada célula da matriz pode mostrar múltiplos tipos de manutenção
   - Os tipos são listados dentro de cada célula
   - Facilita verificar quais manutenções serão executadas simultaneamente

#### **Como Usar**

1. **Definir Período**:
   - Selecione a data de início e fim do período que deseja visualizar
   - O padrão é o ano atual (01/01 até 31/12)

2. **Filtrar por Setor**:
   - Selecione "Todos" para ver todos os setores
   - Ou escolha um setor específico para focar nele

3. **Interpretar a Matriz**:
   - Cada linha representa um setor
   - Cada coluna representa um mês
   - O conteúdo de cada célula mostra os tipos de manutenção programadas para aquele setor naquele mês

4. **Atualizar Dados**:
   - Use o botão "Atualizar" para forçar a sincronização com a API Effort
   - Os dados são atualizados automaticamente, mas você pode forçar uma atualização quando necessário

#### **Visualização Detalhada**

Ao visualizar a matriz, você pode ver:

- **Tipos de Manutenção**: Lista de todos os tipos encontrados no período
- **Contagem por Tipo**: Quantas manutenções de cada tipo estão programadas
- **Distribuição**: Como as manutenções estão distribuídas ao longo do ano

#### **Última Sincronização**

O sistema mostra a data e hora da última sincronização dos dados do cronograma, garantindo que você saiba quando os dados foram atualizados pela última vez.

---

## Rondas Semanais

### Descrição

As Rondas Semanais são reuniões periódicas para acompanhamento de manutenção e comunicação com departamentos.

### Funcionalidades Principais

#### **Criar Nova Ronda**

1. Clique no botão "Nova Ronda"
2. Preencha os campos obrigatórios:
   - **Setor**: Selecione o setor da ronda
   - **Data de Início da Semana**: Data de início da semana da ronda
   - **Responsável**: Nome do responsável pela ronda (preenchido automaticamente)
3. Opcionalmente:
   - Adicione um **resumo/observações** da ronda
   - **Vincule Ordens de Serviço** (OS) relevantes
   - **Vincule Investimentos** relacionados
   - **Vincule Solicitações de Compra** pendentes

#### **Visualização de Rondas**

Cada ronda exibe:

- **Setor**: Setor da ronda
- **Data**: Data de início da semana
- **Responsável**: Pessoa responsável
- **Resumo**: Observações e notas da ronda
- **Estatísticas**: 
  - Número de OS Abertas
  - Número de OS Fechadas
- **Itens Vinculados**: OS, Investimentos e Solicitações de Compra vinculadas

#### **Funcionalidades**

1. **Editar Ronda**: Clique no ícone de edição para modificar uma ronda existente
2. **Criar Investimento**: Crie um investimento diretamente a partir de uma ronda
3. **Filtros**: Filtre rondas por período ou setor
4. **Estatísticas Globais**: Veja o total de setores com rondas, OS abertas e fechadas

#### **Filtro de OS por Situação**

Ao criar ou editar uma ronda, você pode filtrar as OS disponíveis:

- **Abertas**: Apenas OS em aberto
- **Fechadas**: Apenas OS fechadas
- **Todas**: Todas as OS disponíveis

---

## Investimentos

### Descrição

O módulo de Investimentos permite gerenciar investimentos planejados e em andamento.

### Funcionalidades Principais

#### **Criar Novo Investimento**

1. Clique em "Novo Investimento"
2. Preencha os campos:
   - **Título**: Nome do investimento
   - **Descrição**: Descrição detalhada
   - **Categoria**: Equipamento, Infraestrutura, Melhoria, Substituição, Outros
   - **Valor Estimado**: Valor estimado em R$
   - **Prioridade**: Baixa, Média, Alta, Crítica
   - **Status**: Proposto, Em Análise, Aprovado, Em Execução, Concluído, Cancelado
   - **Setor**: Setor relacionado
   - **Responsável**: Pessoa responsável
   - **Datas**: Data prevista, solicitação, chegada
   - **Observações**: Notas adicionais

#### **Visualização de Investimentos**

- **Lista Completa**: Veja todos os investimentos cadastrados
- **Filtros**: Filtre por status, categoria, setor, prioridade
- **Busca**: Busque por título ou descrição
- **Ordenação**: Ordene por valor, data, prioridade, etc.

#### **Estatísticas e Gráficos**

- **Valor Total**: Soma de todos os investimentos
- **Total de Itens**: Quantidade total de investimentos
- **Distribuição por Status**: Gráfico mostrando investimentos por status
- **Top 10 Setores**: Gráfico dos setores com maior investimento
- **Distribuição por Categoria**: Gráfico de pizza por categoria

#### **Ações Disponíveis**

- **Editar**: Modifique investimentos existentes
- **Vincular à Ronda**: Vincule investimentos a rondas semanais
- **Exportar**: Exporte a lista para Excel ou CSV
- **Filtros Salvos**: Salve e reutilize filtros frequentes

---

## Contratos

### Descrição

O módulo de Contratos permite gerenciar contratos de manutenção e serviços.

### Funcionalidades Principais

#### **Criar Novo Contrato**

1. Clique em "Novo Contrato"
2. Preencha as informações:
   - **Nome do Contrato**: Nome identificador do contrato
   - **Fornecedor**: Nome do fornecedor/empresa
   - **Tipo de Contrato**: Preventiva, Corretiva, Misto, Full Service
   - **Valor Anual**: Valor anual do contrato em R$
   - **Data de Início**: Data de início do contrato
   - **Data de Fim**: Data de término do contrato
   - **Renovação Automática**: Marque se o contrato tem renovação automática
   - **Descrição**: Descrição detalhada do contrato
   - **Observações**: Notas adicionais
   - **Arquivo**: Anexe o arquivo do contrato (PDF, DOC, DOCX, JPG, PNG)

#### **Vincular Equipamentos**

- Selecione os equipamentos que fazem parte do contrato
- Use a busca para encontrar equipamentos específicos
- Selecione múltiplos equipamentos de uma vez

#### **Visualização de Contratos**

- **Lista de Contratos**: Veja todos os contratos cadastrados
- **Filtros**: Filtre por tipo, fornecedor, status
- **Detalhes**: Clique em um contrato para ver informações completas

#### **Indicador de Custo de Manutenção**

O sistema calcula automaticamente:
- **Custo Total Anual**: Soma de todos os contratos
- **Custo por Equipamento**: Custo médio por equipamento
- **Distribuição por Tipo**: Gráfico mostrando distribuição de custos

#### **Ações Disponíveis**

- **Editar**: Modifique contratos existentes
- **Excluir**: Remova contratos (com confirmação)
- **Download de Arquivo**: Baixe o arquivo anexado ao contrato
- **Exportar**: Exporte a lista para Excel ou CSV

---

## MEL - Lista Mínima de Equipamentos

### Descrição

O MEL (Minimum Equipment List) é uma funcionalidade crítica que permite definir e monitorar a quantidade mínima de equipamentos que devem estar disponíveis em cada setor.

### Funcionalidades Principais

#### **Criar Regra MEL**

1. Clique em "Criar Regra"
2. Selecione o **Setor**
3. Configure a regra:
   - **Nome do Grupo**: Nome identificador do grupo de equipamentos (ex: "Monitores CC")
   - **Quantidade Mínima**: Número mínimo de equipamentos que devem estar disponíveis
   - **Justificativa**: Motivo da regra (ex: "RDC 930 - Norma técnica obrigatória")
   - **Status**: Ativa ou Inativa

4. **Selecione os Equipamentos**:
   - O sistema lista todos os equipamentos do setor
   - Selecione os equipamentos que fazem parte deste grupo MEL
   - Você pode buscar por Tag, nome, modelo ou fabricante

#### **Visualização de Regras MEL**

O sistema exibe:

- **Regras por Setor**: Lista todas as regras MEL cadastradas, organizadas por setor
- **Status da Regra**: OK (quantidade suficiente) ou Em Alerta (abaixo do mínimo)
- **Estatísticas**:
  - Total de equipamentos no grupo
  - Quantidade indisponível (em manutenção)
  - Quantidade disponível
  - Diferença em relação ao mínimo

#### **Alertas Automáticos**

O sistema gera alertas automaticamente quando:

- A quantidade disponível de um grupo fica abaixo do mínimo configurado
- Um equipamento do grupo MEL entra em manutenção
- Há mudanças no status de disponibilidade

#### **Estatísticas e Gráficos**

- **Regras por Setor**: Gráfico de barras mostrando regras OK vs. Em Alerta por setor
- **Status Geral**: Gráfico de pizza com distribuição geral de status
- **Setores com Problema**: Lista de setores com regras em alerta
- **Problemas Ativos**: Lista detalhada de todos os problemas/alertas ativos

#### **Funcionalidades Avançadas**

1. **Recalcular Alertas**: Force o recálculo de todos os alertas MEL
2. **Filtros**: Filtre regras por status (Todos, Ativos, Inativos, Em Alerta)
3. **Editar Regra**: Modifique regras existentes
4. **Desativar Regra**: Desative regras que não são mais necessárias
5. **Visualização Detalhada**: Veja todos os equipamentos de um grupo e seu status individual

#### **Como o MEL Funciona**

1. O sistema identifica equipamentos em manutenção através das OS abertas
2. Compara a quantidade disponível com o mínimo configurado
3. Gera alertas quando a disponibilidade fica abaixo do mínimo
4. Atualiza os alertas automaticamente conforme as OS são abertas ou fechadas

---

## Solicitações de Compra

### Descrição

O módulo de Solicitações de Compra permite gerenciar solicitações de compra relacionadas a equipamentos e investimentos.

### Funcionalidades Principais

#### **Criar Nova Solicitação de Compra**

1. Clique em "Nova Solicitação"
2. Preencha os campos:
   - **Nº Solicitação Externa**: Número da solicitação no sistema externo (opcional)
   - **Setor**: Setor solicitante
   - **Descrição**: Descrição detalhada da solicitação
   - **Status**: Pendente, Aprovada, Em Compra, Entregue, Cancelada
   - **Data de Solicitação**: Data em que a solicitação foi feita
   - **Data de Entrega**: Data prevista ou efetiva de entrega (opcional)
   - **Observações**: Notas adicionais

3. **Vincular Itens**:
   - **Ordens de Serviço**: Selecione OS relacionadas à solicitação
   - **Investimentos**: Selecione investimentos relacionados

#### **Visualização de Solicitações**

- **Lista Completa**: Veja todas as solicitações cadastradas
- **Filtros**: Filtre por status ou setor
- **Indicador de Tempo**: O sistema calcula automaticamente quantos dias a solicitação está aguardando
- **Códigos de Cores**: 
  - Verde: Menos de 15 dias
  - Amarelo: 15 a 30 dias
  - Vermelho: Mais de 30 dias

#### **Detalhes das Solicitações**

Cada solicitação exibe:

- **Informações Básicas**: Número, setor, descrição, status
- **Datas**: Solicitação e entrega
- **OS Vinculadas**: Lista de ordens de serviço relacionadas (clique para ver detalhes)
- **Investimentos Vinculados**: Lista de investimentos relacionados (clique para ver detalhes)
- **Dias de Espera**: Calculado automaticamente desde a data de solicitação

#### **Ações Disponíveis**

- **Editar**: Modifique solicitações existentes
- **Vincular OS/Investimentos**: Adicione ou remova vínculos
- **Visualizar Detalhes**: Clique em uma OS ou investimento vinculado para ver detalhes completos
- **Excluir**: Remova solicitações (com confirmação)

#### **Modal de Detalhes**

Ao clicar em uma OS ou investimento vinculado, um modal abre mostrando:

- **Para OS**: Código, comentários, solicitação de compra vinculada, datas
- **Para Investimentos**: Título, descrição, valor, categoria, prioridade, status, setor, datas

---

## Equipamentos Críticos e SLA

### Descrição

O módulo de Equipamentos Críticos permite monitorar equipamentos marcados como críticos e acompanhar indicadores de SLA (Service Level Agreement - Acordo de Nível de Serviço).

### Funcionalidades Principais

#### **Indicadores de Desempenho (KPIs)**

O sistema calcula e exibe automaticamente:

1. **Disponibilidade Média**: Percentual médio de disponibilidade dos equipamentos críticos
2. **SLA de Atendimento**: Percentual de OS atendidas dentro do prazo definido
3. **SLA de Solução**: Percentual de OS resolvidas dentro do prazo definido

#### **Lista de Equipamentos Críticos**

Exibe todos os equipamentos marcados como críticos com informações detalhadas:

- **Tag**: Identificador do equipamento
- **Nome**: Nome do equipamento
- **Setor**: Localização
- **Valor Gasto**: Total gasto com manutenção no período
- **Quantidade de OS**: Número de ordens de serviço no período
- **Uptime Médio**: Percentual médio de tempo em operação
- **Gráfico de Uptime**: Visualização gráfica da disponibilidade ao longo do tempo

#### **Gráficos e Visualizações**

1. **Gráfico de Uptime Agregado**:
   - Mostra a disponibilidade média de todos os equipamentos críticos
   - Exibido por mês ou período selecionado
   - Permite identificar tendências e padrões

2. **Gráficos Individuais**:
   - Cada equipamento crítico possui seu próprio gráfico de uptime
   - Mostra a evolução da disponibilidade ao longo do tempo

#### **Filtros**

- **Por Ano**: Selecione o ano para análise
- **Por Setor**: Filtre por setor específico (se aplicável)
- **Por Equipamento**: Busque equipamentos específicos

#### **Como Marcar um Equipamento como Crítico**

1. Acesse o módulo **Inventário**
2. Clique no equipamento desejado
3. No modal de detalhes, encontre a seção "Flags"
4. Marque a opção **"Equipamento Crítico"**
5. Configure o **SLA Target** (percentual de disponibilidade alvo, padrão: 98%)
6. Salve as alterações

#### **Utilidade do Módulo**

Este módulo é essencial para:

- Monitorar equipamentos essenciais para operação
- Avaliar se os SLAs estão sendo cumpridos
- Identificar equipamentos com maior necessidade de manutenção
- Tomar decisões baseadas em dados sobre substituição ou upgrade
- Comparar desempenho entre diferentes equipamentos

---

## Alertas do Sistema

### Descrição

O módulo de Alertas centraliza todas as notificações e alertas gerados automaticamente pelo sistema.

### Tipos de Alertas

O sistema gera automaticamente alertas para:

1. **OS Aberta**: Quando uma ordem de serviço é aberta
2. **OS Atrasada**: Quando uma OS está atrasada além do prazo esperado
3. **Manutenção Preventiva**: Lembretes sobre manutenções preventivas agendadas

### Funcionalidades Principais

#### **Visualização de Alertas**

- **Lista Completa**: Veja todos os alertas do sistema
- **Filtros**:
  - Por Situação: Todos, Pendente, Visualizada, Resolvida
  - Por Prioridade: Todos, Baixa, Média, Alta, Crítica
- **Ordenação**: Por data, prioridade ou situação

#### **Informações do Alerta**

Cada alerta exibe:

- **Tipo**: OS Aberta, OS Atrasada, Manutenção Preventiva
- **Prioridade**: Baixa, Média, Alta ou Crítica
- **Equipamento**: Nome e Tag do equipamento
- **OS**: Código da ordem de serviço (se aplicável)
- **Mensagem**: Descrição detalhada do alerta
- **Data de Abertura**: Quando o alerta foi gerado
- **Situação**: Pendente, Visualizada ou Resolvida

#### **Ações Disponíveis**

1. **Marcar como Visualizada**:
   - Clique no botão "Marcar como Visualizada"
   - O alerta continua visível mas indica que foi visto

2. **Marcar como Resolvida**:
   - Clique no botão "Marcar como Resolvida"
   - O alerta é marcado como resolvido
   - Alerta resolvido pode ser ocultado através de filtros

#### **Indicadores**

- **Total de Alertas**: Quantidade total de alertas no sistema
- **Pendentes**: Alertas não visualizados
- **Visualizados**: Alertas visualizados mas não resolvidos
- **Resolvidos**: Alertas que já foram resolvidos

#### **Boas Práticas**

1. **Revise Alertas Regularmente**: Verifique os alertas diariamente
2. **Priorize por Criticidade**: Atenda primeiro alertas críticos
3. **Marque como Resolvidos**: Após resolver o problema, marque o alerta como resolvido
4. **Use Filtros**: Use os filtros para focar em alertas específicos

---

## Configurações

### Descrição

O módulo de Configurações permite configurar aspectos técnicos do sistema. **Apenas administradores têm acesso a este módulo.**

### Funcionalidades Principais

#### **Configuração de Tipos de Manutenção**

O sistema detecta automaticamente os tipos de manutenção encontrados nas OS e permite classificá-los:

- **Corretiva**: Manutenções corretivas (quando algo quebra)
- **Preventiva**: Manutenções preventivas (manutenção programada)
- **Não Classificado**: Tipos ainda não classificados

**Como usar**:

1. O sistema lista todos os tipos de manutenção encontrados
2. Para cada tipo, selecione se é "Corretiva", "Preventiva" ou deixe sem classificação
3. O sistema utiliza essa classificação para filtrar e calcular indicadores

#### **Configuração de Oficinas**

Configure quais oficinas/workshops devem ser consideradas no sistema:

- **Ativar/Desativar**: Marque oficinas como ativas ou inativas
- **Filtros**: O sistema usa apenas oficinas ativas para calcular indicadores
- **Classificação**: As oficinas são classificadas automaticamente como "enabled" ou "disabled"

#### **Configuração de Permissões de Páginas**

Através do link "Permissões" dentro de Configurações, administradores podem:

1. **Configurar Acesso por Tipo de Usuário**:
   - Para cada tipo de usuário (Admin, Gerente, Comum)
   - Configure quais páginas são acessíveis
   - Use os ícones de olho (👁️) para habilitar/desabilitar acesso

2. **Páginas Configuráveis**:
   - Dashboard
   - Inventário
   - Ordens de Serviço
   - Cronograma
   - Rondas
   - Investimentos
   - Contratos
   - MEL
   - Solicitações de Compra

3. **Salvar Alterações**:
   - Clique em "Salvar Permissões"
   - As alterações são aplicadas imediatamente
   - Usuários precisam recarregar a página para ver mudanças

#### **Acesso ao Módulo**

- Vá até Configurações no menu (apenas administradores)
- Se você não for administrador, será redirecionado automaticamente
- As configurações são aplicadas imediatamente após salvar

---

## Permissões e Usuários

### Descrição

O módulo de Usuários permite gerenciar usuários do sistema e suas permissões. **Apenas administradores têm acesso a este módulo.**

### Funcionalidades Principais

#### **Tipos de Usuários**

1. **Administrador**:
   - Acesso completo a todos os módulos
   - Pode gerenciar usuários
   - Pode acessar configurações do sistema
   - Pode ver dados de todos os setores

2. **Gerente**:
   - Pode visualizar dados de múltiplos setores
   - Pode gerenciar usuários comuns (personificar)
   - Não tem acesso às configurações do sistema

3. **Usuário Comum**:
   - Acesso limitado aos setores atribuídos
   - Pode visualizar apenas dados dos setores permitidos
   - Não pode gerenciar usuários

#### **Criar Novo Usuário**

1. Clique em "Novo Usuário"
2. Preencha os dados:
   - **Nome**: Nome completo do usuário
   - **Email**: Email do usuário (será usado para login)
   - **Função**: Selecione entre Administrador, Gerente ou Usuário Comum
   - **Ativo**: Marque se o usuário está ativo
   - **Pode Personificar**: Apenas para gerentes - permite personificar outros usuários

3. **Para Usuários Comuns**:
   - **Setores**: Selecione os setores que o usuário pode visualizar
   - O usuário só verá dados dos setores selecionados

4. **Para Gerentes**:
   - **Usuários Gerenciados**: Selecione quais usuários comuns o gerente pode gerenciar

#### **Personificação**

Gerentes podem personificar usuários comuns para:

- Ver o sistema como o usuário vê
- Ajudar com problemas de acesso
- Diagnosticar questões de permissões

**Como personificar**:

1. Vá até o menu do usuário (canto superior direito)
2. Selecione "Personificar Usuário"
3. Escolha o usuário a ser personificado
4. O sistema será exibido como se você fosse aquele usuário
5. Clique em "Parar Personificação" para voltar ao seu perfil

#### **Configuração de Permissões por Página**

Através do módulo "Configurações > Permissões", administradores podem configurar quais páginas cada tipo de usuário pode acessar:

1. Acesse "Configurações" no menu
2. Clique em "Permissões de Páginas"
3. Configure para cada tipo de usuário (Admin, Gerente, Comum) quais páginas são acessíveis
4. Salve as alterações

**Páginas Configuráveis**:

- Dashboard
- Inventário
- Ordens de Serviço
- Cronograma
- Rondas
- Investimentos
- Contratos
- MEL
- Solicitações de Compra

---

## Atalhos de Teclado

O sistema possui vários atalhos de teclado para agilizar a navegação:

### **Atalhos Gerais**

- **?** (Interrogação): Abre a ajuda de atalhos de teclado
- **ESC**: Fecha modais e menus abertos

### **Atalhos por Módulo**

#### **Inventário**
- Use **Tab** para navegar entre campos de filtro
- **Enter** para aplicar filtros

#### **Tabelas**
- Use as setas do teclado para navegar entre células
- **Enter** para selecionar um item

---

## Recursos Adicionais

### **Sincronização Automática**

O sistema sincroniza automaticamente com a API Effort:

- **Equipamentos**: Atualizados automaticamente
- **Ordens de Serviço**: Sincronizadas em tempo real
- **Cronograma**: Atualizado periodicamente

O indicador no rodapé mostra quando foi a última sincronização.

### **Filtros Salvos**

Muitos módulos permitem salvar filtros para reutilização:

1. Configure seus filtros
2. Clique em "Salvar Filtro"
3. Dê um nome ao filtro
4. Use o filtro salvo sempre que precisar

**Compartilhar Filtros**:

1. Salve um filtro
2. Gere um link de compartilhamento
3. Compartilhe o link com outros usuários
4. Eles poderão aplicar o mesmo filtro

### **Exportação de Dados**

Vários módulos permitem exportar dados:

- **Excel (.xlsx)**: Formato recomendado para análises
- **CSV**: Formato compatível com diversos sistemas

### **Busca Global** (quando disponível)

Use a barra de busca no topo para buscar rapidamente:

- Equipamentos
- Ordens de Serviço
- Investimentos

### **Design Responsivo**

O sistema é totalmente responsivo:

- **Desktop**: Menu lateral expansível/retrátil
- **Mobile**: Menu lateral que abre ao toque
- **Tablet**: Layout adaptativo

---

## Dicas e Boas Práticas

### **Gestão de Equipamentos**

1. **Mantenha os Flags Atualizados**:
   - Marque equipamentos críticos corretamente
   - Atualize datas de EOL/EOS regularmente
   - Mantenha registros ANVISA atualizados

2. **Use Filtros Salvos**:
   - Crie filtros para visualizações frequentes
   - Ex: "Equipamentos Críticos do Setor X"

3. **Monitore Alertas**:
   - Verifique regularmente equipamentos em alerta
   - Acompanhe equipamentos com ANVISA vencida

### **Gestão de Manutenção**

1. **Rondas Semanais**:
   - Realize rondas semanais regularmente
   - Vincule OS relevantes às rondas
   - Documente observações importantes

2. **MEL**:
   - Configure regras MEL para setores críticos
   - Revise alertas MEL regularmente
   - Ajuste quantidades mínimas conforme necessário

3. **Cronograma**:
   - Monitore manutenções preventivas
   - Identifique padrões de atraso
   - Planeje substituições baseado em EOL/EOS

### **Gestão de Investimentos**

1. **Organize por Prioridade**:
   - Use a prioridade corretamente (Crítica para urgente)
   - Atualize status conforme o investimento progride

2. **Vincule a Rondas**:
   - Vincule investimentos relevantes às rondas semanais
   - Facilita o acompanhamento e comunicação

3. **Categorização**:
   - Use categorias apropriadas (Equipamento, Infraestrutura, etc.)
   - Facilita relatórios e análises

4. **Acompanhamento de Datas**:
   - Mantenha datas previstas atualizadas
   - Registre datas de solicitação e chegada quando disponíveis

### **Gestão de Contratos**

1. **Vincule Equipamentos Corretamente**:
   - Certifique-se de vincular todos os equipamentos cobertos pelo contrato
   - Facilita o cálculo de custos por equipamento

2. **Mantenha Arquivos Atualizados**:
   - Anexe os arquivos dos contratos
   - Facilita consulta e auditoria

3. **Renovação Automática**:
   - Marque contratos com renovação automática
   - Facilita planejamento futuro

### **Solicitações de Compra**

1. **Vincule OS e Investimentos**:
   - Sempre vincule OS relacionadas
   - Facilita o rastreamento e justificativa

2. **Mantenha Status Atualizado**:
   - Atualize o status conforme a solicitação progride
   - Facilita o acompanhamento

---

## Suporte e Contato

Para dúvidas, problemas ou sugestões:

- Entre em contato com o administrador do sistema
- Consulte a equipe de TI da instituição
- Verifique a documentação técnica se necessário

---

## Glossário

- **ANVISA**: Agência Nacional de Vigilância Sanitária
- **EOL**: End of Life (Fim de Vida Útil)
- **EOS**: End of Service (Fim de Suporte)
- **MEL**: Minimum Equipment List (Lista Mínima de Equipamentos)
- **OS**: Ordem de Serviço (manutenção)
- **SLA**: Service Level Agreement (Acordo de Nível de Serviço)
- **Tag**: Identificador único do equipamento no sistema

---

## Anexos e Informações Técnicas

### Integração com API Effort

O sistema sincroniza automaticamente com a API Effort para manter os dados atualizados:

- **Frequência de Sincronização**: Automática, em tempo real
- **Dados Sincronizados**:
  - Equipamentos (inventário completo)
  - Ordens de Serviço (OS)
  - Cronograma de manutenções
  - Dados de disponibilidade

### Permissões por Setor

O sistema permite controle granular de acesso:

- **Usuários Comuns**: Podem visualizar apenas setores atribuídos
- **Gerentes**: Podem visualizar múltiplos setores e gerenciar usuários comuns
- **Administradores**: Acesso total a todos os setores e funcionalidades

### Sincronização de Dados

- Os dados são sincronizados automaticamente com a API Effort
- O indicador no rodapé mostra a última sincronização
- Os dados são atualizados em tempo real conforme mudanças na API

### Exportação de Dados

Vários módulos permitem exportar dados:

- **Formato Excel (.xlsx)**: Recomendado para análises detalhadas
- **Formato CSV**: Compatível com diversos sistemas
- Os dados exportados respeitam os filtros aplicados

---

## FAQ - Perguntas Frequentes

### Como marcar um equipamento como crítico?

1. Vá até o módulo **Inventário**
2. Clique no equipamento desejado
3. No modal de detalhes, marque a opção **"Equipamento Crítico"**
4. Salve as alterações

### Como criar uma regra MEL?

1. Acesse o módulo **MEL**
2. Clique em **"Criar Regra"**
3. Selecione o setor
4. Defina o nome do grupo e quantidade mínima
5. Selecione os equipamentos que fazem parte do grupo
6. Salve a regra

### Como vincular uma OS a uma solicitação de compra?

1. Acesse a página de **Ordens de Serviço** ou **Solicitações de Compra**
2. Clique na OS ou na solicitação
3. No modal de detalhes, vincule os itens relacionados
4. Salve as alterações

### Como filtrar equipamentos por setor?

No módulo **Inventário**, use o filtro "Setor" no painel de filtros à esquerda.

### Como criar uma ronda semanal?

1. Acesse o módulo **Rondas**
2. Clique em **"Nova Ronda"**
3. Preencha setor, data e responsável
4. Opcionalmente, vincule OS e investimentos
5. Salve a ronda

### Como editar um investimento existente?

1. Acesse o módulo **Investimentos**
2. Clique no ícone de edição ao lado do investimento
3. Modifique os campos desejados
4. Salve as alterações

### Como exportar dados do inventário?

1. Configure seus filtros no módulo **Inventário**
2. Clique no botão **"Exportar"**
3. Escolha o formato (Excel ou CSV)
4. O arquivo será baixado automaticamente

### O que significa MEL?

MEL significa **Minimum Equipment List** (Lista Mínima de Equipamentos). É uma lista que define quantos equipamentos de cada tipo devem estar disponíveis em cada setor para garantir o funcionamento adequado do setor.

### Como vincular um investimento a uma ronda?

Ao criar ou editar uma ronda semanal, há uma seção "Investimentos do Setor" onde você pode selecionar investimentos relevantes para vincular à ronda.

### Como ver apenas OS abertas?

No módulo **Ordens de Serviço**, todas as OS exibidas são abertas por padrão. No módulo **Rondas**, ao vincular OS, você pode filtrar por "Abertas", "Fechadas" ou "Todas".

### Como funciona o cálculo de dias de espera nas solicitações de compra?

O sistema calcula automaticamente quantos dias se passaram desde a data de solicitação até hoje. Esse cálculo é feito apenas para solicitações que ainda não foram entregues (status diferente de "Entregue").

---

## Problemas Comuns e Soluções

### Não consigo ver certos equipamentos

**Solução**: Verifique se você tem permissão para visualizar o setor onde o equipamento está localizado. Entre em contato com o administrador se necessário.

### O sistema está lento

**Solução**: 
- Verifique sua conexão com a internet
- Limpe o cache do navegador
- Aguarde alguns segundos, o sistema pode estar sincronizando dados

### Não consigo criar uma ronda

**Solução**: Verifique se você preencheu todos os campos obrigatórios (marcados com *). Se o problema persistir, entre em contato com o administrador.

### Filtro salvo não está funcionando

**Solução**: Verifique se o filtro foi salvo corretamente. Tente recarregar a página e aplicar o filtro novamente.

### Equipamento não aparece na lista do MEL

**Solução**: Verifique se o equipamento está no setor selecionado e se possui a Tag correta. O sistema identifica equipamentos pela Tag.

---

*Documentação atualizada em: Dezembro 2024*
*Versão do Sistema: 1.0*


