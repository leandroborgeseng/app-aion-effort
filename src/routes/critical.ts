// src/routes/critical.ts
import { Router } from 'express';
import { calcKpisCriticosMes } from '../services/kpiService';
import { getCache, setCache, generateCacheKey } from '../services/cacheService';
import fs from 'node:fs/promises';

import { getPrisma } from '../services/prismaService';

const USE_MOCK = process.env.USE_MOCK === 'true';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

async function readFlags(): Promise<{
  criticalFlags: Record<string, boolean>;
  monitoredFlags: Record<string, boolean>;
}> {
  if (USE_MOCK) {
    try {
      const buf = await fs.readFile('./mocks/equipment_flags.json', 'utf-8');
      const data = JSON.parse(buf);
      return {
        criticalFlags: data.criticalFlags || {},
        monitoredFlags: data.monitoredFlags || {},
      };
    } catch {
      return { criticalFlags: {}, monitoredFlags: {} };
    }
  }
  
  const prismaClient = await getPrisma();
  if (!prismaClient) return { criticalFlags: {}, monitoredFlags: {} };
  
  // Buscar flags do Prisma
  const flags = await prismaClient.equipmentFlag.findMany({
    where: {
      OR: [{ criticalFlag: true }, { monitoredFlag: true }],
    },
  });
  
  const criticalFlags: Record<string, boolean> = {};
  const monitoredFlags: Record<string, boolean> = {};
  
  flags.forEach((flag) => {
    const id = String(flag.effortId);
    if (flag.criticalFlag) {
      criticalFlags[id] = true;
    }
    if (flag.monitoredFlag) {
      monitoredFlags[id] = true;
    }
  });
  
  return { criticalFlags, monitoredFlags };
}

async function saveFlags(flags: {
  criticalFlags: Record<string, boolean>;
  monitoredFlags: Record<string, boolean>;
}): Promise<void> {
  if (USE_MOCK) {
    await fs.writeFile('./mocks/equipment_flags.json', JSON.stringify(flags, null, 2));
    return;
  }
  
  const prismaClient = await getPrisma();
  if (!prismaClient) return;
  
  // Salvar criticalFlags e monitoredFlags no Prisma
  const allEffortIds = new Set([
    ...Object.keys(flags.criticalFlags),
    ...Object.keys(flags.monitoredFlags),
  ]);
  
  for (const effortIdStr of allEffortIds) {
    const effortId = Number(effortIdStr);
    const isCritical = flags.criticalFlags[effortIdStr] || false;
    const isMonitored = flags.monitoredFlags[effortIdStr] || false;
    
    await prismaClient.equipmentFlag.upsert({
      where: { effortId },
      update: {
        criticalFlag: isCritical,
        monitoredFlag: isMonitored,
      },
      create: {
        effortId,
        criticalFlag: isCritical,
        monitoredFlag: isMonitored,
      },
    });
  }
  
  // Remover flags que não estão mais marcadas
  const allFlags = await prismaClient.equipmentFlag.findMany({
    where: {
      OR: [{ criticalFlag: true }, { monitoredFlag: true }],
    },
  });
  
  for (const flag of allFlags) {
    const id = String(flag.effortId);
    const shouldBeCritical = flags.criticalFlags[id] || false;
    const shouldBeMonitored = flags.monitoredFlags[id] || false;
    
    if (flag.criticalFlag !== shouldBeCritical || flag.monitoredFlag !== shouldBeMonitored) {
      await prismaClient.equipmentFlag.update({
        where: { effortId: flag.effortId },
        data: {
          criticalFlag: shouldBeCritical,
          monitoredFlag: shouldBeMonitored,
        },
      });
    }
  }
}

export const critical = Router();

