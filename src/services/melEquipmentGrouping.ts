// src/services/melEquipmentGrouping.ts
// Serviço para agrupar equipamentos por tipo genérico baseado em padrões de nome

import type { EquipamentoDTO } from '../types/effort';

/**
 * Configuração de grupos de equipamentos com padrões de identificação
 */
export interface EquipmentGroup {
  key: string; // Chave única do grupo (ex: "monitor", "ventilador")
  name: string; // Nome legível do grupo (ex: "Monitor Multiparâmetro")
  patterns: string[]; // Padrões para identificar equipamentos deste grupo (case-insensitive)
}

/**
 * Grupos padrão de equipamentos com seus padrões de identificação
 */
export const DEFAULT_EQUIPMENT_GROUPS: EquipmentGroup[] = [
  {
    key: 'monitor',
    name: 'Monitor Multiparâmetro',
    patterns: ['monitor', 'multiparâmetro', 'multiparameter', 'sinais vitais', 'ecg', 'spo2'],
  },
  {
    key: 'ventilador',
    name: 'Ventilador Pulmonar',
    patterns: ['ventilador', 'ventilator', 'respirator', 'respirador'],
  },
  {
    key: 'desfibrilador',
    name: 'Desfibrilador',
    patterns: ['desfibrilador', 'defibrillator', 'desfibrilador'],
  },
  {
    key: 'bomba-infusao',
    name: 'Bomba de Infusão',
    patterns: ['bomba', 'infusão', 'infusion pump', 'bomba de infusão'],
  },
  {
    key: 'anestesia',
    name: 'Aparelho de Anestesia',
    patterns: ['anestesia', 'anesthesia', 'aparelho de anestesia'],
  },
  {
    key: 'mesa-cirurgica',
    name: 'Mesa Cirúrgica',
    patterns: ['mesa cirúrgica', 'surgical table', 'mesa operatória'],
  },
  {
    key: 'foco-cirurgico',
    name: 'Foco Cirúrgico',
    patterns: ['foco', 'surgical light', 'lâmpada cirúrgica', 'iluminação cirúrgica'],
  },
  {
    key: 'bisturi-eletronico',
    name: 'Bisturi Eletrônico',
    patterns: ['bisturi', 'electrosurgical', 'electrocautery', 'bisturi elétrico'],
  },
  {
    key: 'aspirador-cirurgico',
    name: 'Aspirador Cirúrgico',
    patterns: ['aspirador cirúrgico', 'surgical aspirator', 'aspirador de sucção'],
  },
  {
    key: 'oximetro',
    name: 'Oxímetro de Pulso',
    patterns: ['oxímetro', 'pulse oximeter', 'oximetro de pulso'],
  },
  {
    key: 'raio-x',
    name: 'Raio-X',
    patterns: ['raio-x', 'x-ray', 'radiografia', 'fluoroscopia'],
  },
  {
    key: 'ultrassom',
    name: 'Ultrassom',
    patterns: ['ultrassom', 'ultrasound', 'ecografia'],
  },
  {
    key: 'eletrocardiografo',
    name: 'Eletrocardiógrafo',
    patterns: ['eletrocardi', 'ecg', 'eletrocardiógrafo'],
  },
];

/**
 * Identifica o grupo de um equipamento baseado em seus padrões
 */
export function identificarGrupoEquipamento(
  equipamento: EquipamentoDTO,
  grupos: EquipmentGroup[] = DEFAULT_EQUIPMENT_GROUPS
): EquipmentGroup | null {
  const nomeCompleto = `${equipamento.Equipamento || ''} ${equipamento.Modelo || ''} ${equipamento.Fabricante || ''}`.toLowerCase();

  for (const grupo of grupos) {
    for (const pattern of grupo.patterns) {
      const patternLower = pattern.toLowerCase();
      if (nomeCompleto.includes(patternLower)) {
        return grupo;
      }
    }
  }

  return null;
}

/**
 * Agrupa equipamentos por tipo genérico
 */
export function agruparEquipamentos(
  equipamentos: EquipamentoDTO[],
  grupos: EquipmentGroup[] = DEFAULT_EQUIPMENT_GROUPS
): Map<string, { grupo: EquipmentGroup; equipamentos: EquipamentoDTO[] }> {
  const gruposMap = new Map<string, { grupo: EquipmentGroup; equipamentos: EquipamentoDTO[] }>();

  for (const equipamento of equipamentos) {
    const grupo = identificarGrupoEquipamento(equipamento, grupos);
    if (grupo) {
      if (!gruposMap.has(grupo.key)) {
        gruposMap.set(grupo.key, {
          grupo,
          equipamentos: [],
        });
      }
      gruposMap.get(grupo.key)!.equipamentos.push(equipamento);
    }
  }

  return gruposMap;
}

/**
 * Obtém todos os grupos disponíveis com contagem de equipamentos
 */
