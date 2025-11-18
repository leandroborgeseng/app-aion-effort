// src/web/utils/sectorMapping.ts
// Utilitário para mapear IDs de setores para nomes (mesmo mapeamento do backend)

const SECTOR_ID_TO_NAME_MAP: Record<number, string> = {
  1: 'UTI 1',
  2: 'UTI 2',
  3: 'UTI 3',
  4: 'Emergência',
  5: 'Centro Cirúrgico',
  6: 'Radiologia',
  7: 'Cardiologia',
  8: 'Neurologia',
  9: 'Ortopedia',
  10: 'Pediatria',
  11: 'Maternidade',
  12: 'Ambulatório',
};

/**
 * Obtém o nome do setor a partir do ID
 */
export function getSectorNameFromId(sectorId: number): string | null {
  return SECTOR_ID_TO_NAME_MAP[sectorId] || null;
}

/**
 * Obtém os nomes dos setores a partir de uma lista de IDs
 */
export function getSectorNamesFromIds(sectorIds: number[]): string[] {
  return sectorIds
    .map(id => getSectorNameFromId(id))
    .filter((name): name is string => name !== null);
}