critical.get('/kpi', async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const setoresFilter = req.query.setores 
      ? (req.query.setores as string).split(',').map(s => parseInt(s.trim())).filter(Boolean)
      : null;
    
    const cacheKey = generateCacheKey('critical:kpi', { year, month, setoresFilter });
    
    // Tentar buscar do cache primeiro
    let cachedData: any = null;
    const USE_MOCK = process.env.USE_MOCK === 'true';
    if (!USE_MOCK) {
      cachedData = await getCache<any>(cacheKey, CACHE_TTL);
      if (cachedData) {
        console.log('[critical:kpi] Dados carregados do cache');
        return res.json(cachedData);
      }
    }
    
    let kpi = await calcKpisCriticosMes(year, month);
    
    // Filtrar por setores se fornecido (usando nomes de setores diretamente da API)
    if (setoresFilter && setoresFilter.length > 0 && kpi) {
      // Buscar nomes dos setores do sistema para fazer o filtro
      const sectorsRes = await fetch(`${req.protocol}://${req.get('host')}/api/ecm/investments/sectors/list`);
      const sectorsData = sectorsRes.ok ? await sectorsRes.json() : { sectors: [] };
      const sectorNames = new Set(
        sectorsData.sectors
          ?.filter((s: any) => setoresFilter.includes(s.id))
          .map((s: any) => s.name.toLowerCase()) || []
      );

      if (sectorNames.size > 0) {
        // Buscar equipamentos para filtrar
        const { dataSource } = await import('../adapters/dataSource');
        const equipamentos = await dataSource.equipamentos({
          apenasAtivos: true,
          incluirComponentes: false,
          incluirCustoSubstituicao: false,
        });

        const equipamentosArray = Array.isArray(equipamentos) 
          ? equipamentos 
          : (equipamentos as any)?.Itens || (equipamentos as any)?.data || [];

        // Filtrar equipamentos por nome do setor
        const equipamentosPermitidos = new Set<number>();
        equipamentosArray.forEach((eq: any) => {
          const eqSetor = (eq.Setor || eq.setor || eq.SETOR || '').trim().toLowerCase();
          if (eqSetor && sectorNames.has(eqSetor) && eq.Id) {
            equipamentosPermitidos.add(eq.Id);
          }
        });

        // Filtrar KPIs baseados em equipamentos dos setores permitidos
        if (kpi.equipamentos && Array.isArray(kpi.equipamentos)) {
          kpi.equipamentos = kpi.equipamentos.filter((eq: any) => {
            return eq.Id && equipamentosPermitidos.has(eq.Id);
          });
        }
      }
    }
    
    // Salvar no cache (apenas se não for mock)
    if (!USE_MOCK && kpi) {
      await setCache(cacheKey, kpi);
      console.log('[critical:kpi] Dados salvos no cache');
    }
    
    res.json(kpi);
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

critical.patch('/:effortId/critical', async (req, res) => {
  try {
    const { effortId } = req.params;
    const { criticalFlag } = req.body;
    const flags = await readFlags();
    const effortIdStr = String(effortId);
    
    if (criticalFlag) {
      flags.criticalFlags[effortIdStr] = true;
    } else {
      delete flags.criticalFlags[effortIdStr];
    }
    
    await saveFlags(flags);
    
    // Invalidar caches relacionados
    const { deleteCache } = await import('../services/cacheService');
    const year = new Date().getFullYear();
    await Promise.all([
      deleteCache(generateCacheKey('critical:equipamentos', { criticalIds: Object.keys(flags.criticalFlags).map(Number), year })).catch(() => {}),
      deleteCache(generateCacheKey('critical:uptime-aggregated', { criticalIds: Object.keys(flags.criticalFlags).map(Number), year })).catch(() => {}),
      deleteCache(generateCacheKey('inv', {})).catch(() => {}), // Invalidar inventário também
    ]);
    
    res.json({ ok: true, effortId: Number(effortId), criticalFlag: !!criticalFlag });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

critical.patch('/:effortId/monitored', async (req, res) => {
  try {
    const { effortId } = req.params;
    const { monitoredFlag } = req.body;
    const flags = await readFlags();
    const effortIdStr = String(effortId);
    
    if (monitoredFlag) {
      flags.monitoredFlags[effortIdStr] = true;
    } else {
      delete flags.monitoredFlags[effortIdStr];
    }
    
    await saveFlags(flags);
    
    // Invalidar caches relacionados
    const { deleteCache } = await import('../services/cacheService');
    await deleteCache(generateCacheKey('inv', {})).catch(() => {}); // Invalidar inventário
    
    // Processar OS existentes para criar alertas
    if (monitoredFlag) {
      const { processNewOS } = await import('../services/alertService');
      await processNewOS();
    }
    
    res.json({ ok: true, effortId: Number(effortId), monitoredFlag: !!monitoredFlag });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

critical.get('/flags', async (_req, res) => {
  try {
    const flags = await readFlags();
    res.json(flags);
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

critical.get('/equipamentos', async (req, res) => {
  try {
    const flags = await readFlags();
    const criticalIds = Object.keys(flags.criticalFlags)
      .map(Number)
      .filter((id) => flags.criticalFlags[String(id)] === true);
    
    if (criticalIds.length === 0) {
      return res.json([]);
    }

    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const setoresFilter = req.query.setores 
      ? (req.query.setores as string).split(',').map(s => parseInt(s.trim())).filter(Boolean)
      : null;
    
    const cacheKey = generateCacheKey('critical:equipamentos', { criticalIds, year, setoresFilter });
    
    // Tentar buscar do cache primeiro
    let cachedData: any = null;
    const USE_MOCK = process.env.USE_MOCK === 'true';
    if (!USE_MOCK) {
      cachedData = await getCache<any>(cacheKey, CACHE_TTL);
      if (cachedData) {
        console.log('[critical:equipamentos] Dados carregados do cache');
        return res.json(cachedData);
      }
    }

    // Buscar equipamentos do inventário
    const { dataSource } = await import('../adapters/dataSource');
    const equipamentos = await dataSource.equipamentos({
      apenasAtivos: true,
      incluirComponentes: false,
      incluirCustoSubstituicao: true,
    });

    // Filtrar apenas os críticos
    let equipamentosCriticos = equipamentos.filter((eq: any) =>
      criticalIds.includes(eq.Id)
    );

    // Filtrar por setores se fornecido (usando nomes de setores diretamente da API)
    if (setoresFilter && setoresFilter.length > 0) {
      // Buscar nomes dos setores do sistema para fazer o filtro
      const sectorsRes = await fetch(`${req.protocol}://${req.get('host')}/api/ecm/investments/sectors/list`);
      const sectorsData = sectorsRes.ok ? await sectorsRes.json() : { sectors: [] };
      const sectorNames = new Set(
        sectorsData.sectors
          ?.filter((s: any) => setoresFilter.includes(s.id))
          .map((s: any) => s.name.toLowerCase()) || []
      );

      if (sectorNames.size > 0) {
        equipamentosCriticos = equipamentosCriticos.filter((eq: any) => {
          const eqSetor = (eq.Setor || eq.setor || eq.SETOR || '').trim().toLowerCase();
          return eqSetor && sectorNames.has(eqSetor);
        });
        console.log('[critical:equipamentos] Filtro de setores:', Array.from(sectorNames));
        console.log('[critical:equipamentos] Equipamentos críticos filtrados:', equipamentosCriticos.length);
      }
    }

    // Buscar custos e KPIs
    const { getEquipmentCosts } = await import('../services/equipmentCostService');
    const costsMap = await getEquipmentCosts();

    // Buscar KPIs de uptime individuais
    const { getEquipmentUptimeKpis } = await import('../services/uptimeKpiService');

    // Enriquecer com custos e KPIs de uptime
    const equipamentosComDados = await Promise.all(
      equipamentosCriticos.map(async (eq: any) => {
        const cost = costsMap.get(eq.Id);
        const uptimeKpis = await getEquipmentUptimeKpis(eq.Id, year);
        
        // Calcular uptime médio do ano (se houver dados)
        const uptimeMedio =
          uptimeKpis.length > 0
            ? uptimeKpis.reduce((acc, kpi) => acc + kpi.uptimePercent, 0) / uptimeKpis.length
            : null;

        return {
          ...eq,
          ValorGasto: cost ? cost.totalGasto.toFixed(2) : '0.00',
          QuantidadeOS: cost ? cost.quantidadeOS : 0,
          IsCritical: true,
          UptimeMedio: uptimeMedio,
          UptimeKpis: uptimeKpis,
        };
      })
    );

    // Salvar no cache (apenas se não for mock)
    if (!USE_MOCK && equipamentosComDados) {
      await setCache(cacheKey, equipamentosComDados);
      console.log('[critical:equipamentos] Dados salvos no cache');
    }

    res.json(equipamentosComDados);
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

critical.get('/equipamentos/:effortId/uptime', async (req, res) => {
  try {
    const { effortId } = req.params;
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const cacheKey = generateCacheKey('critical:equipamento-uptime', { effortId: Number(effortId), year });
    
    // Tentar buscar do cache primeiro
    let cachedData: any = null;
    const USE_MOCK = process.env.USE_MOCK === 'true';
    if (!USE_MOCK) {
      cachedData = await getCache<any>(cacheKey, CACHE_TTL);
      if (cachedData) {
        console.log('[critical:equipamento-uptime] Dados carregados do cache');
        return res.json(cachedData);
      }
    }
    
    const { getEquipmentUptimeKpis } = await import('../services/uptimeKpiService');
    const kpis = await getEquipmentUptimeKpis(Number(effortId), year);
    
    // Salvar no cache (apenas se não for mock)
    if (!USE_MOCK && kpis) {
      await setCache(cacheKey, kpis);
      console.log('[critical:equipamento-uptime] Dados salvos no cache');
    }
    
    res.json(kpis);
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

critical.get('/uptime/aggregated', async (req, res) => {
  try {
    const flags = await readFlags();
    const criticalIds = Object.keys(flags.criticalFlags)
      .map(Number)
      .filter((id) => flags.criticalFlags[String(id)] === true);
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const setoresFilter = req.query.setores 
      ? (req.query.setores as string).split(',').map(s => parseInt(s.trim())).filter(Boolean)
      : null;
    
    const cacheKey = generateCacheKey('critical:uptime-aggregated', { criticalIds, year, setoresFilter });
    
    // Tentar buscar do cache primeiro
    let cachedData: any = null;
    const USE_MOCK = process.env.USE_MOCK === 'true';
    if (!USE_MOCK) {
      cachedData = await getCache<any>(cacheKey, CACHE_TTL);
      if (cachedData) {
        console.log('[critical:uptime-aggregated] Dados carregados do cache');
        return res.json(cachedData);
      }
    }
    
    const { getAggregatedUptimeKpi } = await import('../services/uptimeKpiService');
    let aggregated = await getAggregatedUptimeKpi(criticalIds, year);
    
    // Filtrar por setores se fornecido
    if (setoresFilter && setoresFilter.length > 0 && aggregated) {
      // Buscar equipamentos para filtrar
      const { dataSource } = await import('../adapters/dataSource');
      const equipamentos = await dataSource.equipamentos({
        apenasAtivos: true,
        incluirComponentes: false,
        incluirCustoSubstituicao: false,
      });

      // Buscar nomes dos setores do sistema para fazer o filtro
      const sectorsRes = await fetch(`${req.protocol}://${req.get('host')}/api/ecm/investments/sectors/list`);
      const sectorsData = sectorsRes.ok ? await sectorsRes.json() : { sectors: [] };
      const sectorNames = new Set(
        sectorsData.sectors
          ?.filter((s: any) => setoresFilter.includes(s.id))
          .map((s: any) => s.name.toLowerCase()) || []
      );

      const equipamentosPermitidos = new Set<number>();
      if (sectorNames.size > 0) {
        equipamentos.forEach((eq: any) => {
          const eqSetor = (eq.Setor || eq.setor || eq.SETOR || '').trim().toLowerCase();
          if (eqSetor && sectorNames.has(eqSetor) && eq.Id && criticalIds.includes(eq.Id)) {
            equipamentosPermitidos.add(eq.Id);
          }
        });
      }

      // Filtrar dados agregados baseados em equipamentos dos setores permitidos
      if (Array.isArray(aggregated)) {
        aggregated = aggregated.filter((item: any) => {
          return item.effortId && equipamentosPermitidos.has(item.effortId);
        });
      }
    }
    
    // Salvar no cache (apenas se não for mock)
    if (!USE_MOCK && aggregated) {
      await setCache(cacheKey, aggregated);
      console.log('[critical:uptime-aggregated] Dados salvos no cache');
    }
    
    res.json(aggregated);
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

critical.post('/equipamentos/:effortId/uptime', async (req, res) => {
  try {
    const { effortId } = req.params;
    const { year, month, uptimePercent, horasFuncionando, horasParado } = req.body;
    
    const { saveEquipmentUptimeKpi } = await import('../services/uptimeKpiService');
    const { dataSource } = await import('../adapters/dataSource');
    
    // Buscar dados do equipamento
    const equipamentos = await dataSource.equipamentos({
      apenasAtivos: true,
      incluirComponentes: false,
      incluirCustoSubstituicao: true,
    });
    const equipamento = equipamentos.find((e: any) => e.Id === Number(effortId));
    
    if (!equipamento) {
      return res.status(404).json({ error: true, message: 'Equipamento não encontrado' });
    }

    const horasTotais = horasFuncionando + horasParado;
    const kpi = {
      effortId: Number(effortId),
      tag: equipamento.Tag,
      equipamento: equipamento.Equipamento,
      year: Number(year),
      month: Number(month),
      uptimePercent: Number(uptimePercent),
      horasFuncionando: Number(horasFuncionando),
      horasParado: Number(horasParado),
      horasTotais,
    };

    await saveEquipmentUptimeKpi(kpi);
    res.json({ ok: true, kpi });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

critical.patch('/:effortId/replace', async (req, res) => {
  try {
    const { effortId } = req.params;
    const { replaceFlag, replaceReason, replaceNotes } = req.body;
    res.json({ ok: true, effortId, replaceFlag, replaceReason, replaceNotes });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

critical.patch('/:effortId/inspect', async (req, res) => {
  try {
    const { effortId } = req.params;
    const { inspected } = req.body;
    res.json({
      ok: true,
      effortId,
      inspected,
      inspectedAt: inspected ? new Date().toISOString() : null,
      inspectedBy: 'mock-user',
    });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

