// src/routes/lifecycle.ts
import { Router } from 'express';
import { dataSource } from '../adapters/dataSource';
import { getEquipmentCosts } from '../services/equipmentCostService';
import { getCache, setCache, generateCacheKey } from '../services/cacheService';
import { getPrisma } from '../services/prismaService';
import * as fs from 'node:fs/promises';

const USE_MOCK = process.env.USE_MOCK === 'true';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

export const lifecycle = Router();

lifecycle.get('/mes-a-mes', async (req, res) => {
  try {
    const empresasId =
      (req.query.empresasId as string)?.split(',').map(Number).filter(Boolean) || [];
    const periodo = (req.query.periodo as string) || 'AnoCorrente';
    
    const cacheKey = generateCacheKey('lifecycle:mes-a-mes', { empresasId, periodo });
    
    // Tentar buscar do cache primeiro
    let data: any = null;
    if (!USE_MOCK) {
      data = await getCache<any>(cacheKey, CACHE_TTL);
      if (data) {
        console.log('[mes-a-mes] Dados carregados do cache');
        return res.json(data);
      }
    }
    
    // Se não estiver em cache, buscar da API
    data = await dataSource.dispMes({ empresasId, periodo });
    
    // Salvar no cache (apenas se não for mock)
    if (!USE_MOCK && data) {
      await setCache(cacheKey, data);
      console.log('[mes-a-mes] Dados salvos no cache');
    }
    
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

lifecycle.get('/cronograma', async (req, res) => {
  try {
    const dataInicio = (req.query.dataInicio as string) || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const dataFim = (req.query.dataFim as string) || new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0];
    const empresasId = (req.query.empresasId as string)?.split(',').map(Number).filter(Boolean);
    const setoresFilter = req.query.setores 
      ? (req.query.setores as string).split(',').map(s => parseInt(s.trim())).filter(Boolean)
      : null;
    
    const cacheKey = generateCacheKey('lifecycle:cronograma', { dataInicio, dataFim, empresasId, setoresFilter });
    
    // Limpar cache se solicitado
    if (req.query.forceRefresh === 'true') {
      const { deleteCache } = await import('../services/cacheService');
      await deleteCache(cacheKey);
      console.log('[cronograma] Cache limpo, forçando nova busca');
    }
    
    // Tentar buscar do cache primeiro
    let data: any = null;
    if (!USE_MOCK && req.query.forceRefresh !== 'true') {
      data = await getCache<any>(cacheKey, CACHE_TTL);
      if (data) {
        console.log('[cronograma] Dados carregados do cache');
        return res.json(data);
      }
    }
    
    // Se não estiver em cache, buscar da API
    console.log('[cronograma] Buscando da API - setoresFilter:', setoresFilter, 'isAdmin:', !setoresFilter);
    data = await dataSource.cronograma({
      dataInicio,
      dataFim,
      listaEmpresaId: empresasId,
    });
    
    console.log('[cronograma] Dados retornados da API:', Array.isArray(data) ? data.length : 'não é array', typeof data);
    
    // Filtrar por setores se fornecido (usando nomes de setores diretamente da API)
    // Se não há filtro de setores (admin), retornar todos os dados
    if (setoresFilter && setoresFilter.length > 0 && Array.isArray(data)) {
      // Buscar nomes dos setores do sistema para fazer o filtro
      const { dataSource } = await import('../adapters/dataSource');
      const sectorsRes = await fetch(`${req.protocol}://${req.get('host')}/api/ecm/investments/sectors/list`);
      const sectorsData = sectorsRes.ok ? await sectorsRes.json() : { sectors: [] };
      const sectorNames = new Set(
        sectorsData.sectors
          ?.filter((s: any) => setoresFilter.includes(s.id))
          .map((s: any) => s.name.toLowerCase()) || []
      );

      if (sectorNames.size > 0) {
        data = data.filter((item: any) => {
          const itemSetor = (item.Setor || item.setor || item.SETOR || '').trim().toLowerCase();
          return itemSetor && sectorNames.has(itemSetor);
        });
        console.log('[cronograma] Filtro aplicado - setores:', Array.from(sectorNames), '- Resultado:', data.length);
      }
    }
    
    // Salvar no cache (apenas se não for mock)
    if (!USE_MOCK && data) {
      await setCache(cacheKey, data);
      console.log('[cronograma] Dados salvos no cache');
    }
    
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

lifecycle.get('/inventario', async (req, res) => {
  try {
    // Parâmetros de paginação
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const skip = (page - 1) * pageSize;

    // Filtro de setores (array de IDs de setores)
    const setoresFilter = req.query.setores 
      ? (req.query.setores as string).split(',').map(s => parseInt(s.trim())).filter(Boolean)
      : null;

    console.log('[inventario] Iniciando busca de equipamentos...');
    console.log('[inventario] USE_MOCK:', USE_MOCK);
    console.log('[inventario] Paginação:', { page, pageSize, skip });
    console.log('[inventario] Filtro de setores:', setoresFilter);

    // Chave de cache para a lista completa de equipamentos
    const cacheKey = generateCacheKey('inventario:all', { apenasAtivos: true, setoresFilter });
    
    // Tentar buscar do cache primeiro
    let equipamentos: any[] | null = null;
    if (!USE_MOCK) {
      equipamentos = await getCache<any[]>(cacheKey, CACHE_TTL);
      if (equipamentos) {
        console.log('[inventario] Dados carregados do cache');
      }
    }

    // Se não estiver em cache, buscar da API
    if (!equipamentos) {
      const equipamentosData = await dataSource.equipamentos({
        apenasAtivos: true,
        incluirComponentes: false,
        incluirCustoSubstituicao: true,
      });
      equipamentos = Array.isArray(equipamentosData) ? equipamentosData : [];

      // Salvar no cache (apenas se não for mock)
      if (!USE_MOCK && equipamentos) {
        await setCache(cacheKey, equipamentos);
        console.log('[inventario] Dados salvos no cache');
      }
    }

    console.log('[inventario] Equipamentos encontrados:', equipamentos?.length || 0);

    // Buscar custos por equipamento (com cache)
    let costsMap = new Map<number, any>();
    try {
      const costsCacheKey = generateCacheKey('equipment-costs');
      let costsCached = await getCache<Array<[number, any]>>(costsCacheKey, CACHE_TTL);
      
      if (costsCached) {
        costsMap = new Map(costsCached);
        console.log('[inventario] Custos carregados do cache');
      } else {
        costsMap = await getEquipmentCosts();
        // Converter Map para Array para salvar no cache
        const costsArray = Array.from(costsMap.entries());
        await setCache(costsCacheKey, costsArray);
        console.log('[inventario] Custos calculados e salvos no cache para', costsMap.size, 'equipamentos');
      }
    } catch (costError: any) {
      console.warn('[inventario] Erro ao calcular custos (continuando sem custos):', costError?.message);
      // Continua sem custos se falhar
    }

    // Buscar flags críticas e monitorados
    let criticalFlags: Record<string, boolean> = {};
    let monitoredFlags: Record<string, boolean> = {};
    
    if (USE_MOCK) {
      try {
        const buf = await fs.readFile('./mocks/equipment_flags.json', 'utf-8');
        const data = JSON.parse(buf);
        criticalFlags = data.criticalFlags || {};
        monitoredFlags = data.monitoredFlags || {};
      } catch {
        // Se falhar, continua sem flags
      }
    } else {
      try {
        const prismaClient = await getPrisma();
        if (prismaClient) {
          const flags = await prismaClient.equipmentFlag.findMany({
            where: {
              OR: [{ criticalFlag: true }, { monitoredFlag: true }],
            },
          });
          
          flags.forEach((flag) => {
            const id = String(flag.effortId);
            if (flag.criticalFlag) criticalFlags[id] = true;
            if (flag.monitoredFlag) monitoredFlags[id] = true;
          });
          console.log('[inventario] Flags carregadas:', Object.keys(criticalFlags).length, 'críticos,', Object.keys(monitoredFlags).length, 'monitorados');
        }
      } catch (flagError: any) {
        console.warn('[inventario] Erro ao buscar flags (continuando sem flags):', flagError?.message);
        // Continua sem flags se falhar
      }
    }

    // Função auxiliar para normalizar string (remove acentos, espaços extras)
    const normalizarString = (str: string): string => {
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/\s+/g, ' ') // Normaliza espaços
        .trim();
    };

    // Filtrar por setores se fornecido (antes de enriquecer com custos)
    let equipamentosFiltrados = equipamentos;
    if (setoresFilter && setoresFilter.length > 0) {
      // Buscar nomes dos setores usando SectorMapping do banco
      let sectorNamesToMatch: string[] = [];
      try {
        const prismaClient = await getPrisma();
        if (prismaClient) {
          const sectorMappings = await prismaClient.sectorMapping.findMany({
            where: {
              systemSectorId: { in: setoresFilter },
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
          
          console.log('[inventario] Setores mapeados encontrados no banco:', sectorNamesToMatch);
        }
        
        // Se não encontrou mapeamento no banco, buscar nomes dos setores da API de investimentos
        if (sectorNamesToMatch.length === 0) {
          try {
            const sectorsRes = await fetch(`${req.protocol}://${req.get('host')}/api/ecm/investments/sectors/list`);
            if (sectorsRes.ok) {
              const sectorsData = await sectorsRes.json();
              const sectorsFromApi = sectorsData.sectors
                ?.filter((s: any) => setoresFilter.includes(s.id))
                .map((s: any) => s.name) || [];
              
              sectorNamesToMatch = sectorsFromApi;
              console.log('[inventario] Setores encontrados na API de investimentos:', sectorNamesToMatch);
            }
          } catch (apiError: any) {
            console.warn('[inventario] Erro ao buscar setores da API:', apiError?.message);
          }
        }
      } catch (error: any) {
        console.warn('[inventario] Erro ao buscar mapeamento de setores:', error?.message);
      }
      
      // Usar utilitário getSectorIdFromItem como fallback
      const { getSectorIdFromItem } = await import('../utils/sectorMapping');
      
      equipamentosFiltrados = equipamentos.filter((eq: any) => {
        const eqSetor = eq.Setor || '';
        
        // Se temos mapeamento do banco, usar comparação flexível por nome do setor
        if (sectorNamesToMatch.length > 0) {
          const eqSetorNormalizado = normalizarString(eqSetor);
          for (const sectorName of sectorNamesToMatch) {
            const sectorNameNormalizado = normalizarString(sectorName);
            
            // Comparação exata
            if (eqSetorNormalizado === sectorNameNormalizado) {
              return true;
            }
            
            // Verificar se o nome do setor está contido no setor do equipamento
            if (eqSetorNormalizado.includes(sectorNameNormalizado) || sectorNameNormalizado.includes(eqSetorNormalizado)) {
              return true;
            }
            
            // Verificar palavras principais (para nomes compostos)
            const palavrasSetor = sectorNameNormalizado.split(/\s+/).filter(w => w.length >= 3);
            if (palavrasSetor.length >= 2) {
              const palavrasCoincidentes = palavrasSetor.filter(palavra => eqSetorNormalizado.includes(palavra));
              if (palavrasCoincidentes.length >= 2) {
                return true;
              }
            }
          }
        }
        
        // Fallback: usar SetorId do equipamento ou converter nome para ID
        const sectorId = getSectorIdFromItem(eq);
        if (!sectorId) return false;
        return setoresFilter.includes(sectorId);
      });
      
      console.log('[inventario] Filtro de setores (IDs):', setoresFilter);
      console.log('[inventario] Nomes de setores para filtrar:', sectorNamesToMatch);
      console.log('[inventario] Equipamentos antes do filtro:', equipamentos.length);
      console.log('[inventario] Equipamentos após filtro de setores:', equipamentosFiltrados.length);
      
      // Debug: mostrar alguns exemplos de setores encontrados nos equipamentos
      if (equipamentosFiltrados.length === 0 && equipamentos.length > 0) {
        const setoresEncontrados = new Set(equipamentos.slice(0, 50).map((eq: any) => eq.Setor || '').filter((s: string) => s));
        console.log('[inventario] Exemplos de setores encontrados nos equipamentos (primeiros 50):', Array.from(setoresEncontrados).slice(0, 10));
      } else if (equipamentosFiltrados.length > 0) {
        console.log('[inventario] Exemplo de equipamento filtrado:', {
          Id: equipamentosFiltrados[0].Id,
          Setor: equipamentosFiltrados[0].Setor,
          SetorId: equipamentosFiltrados[0].SetorId || getSectorIdFromItem(equipamentosFiltrados[0]),
        });
      }
    }

    // Enriquecer equipamentos com custos e flags
    const equipamentosComCustos = equipamentosFiltrados.map((eq: any) => {
      const cost = costsMap.get(eq.Id);
      const isCritical = criticalFlags[String(eq.Id)] || false;
      const isMonitored = monitoredFlags[String(eq.Id)] || false;
      return {
        ...eq,
        ValorGasto: cost ? cost.totalGasto.toFixed(2) : '0.00',
        QuantidadeOS: cost ? cost.quantidadeOS : 0,
        IsCritical: isCritical,
        IsMonitored: isMonitored,
      };
    });

    // Calcular estatísticas totais (de todos os equipamentos)
    const total = equipamentosComCustos.length;
    const equipamentosAtivos = equipamentosComCustos.filter((e: any) => e.Status?.toUpperCase() === 'ATIVO').length;
    const equipamentosInativos = equipamentosComCustos.filter((e: any) => e.Status?.toUpperCase() !== 'ATIVO').length;
    
    // Função auxiliar para verificar ANVISA vencida
    const isAnvisaVencida = (validade: string) => {
      if (!validade || validade.trim() === '') return false;
      try {
        const date = new Date(validade);
        if (isNaN(date.getTime())) return false;
        return date < new Date();
      } catch {
        return false;
      }
    };

    // Função auxiliar para verificar EOL próximo (1 ano) - inclui qualquer vencido OU futuro até 12 meses
    const isEolProximo = (eol: string) => {
      if (!eol || eol.trim() === '') return false;
      try {
        const eolDate = new Date(eol);
        if (isNaN(eolDate.getTime())) return false;
        const hoje = new Date();
        const diffMonths = (eolDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24 * 30);
        // Inclui qualquer data vencida (independente de quando) OU datas futuras até 12 meses
        return diffMonths <= 12;
      } catch {
        return false;
      }
    };

    // Função auxiliar para verificar EOS próximo (1 ano) - inclui qualquer vencido OU futuro até 12 meses
    const isEosProximo = (eos: string) => {
      if (!eos || eos.trim() === '') return false;
      try {
        const eosDate = new Date(eos);
        if (isNaN(eosDate.getTime())) return false;
        const hoje = new Date();
        const diffMonths = (eosDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24 * 30);
        // Inclui qualquer data vencida (independente de quando) OU datas futuras até 12 meses
        return diffMonths <= 12;
      } catch {
        return false;
      }
    };

    // Função auxiliar para converter valores brasileiros
    const parseBrazilianCurrency = (value: string): number => {
      if (!value || value.trim() === '') return 0;
      let cleaned = value.trim().replace(/[^\d,.-]/g, '');
      if (!cleaned.includes(',')) {
        return parseFloat(cleaned) || 0;
      }
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    };

    const anvisaVencida = equipamentosComCustos.filter((e: any) =>
      isAnvisaVencida(e.ValidadeDoRegistroAnvisa || '')
    ).length;
    
    const eolProximo = equipamentosComCustos.filter((e: any) =>
      isEolProximo(e.EndOfLife || '')
    ).length;

    const eosProximo = equipamentosComCustos.filter((e: any) =>
      isEosProximo(e.EndOfService || '')
    ).length;

    const valorTotalSubstituicao = equipamentosComCustos.reduce((acc: number, e: any) => {
      const valor = parseBrazilianCurrency(e.ValorDeSubstituicao || '0');
      return acc + valor;
    }, 0);

    const quantidadeTotalOS = equipamentosComCustos.reduce((acc: number, e: any) => {
      return acc + (e.QuantidadeOS || 0);
    }, 0);

    // Aplicar paginação
    const paginatedData = equipamentosComCustos.slice(skip, skip + pageSize);
    const totalPages = Math.ceil(total / pageSize);

    console.log('[inventario] Retornando', paginatedData.length, 'de', total, 'equipamentos (página', page, 'de', totalPages, ')');
    
    res.json({
      data: paginatedData,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      statistics: {
        total,
        ativos: equipamentosAtivos,
        inativos: equipamentosInativos,
        anvisaVencida,
        eolProximo,
        eosProximo,
        valorTotalSubstituicao,
        quantidadeTotalOS,
      },
    });
  } catch (e: any) {
    console.error('[inventario] Erro:', e?.message);
    console.error('[inventario] Stack:', e?.stack);
    const errorMessage = e?.response?.data?.message || e?.message || 'Erro desconhecido ao buscar inventário';
    const statusCode = e?.response?.status || 500;
    res.status(statusCode).json({ 
      error: true, 
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? e?.stack : undefined
    });
  }
});

lifecycle.patch('/:effortId/replace', async (req, res) => {
  try {
    const { effortId } = req.params;
    const { replaceFlag, replaceReason, replaceNotes } = req.body;
    // stub: em produção, salvaria no Prisma EquipmentFlag
    res.json({ ok: true, effortId, replaceFlag, replaceReason, replaceNotes });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

lifecycle.patch('/:effortId/inspect', async (req, res) => {
  try {
    const { effortId } = req.params;
    const { inspected } = req.body;
    // stub: em produção, salvaria no Prisma EquipmentFlag
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

lifecycle.patch('/:effortId/substitution-cost', async (req, res) => {
  try {
    const { effortId } = req.params;
    const { substCost, substCostSource } = req.body;
    // stub: em produção, salvaria no Prisma EquipmentFlag
    res.json({ ok: true, effortId, substCost, substCostSource });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

