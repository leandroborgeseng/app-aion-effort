# 🔍 FLUXO COMPLETO DO FILTRO DE OS CORRETIVAS

## 📋 RESUMO DO PROCESSO

### 1. BUSCA DE OS DA API
```typescript
// Busca TODAS as OS do ano corrente
const dadosPagina = await dataSource.osResumida({
  tipoManutencao: 'Todos',  // ← Busca TODAS, não filtra aqui
  periodo: 'AnoCorrente',
  pagina: paginaAtual,
  qtdPorPagina: 50000,
});
```

### 2. FILTRAGEM DE CADA OS
Para cada OS retornada, chama `isOSInMaintenance(os)` ou `isOSInMaintenanceList(os)`:

```typescript
const osAbertasPagina = (await Promise.all(
  dadosArray.map(async (os: any) => ({
    os,
    isValid: await isOSInMaintenance(os), // ← AQUI É ONDE FILTRA
  }))
)).filter(item => item.isValid).map(item => item.os);
```

### 3. FUNÇÃO `isOSInMaintenance(os)`
Esta função faz:
1. Verifica se a OS está **aberta** (não cancelada)
2. Chama `isOSCorretiva(os)` para verificar se é corretiva

### 4. FUNÇÃO `isOSCorretiva(os)` - AQUI É ONDE ESTÁ O PROBLEMA

#### Passo 4.1: Extrair o tipo
```typescript
const tipoManutencao = (os.TipoDeManutencao || os.TipoManutencao || '').toString().trim();
```
**Exemplo:** Se a OS tem `TipoDeManutencao: "A - CALIBRAÇÃO DE EQUIPAMENTOS MÉDICOS"`, então:
- `tipoManutencao = "A - CALIBRAÇÃO DE EQUIPAMENTOS MÉDICOS"`

#### Passo 4.2: Buscar na tabela SystemConfig
```typescript
// Busca EXATA (case-sensitive)
const config = await prisma.systemConfig.findUnique({
  where: {
    category_key: {
      category: 'maintenance_type',
      key: tipoManutencao, // ← Busca exatamente "A - CALIBRAÇÃO DE EQUIPAMENTOS MÉDICOS"
    },
  },
});
```

**PROBLEMA POTENCIAL:** Se na tabela SystemConfig o tipo está salvo como:
- `"A - Calibração de Equipamentos Médicos"` (diferente capitalização)
- `"A - CALIBRAÇÃO DE EQUIPAMENTOS MÉDICOS "` (com espaço no final)
- `"A-CALIBRAÇÃO DE EQUIPAMENTOS MÉDICOS"` (sem espaços)

A busca EXATA não vai encontrar!

#### Passo 4.3: Fallback case-insensitive
```typescript
if (!config) {
  // Busca TODAS as configs e compara case-insensitive
  const todasConfigs = await prisma.systemConfig.findMany({
    where: {
      category: 'maintenance_type',
      active: true,
    },
  });
  
  const configEncontrada = todasConfigs.find(c => 
    c.key.toLowerCase().trim() === tipoManutencao.toLowerCase().trim()
  );
}
```

#### Passo 4.4: Verificar classificação
```typescript
if (!config) {
  return false; // ❌ EXCLUIR - não classificado
}

if (!config.active) {
  return false; // ❌ EXCLUIR - inativo
}

const classificacao = config.value.toLowerCase().trim();
const isCorretiva = classificacao === 'corretiva';

return isCorretiva; // ✅ true apenas se value === 'corretiva'
```

## 🐛 POSSÍVEIS PROBLEMAS

### Problema 1: Tipo não encontrado na tabela
**Sintoma:** OS aparece como "Não classificado"
**Causa:** O tipo na OS não existe na tabela SystemConfig
**Solução:** Classificar o tipo na página de Configurações

### Problema 2: Tipo classificado como "preventiva"
**Sintoma:** OS não aparece (mas está classificada)
**Causa:** O tipo está classificado como "preventiva" ao invés de "corretiva"
**Solução:** Alterar a classificação na página de Configurações

### Problema 3: Diferença de espaços/caracteres
**Sintoma:** Tipo não encontrado mesmo existindo
**Causa:** Espaços extras ou caracteres diferentes entre OS e tabela
**Solução:** O código já tem fallback case-insensitive, mas pode não resolver espaços extras

### Problema 4: Campo do tipo diferente
**Sintoma:** Tipo sempre vazio
**Causa:** A OS pode ter o tipo em outro campo
**Solução:** Verificar qual campo realmente contém o tipo

## 🔧 ENDPOINTS DE DEBUG CRIADOS

### 1. Ver todas as configurações
```
GET http://localhost:4000/api/dashboard/debug/corretivas
```
Retorna:
- Total de configurações
- Tipos classificados como "corretiva"
- Tipos classificados como "preventiva"
- Tipos classificados como "aguardando_compras"
- Outros tipos

### 2. Testar um tipo específico
```
GET http://localhost:4000/api/dashboard/debug/test-os?tipo=A - CALIBRAÇÃO DE EQUIPAMENTOS MÉDICOS
```
Retorna:
- Se o tipo foi encontrado
- Qual a classificação encontrada
- Se será incluído ou excluído

## 📝 EXEMPLO DE FLUXO

**OS exemplo:**
```json
{
  "OS": "202509221",
  "TipoDeManutencao": "A - CALIBRAÇÃO DE EQUIPAMENTOS MÉDICOS",
  "SituacaoDaOS": "Aberta"
}
```

**Passo 1:** `tipoManutencao = "A - CALIBRAÇÃO DE EQUIPAMENTOS MÉDICOS"`

**Passo 2:** Busca na tabela SystemConfig:
```sql
SELECT * FROM SystemConfig 
WHERE category = 'maintenance_type' 
AND key = 'A - CALIBRAÇÃO DE EQUIPAMENTOS MÉDICOS'
```

**Passo 3:** Se não encontrou, busca todas e compara:
```typescript
// Busca todas
const todas = await prisma.systemConfig.findMany({...});

// Compara case-insensitive
const encontrada = todas.find(c => 
  c.key.toLowerCase().trim() === "a - calibração de equipamentos médicos"
);
```

**Passo 4:** Verifica `value`:
- Se `value === 'corretiva'` → ✅ INCLUIR
- Se `value === 'preventiva'` → ❌ EXCLUIR
- Se não encontrou → ❌ EXCLUIR

## 🎯 PRÓXIMOS PASSOS PARA DEBUG

1. Acesse: `http://localhost:4000/api/dashboard/debug/corretivas`
   - Veja quais tipos estão classificados como "corretiva"

2. Teste um tipo específico:
   ```
   http://localhost:4000/api/dashboard/debug/test-os?tipo=A - CALIBRAÇÃO DE EQUIPAMENTOS MÉDICOS
   ```

3. Verifique os logs do servidor ao acessar o dashboard
   - Procure por `[isOSCorretiva] ✅ É corretiva`
   - Procure por `[isOSCorretiva] ❌ Não classificado`

4. Compare os tipos que aparecem nas OS com os tipos na tabela SystemConfig
   - Verifique se há diferenças de espaços, maiúsculas, etc.

