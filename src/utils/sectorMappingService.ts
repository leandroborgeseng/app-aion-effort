// src/utils/sectorMappingService.ts
// Serviço para aplicar mapeamento de setores da API Effort para setores do sistema

let prisma: any = null;
async function getPrisma() {
  if (!prisma && process.env.USE_MOCK !== 'true') {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

// Cache de mapeamentos (TTL de 5 minutos)
let mappingsCache: Array<{ effortSectorName: string; effortSectorId?: number | null; systemSectorId: number }> | null = null;
let mappingsCacheTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Carrega mapeamentos de setores do banco de dados (com cache)
 */
async function loadMappings(): Promise<Array<{ effortSectorName: string; effortSectorId?: number | null; systemSectorId: number }>> {
  const now = Date.now();
  
  // Retornar cache se ainda válido
  if (mappingsCache && (now - mappingsCacheTime) < CACHE_TTL) {
    return mappingsCache;
  }

  const USE_MOCK = process.env.USE_MOCK === 'true';
  if (USE_MOCK) {
    return [];
  }

  const prismaClient = await getPrisma();
  if (!prismaClient) {
    return [];
  }

  try {
    const mappings = await prismaClient.sectorMapping.findMany({
      where: { active: true },
      select: {
        effortSectorName: true,
        effortSectorId: true,
        systemSectorId: true,
      },
    });

    mappingsCache = mappings;
    mappingsCacheTime = now;
    return mappings;
  } catch (error) {
    console.error('[sectorMappingService] Erro ao carregar mapeamentos:', error);
    return [];
  }
}

/**
 * Mapeia um setor da API Effort para um setor do sistema
 * @param effortSectorName Nome do setor da API Effort
 * @param effortSectorId ID do setor da API Effort (opcional)
 * @returns ID do setor do sistema ou null se não mapeado
 */
export async function mapEffortSectorToSystem(
  effortSectorName: string | null | undefined,
  effortSectorId?: number | null
): Promise<number | null> {
  if (!effortSectorName || effortSectorName.trim() === '') {
    return null;
  }

  const mappings = await loadMappings();
  const normalizedName = effortSectorName.trim();

  // Tentar encontrar mapeamento por nome e ID (mais preciso)
  if (effortSectorId !== undefined && effortSectorId !== null) {
    const mappingById = mappings.find(
      (m) => m.effortSectorName === normalizedName && m.effortSectorId === effortSectorId
    );
    if (mappingById) {
      return mappingById.systemSectorId;
    }
  }

  // Tentar encontrar mapeamento apenas por nome
  const mappingByName = mappings.find((m) => m.effortSectorName === normalizedName);
  if (mappingByName) {
    return mappingByName.systemSectorId;
  }

  return null;
}

/**
 * Mapeia múltiplos setores da API Effort para setores do sistema
 * @param effortSectors Array de objetos com nome e ID do setor
 * @returns Array de IDs de setores do sistema (sem duplicatas)
 */
export async function mapEffortSectorsToSystem(
  effortSectors: Array<{ name: string; id?: number | null }>
): Promise<number[]> {
  const systemSectorIds = new Set<number>();

  for (const sector of effortSectors) {
    const mappedId = await mapEffortSectorToSystem(sector.name, sector.id);
    if (mappedId !== null) {
      systemSectorIds.add(mappedId);
    }
  }

  return Array.from(systemSectorIds);
}

/**
 * Filtra um array de itens (equipamentos ou OS) por setores do sistema usando o mapeamento
 * @param items Array de itens com campo Setor e/ou SetorId
 * @param systemSectorIds Array de IDs de setores do sistema para filtrar
 * @returns Array filtrado
 */
export async function filterBySystemSectors<T extends { Setor?: string; SetorId?: number }>(
  items: T[],
  systemSectorIds: number[]
): Promise<T[]> {
  if (!systemSectorIds || systemSectorIds.length === 0) {
    return items;
  }

  const filtered: T[] = [];

  for (const item of items) {
    const mappedSectorId = await mapEffortSectorToSystem(item.Setor, item.SetorId);
    if (mappedSectorId !== null && systemSectorIds.includes(mappedSectorId)) {
      filtered.push(item);
    }
  }

  return filtered;
}

/**
 * Invalida o cache de mapeamentos (chamar após criar/atualizar/deletar mapeamentos)
 */
export function invalidateMappingsCache(): void {
  mappingsCache = null;
  mappingsCacheTime = 0;
}

