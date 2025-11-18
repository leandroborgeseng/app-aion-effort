// src/services/workshopFilterService.ts
import { getPrisma } from './prismaService';

const USE_MOCK = process.env.USE_MOCK === 'true';

// Cache para oficinas habilitadas (evita múltiplas queries)
declare global {
  var _enabledWorkshopsCache: Set<string> | undefined;
  var _enabledWorkshopsCacheTime: number | undefined;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Busca todas as oficinas habilitadas do banco de dados
 */
async function getEnabledWorkshops(): Promise<Set<string>> {
  // Verificar cache
  if (global._enabledWorkshopsCache && global._enabledWorkshopsCacheTime) {
    const cacheAge = Date.now() - global._enabledWorkshopsCacheTime;
    if (cacheAge < CACHE_TTL) {
      return global._enabledWorkshopsCache;
    }
  }

  if (USE_MOCK) {
    // Em modo mock, retornar todas as oficinas como habilitadas
    return new Set<string>();
  }

  const prisma = await getPrisma();
  if (!prisma) {
    console.warn('[workshopFilter] Prisma não disponível, retornando todas as oficinas');
    return new Set<string>();
  }

  try {
    const configs = await prisma.systemConfig.findMany({
      where: {
        category: 'workshop',
        active: true,
        value: 'enabled',
      },
    });

    const enabledWorkshops = new Set<string>(
      configs.map((config) => config.key.trim())
    );

    // Atualizar cache
    global._enabledWorkshopsCache = enabledWorkshops;
    global._enabledWorkshopsCacheTime = Date.now();

    console.log(`[workshopFilter] Carregadas ${enabledWorkshops.size} oficinas habilitadas`);
    return enabledWorkshops;
  } catch (error: any) {
    console.error('[workshopFilter] Erro ao buscar oficinas habilitadas:', error);
    // Em caso de erro, retornar todas como habilitadas (não filtrar)
    return new Set<string>();
  }
}

/**
 * Verifica se uma oficina está habilitada
 * Se não houver configuração, retorna true (não filtra)
 */
export async function isWorkshopEnabled(oficina: string | null | undefined): Promise<boolean> {
  if (!oficina || oficina.trim() === '') {
    return true; // Se não tem oficina, não filtrar
  }

  const enabledWorkshops = await getEnabledWorkshops();

  // Se não há oficinas configuradas, não filtrar (comportamento padrão)
  if (enabledWorkshops.size === 0) {
    return true;
  }

  return enabledWorkshops.has(oficina.trim());
}

/**
 * Filtra um array de OS removendo aquelas com oficinas desabilitadas
 */
export async function filterOSByWorkshop<T extends { Oficina?: string | null }>(
  osList: T[] | null | undefined
): Promise<T[]> {
  // Validar entrada
  if (!osList || !Array.isArray(osList)) {
    console.warn('[workshopFilter] filterOSByWorkshop recebeu valor inválido:', typeof osList);
    return [];
  }

  try {
    const enabledWorkshops = await getEnabledWorkshops();

    // Se não há oficinas configuradas, retornar todas (não filtrar)
    if (enabledWorkshops.size === 0) {
      return osList;
    }

    return osList.filter((os) => {
      if (!os || typeof os !== 'object') {
        return false; // Remover entradas inválidas
      }
      const oficina = os.Oficina;
      if (!oficina || typeof oficina !== 'string' || oficina.trim() === '') {
        return true; // Se não tem oficina, manter
      }
      return enabledWorkshops.has(oficina.trim());
    });
  } catch (error: any) {
    console.error('[workshopFilter] Erro ao filtrar OS por oficina:', error);
    // Em caso de erro, retornar todas (não filtrar)
    return osList;
  }
}

/**
 * Verifica se uma oficina tem classificação (value não vazio na configuração)
 * Oficinas sem classificação devem ser excluídas
 */
export async function hasWorkshopClassification(oficina: string | null | undefined): Promise<boolean> {
  if (!oficina || oficina.trim() === '') {
    return false; // Sem oficina = sem classificação
  }

  if (USE_MOCK) {
    // Em mock, assumir que todas têm classificação
    return true;
  }

  const prisma = await getPrisma();
  if (!prisma) {
    console.warn('[workshopFilter] Prisma não disponível para verificar classificação');
    return false; // Sem Prisma = não tem classificação
  }

  try {
    const config = await prisma.systemConfig.findUnique({
      where: {
        category_key: {
          category: 'workshop',
          key: oficina.trim(),
        },
      },
    });

    // Tem classificação se existe configuração E o value não está vazio
    return config !== null && config.value !== null && config.value.trim() !== '';
  } catch (error: any) {
    console.error('[workshopFilter] Erro ao verificar classificação de oficina:', error);
    return false; // Em caso de erro, não tem classificação
  }
}

/**
 * Filtra um array de OS removendo aquelas com oficinas sem classificação
 */
export async function filterOSByWorkshopClassification<T extends { Oficina?: string | null }>(
  osList: T[] | null | undefined
): Promise<T[]> {
  if (!osList || !Array.isArray(osList)) {
    return [];
  }

  try {
    const prisma = await getPrisma();
    if (!prisma) {
      console.warn('[workshopFilter] Prisma não disponível, retornando todas as OS');
      return osList;
    }

    // Buscar todas as configurações de oficinas com classificação (value não vazio)
    const configs = await prisma.systemConfig.findMany({
      where: {
        category: 'workshop',
        value: { not: null },
      },
    });

    // Criar Set com oficinas que têm classificação
    const workshopsWithClassification = new Set<string>(
      configs
        .filter(config => config.value && config.value.trim() !== '')
        .map(config => config.key.trim())
    );

    // Se não há oficinas com classificação configuradas, retornar todas
    if (workshopsWithClassification.size === 0) {
      return osList;
    }

    return osList.filter((os) => {
      if (!os || typeof os !== 'object') {
        return false;
      }
      const oficina = os.Oficina;
      if (!oficina || typeof oficina !== 'string' || oficina.trim() === '') {
        return false; // Sem oficina = excluir
      }
      return workshopsWithClassification.has(oficina.trim());
    });
  } catch (error: any) {
    console.error('[workshopFilter] Erro ao filtrar OS por classificação de oficina:', error);
    return osList;
  }
}

/**
 * Invalida o cache de oficinas habilitadas
 */
export function invalidateWorkshopCache(): void {
  global._enabledWorkshopsCache = undefined;
  global._enabledWorkshopsCacheTime = undefined;
}

