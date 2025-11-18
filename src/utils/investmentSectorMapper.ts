// src/utils/investmentSectorMapper.ts
// Utilitário para mapear nomes de setores de investimentos para IDs de setores da API

import { dataSource } from '../adapters/dataSource';
import { getSectorIdFromName } from './sectorMapping';

/**
 * Mapeamento manual de setores específicos de investimentos para IDs de setores da API
 * Este mapeamento é usado quando a API não retorna SetorId diretamente
 */
const INVESTMENT_SECTOR_MAPPING: Record<string, number> = {
  // Setores que mapeiam diretamente
  'PEDIATRIA': 10,
  'UTI 2': 2,
  'UTI 1': 1,
  'UTI 3': 3,
  'CENTRO CIRÚRGICO': 5,
  'Centro Cirúrgico': 5,
  'CENTRO CIRÚRGICO - 10A': 5,
  'Centro Cirúrgico Ambulatorial': 5,
  'UNIDADE DE EMERGÊNCIA': 4,
  'UTI/UNIDADE DE EMERGÊNCIA': 4,
  'Emergência': 4,
  
  // Setores de diagnóstico por imagem -> Radiologia
  'TOMOGRAFIA': 6,
  'TOMOGRAFIA 2': 6,
  'RESSONÂNCIA MAGNÉTICA': 6,
  'RESSONANCIA MAGNÉTICA': 6,
  'ULTRASSONOGRAFIA': 6,
  
  // Setores relacionados a cardiologia
  'HEMODINÂMICA': 7,
  'HEMODINAMICA': 7,
  'CDC': 7, // Centro de Diagnóstico Cardiovascular
  
  // Setores relacionados a maternidade/pediatria
  'BERÇÁRIO': 11, // Maternidade
  'BERÇARIO': 11,
  'UTI NEONATAL E PEDIÁTRICA': 1, // UTI 1 (assumindo que é a UTI neonatal)
  'UTI Neonatal e Pediátrica': 1,
  'UTI INFANTIL - 8': 1,
  'UTI INFANTIL-8': 1,
  'UTI ADULTO I': 1, // Assumindo UTI 1
  'UTI Adulto I': 1,
  
  // Setores administrativos/suporte (usar IDs gerados ou mapear para setores existentes)
  'UNIDADES DE INTERNAÇÃO': 12, // Ambulatório (mais próximo)
  'EDUCAÇÃO CORPORATIVA': 12, // Ambulatório
  'Educação Corporativa': 12,
  'CME': 5, // Centro Cirúrgico (Central de Material e Esterilização geralmente fica próxima)
  'ENDOSCOPIA': 5, // Centro Cirúrgico (endoscopia geralmente é no centro cirúrgico)
  'MANUTENÇÃO': 12, // Ambulatório (setor de apoio)
  'MANUTENCAO': 12,
  'ROUPARIA': 12, // Ambulatório (setor de apoio)
  'UNIDADE 1': 12, // Ambulatório
  'Unidade 1': 12,
  'CENTRO CIRÚRGICO AMBULATORIAL': 5,
  'Centro Cirúrgico Ambulatorial': 5,
};

/**
 * Busca setores únicos da API de equipamentos e OS
 */
export async function getUniqueSectorsFromAPI(): Promise<Map<string, number>> {
  const sectorMap = new Map<string, number>();
  
  try {
    // Buscar equipamentos para extrair setores únicos
    const equipamentos = await dataSource.equipamentos({});
    
    if (Array.isArray(equipamentos)) {
      equipamentos.forEach((eq: any) => {
        if (eq.Setor) {
          const setorNormalizado = eq.Setor.trim().toUpperCase();
          // Se tem SetorId, usar ele
          if (eq.SetorId) {
            if (!sectorMap.has(setorNormalizado)) {
              sectorMap.set(setorNormalizado, eq.SetorId);
            }
          } else {
            // Se não tem SetorId, usar o mapeamento fixo ou gerar hash
            const sectorId = getSectorIdFromName(eq.Setor);
            if (!sectorMap.has(setorNormalizado)) {
              sectorMap.set(setorNormalizado, sectorId);
            }
          }
        }
      });
    }
    
    // Também buscar de OS resumida para ter mais setores
    try {
      const osData = await dataSource.osResumida({
        tipoManutencao: 'Todos',
        periodo: 'Todos',
      });
      
      if (Array.isArray(osData)) {
        osData.forEach((os: any) => {
          if (os.Setor) {
            const setorNormalizado = os.Setor.trim().toUpperCase();
            // Se já existe no map, não sobrescrever
            if (!sectorMap.has(setorNormalizado)) {
              if (os.SetorId) {
                sectorMap.set(setorNormalizado, os.SetorId);
              } else {
                // Usar mapeamento fixo
                const sectorId = getSectorIdFromName(os.Setor);
                sectorMap.set(setorNormalizado, sectorId);
              }
            }
          }
        });
      }
    } catch (osError) {
      console.warn('[investmentSectorMapper] Erro ao buscar setores de OS:', osError);
    }
  } catch (error) {
    console.error('[investmentSectorMapper] Erro ao buscar setores da API:', error);
  }
  
  return sectorMap;
}

/**
 * Mapeia um nome de setor para um SetorId baseado nos setores da API
 * Retorna null se não encontrar correspondência
 */
