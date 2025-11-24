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

  // Se a lista está vazia, retornar vazia
  if (osList.length === 0) {
    return [];
  }

  try {
    const enabledWorkshops = await getEnabledWorkshops();

    // Se não há oficinas configuradas, retornar todas (não filtrar)
    // Isso significa que o sistema está configurado para não filtrar por oficina
    if (enabledWorkshops.size === 0) {
      console.log('[workshopFilter] Nenhuma oficina configurada, retornando todas as OS sem filtrar');
      return osList;
    }

    console.log(`[workshopFilter] Filtrando ${osList.length} OS com ${enabledWorkshops.size} oficinas habilitadas`);
    
    const filtradas = osList.filter((os) => {
      if (!os || typeof os !== 'object') {
        return false; // Remover entradas inválidas
      }
      const oficina = os.Oficina;
      if (!oficina || typeof oficina !== 'string' || oficina.trim() === '') {
        return true; // Se não tem oficina, manter
      }
      const oficinaTrimmed = oficina.trim();
      const estaHabilitada = enabledWorkshops.has(oficinaTrimmed);
      return estaHabilitada;
    });
    
    console.log(`[workshopFilter] ${filtradas.length} OS passaram no filtro (de ${osList.length})`);
    return filtradas;
  } catch (error: any) {
    console.error('[workshopFilter] Erro ao filtrar OS por oficina:', error);
    console.error('[workshopFilter] Stack:', error?.stack);
    // Em caso de erro, retornar todas (não filtrar) para não quebrar o sistema
    console.warn('[workshopFilter] Retornando todas as OS devido ao erro');
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

    // Buscar TODAS as configurações de oficinas primeiro para debug
    const todasConfigs = await prisma.systemConfig.findMany({
      where: {
        category: 'workshop',
      },
    });
    
    console.log(`[workshopFilter] === DEBUG OFICINAS ===`);
    console.log(`[workshopFilter] Total de configurações de oficinas no banco: ${todasConfigs.length}`);
    todasConfigs.forEach(config => {
      console.log(`[workshopFilter]   - Oficina: "${config.key}" | Value: "${config.value || 'null'}" | Active: ${config.active}`);
    });

    // Buscar todas as configurações de oficinas ATIVAS (active=true)
    const configs = await prisma.systemConfig.findMany({
      where: {
        category: 'workshop',
        active: true, // Apenas oficinas ativas
      },
    });
    
    // Filtrar apenas oficinas com value="enabled" (oficinas habilitadas)
    const oficinasHabilitadas = configs.filter(config => {
      const value = (config.value || '').trim().toLowerCase();
      return value === 'enabled';
    });

    console.log(`[workshopFilter] Oficinas ativas encontradas: ${configs.length}`);
    console.log(`[workshopFilter] Oficinas habilitadas (value="enabled"): ${oficinasHabilitadas.length}`);
    oficinasHabilitadas.forEach(config => {
      console.log(`[workshopFilter]   ✓ Oficina HABILITADA: "${config.key}" | Value: "${config.value}"`);
    });

    // Criar Set com oficinas que estão habilitadas (value="enabled" e active=true)
    const workshopsWithClassification = new Set<string>(
      oficinasHabilitadas.map(config => config.key.trim().toUpperCase())
    );
    
    console.log(`[workshopFilter] Oficinas que serão consideradas (normalizadas): ${Array.from(workshopsWithClassification).join(', ')}`);

    // Se não há oficinas habilitadas configuradas, retornar array vazio
    // (NÃO retornar todas as OS, pois isso causaria o problema que estamos vendo)
    if (workshopsWithClassification.size === 0) {
      console.warn('[workshopFilter] ⚠️ Nenhuma oficina habilitada (value="enabled") encontrada!');
      console.warn('[workshopFilter] ⚠️ Retornando array vazio para evitar incluir OS de oficinas não habilitadas');
      return [];
    }

    const antes = osList.length;
    
    // Contar oficinas únicas nas OS para debug
    const oficinasUnicas = new Set<string>();
    osList.forEach((os: any) => {
      if (os && os.Oficina && typeof os.Oficina === 'string') {
        oficinasUnicas.add(os.Oficina.trim().toUpperCase());
      }
    });
    console.log(`[workshopFilter] Oficinas únicas encontradas nas ${antes} OS: ${Array.from(oficinasUnicas).join(', ')}`);
    
    // Mapear quais oficinas das OS estão nas configuradas
    const oficinasEncontradas = new Set<string>();
    const oficinasNaoEncontradas = new Set<string>();
    oficinasUnicas.forEach(oficina => {
      if (workshopsWithClassification.has(oficina)) {
        oficinasEncontradas.add(oficina);
      } else {
        oficinasNaoEncontradas.add(oficina);
      }
    });
    
    console.log(`[workshopFilter] Oficinas das OS que ESTÃO classificadas: ${Array.from(oficinasEncontradas).join(', ')}`);
    console.log(`[workshopFilter] Oficinas das OS que NÃO estão classificadas: ${Array.from(oficinasNaoEncontradas).join(', ')}`);
    
    const filtradas = osList.filter((os) => {
      if (!os || typeof os !== 'object') {
        return false;
      }
      const oficina = os.Oficina;
      if (!oficina || typeof oficina !== 'string' || oficina.trim() === '') {
        return false; // Sem oficina = excluir
      }
      const oficinaNormalizada = oficina.trim().toUpperCase();
      const estaHabilitada = workshopsWithClassification.has(oficinaNormalizada);
      return estaHabilitada;
    });
    
    console.log(`[workshopFilter] === RESULTADO DO FILTRO ===`);
    console.log(`[workshopFilter] Total de OS antes: ${antes}`);
    console.log(`[workshopFilter] Total de OS após filtro: ${filtradas.length}`);
    console.log(`[workshopFilter] OS excluídas: ${antes - filtradas.length}`);
    console.log(`[workshopFilter] ==========================`);
    
    return filtradas;
  } catch (error: any) {
    console.error('[workshopFilter] Erro ao filtrar OS por classificação de oficina:', error);
    console.error('[workshopFilter] Stack:', error?.stack);
    // Em caso de erro, retornar array vazio para não incluir OS de oficinas não configuradas
    console.warn('[workshopFilter] ⚠️ Retornando array vazio devido ao erro');
    return [];
  }
}

/**
 * Invalida o cache de oficinas habilitadas
 */
export function invalidateWorkshopCache(): void {
  global._enabledWorkshopsCache = undefined;
  global._enabledWorkshopsCacheTime = undefined;
}

