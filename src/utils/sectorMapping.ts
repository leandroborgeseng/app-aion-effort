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

/**
 * Busca nomes dos setores - mesma lógica usada no inventário
 * 1. Tenta buscar da tabela SectorMapping
 * 2. Se não encontrar, busca da API de investimentos (/api/ecm/investments/sectors/list)
 * 3. Fallback para mapeamento fixo
 * 
 * @param sectorIds - IDs dos setores para buscar nomes
 * @param req - Request object (opcional) para buscar da API de investimentos
 */
export async function getSectorNamesFromUserSector(
  sectorIds: number[],
  equipamentos?: any[],
  userId?: string,
  req?: any // Request object para fazer fetch interno
): Promise<string[]> {
  const nomes: string[] = [];
  
  try {
    const { getPrisma } = await import('../services/prismaService');
    const prismaClient = await getPrisma();
    
    if (!prismaClient) {
      throw new Error('Prisma não disponível');
    }

    // Criar mapa de IDs para nomes (será preenchido com nomes encontrados)
    const sectorIdToNameMap = new Map<number, string>();
    
    // Passo 1: Buscar da tabela SectorMapping (mesma lógica do inventário)
    try {
      const sectorMappings = await prismaClient.sectorMapping.findMany({
        where: {
          systemSectorId: { in: sectorIds },
          active: true,
        },
      });
      
      sectorMappings.forEach((mapping) => {
        const name = mapping.systemSectorName || mapping.effortSectorName;
        if (name && !sectorIdToNameMap.has(mapping.systemSectorId)) {
          sectorIdToNameMap.set(mapping.systemSectorId, name);
        }
      });
    } catch (error) {
      console.error('[getSectorNamesFromUserSector] Erro ao buscar SectorMapping:', error);
    }
    
    // Passo 2: Se não encontrou todos, buscar da API de investimentos (mesma lógica do inventário)
    const sectorIdsSemNome = sectorIds.filter((id) => !sectorIdToNameMap.has(id));
    
    if (sectorIdsSemNome.length > 0 && req) {
      try {
        const sectorsRes = await fetch(`${req.protocol}://${req.get('host')}/api/ecm/investments/sectors/list`);
        if (sectorsRes.ok) {
          const sectorsData = await sectorsRes.json();
          const sectorsFromApi = sectorsData.sectors
            ?.filter((s: any) => sectorIdsSemNome.includes(s.id))
            .map((s: any) => ({ id: s.id, name: s.name })) || [];
          
          sectorsFromApi.forEach((s: any) => {
            if (s.name && !sectorIdToNameMap.has(s.id)) {
              sectorIdToNameMap.set(s.id, s.name);
            }
          });
        }
      } catch (apiError: any) {
        console.warn('[getSectorNamesFromUserSector] Erro ao buscar da API de investimentos:', apiError?.message);
      }
    }
    
    // Passo 3: Preencher resultado final na ordem dos sectorIds
    for (const id of sectorIds) {
      let nomeEncontrado = sectorIdToNameMap.get(id);
      
      // Se não encontrou no mapeamento, tentar dos equipamentos
      if (!nomeEncontrado && equipamentos) {
        for (const eq of equipamentos) {
          const sectorId = getSectorIdFromItem(eq);
          if (sectorId === id && eq.Setor) {
            nomeEncontrado = eq.Setor;
            break;
          }
        }
      }
      
      // Último fallback: mapeamento fixo
      if (!nomeEncontrado) {
        nomeEncontrado = getSectorNameFromId(id) || `Setor ${id}`;
      }
      
      nomes.push(nomeEncontrado);
    }
  } catch (error) {
    console.error('[getSectorNamesFromUserSector] Erro:', error);
    // Fallback completo
    sectorIds.forEach((id) => {
      let nomeEncontrado = false;
      if (equipamentos) {
        for (const eq of equipamentos) {
          const sectorId = getSectorIdFromItem(eq);
          if (sectorId === id && eq.Setor) {
            nomes.push(eq.Setor);
            nomeEncontrado = true;
            break;
          }
        }
      }
      if (!nomeEncontrado) {
        const nomeMapeado = getSectorNameFromId(id);
        nomes.push(nomeMapeado || `Setor ${id}`);
      }
    });
  }
  
  return nomes;
}

