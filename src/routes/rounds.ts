// src/routes/rounds.ts
import { Router } from 'express';
import { getRoundsResumo } from '../services/roundService';
import { getCache, setCache, generateCacheKey } from '../services/cacheService';
import { filterOSByWorkshop } from '../services/workshopFilterService';
import fs from 'node:fs/promises';
import path from 'node:path';

const USE_MOCK = process.env.USE_MOCK === 'true';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

// Cache para tipos de manutenção (evita múltiplas queries)
declare global {
  var _maintenanceTypesCache: any[] | undefined;
}

// Lazy load Prisma apenas quando necessário (modo não-mock)
let prisma: any = null;
async function getPrisma() {
  if (!prisma && !USE_MOCK) {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

export const rounds = Router();

const MOCK_FILE = path.join(process.cwd(), 'mocks', 'rounds.json');

// Ler rondas do mock
async function readMockRounds() {
  try {
    const buf = await fs.readFile(MOCK_FILE, 'utf-8');
    const parsed = JSON.parse(buf);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return [];
    }
    console.error('Erro ao ler rondas do mock:', err?.message);
    return [];
  }
}

// Salvar rondas no mock
async function saveMockRounds(data: any[]) {
  try {
    const dir = path.dirname(MOCK_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(MOCK_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err: any) {
    console.error('Erro ao salvar rondas no mock:', err?.message);
    throw err;
  }
}

// GET /api/ecm/rounds - Listar rondas (resumo)
rounds.get('/', async (req, res) => {
  try {
    if (USE_MOCK) {
      const rounds = await readMockRounds();
      console.log(`[rounds:GET] Retornando ${rounds.length} rondas do mock`);
      res.json(rounds);
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      // Buscar todas as rondas do banco de dados
      const allRounds = await prismaClient.sectorRound.findMany({
        orderBy: {
          weekStart: 'desc',
        },
      });

      console.log(`[rounds:GET] Retornando ${allRounds.length} rondas do banco de dados`);
      res.json(allRounds);
    }
  } catch (e: any) {
    console.error('[rounds:GET] Erro ao buscar rondas:', e);
    res.status(500).json({ error: true, message: e?.message });
  }
});

// GET /api/ecm/rounds/:id - Buscar ronda por ID
rounds.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (USE_MOCK) {
      const rounds = await readMockRounds();
      const round = rounds.find((r: any) => r.id === id);
      if (!round) {
        return res.status(404).json({ error: true, message: 'Ronda não encontrada' });
      }
      res.json(round);
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      const round = await prismaClient.sectorRound.findUnique({
        where: { id },
      });

      if (!round) {
        return res.status(404).json({ error: true, message: 'Ronda não encontrada' });
      }

      res.json(round);
    }
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// POST /api/ecm/rounds - Criar nova ronda
rounds.post('/', async (req, res) => {
  try {
    const {
      sectorId,
      sectorName,
      weekStart,
      responsibleId,
      responsibleName,
      notes,
      purchaseRequestIds = [],
      osIds = [],
      investmentIds = [],
    } = req.body;

    if (!sectorId || !sectorName || !weekStart || !responsibleName) {
      return res.status(400).json({
        error: true,
        message: 'Campos obrigatórios: sectorId, sectorName, weekStart, responsibleName',
      });
    }
    
    // Se não tiver responsibleId mas tiver responsibleName, tentar buscar o ID
    let finalResponsibleId = responsibleId;
    if (!finalResponsibleId && responsibleName) {
      try {
        const prismaClient = await getPrisma();
        if (prismaClient) {
          const user = await prismaClient.user.findFirst({
            where: {
              name: { contains: responsibleName, mode: 'insensitive' },
            },
          });
          if (user) {
            finalResponsibleId = user.id;
          }
        }
      } catch (err) {
        console.warn('Não foi possível buscar ID do responsável pelo nome:', err);
      }
    }

    // Normalizar weekStart para o início da semana (segunda-feira, 00:00:00)
    // Isso garante que rondas da mesma semana sejam agrupadas corretamente
    const weekStartDate = new Date(weekStart);
    const dayOfWeek = weekStartDate.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Ajustar para segunda-feira
    const normalizedWeekStart = new Date(weekStartDate);
    normalizedWeekStart.setDate(weekStartDate.getDate() + daysToMonday);
    normalizedWeekStart.setHours(0, 0, 0, 0); // Zerar horas, minutos, segundos e milissegundos
    
    console.log('[rounds:POST] Data original:', weekStart, '→ Normalizada:', normalizedWeekStart.toISOString());

    // Calcular contadores de OS
    let openOsCount = 0;
    let closedOsCount = 0;

    if (osIds && osIds.length > 0) {
      try {
        const { dataSource } = await import('../adapters/dataSource');
        let osData = await dataSource.osResumida({
          tipoManutencao: 'Todos',
          periodo: 'MesCorrente',
        });
        
        // Aplicar filtro de oficinas habilitadas
        osData = await filterOSByWorkshop(osData);

        osIds.forEach((osId: number) => {
          const os = osData.find((o: any) => o.CodigoSerialOS === osId);
          if (os) {
            if (os.SituacaoDaOS === 'Aberta') {
              openOsCount++;
            } else if (os.SituacaoDaOS === 'Fechada') {
              closedOsCount++;
            }
          }
        });
      } catch (err) {
        console.error('Erro ao calcular contadores de OS:', err);
      }
    }

    if (USE_MOCK) {
      const rounds = await readMockRounds();
      // Se não tiver responsibleId mas tiver responsibleName, usar string vazia
      const finalResponsibleId = responsibleId || '';
      
      // Normalizar weekStart para o início da semana (segunda-feira, 00:00:00)
      const weekStartDate = new Date(weekStart);
      const dayOfWeek = weekStartDate.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const normalizedWeekStart = new Date(weekStartDate);
      normalizedWeekStart.setDate(weekStartDate.getDate() + daysToMonday);
      normalizedWeekStart.setHours(0, 0, 0, 0);
      
      // Verificar se já existe uma ronda para este setor nesta semana
      const existingRound = rounds.find((r: any) => {
        const rWeekStart = new Date(r.weekStart);
        return r.sectorId === Number(sectorId) && 
               rWeekStart.getTime() === normalizedWeekStart.getTime();
      });
      
      if (existingRound) {
        return res.status(400).json({
          error: true,
          message: 'Já existe uma ronda para este setor nesta semana. Escolha outra semana ou edite a ronda existente.',
        });
      }
      
      const newRound = {
        id: `round-${Date.now()}`,
        sectorId: Number(sectorId),
        sectorName,
        weekStart: normalizedWeekStart.toISOString(),
        responsibleId: finalResponsibleId,
        responsibleName: responsibleName || null,
        openOsCount,
        closedOsCount,
        notes: notes || null,
        purchaseRequestIds: JSON.stringify(purchaseRequestIds),
        osIds: JSON.stringify(osIds),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      rounds.push(newRound);
      await saveMockRounds(rounds);

      res.status(201).json(newRound);
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      console.log('[rounds:POST] Criando ronda com dados:', {
        sectorId: Number(sectorId),
        sectorName,
        weekStart: normalizedWeekStart,
        responsibleId: finalResponsibleId || '',
        responsibleName,
        openOsCount,
        closedOsCount,
      });

      try {
        const round = await prismaClient.sectorRound.create({
          data: {
            sectorId: Number(sectorId),
            sectorName,
            weekStart: normalizedWeekStart,
            responsibleId: finalResponsibleId || '',
            responsibleName,
            openOsCount,
            closedOsCount,
            notes: notes || null,
            purchaseRequestIds: JSON.stringify(purchaseRequestIds),
            osIds: JSON.stringify(osIds),
          },
        });

        console.log('[rounds:POST] Ronda criada com sucesso:', round.id);
        
        // Vincular investimentos à ronda
        if (investmentIds && investmentIds.length > 0) {
          await prismaClient.investment.updateMany({
            where: {
              id: { in: investmentIds },
            },
            data: {
              sectorRoundId: round.id,
            },
          });
        }

        res.status(201).json(round);
      } catch (createError: any) {
        console.error('[rounds:POST] Erro ao criar ronda:', createError);
        
        // Verificar se é erro de constraint única (ronda já existe para setor/semana)
        if (createError.code === 'P2002') {
          return res.status(400).json({
            error: true,
            message: 'Já existe uma ronda para este setor nesta semana. Escolha outra semana ou edite a ronda existente.',
          });
        }
        
        throw createError; // Re-throw para ser capturado pelo catch externo
      }
    }
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// PATCH /api/ecm/rounds/:id - Atualizar ronda
rounds.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[rounds:PATCH] Atualizando ronda:', id);
    console.log('[rounds:PATCH] Body recebido:', req.body);
    
    const {
      sectorId,
      sectorName,
      weekStart,
      responsibleId,
      responsibleName,
      notes,
      purchaseRequestIds,
      osIds,
      investmentIds,
    } = req.body;

    if (USE_MOCK) {
      const rounds = await readMockRounds();
      const index = rounds.findIndex((r: any) => r.id === id);
      if (index === -1) {
        return res.status(404).json({ error: true, message: 'Ronda não encontrada' });
      }

      // Recalcular contadores se osIds mudou
      let openOsCount = rounds[index].openOsCount;
      let closedOsCount = rounds[index].closedOsCount;

      if (osIds !== undefined && osIds.length > 0) {
        try {
          const { dataSource } = await import('../adapters/dataSource');
          let osData = await dataSource.osResumida({
            tipoManutencao: 'Todos',
            periodo: 'MesCorrente',
          });
          
          // Aplicar filtro de oficinas habilitadas
          osData = await filterOSByWorkshop(osData);

          openOsCount = 0;
          closedOsCount = 0;
          osIds.forEach((osId: number) => {
            const os = osData.find((o: any) => o.CodigoSerialOS === osId);
            if (os) {
              if (os.SituacaoDaOS === 'Aberta') {
                openOsCount++;
              } else if (os.SituacaoDaOS === 'Fechada') {
                closedOsCount++;
              }
            }
          });
        } catch (err) {
          console.error('Erro ao recalcular contadores de OS:', err);
        }
      }

      const updated = {
        ...rounds[index],
        ...(sectorId !== undefined && { sectorId: Number(sectorId) }),
        ...(sectorName !== undefined && { sectorName }),
        ...(weekStart !== undefined && { weekStart: new Date(weekStart).toISOString() }),
        ...(responsibleId !== undefined && { responsibleId }),
        ...(responsibleName !== undefined && { responsibleName }),
        ...(notes !== undefined && { notes }),
        ...(purchaseRequestIds !== undefined && { purchaseRequestIds: JSON.stringify(purchaseRequestIds) }),
        ...(osIds !== undefined && { osIds: JSON.stringify(osIds) }),
        ...(osIds !== undefined && { openOsCount, closedOsCount }),
        updatedAt: new Date().toISOString(),
      };

      rounds[index] = updated;
      await saveMockRounds(rounds);

      res.json(updated);
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      const updateData: any = {};
      if (sectorId !== undefined) updateData.sectorId = Number(sectorId);
      if (sectorName !== undefined) updateData.sectorName = sectorName;
      if (weekStart !== undefined) updateData.weekStart = new Date(weekStart);
      if (responsibleId !== undefined) updateData.responsibleId = responsibleId;
      if (responsibleName !== undefined) updateData.responsibleName = responsibleName;
      if (notes !== undefined) updateData.notes = notes;
      if (purchaseRequestIds !== undefined) updateData.purchaseRequestIds = JSON.stringify(purchaseRequestIds);
      if (osIds !== undefined) updateData.osIds = JSON.stringify(osIds);

      const round = await prismaClient.sectorRound.update({
        where: { id },
        data: updateData,
      });

      // Atualizar vínculos de investimentos
      if (investmentIds !== undefined) {
        console.log('[rounds:PATCH] Atualizando vínculos de investimentos:', investmentIds);
        
        // Primeiro, remover vínculos de investimentos que não estão mais na lista
        await prismaClient.investment.updateMany({
          where: {
            sectorRoundId: id,
            id: { notIn: investmentIds },
          },
          data: {
            sectorRoundId: null,
          },
        });

        // Depois, vincular os investimentos selecionados
        if (investmentIds.length > 0) {
          await prismaClient.investment.updateMany({
            where: {
              id: { in: investmentIds },
            },
            data: {
              sectorRoundId: id,
            },
          });
        }
        
        console.log('[rounds:PATCH] Vínculos de investimentos atualizados');
      }

      res.json(round);
    }
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// DELETE /api/ecm/rounds/:id - Deletar ronda
rounds.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (USE_MOCK) {
      const rounds = await readMockRounds();
      const filtered = rounds.filter((r: any) => r.id !== id);
      if (filtered.length === rounds.length) {
        return res.status(404).json({ error: true, message: 'Ronda não encontrada' });
      }
      await saveMockRounds(filtered);
      res.json({ success: true });
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      await prismaClient.sectorRound.delete({
        where: { id },
      });

      res.json({ success: true });
    }
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// GET /api/ecm/rounds/history - Histórico de rondas
rounds.get('/history', async (req, res) => {
  try {
    const sectorId = req.query.sectorId ? Number(req.query.sectorId) : undefined;

    if (USE_MOCK) {
      let rounds = await readMockRounds();
      if (sectorId) {
        rounds = rounds.filter((r: any) => r.sectorId === sectorId);
      }
      console.log(`[rounds:history] Retornando ${rounds.length} rondas do mock${sectorId ? ` para setor ${sectorId}` : ''}`);
      res.json(rounds.sort((a: any, b: any) => new Date(b.weekStart || b.createdAt || 0).getTime() - new Date(a.weekStart || a.createdAt || 0).getTime()));
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      const where: any = {};
      if (sectorId) where.sectorId = sectorId;

      const data = await prismaClient.sectorRound.findMany({
        where,
        orderBy: { weekStart: 'desc' },
      });

      console.log(`[rounds:history] Retornando ${data.length} rondas do banco${sectorId ? ` para setor ${sectorId}` : ''}`);
      res.json(data);
    }
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// GET /api/ecm/rounds/summary - Resumo de rondas
rounds.get('/summary', async (_req, res) => {
  try {
    const resumo = await getRoundsResumo();
    res.json(resumo);
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// Função auxiliar para verificar se uma OS é corretiva (reutilizada do dashboard.ts)
async function isOSCorretiva(os: any): Promise<boolean> {
  const tipoManutencao = (os.TipoDeManutencao || os.TipoManutencao || '').toString().trim();
  
  if (!tipoManutencao || tipoManutencao.trim() === '') {
    return false; // Sem tipo = não é corretiva
  }
  
  if (USE_MOCK) {
    // Em mock, verificar padrões conhecidos de corretivas
    const tipoNormalizado = tipoManutencao.toLowerCase();
    const padroesCorretivos = ['corretiva', 'corretivo', 'correção', 'correcao'];
    return padroesCorretivos.some(padrao => tipoNormalizado.includes(padrao));
  }
  
  try {
    const { getPrisma } = await import('../services/prismaService');
    const prisma = await getPrisma();
    if (!prisma) {
      return false; // Sem Prisma = não verificar, excluir por segurança
    }
    
    // Cache das configurações para evitar múltiplas queries
    if (!global._maintenanceTypesCache) {
      global._maintenanceTypesCache = await prisma.systemConfig.findMany({
        where: {
          category: 'maintenance_type',
          active: true,
        },
      });
    }
    
    // Procurar por match case-insensitive no cache
    const config = global._maintenanceTypesCache.find(c => 
      c.key.toLowerCase().trim() === tipoManutencao.toLowerCase().trim()
    );
    
    if (!config) {
      return false; // Não classificado = não é corretiva
    }
    
    const classificacao = config.value.toLowerCase().trim();
    return classificacao === 'corretiva';
  } catch (e) {
    console.error(`[isOSCorretiva] Erro ao verificar tipo "${tipoManutencao}":`, e);
    return false; // Em caso de erro, excluir por segurança
  }
}

// GET /api/ecm/rounds/os/available - Buscar OS disponíveis para vincular (APENAS CORRETIVAS ABERTAS)
rounds.get('/os/available', async (req, res) => {
  try {
    const { setor, situacao } = req.query;
    const { dataSource } = await import('../adapters/dataSource');
    
    // Incluir filtro de corretivas na chave do cache para invalidar quando necessário
    const cacheKey = generateCacheKey('rounds:os-available-corretivas', { periodo: 'MesCorrente' });
    
    // Tentar buscar do cache primeiro
    let osData: any[] | null = null;
    if (!USE_MOCK) {
      const cachedData = await getCache<any>(cacheKey, CACHE_TTL);
      if (cachedData) {
        // Garantir que os dados do cache são um array válido
        if (Array.isArray(cachedData)) {
          osData = cachedData;
        } else if (cachedData && typeof cachedData === 'object') {
          osData = (cachedData as any).Itens || (cachedData as any).data || (cachedData as any).items || [];
        }
        if (osData && osData.length > 0) {
          console.log('[rounds:os-available] Dados carregados do cache');
          // Aplicar filtro de oficinas mesmo quando vem do cache (pode ter mudado)
          osData = await filterOSByWorkshop(osData);
        } else {
          osData = null; // Forçar nova busca se cache inválido
        }
      }
    }
    
    // Se não estiver em cache, buscar da API
    if (!osData) {
      const osDataRaw = await dataSource.osResumida({
        tipoManutencao: 'Todos',
        periodo: 'MesCorrente',
      });
      
      // Garantir que osData é um array
      if (Array.isArray(osDataRaw)) {
        osData = osDataRaw;
      } else if (osDataRaw && typeof osDataRaw === 'object') {
        osData = (osDataRaw as any).Itens || (osDataRaw as any).data || (osDataRaw as any).items || [];
      } else {
        osData = [];
      }
      
      // Aplicar filtro de oficinas habilitadas
      osData = await filterOSByWorkshop(osData);
      
      // Salvar no cache (apenas se não for mock)
      if (!USE_MOCK && osData) {
        await setCache(cacheKey, osData);
        console.log('[rounds:os-available] Dados salvos no cache');
      }
    }

    // Garantir que osData é um array válido
    if (!Array.isArray(osData)) {
      osData = [];
    }

    // Filtrar apenas OS corretivas e abertas
    let filtered = osData;
    
    // Filtrar por situação (apenas abertas)
    filtered = filtered.filter((os: any) => {
      const situacao = (os.SituacaoDaOS || os.Situacao || '').toString().trim().toLowerCase();
      return situacao === 'aberta' || situacao === 'aberto' || situacao === 'em andamento' || situacao === 'pendente';
    });

    // Filtrar apenas corretivas
    const osComValidacao = await Promise.all(
      filtered.map(async (os: any) => ({
        os,
        isCorretiva: await isOSCorretiva(os),
      }))
    );
    
    filtered = osComValidacao
      .filter(item => item.isCorretiva)
      .map(item => item.os);

    // Filtros adicionais opcionais
    if (setor) {
      filtered = filtered.filter((os: any) => os.Setor === setor);
    }
    if (situacao) {
      filtered = filtered.filter((os: any) => os.SituacaoDaOS === situacao);
    }

    console.log(`[rounds:os-available] Retornando ${filtered.length} OS corretivas abertas de ${osData.length} total`);
    res.json(filtered);
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});
