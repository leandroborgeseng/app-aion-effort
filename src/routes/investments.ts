// src/routes/investments.ts
import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';

import { getPrisma } from '../services/prismaService';

const USE_MOCK = process.env.USE_MOCK === 'true';

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
      console.log('[investments] Buscando investimentos - sectorId:', sectorId, 'isAdmin:', !sectorId);
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
      
      console.log('[investments] Total de investimentos encontrados (antes do filtro):', data.length);
      
      // Aplicar filtro de sectorId se fornecido (usando a mesma lógica do inventário)
      // Se não há sectorId (admin), retornar todos os investimentos
      if (sectorId) {
        const sectorIdNum = Number(sectorId);
        
        // Buscar nomes dos setores usando SectorMapping do banco (mesma lógica do inventário)
        let sectorNamesToMatch: string[] = [];
        try {
          const { getPrisma } = await import('../services/prismaService');
          const prismaClient = await getPrisma();
          if (prismaClient) {
            const sectorMappings = await prismaClient.sectorMapping.findMany({
              where: {
                systemSectorId: sectorIdNum,
                active: true,
              },
            });
            
            // Criar lista com todos os nomes de setores (effortSectorName prioritário)
            sectorMappings.forEach((mapping) => {
              if (mapping.effortSectorName) {
                sectorNamesToMatch.push(mapping.effortSectorName);
              }
              if (mapping.systemSectorName && mapping.systemSectorName !== mapping.effortSectorName) {
                sectorNamesToMatch.push(mapping.systemSectorName);
              }
            });
            
            console.log('[investments] Setores mapeados encontrados no banco para sectorId', sectorIdNum, ':', sectorNamesToMatch);
          }
          
          // Se não encontrou mapeamento no banco, buscar nomes dos setores da API de investimentos
          if (sectorNamesToMatch.length === 0) {
            try {
              const sectorsRes = await fetch(`${req.protocol}://${req.get('host')}/api/ecm/investments/sectors/list`);
              if (sectorsRes.ok) {
                const sectorsData = await sectorsRes.json();
                const sectorFromApi = sectorsData.sectors?.find((s: any) => s.id === sectorIdNum);
                if (sectorFromApi?.name) {
                  sectorNamesToMatch.push(sectorFromApi.name);
                  console.log('[investments] Setor encontrado na API de investimentos:', sectorFromApi.name);
                }
              }
            } catch (apiError: any) {
              console.warn('[investments] Erro ao buscar setor da API:', apiError?.message);
            }
          }
        } catch (error: any) {
          console.warn('[investments] Erro ao buscar mapeamento de setores:', error?.message);
        }
        
        // Função auxiliar para normalizar string (remove acentos, espaços extras)
        const normalizarString = (str: string): string => {
          if (!str) return '';
          return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/\s+/g, ' ') // Normaliza espaços
            .trim();
        };
        
        data = data.filter((inv: any) => {
          // Prioridade 1: Verificar pelo sectorId direto
          if (inv.sectorId === sectorIdNum) {
            return true;
          }
          
          // Prioridade 2: Se temos mapeamento do banco, usar comparação flexível por nome do setor
          if (sectorNamesToMatch.length > 0 && inv.setor) {
            const invSetorNormalizado = normalizarString(inv.setor);
            for (const sectorName of sectorNamesToMatch) {
              const sectorNameNormalizado = normalizarString(sectorName);
              
              // Comparação exata
              if (invSetorNormalizado === sectorNameNormalizado) {
                return true;
              }
              
              // Verificar se o nome do setor está contido no setor do investimento
              if (invSetorNormalizado.includes(sectorNameNormalizado) || sectorNameNormalizado.includes(invSetorNormalizado)) {
                return true;
              }
              
              // Verificar palavras principais (para nomes compostos)
              const palavrasSetor = sectorNameNormalizado.split(/\s+/).filter(w => w.length >= 3);
              if (palavrasSetor.length >= 2) {
                const palavrasCoincidentes = palavrasSetor.filter(palavra => invSetorNormalizado.includes(palavra));
                if (palavrasCoincidentes.length >= 2) {
                  return true;
                }
              }
            }
          }
          
          // Fallback: não incluir se não encontrou correspondência
          return false;
        });
        
        console.log('[investments] Total de investimentos encontrados (após filtro):', data.length);
      }

      // Converter Decimal para número (Prisma retorna Decimal como string)
      // Converter datas para ISO string
      const normalizedData = data.map((inv: any) => ({
        ...inv,
        valorEstimado: inv.valorEstimado ? Number(inv.valorEstimado) : null,
        dataPrevista: inv.dataPrevista ? inv.dataPrevista.toISOString() : null,
        dataSolicitacao: inv.dataSolicitacao ? inv.dataSolicitacao.toISOString() : null,
        dataChegada: inv.dataChegada ? inv.dataChegada.toISOString() : null,
        createdAt: inv.createdAt.toISOString(),
        updatedAt: inv.updatedAt.toISOString(),
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
      // Garantir que valorEstimado seja número e converter datas
      const normalizedInvestment = {
        ...investment,
        valorEstimado: typeof investment.valorEstimado === 'string' 
          ? parseFloat(investment.valorEstimado.replace(/[^\d.,-]/g, '').replace(',', '.')) 
          : (investment.valorEstimado ? Number(investment.valorEstimado) : null),
        dataPrevista: investment.dataPrevista ? (typeof investment.dataPrevista === 'string' ? investment.dataPrevista : new Date(investment.dataPrevista).toISOString()) : null,
        dataSolicitacao: investment.dataSolicitacao ? (typeof investment.dataSolicitacao === 'string' ? investment.dataSolicitacao : new Date(investment.dataSolicitacao).toISOString()) : null,
        dataChegada: investment.dataChegada ? (typeof investment.dataChegada === 'string' ? investment.dataChegada : new Date(investment.dataChegada).toISOString()) : null,
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

      // Converter Decimal para número e datas para ISO string
      const normalizedInvestment = {
        ...investment,
        valorEstimado: investment.valorEstimado ? Number(investment.valorEstimado) : null,
        dataPrevista: investment.dataPrevista ? investment.dataPrevista.toISOString() : null,
        dataSolicitacao: investment.dataSolicitacao ? investment.dataSolicitacao.toISOString() : null,
        dataChegada: investment.dataChegada ? investment.dataChegada.toISOString() : null,
        createdAt: investment.createdAt.toISOString(),
        updatedAt: investment.updatedAt.toISOString(),
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
      // Campos de controle de compra
      if (req.body.ordemCompra !== undefined) updateData.ordemCompra = req.body.ordemCompra || null;
      if (req.body.dataSolicitacao !== undefined) updateData.dataSolicitacao = req.body.dataSolicitacao ? new Date(req.body.dataSolicitacao) : null;
      if (req.body.dataChegada !== undefined) updateData.dataChegada = req.body.dataChegada ? new Date(req.body.dataChegada) : null;

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

      // Converter Decimal para número e datas para ISO string
      const normalizedInvestment = {
        ...investment,
        valorEstimado: investment.valorEstimado ? Number(investment.valorEstimado) : null,
        dataPrevista: investment.dataPrevista ? investment.dataPrevista.toISOString() : null,
        dataSolicitacao: investment.dataSolicitacao ? investment.dataSolicitacao.toISOString() : null,
        dataChegada: investment.dataChegada ? investment.dataChegada.toISOString() : null,
        createdAt: investment.createdAt.toISOString(),
        updatedAt: investment.updatedAt.toISOString(),
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

// GET /api/ecm/investments/sectors/list - Listar todos os setores configurados no sistema (da tabela UserSector)
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

    // Buscar setores diretamente da API do Effort
    const { dataSource } = await import('../adapters/dataSource');
    
    let equipamentosData: any = null;
    let osData: any = null;
    
    try {
      equipamentosData = await dataSource.equipamentos({
        apenasAtivos: false,
        incluirComponentes: true,
        incluirCustoSubstituicao: false,
      });
    } catch (err: any) {
      console.error('[investments:sectors/list] Erro ao buscar equipamentos:', err?.message);
      equipamentosData = [];
    }
    
    try {
      osData = await dataSource.osResumida({
        tipoManutencao: 'Todos',
        periodo: 'AnoCorrente',
        pagina: 0,
        qtdPorPagina: 10000,
      });
    } catch (err: any) {
      console.error('[investments:sectors/list] Erro ao buscar OS:', err?.message);
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

    // Extrair setores únicos de equipamentos e OS
    const setoresUnicos = new Map<string, { name: string; id?: number }>();
    
    equipamentosArray.forEach((eq: any) => {
      const setorNome = eq.Setor?.trim() || eq.setor?.trim() || eq.SETOR?.trim() || '';
      const setorId = eq.SetorId || eq.setorId || eq.SETOR_ID || eq.SetorCodigo || eq.setorCodigo;
      
      if (setorNome && setorNome !== '') {
        const key = setorNome.toLowerCase();
        if (!setoresUnicos.has(key)) {
          setoresUnicos.set(key, {
            name: setorNome,
            id: setorId ? Number(setorId) : undefined,
          });
        }
      }
    });

    osArray.forEach((os: any) => {
      const setorNome = os.Setor?.trim() || os.setor?.trim() || os.SETOR?.trim() || '';
      const setorId = os.SetorId || os.setorId || os.SETOR_ID || os.SetorCodigo || os.setorCodigo;
      
      if (setorNome && setorNome !== '') {
        const key = setorNome.toLowerCase();
        if (!setoresUnicos.has(key)) {
          setoresUnicos.set(key, {
            name: setorNome,
            id: setorId ? Number(setorId) : undefined,
          });
        }
      }
    });

    // Converter para array, gerar IDs sequenciais se não tiverem, e ordenar
    const sectors = Array.from(setoresUnicos.values())
      .map((setor, index) => ({
        id: setor.id || (index + 1),
        name: setor.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    console.log(`[investments:sectors/list] Retornando ${sectors.length} setores da API do Effort`);

    const response = {
      success: true,
      total: sectors.length,
      sectors,
      source: 'effort-api',
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

