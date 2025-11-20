// src/routes/config.ts
import { Router } from 'express';
import * as fs from 'node:fs/promises';

const USE_MOCK = process.env.USE_MOCK === 'true';

let prisma: any = null;
async function getPrisma() {
  if (!prisma && !USE_MOCK) {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

export const config = Router();

// ========== SETOR MAPPING (De-Para de Setores) ==========

// GET /api/config/sectors/effort - Listar setores únicos da API do Effort (equipamentos e OS)
config.get('/sectors/effort', async (req, res) => {
  try {
    const { dataSource } = await import('../adapters/dataSource');
    
    console.log('[config:sectors/effort] Iniciando busca de setores...');
    
    // Buscar equipamentos e OS para extrair setores únicos
    let equipamentosData: any = null;
    let osData: any = null;
    
    try {
      equipamentosData = await dataSource.equipamentos({
        apenasAtivos: false, // Buscar todos, não apenas ativos
        incluirComponentes: true,
        incluirCustoSubstituicao: false,
      });
      console.log('[config:sectors/effort] Equipamentos recebidos:', {
        isArray: Array.isArray(equipamentosData),
        hasItens: !!(equipamentosData as any)?.Itens,
        hasData: !!(equipamentosData as any)?.data,
        type: typeof equipamentosData,
        length: Array.isArray(equipamentosData) ? equipamentosData.length : 'N/A',
      });
    } catch (err: any) {
      console.error('[config:sectors/effort] Erro ao buscar equipamentos:', err?.message);
      console.error('[config:sectors/effort] Stack:', err?.stack);
      equipamentosData = [];
    }
    
    try {
      osData = await dataSource.osResumida({
        tipoManutencao: 'Todos',
        periodo: 'AnoCorrente',
        pagina: 0,
        qtdPorPagina: 10000,
      });
      console.log('[config:sectors/effort] OS recebidas:', {
        isArray: Array.isArray(osData),
        hasItens: !!(osData as any)?.Itens,
        hasData: !!(osData as any)?.data,
        type: typeof osData,
      });
    } catch (err: any) {
      console.error('[config:sectors/effort] Erro ao buscar OS:', err?.message);
      osData = [];
    }

    // Processar equipamentos
    const equipamentosArray = Array.isArray(equipamentosData) 
      ? equipamentosData 
      : (equipamentosData as any)?.Itens || (equipamentosData as any)?.data || (equipamentosData as any)?.items || [];
    
    // Processar OS
    const osArray = Array.isArray(osData)
      ? osData
      : (osData as any)?.Itens || (osData as any)?.data || (osData as any)?.items || [];

    console.log('[config:sectors/effort] Processamento:', {
      equipamentosCount: equipamentosArray.length,
      osCount: osArray.length,
      primeiroEquipamento: equipamentosArray[0] ? Object.keys(equipamentosArray[0]) : [],
      primeiraOS: osArray[0] ? Object.keys(osArray[0]) : [],
    });

    // Extrair setores únicos de equipamentos
    const setoresEquipamentos = new Map<string, { name: string; id?: number; source: string }>();
    equipamentosArray.forEach((eq: any) => {
      // Tentar diferentes variações do campo Setor
      const setorNome = eq.Setor?.trim() || eq.setor?.trim() || eq.SETOR?.trim() || '';
      const setorId = eq.SetorId || eq.setorId || eq.SETOR_ID || eq.SetorCodigo || eq.setorCodigo;
      
      if (setorNome && setorNome !== '') {
        const key = `${setorNome}|${setorId || ''}`;
        if (!setoresEquipamentos.has(key)) {
          setoresEquipamentos.set(key, {
            name: setorNome,
            id: setorId ? Number(setorId) : undefined,
            source: 'equipamentos',
          });
        }
      }
    });

    // Extrair setores únicos de OS
    const setoresOS = new Map<string, { name: string; id?: number; source: string }>();
    osArray.forEach((os: any) => {
      // Tentar diferentes variações do campo Setor
      const setorNome = os.Setor?.trim() || os.setor?.trim() || os.SETOR?.trim() || '';
      const setorId = os.SetorId || os.setorId || os.SETOR_ID || os.SetorCodigo || os.setorCodigo;
      
      if (setorNome && setorNome !== '') {
        const key = `${setorNome}|${setorId || ''}`;
        if (!setoresOS.has(key)) {
          setoresOS.set(key, {
            name: setorNome,
            id: setorId ? Number(setorId) : undefined,
            source: 'os',
          });
        }
      }
    });

    console.log('[config:sectors/effort] Setores extraídos:', {
      equipamentos: setoresEquipamentos.size,
      os: setoresOS.size,
    });

    // Combinar e marcar setores que aparecem em ambos
    const setoresCombinados = new Map<string, { name: string; id?: number; sources: string[] }>();
    
    setoresEquipamentos.forEach((setor, key) => {
      setoresCombinados.set(key, {
        name: setor.name,
        id: setor.id,
        sources: [setor.source],
      });
    });

    setoresOS.forEach((setor, key) => {
      if (setoresCombinados.has(key)) {
        const existente = setoresCombinados.get(key)!;
        if (!existente.sources.includes(setor.source)) {
          existente.sources.push(setor.source);
        }
      } else {
        setoresCombinados.set(key, {
          name: setor.name,
          id: setor.id,
          sources: [setor.source],
        });
      }
    });

    // Converter para array e ordenar
    const setoresArray = Array.from(setoresCombinados.values())
      .map((s) => ({
        name: s.name,
        id: s.id,
        source: s.sources.includes('equipamentos') && s.sources.includes('os') ? 'both' : s.sources[0],
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    console.log('[config:sectors/effort] Setores finais:', {
      total: setoresArray.length,
      amostra: setoresArray.slice(0, 5),
    });

    res.json({
      success: true,
      total: setoresArray.length,
      sectors: setoresArray,
    });
  } catch (e: any) {
    console.error('[config:sectors/effort] Erro:', e);
    console.error('[config:sectors/effort] Stack:', e?.stack);
    res.status(500).json({ 
      error: true, 
      message: e?.message || 'Erro ao buscar setores da API do Effort',
      details: process.env.NODE_ENV === 'development' ? e?.stack : undefined,
    });
  }
});

// GET /api/config/sectors/mappings - Listar mapeamentos de setores
config.get('/sectors/mappings', async (req, res) => {
  try {
    if (USE_MOCK) {
      return res.json({ success: true, mappings: [] });
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Prisma não disponível' });
    }

    const mappings = await prismaClient.sectorMapping.findMany({
      where: {
        active: true,
      },
      orderBy: [
        { effortSectorName: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({
      success: true,
      total: mappings.length,
      mappings,
    });
  } catch (e: any) {
    console.error('[config:sectors/mappings] Erro:', e);
    res.status(500).json({ error: true, message: e?.message || 'Erro ao buscar mapeamentos' });
  }
});

// POST /api/config/sectors/mappings - Criar ou atualizar mapeamento
config.post('/sectors/mappings', async (req, res) => {
  try {
    const { effortSectorName, effortSectorId, systemSectorId, systemSectorName, source } = req.body;

    if (!effortSectorName || !systemSectorId) {
      return res.status(400).json({ error: true, message: 'effortSectorName e systemSectorId são obrigatórios' });
    }

    if (USE_MOCK) {
      return res.json({ success: true, message: 'Mapeamento criado (mock)' });
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Prisma não disponível' });
    }

    // Buscar nome do setor do sistema se não fornecido
    let finalSystemSectorName = systemSectorName;
    if (!finalSystemSectorName) {
      const userSector = await prismaClient.userSector.findFirst({
        where: { sectorId: systemSectorId },
        select: { sectorName: true },
      });
      finalSystemSectorName = userSector?.sectorName || `Setor ${systemSectorId}`;
    }

    // Verificar se já existe mapeamento
    const existing = await prismaClient.sectorMapping.findFirst({
      where: {
        effortSectorName,
        effortSectorId: effortSectorId || null,
        systemSectorId,
        active: true,
      },
    });

    if (existing) {
      // Atualizar existente
      const updated = await prismaClient.sectorMapping.update({
        where: { id: existing.id },
        data: {
          effortSectorId: effortSectorId || null,
          systemSectorName: finalSystemSectorName,
          source: source || 'both',
          updatedAt: new Date(),
        },
      });
      return res.json({ success: true, mapping: updated });
    } else {
      // Criar novo
      const created = await prismaClient.sectorMapping.create({
        data: {
          effortSectorName,
          effortSectorId: effortSectorId || null,
          systemSectorId,
          systemSectorName: finalSystemSectorName,
          source: source || 'both',
          active: true,
        },
      });
      // Invalidar cache de mapeamentos
      const { invalidateMappingsCache } = await import('../utils/sectorMappingService');
      invalidateMappingsCache();
      
      return res.json({ success: true, mapping: created });
    }
  } catch (e: any) {
    console.error('[config:sectors/mappings:POST] Erro:', e);
    res.status(500).json({ error: true, message: e?.message || 'Erro ao salvar mapeamento' });
  }
});

// DELETE /api/config/sectors/mappings/:id - Deletar mapeamento
config.delete('/sectors/mappings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (USE_MOCK) {
      return res.json({ success: true, message: 'Mapeamento deletado (mock)' });
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Prisma não disponível' });
    }

    await prismaClient.sectorMapping.update({
      where: { id },
      data: { active: false },
    });

    // Invalidar cache de mapeamentos
    const { invalidateMappingsCache } = await import('../utils/sectorMappingService');
    invalidateMappingsCache();

    res.json({ success: true, message: 'Mapeamento removido' });
  } catch (e: any) {
    console.error('[config:sectors/mappings:DELETE] Erro:', e);
    res.status(500).json({ error: true, message: e?.message || 'Erro ao remover mapeamento' });
  }
});

// GET /api/config/maintenance-types - Listar tipos de manutenção configurados
config.get('/maintenance-types', async (req, res) => {
  try {
    if (USE_MOCK) {
      // Dados mockados para desenvolvimento
      return res.json([
        { id: '1', category: 'maintenance_type', key: 'Corretiva', value: 'corretiva', active: true },
        { id: '2', category: 'maintenance_type', key: 'Preventiva', value: 'preventiva', active: true },
        { id: '3', category: 'maintenance_type', key: 'Calibração', value: 'calibracao', active: true },
      ]);
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Prisma não disponível' });
    }

    const configs = await prismaClient.systemConfig.findMany({
      where: {
        category: 'maintenance_type',
        active: true,
      },
      orderBy: {
        key: 'asc',
      },
    });

    res.json(configs);
  } catch (e: any) {
    console.error('[config:maintenance-types] Erro:', e);
    res.status(500).json({ error: true, message: e?.message || 'Erro ao buscar tipos de manutenção' });
  }
});

// GET /api/config/maintenance-types/all - Listar todos os tipos encontrados nas OS (para classificação)
config.get('/maintenance-types/all', async (req, res) => {
  try {
    const { dataSource } = await import('../adapters/dataSource');
    
    // Buscar todas as OS para extrair tipos únicos
    const osData = await dataSource.osResumida({
      tipoManutencao: 'Todos',
      periodo: 'AnoCorrente',
      pagina: 0,
      qtdPorPagina: 10000,
    });

    let osArray: any[] = [];
    if (Array.isArray(osData)) {
      osArray = osData;
    } else if (osData && typeof osData === 'object') {
      osArray = (osData as any).Itens || (osData as any).data || (osData as any).items || [];
    }

    // Extrair tipos únicos
    const tiposUnicos = new Set<string>();
    osArray.forEach((os: any) => {
      const tipo = os.TipoDeManutencao || os.TipoManutencao;
      if (tipo && tipo.trim() !== '') {
        tiposUnicos.add(tipo.trim());
      }
    });

    // Buscar configurações existentes
    let configs: any[] = [];
    if (!USE_MOCK) {
      const prismaClient = await getPrisma();
      if (prismaClient) {
        configs = await prismaClient.systemConfig.findMany({
          where: {
            category: 'maintenance_type',
          },
        });
      }
    }

    // Criar mapa de configurações por key
    const configMap = new Map<string, any>();
    configs.forEach((config) => {
      configMap.set(config.key, config);
    });

    // Montar lista com tipos encontrados e suas classificações
    const tipos = Array.from(tiposUnicos)
      .sort()
      .map((tipo) => {
        const config = configMap.get(tipo);
        return {
          key: tipo,
          value: config?.value || null,
          active: config?.active ?? true,
          id: config?.id || null,
          category: 'maintenance_type',
        };
      });

    res.json(tipos);
  } catch (e: any) {
    console.error('[config:maintenance-types/all] Erro:', e);
    res.status(500).json({ error: true, message: e?.message || 'Erro ao buscar tipos de manutenção' });
  }
});

// POST /api/config/maintenance-types - Criar ou atualizar classificação de tipo de manutenção
config.post('/maintenance-types', async (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key || !value) {
      return res.status(400).json({ error: true, message: 'key e value são obrigatórios' });
    }

    if (!['corretiva', 'preventiva', 'aguardando_compras'].includes(value.toLowerCase())) {
      return res.status(400).json({ error: true, message: 'value deve ser "corretiva", "preventiva" ou "aguardando_compras"' });
    }

    if (USE_MOCK) {
      return res.json({
        id: `mock-${Date.now()}`,
        category: 'maintenance_type',
        key,
        value: value.toLowerCase(),
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Prisma não disponível' });
    }

    const config = await prismaClient.systemConfig.upsert({
      where: {
        category_key: {
          category: 'maintenance_type',
          key,
        },
      },
      update: {
        value: value.toLowerCase(),
        updatedAt: new Date(),
      },
      create: {
        category: 'maintenance_type',
        key,
        value: value.toLowerCase(),
        active: true,
      },
    });

    res.json(config);
  } catch (e: any) {
    console.error('[config:maintenance-types] Erro:', e);
    res.status(500).json({ error: true, message: e?.message || 'Erro ao salvar configuração' });
  }
});

// DELETE /api/config/maintenance-types/:id - Desativar configuração
config.delete('/maintenance-types/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (USE_MOCK) {
      return res.json({ success: true });
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Prisma não disponível' });
    }

    await prismaClient.systemConfig.update({
      where: { id },
      data: { active: false },
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error('[config:maintenance-types] Erro:', e);
    res.status(500).json({ error: true, message: e?.message || 'Erro ao desativar configuração' });
  }
});

// GET /api/config/workshops/all - Listar todas as oficinas encontradas nas OS (para seleção)
config.get('/workshops/all', async (req, res) => {
  try {
    const { dataSource } = await import('../adapters/dataSource');
    
    // Buscar todas as OS para extrair oficinas únicas
    const osData = await dataSource.osResumida({
      tipoManutencao: 'Todos',
      periodo: 'AnoCorrente',
      pagina: 0,
      qtdPorPagina: 10000,
    });

    let osArray: any[] = [];
    if (Array.isArray(osData)) {
      osArray = osData;
    } else if (osData && typeof osData === 'object') {
      osArray = (osData as any).Itens || (osData as any).data || (osData as any).items || [];
    }

    // Extrair oficinas únicas
    const oficinasUnicas = new Set<string>();
    osArray.forEach((os: any) => {
      const oficina = os.Oficina;
      if (oficina && oficina.trim() !== '') {
        oficinasUnicas.add(oficina.trim());
      }
    });

    // Buscar configurações existentes
    let configs: any[] = [];
    if (!USE_MOCK) {
      const prismaClient = await getPrisma();
      if (prismaClient) {
        configs = await prismaClient.systemConfig.findMany({
          where: {
            category: 'workshop',
          },
        });
      }
    }

    // Criar mapa de configurações por key
    const configMap = new Map<string, any>();
    configs.forEach((config) => {
      configMap.set(config.key, config);
    });

    // Montar lista com oficinas encontradas e suas configurações
    const oficinas = Array.from(oficinasUnicas)
      .sort()
      .map((oficina) => {
        const config = configMap.get(oficina);
        return {
          key: oficina,
          value: config?.value === 'enabled' ? 'enabled' : null,
          active: config?.active ?? true,
          id: config?.id || null,
          category: 'workshop',
        };
      });

    res.json(oficinas);
  } catch (e: any) {
    console.error('[config:workshops/all] Erro:', e);
    res.status(500).json({ error: true, message: e?.message || 'Erro ao buscar oficinas' });
  }
});

// POST /api/config/workshops - Criar ou atualizar configuração de oficina
config.post('/workshops', async (req, res) => {
  try {
    const { key, enabled } = req.body;

    if (!key || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: true, message: 'key e enabled são obrigatórios' });
    }

    if (USE_MOCK) {
      return res.json({
        id: `mock-${Date.now()}`,
        category: 'workshop',
        key,
        value: enabled ? 'enabled' : 'disabled',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Prisma não disponível' });
    }

    const config = await prismaClient.systemConfig.upsert({
      where: {
        category_key: {
          category: 'workshop',
          key,
        },
      },
      update: {
        value: enabled ? 'enabled' : 'disabled',
        active: enabled,
        updatedAt: new Date(),
      },
      create: {
        category: 'workshop',
        key,
        value: enabled ? 'enabled' : 'disabled',
        active: enabled,
      },
    });

    // Invalidar cache de oficinas após salvar
    const { invalidateWorkshopCache } = await import('../services/workshopFilterService');
    invalidateWorkshopCache();

    res.json(config);
  } catch (e: any) {
    console.error('[config:workshops] Erro:', e);
    res.status(500).json({ error: true, message: e?.message || 'Erro ao salvar configuração' });
  }
});

