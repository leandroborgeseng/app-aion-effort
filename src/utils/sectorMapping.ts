// src/utils/sectorMapping.ts
// Utilitário para mapear nomes de setores para IDs consistentes

/**
 * Mapeamento fixo de nomes de setores para IDs (garante consistência)
 * Este mapeamento deve ser usado em todas as rotas que precisam converter
 * Setor (nome) para SetorId quando o equipamento não tem SetorId
 */
const SECTOR_NAME_TO_ID_MAP: Record<string, number> = {
  'UTI 1': 1,
  'UTI 2': 2,
  'UTI 3': 3,
  'Emergência': 4,
  'Centro Cirúrgico': 5,
  'Radiologia': 6,
  'Cardiologia': 7,
  'Neurologia': 8,
  'Ortopedia': 9,
  'Pediatria': 10,
  'Maternidade': 11,
  'Ambulatório': 12,
};

/**
 * Gera um ID consistente a partir do nome do setor
 * Se o setor estiver no mapeamento fixo, usa o ID fixo
 * Caso contrário, gera um hash consistente do nome
 */
export function getSectorIdFromName(setorName: string): number {
  const normalizedName = setorName.trim();
  
  // Se existe no mapeamento, usar o ID fixo
  if (SECTOR_NAME_TO_ID_MAP[normalizedName]) {
    return SECTOR_NAME_TO_ID_MAP[normalizedName];
  }

  // Caso contrário, gerar ID baseado no hash do nome (garante consistência)
  let hash = 0;
  for (let i = 0; i < normalizedName.length; i++) {
    const char = normalizedName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Garantir que seja positivo e entre 1-999
  return Math.abs(hash % 999) + 1;
}

/**
 * Obtém o SetorId de um equipamento, OS ou item qualquer
 * Tenta usar SetorId se disponível, senão converte Setor (nome) para ID
 */
export function getSectorIdFromItem(item: any): number | null {
  // Se tem SetorId direto, usar
  if (item.SetorId !== undefined && item.SetorId !== null) {
    return item.SetorId;
  }
  
  // Se não tem SetorId mas tem Setor (nome), gerar ID consistente
  if (item.Setor) {
    return getSectorIdFromName(item.Setor);
  }
  
  return null;
}

/**
 * Retorna o mapeamento de setores (para referência)
 */
export function getSectorNameToIdMap(): Record<string, number> {
  return { ...SECTOR_NAME_TO_ID_MAP };
}

/**
 * Retorna o mapeamento inverso (ID para nome)
 */
export function getSectorIdToNameMap(): Record<number, string> {
  const idToNameMap: Record<number, string> = {};
  Object.entries(SECTOR_NAME_TO_ID_MAP).forEach(([name, id]) => {
    idToNameMap[id] = name;
  });
  return idToNameMap;
}

/**
 * Obtém o nome do setor a partir do ID
 */
export function getSectorNameFromId(sectorId: number): string | null {
  const idToNameMap = getSectorIdToNameMap();
  return idToNameMap[sectorId] || null;
}

/**
 * Obtém os nomes dos setores a partir de uma lista de IDs
 */
export function getSectorNamesFromIds(sectorIds: number[]): string[] {
  return sectorIds
    .map(id => getSectorNameFromId(id))
    .filter((name): name is string => name !== null);
}