export async function mapSectorNameToId(setorName: string): Promise<number | null> {
  if (!setorName || !setorName.trim()) {
    return null;
  }
  
  const normalizedName = setorName.trim();
  const normalizedNameUpper = normalizedName.toUpperCase();
  
  // 1. Tentar mapeamento manual primeiro
  if (INVESTMENT_SECTOR_MAPPING[normalizedNameUpper]) {
    return INVESTMENT_SECTOR_MAPPING[normalizedNameUpper];
  }
  
  // 2. Tentar correspondência parcial no mapeamento manual
  for (const [mappedName, sectorId] of Object.entries(INVESTMENT_SECTOR_MAPPING)) {
    if (normalizedNameUpper.includes(mappedName) || mappedName.includes(normalizedNameUpper)) {
      return sectorId;
    }
  }
  
  // 3. Buscar na API
  const sectorMap = await getUniqueSectorsFromAPI();
  
  // Tentar correspondência exata
  if (sectorMap.has(normalizedNameUpper)) {
    return sectorMap.get(normalizedNameUpper)!;
  }
  
  // Tentar correspondência parcial (caso o nome tenha variações)
  for (const [apiSectorName, sectorId] of sectorMap.entries()) {
    if (apiSectorName.includes(normalizedNameUpper) || normalizedNameUpper.includes(apiSectorName)) {
      return sectorId;
    }
  }
  
  // 4. Usar mapeamento fixo como último recurso
  return getSectorIdFromName(setorName);
}

/**
 * Mapeia uma lista de investimentos, adicionando sectorId a cada um
 */
export async function mapInvestmentsSectors(investments: any[]): Promise<any[]> {
  const sectorMap = await getUniqueSectorsFromAPI();
  
  return investments.map((inv) => {
    if (!inv.setor) {
      return { ...inv, sectorId: null };
    }
    
    const normalizedName = inv.setor.trim();
    const normalizedNameUpper = normalizedName.toUpperCase();
    
    let sectorId: number | null = null;
    
    // 1. Tentar mapeamento manual primeiro
    if (INVESTMENT_SECTOR_MAPPING[normalizedNameUpper]) {
      sectorId = INVESTMENT_SECTOR_MAPPING[normalizedNameUpper];
    } else {
      // 2. Tentar correspondência parcial no mapeamento manual
      for (const [mappedName, mappedSectorId] of Object.entries(INVESTMENT_SECTOR_MAPPING)) {
        if (normalizedNameUpper.includes(mappedName) || mappedName.includes(normalizedNameUpper)) {
          sectorId = mappedSectorId;
          break;
        }
      }
    }
    
    // 3. Tentar correspondência exata na API
    if (!sectorId && sectorMap.has(normalizedNameUpper)) {
      sectorId = sectorMap.get(normalizedNameUpper)!;
    }
    
    // 4. Tentar correspondência parcial na API
    if (!sectorId) {
      for (const [apiSectorName, apiSectorId] of sectorMap.entries()) {
        if (apiSectorName.includes(normalizedNameUpper) || normalizedNameUpper.includes(apiSectorName)) {
          sectorId = apiSectorId;
          break;
        }
      }
    }
    
    // 5. Usar mapeamento fixo como último recurso
    if (!sectorId) {
      sectorId = getSectorIdFromName(inv.setor);
    }
    
    return { ...inv, sectorId };
  });
}

/**
 * Retorna um relatório de mapeamento de setores
 */
export async function getSectorMappingReport(investments: any[]): Promise<{
  mapped: Array<{ setor: string; sectorId: number }>;
  unmapped: string[];
  allApiSectors: Array<{ name: string; id: number }>;
}> {
  const sectorMap = await getUniqueSectorsFromAPI();
  const mapped: Array<{ setor: string; sectorId: number }> = [];
  const unmapped: string[] = [];
  const processedSetors = new Set<string>();
  
  investments.forEach((inv) => {
    if (!inv.setor) return;
    
    const normalizedName = inv.setor.trim();
    const normalizedNameUpper = normalizedName.toUpperCase();
    if (processedSetors.has(normalizedNameUpper)) return;
    processedSetors.add(normalizedNameUpper);
    
    let sectorId: number | null = null;
    
    // 1. Tentar mapeamento manual primeiro
    if (INVESTMENT_SECTOR_MAPPING[normalizedNameUpper]) {
      sectorId = INVESTMENT_SECTOR_MAPPING[normalizedNameUpper];
    } else {
      // 2. Tentar correspondência parcial no mapeamento manual
      for (const [mappedName, mappedId] of Object.entries(INVESTMENT_SECTOR_MAPPING)) {
        if (normalizedNameUpper.includes(mappedName) || mappedName.includes(normalizedNameUpper)) {
          sectorId = mappedId;
          break;
        }
      }
    }
    
    // 3. Tentar correspondência exata na API
    if (!sectorId && sectorMap.has(normalizedNameUpper)) {
      sectorId = sectorMap.get(normalizedNameUpper)!;
    }
    
    // 4. Tentar correspondência parcial na API
    if (!sectorId) {
      for (const [apiSectorName, apiSectorId] of sectorMap.entries()) {
        if (apiSectorName.includes(normalizedNameUpper) || normalizedNameUpper.includes(apiSectorName)) {
          sectorId = apiSectorId;
          break;
        }
      }
    }
    
    // 5. Usar mapeamento fixo como último recurso
    if (!sectorId) {
      sectorId = getSectorIdFromName(inv.setor);
    }
    
    if (sectorId) {
      mapped.push({ setor: inv.setor, sectorId });
    } else {
      unmapped.push(inv.setor);
    }
  });
  
  const allApiSectors = Array.from(sectorMap.entries()).map(([name, id]) => ({ name, id }));
  
  return { mapped, unmapped, allApiSectors };
}

