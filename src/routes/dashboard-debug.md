# Debug: Fluxo de Filtragem de OS Corretivas

## Função Principal: `isOSCorretiva(os)`

### Passo 1: Extrair tipo de manutenção
```typescript
const tipoManutencao = (os.TipoDeManutencao || os.TipoManutencao || '').toString().trim();
```
- Busca em `os.TipoDeManutencao` ou `os.TipoManutencao`
- Converte para string e remove espaços

### Passo 2: Verificar se tem tipo
```typescript
if (!tipoManutencao || tipoManutencao.trim() === '') {
  return false; // EXCLUIR
}
```

### Passo 3: Modo Mock
```typescript
if (USE_MOCK) {
  // Verifica padrões conhecidos
  const padroesCorretivos = ['corretiva', 'corretivo', 'correção', 'correcao'];
  return padroesCorretivos.some(padrao => tipoNormalizado.includes(padrao));
}
```

### Passo 4: Buscar no banco (modo real)
```typescript
// 4.1: Busca EXATA (case-sensitive)
const config = await prisma.systemConfig.findUnique({
  where: {
    category_key: {
      category: 'maintenance_type',
      key: tipoManutencao, // Exemplo: "A - CALIBRAÇÃO DE EQUIPAMENTOS MÉDICOS"
    },
  },
});

// 4.2: Se não encontrou, busca TODAS as configs e faz match case-insensitive
if (!config) {
  // Busca todas as configs ativas
  const todasConfigs = await prisma.systemConfig.findMany({
    where: {
      category: 'maintenance_type',
      active: true,
    },
  });
  
  // Compara case-insensitive
  const configEncontrada = todasConfigs.find(c => 
    c.key.toLowerCase().trim() === tipoManutencao.toLowerCase().trim()
  );
}

// 4.3: Verificar se encontrou
if (!config) {
  return false; // EXCLUIR - não classificado
}

// 4.4: Verificar se está ativo
if (!config.active) {
  return false; // EXCLUIR - inativo
}

// 4.5: Verificar classificação
const classificacao = config.value.toLowerCase().trim();
const isCorretiva = classificacao === 'corretiva';
return isCorretiva; // true apenas se value === 'corretiva'
```

## Onde é usado:

### 1. Gráfico de Pizza (`/availability`)
```typescript
const osAbertasPagina = (await Promise.all(
  dadosArray.map(async (os: any) => ({
    os,
    isValid: await isOSInMaintenance(os), // Chama isOSCorretiva()
  }))
)).filter(item => item.isValid).map(item => item.os);
```

### 2. Lista de Equipamentos (`/equipment-in-maintenance`)
```typescript
const osAbertasPagina = (await Promise.all(
  dadosArray.map(async (os: any) => ({
    os,
    isValid: await isOSInMaintenanceList(os), // Chama isOSCorretiva()
  }))
)).filter(item => item.isValid).map(item => item.os);
```

## Problemas Possíveis:

1. **Campo do tipo diferente**: A OS pode ter o tipo em outro campo
2. **Case sensitivity**: O tipo na OS pode estar diferente do tipo na tabela
3. **Espaços extras**: Pode haver espaços diferentes
4. **Tipo não salvo**: O tipo pode não estar na tabela SystemConfig
5. **Classificação errada**: O tipo pode estar classificado como "preventiva" ao invés de "corretiva"