export function obterGruposComContagem(
  equipamentos: EquipamentoDTO[],
  grupos: EquipmentGroup[] = DEFAULT_EQUIPMENT_GROUPS
): Array<{
  grupo: EquipmentGroup;
  quantidade: number;
  equipamentos: EquipamentoDTO[];
}> {
  const gruposMap = agruparEquipamentos(equipamentos, grupos);
  const resultado: Array<{
    grupo: EquipmentGroup;
    quantidade: number;
    equipamentos: EquipamentoDTO[];
  }> = [];

  for (const [key, data] of gruposMap.entries()) {
    resultado.push({
      grupo: data.grupo,
      quantidade: data.equipamentos.length,
      equipamentos: data.equipamentos,
    });
  }

  // Ordenar por quantidade (maior primeiro) e depois por nome
  resultado.sort((a, b) => {
    if (b.quantidade !== a.quantidade) {
      return b.quantidade - a.quantidade;
    }
    return a.grupo.name.localeCompare(b.grupo.name);
  });

  return resultado;
}

/**
 * Normaliza string para comparação (remove acentos, espaços extras, etc.)
 */
function normalizarString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
}

/**
 * Filtra equipamentos de um setor específico
 * Usa comparação flexível para lidar com variações de nome
 */
export function filtrarEquipamentosPorSetor(
  equipamentos: EquipamentoDTO[],
  sectorName: string
): EquipamentoDTO[] {
  const sectorNameNormalized = normalizarString(sectorName);
  const sectorNameWords = sectorNameNormalized.split(/\s+/).filter(w => w.length > 0);
  
  console.log(`[filtrarEquipamentosPorSetor] Buscando equipamentos do setor: "${sectorName}" (normalizado: "${sectorNameNormalized}")`);
  console.log(`[filtrarEquipamentosPorSetor] Total de equipamentos para filtrar: ${equipamentos.length}`);
  
  // Se o nome do setor tem menos de 3 caracteres, usar comparação exata
  if (sectorNameNormalized.length < 3) {
    console.warn(`[filtrarEquipamentosPorSetor] Nome do setor muito curto, usando comparação exata`);
    const resultado = equipamentos.filter((eq) => {
      const eqSetor = normalizarString(eq.Setor || '');
      return eqSetor === sectorNameNormalized;
    });
    console.log(`[filtrarEquipamentosPorSetor] Encontrados ${resultado.length} equipamentos com comparação exata`);
    return resultado;
  }
  
  // Comparação flexível: verifica se todas as palavras principais do setor estão no nome do setor do equipamento
  const resultado = equipamentos.filter((eq) => {
    const eqSetor = normalizarString(eq.Setor || '');
    
    // Comparação exata
    if (eqSetor === sectorNameNormalized) {
      return true;
    }
    
    // Verificar se o nome do setor está contido no setor do equipamento
    if (eqSetor.includes(sectorNameNormalized)) {
      return true;
    }
    
    // Verificar se o setor do equipamento está contido no nome do setor
    if (sectorNameNormalized.includes(eqSetor) && eqSetor.length >= 3) {
      return true;
    }
    
    // Verificar se pelo menos 2 palavras principais coincidem (para nomes compostos)
    if (sectorNameWords.length >= 2) {
      const palavrasCoincidentes = sectorNameWords.filter(palavra => 
        palavra.length >= 3 && eqSetor.includes(palavra)
      );
      if (palavrasCoincidentes.length >= 2) {
        return true;
      }
    }
    
    return false;
  });
  
  console.log(`[filtrarEquipamentosPorSetor] Encontrados ${resultado.length} equipamentos`);
  
  // Log dos primeiros 5 setores únicos encontrados para debug
  if (equipamentos.length > 0) {
    const setoresUnicos = new Set(equipamentos.slice(0, 50).map(eq => eq.Setor || '').filter(s => s));
    console.log(`[filtrarEquipamentosPorSetor] Exemplos de setores nos equipamentos:`, Array.from(setoresUnicos).slice(0, 5));
  }
  
  // Log dos primeiros 3 equipamentos encontrados para debug
  if (resultado.length > 0) {
    console.log(`[filtrarEquipamentosPorSetor] Exemplos de equipamentos encontrados:`, resultado.slice(0, 3).map(eq => ({
      equipamento: eq.Equipamento,
      setor: eq.Setor,
    })));
  } else {
    console.warn(`[filtrarEquipamentosPorSetor] NENHUM equipamento encontrado!`);
    console.warn(`[filtrarEquipamentosPorSetor] Nome buscado: "${sectorName}" (normalizado: "${sectorNameNormalized}")`);
    // Mostrar alguns exemplos de setores que existem nos equipamentos
    const setoresExistentes = new Set(equipamentos.map(eq => eq.Setor || '').filter(s => s));
    console.warn(`[filtrarEquipamentosPorSetor] Setores existentes nos equipamentos (primeiros 10):`, Array.from(setoresExistentes).slice(0, 10));
  }
  
  return resultado;
}

