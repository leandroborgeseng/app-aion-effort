# Filtros Aplicados na API de OS

## 📋 Filtros Atualmente Aplicados na API (`src/routes/os.ts`)

### 1. **Filtro por Ano Vigente** (Linha 111-121)
- **O que faz**: Filtra apenas OS do ano atual
- **Código**: `os.Abertura >= anoInicio && os.Abertura <= anoFim`
- **Impacto**: Reduz significativamente o número de OS retornadas

### 2. **Filtro de Oficinas Habilitadas** (Linha 126)
- **O que faz**: Remove OS de oficinas não habilitadas
- **Função**: `filterOSByWorkshop(osList)`
- **Impacto**: Remove OS de oficinas desabilitadas

### 3. **Filtro de Oficinas com Classificação** (Linha 130)
- **O que faz**: Remove OS de oficinas sem classificação
- **Função**: `filterOSByWorkshopClassification(osList)`
- **Impacto**: Remove OS de oficinas sem classificação

### 4. **Filtro Obrigatório: Apenas OS Corretivas** (Linha 160-168)
- **O que faz**: Remove todas as OS que não são corretivas
- **Função**: `isOSCorretiva(os)`
- **Impacto**: MUITO ALTO - Remove todas as preventivas, preditivas, etc.

### 5. **Filtro: Apenas Abertas** (Linha 184-189) - Opcional
- **O que faz**: Filtra apenas OS com situação "Aberta"
- **Parâmetro**: `apenasAbertas=true`
- **Impacto**: Remove todas as fechadas

### 6. **Filtro: Apenas com Custo** (Linha 194-262) - Opcional
- **O que faz**: Filtra apenas OS com custo > 0
- **Parâmetro**: `apenasComCusto=true`
- **Impacto**: Remove OS sem custo

### 7. **Filtro por Setores** (Linha 286-292) - Opcional
- **O que faz**: Filtra por IDs de setores específicos
- **Parâmetro**: `setores=1,2,3`
- **Impacto**: Remove OS de outros setores

## 🎯 Resumo

**Filtros Obrigatórios (sempre aplicados):**
1. ✅ Ano vigente
2. ✅ Oficinas habilitadas
3. ✅ Oficinas com classificação
4. ✅ Apenas OS corretivas ⚠️ **MUITO RESTRITIVO**

**Filtros Opcionais (aplicados se solicitados):**
5. Apenas abertas
6. Apenas com custo
7. Por setores

## 📊 Impacto Esperado

Se a API retorna mais de 5000 OS brutas, após aplicar os filtros obrigatórios, especialmente o filtro de OS corretivas, o número pode cair drasticamente.

## 🔧 Próximos Passos

Vamos remover todos os filtros temporariamente para ver quantas OS a API realmente retorna sem filtros.

