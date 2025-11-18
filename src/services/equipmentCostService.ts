// src/services/equipmentCostService.ts
import { dataSource } from '../adapters/dataSource';
import { getCache, setCache, generateCacheKey } from './cacheService';

const CACHE_TTL = 30 * 60 * 1000; // 30 minutos
const USE_MOCK = process.env.USE_MOCK === 'true';

/**
 * Converte valor monetário brasileiro (ex: "4.500,00") para número
 * Remove pontos (separador de milhar) e substitui vírgula por ponto (separador decimal)
 */
function parseBrazilianCurrency(value: string): number {
  if (!value || value.trim() === '') return 0;
  // Remove espaços e caracteres não numéricos exceto vírgula e ponto
  let cleaned = value.trim().replace(/[^\d,.-]/g, '');
  // Se não tem vírgula, trata como número simples
  if (!cleaned.includes(',')) {
    return parseFloat(cleaned) || 0;
  }
  // Remove pontos (separador de milhar) e substitui vírgula por ponto
  cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

interface OSCost {
  EquipamentoId?: number;
  Equipamento: string;
  Tag?: string;
  Custo: string;
}

export interface EquipmentCost {
  equipamentoId: number;
  tag: string;
  equipamento: string;
  totalGasto: number;
  quantidadeOS: number;
  ultimaOS?: string;
}

/**
 * Calcula os valores gastos por equipamento a partir das ordens de serviço
 */
export async function getEquipmentCosts(): Promise<Map<number, EquipmentCost>> {
  const cacheKey = generateCacheKey('equipment-costs', {});
  
  // Tentar buscar do cache primeiro
  let cachedData: any = null;
  if (!USE_MOCK) {
    cachedData = await getCache<Array<[number, EquipmentCost]>>(cacheKey, CACHE_TTL);
    if (cachedData) {
      console.log('[equipmentCostService] Dados carregados do cache');
      return new Map(cachedData);
    }
  }
  
  const osDataRaw = await dataSource.osResumida({
    tipoManutencao: 'Todos',
    periodo: 'Todos',
  });

  // Garantir que osData é um array
  // A API pode retornar um objeto paginado com campo "Itens" ou diretamente um array
  let osData: any[] = [];
  if (Array.isArray(osDataRaw)) {
    osData = osDataRaw;
  } else if (osDataRaw?.Itens && Array.isArray(osDataRaw.Itens)) {
    // Formato paginado da API Effort
    osData = osDataRaw.Itens;
  } else if (osDataRaw && typeof osDataRaw === 'object') {
    osData = (osDataRaw as any).data || (osDataRaw as any).items || [];
  }
  
  // Aplicar filtro de oficinas habilitadas
  const { filterOSByWorkshop } = await import('./workshopFilterService');
  osData = await filterOSByWorkshop(osData);

  if (!Array.isArray(osData) || osData.length === 0) {
    console.warn('[getEquipmentCosts] osData não é um array válido:', typeof osDataRaw, osDataRaw ? Object.keys(osDataRaw) : 'null');
    return new Map();
  }

  // Mapear equipamentos por Tag (mais confiável) ou por nome
  const equipamentos = await dataSource.equipamentos({
    apenasAtivos: false,
    incluirComponentes: false,
    incluirCustoSubstituicao: true,
  });

  // Garantir que equipamentos é um array
  const equipamentosArray = Array.isArray(equipamentos) ? equipamentos : (equipamentos?.data || equipamentos?.items || []);

  // Criar mapa de Tag -> EquipamentoId
  const tagToIdMap = new Map<string, number>();
  const nomeToIdMap = new Map<string, number>();

  equipamentosArray.forEach((eq) => {
    if (eq.Tag) tagToIdMap.set(eq.Tag, eq.Id);
    if (eq.Equipamento) nomeToIdMap.set(eq.Equipamento, eq.Id);
  });

  // Agrupar OS por equipamento e calcular totais
  const costsMap = new Map<number, EquipmentCost>();

  osData.forEach((os: any) => {
    // Tentar encontrar ID do equipamento
    let equipamentoId: number | undefined = os.EquipamentoId;

    // Se não tiver EquipamentoId, tentar encontrar por nome do equipamento + modelo + fabricante
    if (!equipamentoId) {
      // Procurar equipamento que corresponda ao nome, modelo e fabricante
      const equipamento = equipamentosArray.find(
        (e) =>
          e.Equipamento === os.Equipamento &&
          e.Modelo === os.Modelo &&
          e.Fabricante === os.Fabricante
      );
      equipamentoId = equipamento?.Id;
    }

    // Se ainda não encontrou, tentar apenas por nome
    if (!equipamentoId) {
      equipamentoId = nomeToIdMap.get(os.Equipamento);
    }

    if (!equipamentoId) {
      // Se não encontrar, pular esta OS
      return;
    }

    const custo = parseBrazilianCurrency(os.Custo || '0');

    if (costsMap.has(equipamentoId)) {
      const existing = costsMap.get(equipamentoId)!;
      existing.totalGasto += custo;
      existing.quantidadeOS += 1;
      // Atualizar última OS se esta for mais recente
      if (os.Abertura && (!existing.ultimaOS || os.Abertura > existing.ultimaOS)) {
        existing.ultimaOS = os.Abertura;
      }
    } else {
      const equipamento = equipamentosArray.find((e) => e.Id === equipamentoId);
      costsMap.set(equipamentoId, {
        equipamentoId,
        tag: equipamento?.Tag || '',
        equipamento: os.Equipamento || '',
        totalGasto: custo,
        quantidadeOS: 1,
        ultimaOS: os.Abertura,
      });
    }
  });

  // Salvar no cache (apenas se não for mock)
  if (!USE_MOCK && costsMap.size > 0) {
    const costsArray = Array.from(costsMap.entries());
    await setCache(cacheKey, costsArray);
    console.log('[equipmentCostService] Dados salvos no cache');
  }

  return costsMap;
}

/**
 * Retorna o custo total de um equipamento específico
 */
export async function getEquipmentCost(equipamentoId: number): Promise<number> {
  const costs = await getEquipmentCosts();
  return costs.get(equipamentoId)?.totalGasto || 0;
}

