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

