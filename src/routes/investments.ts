// src/routes/investments.ts
import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';

const USE_MOCK = process.env.USE_MOCK === 'true';

// Lazy load Prisma apenas quando necessário (modo não-mock)
let prisma: any = null;
async function getPrisma() {
  if (!prisma && !USE_MOCK) {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

export const investments = Router();

// Caminho absoluto para o arquivo de mock
const MOCK_FILE = path.join(process.cwd(), 'mocks', 'investments.json');

// Ler investimentos do mock
async function readMockInvestments() {
  try {
    const buf = await fs.readFile(MOCK_FILE, 'utf-8');
    const parsed = JSON.parse(buf);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err: any) {
    console.error('Erro ao ler investimentos do mock:', err?.message);
    // Se o arquivo não existe, retorna array vazio
    if (err?.code === 'ENOENT') {
      return [];
    }
    return [];
  }
}

// Salvar investimentos no mock
async function saveMockInvestments(data: any[]) {
  try {
    // Garantir que o diretório existe
    const dir = path.dirname(MOCK_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(MOCK_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err: any) {
    console.error('Erro ao salvar investimentos no mock:', err?.message);
    throw err;
  }
}

// GET /api/ecm/investments - Listar investimentos
investments.get('/', async (req, res) => {
  try {
    const { status, categoria, sectorRoundId, sectorId } = req.query;

      if (USE_MOCK) {
        let investments = await readMockInvestments();
        
        if (status) {
          investments = investments.filter((inv: any) => inv.status === status);
        }
        if (categoria) {
          investments = investments.filter((inv: any) => inv.categoria === categoria);
        }
        if (sectorRoundId) {
          investments = investments.filter((inv: any) => inv.sectorRoundId === sectorRoundId);
        }
        if (sectorId) {
          const sectorIdNum = Number(sectorId);
          const { getSectorIdFromName } = await import('../utils/sectorMapping');
          
          // Filtrar por sectorId direto OU pelo nome do setor usando getSectorIdFromName
          // Isso garante compatibilidade mesmo se os IDs não corresponderem exatamente
          investments = investments.filter((inv: any) => {
            if (inv.sectorId === sectorIdNum) return true;
            // Se o sectorId não corresponde, tentar pelo nome do setor
            if (inv.setor) {
              const invSectorId = getSectorIdFromName(inv.setor);
              return invSectorId === sectorIdNum;
            }
            return false;
          });
        }

        // Garantir que valorEstimado seja número
        const normalizedInvestments = investments.map((inv: any) => ({
          ...inv,
          valorEstimado: typeof inv.valorEstimado === 'string' 
            ? parseFloat(inv.valorEstimado.replace(/[^\d.,-]/g, '').replace(',', '.')) 
            : (inv.valorEstimado ? Number(inv.valorEstimado) : null),
        }));

        res.json(normalizedInvestments);
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      const where: any = {};
      if (status) where.status = status;
      if (categoria) where.categoria = categoria;
      if (sectorRoundId) where.sectorRoundId = sectorRoundId;
      
      // Buscar todos os investimentos primeiro (sem filtro de sectorId no where)
      let data = await prismaClient.investment.findMany({
        where,
        include: {
          sectorRound: {
            select: {
              id: true,
              sectorName: true,
              weekStart: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      
      // Aplicar filtro de sectorId se fornecido (usando o mesmo método usado para equipamentos e OS)
      if (sectorId) {
        const sectorIdNum = Number(sectorId);
        const { getSectorIdFromName } = await import('../utils/sectorMapping');
        
        data = data.filter((inv: any) => {
          // Verificar pelo sectorId direto
          if (inv.sectorId === sectorIdNum) return true;
          // Se não corresponde, tentar pelo nome do setor usando getSectorIdFromName
          if (inv.setor) {
            const invSectorId = getSectorIdFromName(inv.setor);
            return invSectorId === sectorIdNum;
          }
          return false;
        });
      }

      // Converter Decimal para número (Prisma retorna Decimal como string)
      const normalizedData = data.map((inv: any) => ({
        ...inv,
        valorEstimado: inv.valorEstimado ? Number(inv.valorEstimado) : null,
      }));

      res.json(normalizedData);
    }
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// GET /api/ecm/investments/:id - Buscar investimento por ID
investments.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (USE_MOCK) {
      const investments = await readMockInvestments();
      const investment = investments.find((inv: any) => inv.id === id);
      if (!investment) {
        return res.status(404).json({ error: true, message: 'Investimento não encontrado' });
      }
      // Garantir que valorEstimado seja número
      const normalizedInvestment = {
        ...investment,
        valorEstimado: typeof investment.valorEstimado === 'string' 
          ? parseFloat(investment.valorEstimado.replace(/[^\d.,-]/g, '').replace(',', '.')) 
          : (investment.valorEstimado ? Number(investment.valorEstimado) : null),
      };
      res.json(normalizedInvestment);
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      const investment = await prismaClient.investment.findUnique({
        where: { id },
        include: {
          sectorRound: {
            select: {
              id: true,
              sectorName: true,
              weekStart: true,
            },
          },
        },
      });

      if (!investment) {
        return res.status(404).json({ error: true, message: 'Investimento não encontrado' });
      }

      // Converter Decimal para número
      const normalizedInvestment = {
        ...investment,
        valorEstimado: investment.valorEstimado ? Number(investment.valorEstimado) : null,
      };

      res.json(normalizedInvestment);
    }
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// POST /api/ecm/investments - Criar investimento
investments.post('/', async (req, res) => {
  try {
    const {
      titulo,
      descricao,
      categoria,
      valorEstimado,
      prioridade,
      status = 'Proposto',
      setor,
      sectorId,
      responsavel,
      dataPrevista,
      observacoes,
      sectorRoundId,
    } = req.body;

    if (!titulo || !categoria || !valorEstimado || !prioridade) {
      return res.status(400).json({ error: true, message: 'Campos obrigatórios: titulo, categoria, valorEstimado, prioridade' });
    }

    if (USE_MOCK) {
      const investments = await readMockInvestments();
      const newInvestment = {
        id: `inv-${Date.now()}`,
        titulo,
        descricao: descricao || null,
        categoria,
        valorEstimado: parseFloat(valorEstimado),
        prioridade,
        status,
        setor: setor || null,
        sectorId: sectorId ? Number(sectorId) : null,
        responsavel: responsavel || null,
        dataPrevista: dataPrevista || null,
        observacoes: observacoes || null,
        sectorRoundId: sectorRoundId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      investments.push(newInvestment);
      await saveMockInvestments(investments);

      res.status(201).json(newInvestment);
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      const investment = await prismaClient.investment.create({
        data: {
          titulo,
          descricao,
          categoria,
          valorEstimado: parseFloat(valorEstimado),
          prioridade,
          status,
          setor,
          responsavel,
          dataPrevista: dataPrevista ? new Date(dataPrevista) : null,
          observacoes,
          sectorRoundId,
        },
        include: {
          sectorRound: {
            select: {
              id: true,
              sectorName: true,
              weekStart: true,
            },
          },
        },
      });

      // Converter Decimal para número
      const normalizedInvestment = {
        ...investment,
        valorEstimado: investment.valorEstimado ? Number(investment.valorEstimado) : null,
      };

      res.status(201).json(normalizedInvestment);
    }
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// PATCH /api/ecm/investments/:id - Atualizar investimento
investments.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
      const {
      titulo,
      descricao,
      categoria,
      valorEstimado,
      prioridade,
      status,
      setor,
      sectorId,
      responsavel,
      dataPrevista,
      observacoes,
      sectorRoundId,
    } = req.body;

    if (USE_MOCK) {
      const investments = await readMockInvestments();
      const index = investments.findIndex((inv: any) => inv.id === id);
      if (index === -1) {
        return res.status(404).json({ error: true, message: 'Investimento não encontrado' });
      }

      const updated = {
        ...investments[index],
        ...(titulo !== undefined && { titulo }),
        ...(descricao !== undefined && { descricao }),
        ...(categoria !== undefined && { categoria }),
        ...(valorEstimado !== undefined && { valorEstimado: parseFloat(valorEstimado) }),
        ...(prioridade !== undefined && { prioridade }),
        ...(status !== undefined && { status }),
        ...(setor !== undefined && { setor }),
        ...(sectorId !== undefined && { sectorId: sectorId ? Number(sectorId) : null }),
        ...(responsavel !== undefined && { responsavel }),
        ...(dataPrevista !== undefined && { dataPrevista }),
        ...(observacoes !== undefined && { observacoes }),
        ...(sectorRoundId !== undefined && { sectorRoundId }),
        updatedAt: new Date().toISOString(),
      };

      investments[index] = updated;
      await saveMockInvestments(investments);

      res.json(updated);
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      const updateData: any = {};
      if (titulo !== undefined) updateData.titulo = titulo;
      if (descricao !== undefined) updateData.descricao = descricao;
      if (categoria !== undefined) updateData.categoria = categoria;
      if (valorEstimado !== undefined) updateData.valorEstimado = parseFloat(valorEstimado);
      if (prioridade !== undefined) updateData.prioridade = prioridade;
      if (status !== undefined) updateData.status = status;
      if (setor !== undefined) updateData.setor = setor;
      if (sectorId !== undefined) updateData.sectorId = sectorId ? Number(sectorId) : null;
      if (responsavel !== undefined) updateData.responsavel = responsavel;
      if (dataPrevista !== undefined) updateData.dataPrevista = dataPrevista ? new Date(dataPrevista) : null;
      if (observacoes !== undefined) updateData.observacoes = observacoes;
      if (sectorRoundId !== undefined) updateData.sectorRoundId = sectorRoundId;

      const investment = await prismaClient.investment.update({
        where: { id },
        data: updateData,
        include: {
          sectorRound: {
            select: {
              id: true,
              sectorName: true,
              weekStart: true,
            },
          },
        },
      });

      // Converter Decimal para número
      const normalizedInvestment = {
        ...investment,
        valorEstimado: investment.valorEstimado ? Number(investment.valorEstimado) : null,
      };

      res.json(normalizedInvestment);
    }
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// DELETE /api/ecm/investments/:id - Deletar investimento
investments.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (USE_MOCK) {
      const investments = await readMockInvestments();
      const filtered = investments.filter((inv: any) => inv.id !== id);
      if (filtered.length === investments.length) {
        return res.status(404).json({ error: true, message: 'Investimento não encontrado' });
      }
      await saveMockInvestments(filtered);
      res.json({ success: true });
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      await prismaClient.investment.delete({
        where: { id },
      });

      res.json({ success: true });
    }
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// GET /api/ecm/investments/from-round/:roundId - Buscar investimentos de uma ronda
investments.get('/from-round/:roundId', async (req, res) => {
  try {
    const { roundId } = req.params;

    if (USE_MOCK) {
      const investments = await readMockInvestments();
      const filtered = investments.filter((inv: any) => inv.sectorRoundId === roundId);
      // Garantir que valorEstimado seja número
      const normalizedFiltered = filtered.map((inv: any) => ({
        ...inv,
        valorEstimado: typeof inv.valorEstimado === 'string' 
          ? parseFloat(inv.valorEstimado.replace(/[^\d.,-]/g, '').replace(',', '.')) 
          : (inv.valorEstimado ? Number(inv.valorEstimado) : null),
      }));
      res.json(normalizedFiltered);
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      const data = await prismaClient.investment.findMany({
        where: { sectorRoundId: roundId },
        include: {
          sectorRound: {
            select: {
              id: true,
              sectorName: true,
              weekStart: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Converter Decimal para número
      const normalizedData = data.map((inv: any) => ({
        ...inv,
        valorEstimado: inv.valorEstimado ? Number(inv.valorEstimado) : null,
      }));

      res.json(normalizedData);
    }
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// POST /api/ecm/investments/import - Importar investimentos em lote
investments.post('/import', async (req, res) => {
  try {
    const { investments: investmentsList, dryRun = false } = req.body;

    if (!Array.isArray(investmentsList)) {
      return res.status(400).json({ error: true, message: 'O corpo da requisição deve conter um array "investments"' });
    }

    // Importar utilitário de mapeamento
    const { mapInvestmentsSectors, getSectorMappingReport } = await import('../utils/investmentSectorMapper');
    
    // Mapear setores (a função retorna Promise<Array>)
    const mappedInvestments = await mapInvestmentsSectors(investmentsList);
    const mappingReport = await getSectorMappingReport(investmentsList);

    if (dryRun) {
      // Modo dry-run: apenas retornar o relatório de mapeamento
      return res.json({
        success: true,
        dryRun: true,
        mappingReport,
        investments: mappedInvestments,
        summary: {
          total: investmentsList.length,
          mapped: mappingReport.mapped.length,
          unmapped: mappingReport.unmapped.length,
        },
      });
    }

    // Importar investimentos
    const results = {
      created: [] as any[],
      errors: [] as Array<{ investment: any; error: string }>,
    };

    if (USE_MOCK) {
      const existingInvestments = await readMockInvestments();
      const newInvestments = mappedInvestments.map((inv, idx) => ({
        id: `inv-${Date.now()}-${idx}`,
        titulo: inv.titulo || inv.TITULO || inv['DESCRIÇÃO (EQUIPAMENTOS)'] || 'Sem título',
        descricao: inv.descricao || inv.DESCRICAO || inv.justificativa || inv.Justificativa || null,
        categoria: inv.categoria || inv.CATEGORIA || 'Equipamento',
        valorEstimado: parseFloat(String(inv.valorEstimado || inv.valorTotal || inv['Valor total'] || inv['Valor total'] || '0').replace(/[^\d,.-]/g, '').replace(',', '.')),
        prioridade: inv.prioridade || inv.PRIORIDADE || 'Média',
        status: inv.status || inv.STATUS || 'Proposto',
        setor: inv.setor || inv.SETOR || null,
        sectorId: inv.sectorId || null,
        responsavel: inv.responsavel || inv.RESPONSAVEL || null,
        dataPrevista: inv.dataPrevista || inv.DATA_PREVISTA || null,
        observacoes: inv.observacoes || inv.OBSERVACOES || inv.justificativa || inv.Justificativa || `Qtd: ${inv.Qtd || inv.qtd || ''}` || null,
        sectorRoundId: inv.sectorRoundId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      existingInvestments.push(...newInvestments);
      await saveMockInvestments(existingInvestments);
      results.created = newInvestments;
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      for (const inv of mappedInvestments) {
        try {
          const investment = await prismaClient.investment.create({
            data: {
              titulo: inv.titulo || inv.TITULO || inv['DESCRIÇÃO (EQUIPAMENTOS)'] || 'Sem título',
              descricao: inv.descricao || inv.DESCRICAO || inv.justificativa || inv.Justificativa || null,
              categoria: inv.categoria || inv.CATEGORIA || 'Equipamento',
              valorEstimado: parseFloat(String(inv.valorEstimado || inv.valorTotal || inv['Valor total'] || inv['Valor total'] || '0').replace(/[^\d,.-]/g, '').replace(',', '.')),
              prioridade: inv.prioridade || inv.PRIORIDADE || 'Média',
              status: inv.status || inv.STATUS || 'Proposto',
              setor: inv.setor || inv.SETOR || null,
              sectorId: inv.sectorId || null,
              responsavel: inv.responsavel || inv.RESPONSAVEL || null,
              dataPrevista: (inv.dataPrevista || inv.DATA_PREVISTA) ? new Date(inv.dataPrevista || inv.DATA_PREVISTA) : null,
              observacoes: inv.observacoes || inv.OBSERVACOES || inv.justificativa || inv.Justificativa || `Qtd: ${inv.Qtd || inv.qtd || ''}` || null,
              sectorRoundId: inv.sectorRoundId || null,
            },
          });
          results.created.push(investment);
        } catch (error: any) {
          results.errors.push({
            investment: inv,
            error: error?.message || 'Erro desconhecido',
          });
        }
      }
    }

    res.json({
      success: true,
      mappingReport,
      results,
      summary: {
        total: investmentsList.length,
        created: results.created.length,
        errors: results.errors.length,
        mapped: mappingReport.mapped.length,
        unmapped: mappingReport.unmapped.length,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// GET /api/ecm/investments/sectors/mapping-report - Obter relatório de mapeamento de setores
investments.get('/sectors/mapping-report', async (req, res) => {
  try {
    const { getSectorMappingReport } = await import('../utils/investmentSectorMapper');
    
    // Buscar investimentos existentes
    let investments: any[] = [];
    if (USE_MOCK) {
      investments = await readMockInvestments();
    } else {
      const prismaClient = await getPrisma();
      if (prismaClient) {
        investments = await prismaClient.investment.findMany({
          select: { setor: true },
        });
      }
    }
    
    const report = await getSectorMappingReport(investments);
    res.json(report);
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// GET /api/ecm/investments/sectors/list - Listar todos os setores disponíveis na API do Effort
investments.get('/sectors/list', async (req, res) => {
  try {
    // Cache por 10 minutos (setores não mudam frequentemente)
    const CACHE_TTL = 10 * 60 * 1000;
    const cacheKey = 'investments:sectors:list';
    
    // Tentar buscar do cache primeiro
    const { getCache, setCache } = await import('../services/cacheService');
    let cachedSectors: any = null;
    
    if (!USE_MOCK) {
      cachedSectors = await getCache(cacheKey, CACHE_TTL);
      if (cachedSectors) {
        console.log('[investments:sectors/list] Retornando setores do cache');
        return res.json(cachedSectors);
      }
    }

    // Buscar equipamentos da API do Effort para extrair setores reais
    const { dataSource } = await import('../adapters/dataSource');
    const { getSectorIdFromName } = await import('../utils/sectorMapping');
    
    let equipamentos: any[] = [];
    try {
      const equipamentosData = await dataSource.equipamentos({});
      // Garantir que é um array
      if (Array.isArray(equipamentosData)) {
        equipamentos = equipamentosData;
      } else if (equipamentosData && typeof equipamentosData === 'object') {
        equipamentos = (equipamentosData as any).Itens || (equipamentosData as any).data || (equipamentosData as any).items || [];
      }
      console.log(`[investments:sectors/list] Buscou ${equipamentos.length} equipamentos da API do Effort`);
    } catch (error: any) {
      console.error('[investments:sectors/list] Erro ao buscar equipamentos da API:', error?.message);
      // Se falhar, usar setores mapeados como fallback
    }

    // Extrair setores únicos dos equipamentos
    const setoresUnicos = new Map<string, number>();
    
    if (equipamentos.length > 0) {
      equipamentos.forEach((equip: any) => {
        const setorNome = equip.Setor || equip.setor || '';
        if (setorNome && setorNome.trim() !== '') {
          // Usar o mapeamento para obter o ID do setor
          const sectorId = getSectorIdFromName(setorNome);
          if (sectorId) {
            // Se já existe um setor com esse ID, manter o nome mais curto/comum
            if (!setoresUnicos.has(setorNome)) {
              setoresUnicos.set(setorNome, sectorId);
            }
          }
        }
      });
    }

    // Se não encontrou setores na API, usar setores mapeados como fallback
    if (setoresUnicos.size === 0) {
      console.warn('[investments:sectors/list] ⚠️ NENHUM setor encontrado na API do Effort! Usando mapeamento fixo como fallback');
      console.warn('[investments:sectors/list] ⚠️ Isso pode indicar problema de conexão com a API ou estrutura de dados diferente');
      
      // Setores básicos do sistema
      const basicSectors: Record<number, string> = {
        1: 'UTI 1',
        2: 'UTI 2',
        3: 'UTI 3',
        4: 'Emergência',
        5: 'Centro Cirúrgico',
        6: 'Radiologia',
        7: 'Cardiologia',
        8: 'Neurologia',
        9: 'Ortopedia',
        10: 'Pediatria',
        11: 'Maternidade',
        12: 'Ambulatório',
      };

      Object.entries(basicSectors).forEach(([idStr, name]) => {
        setoresUnicos.set(name, parseInt(idStr));
      });
    } else {
      console.log(`[investments:sectors/list] ✅ Encontrados ${setoresUnicos.size} setores reais da API do Effort`);
    }

    // Converter para array ordenado
    const sectors = Array.from(setoresUnicos.entries())
      .map(([name, id]) => ({ id, name }))
      .sort((a, b) => {
        // Ordenar primeiro por ID, depois por nome
        if (a.id !== b.id) {
          return a.id - b.id;
        }
        return a.name.localeCompare(b.name, 'pt-BR');
      });

    console.log(`[investments:sectors/list] Retornando ${sectors.length} setores da API do Effort`);

    const response = {
      success: true,
      total: sectors.length,
      sectors,
      source: equipamentos.length > 0 ? 'effort_api' : 'mapped',
    };

    // Salvar no cache
    if (!USE_MOCK) {
      await setCache(cacheKey, response);
    }

    res.json(response);
  } catch (e: any) {
    console.error('[investments:sectors/list] Erro:', e);
    res.status(500).json({ error: true, message: e?.message });
  }
});

