// src/routes/indicators.ts
import { Router } from 'express';
import {
  calculateMaintenanceCostIndicator,
  calculateMaintenanceCostEvolution,
} from '../services/maintenanceCostService';
import { getCache, setCache, generateCacheKey } from '../services/cacheService';
import fs from 'node:fs/promises';

import { getPrisma } from '../services/prismaService';

const USE_MOCK = process.env.USE_MOCK === 'true';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

async function readContracts(): Promise<any[]> {
  if (USE_MOCK) {
    try {
      const buf = await fs.readFile('./mocks/contratos.json', 'utf-8');
      return JSON.parse(buf);
    } catch {
      return [];
    }
  }
  const prismaClient = await getPrisma();
  if (!prismaClient) return [];
  const contracts = await prismaClient.maintenanceContract.findMany({
    where: { ativo: true },
    orderBy: { createdAt: 'desc' },
  });
  return contracts.map((c) => ({
    id: c.id,
    nome: c.nome,
    fornecedor: c.fornecedor,
    equipamentoIds: c.equipamentoIds,
    tipoContrato: c.tipoContrato,
    valorAnual: c.valorAnual.toString(),
    dataInicio: c.dataInicio.toISOString(),
    dataFim: c.dataFim.toISOString(),
    renovacaoAutomatica: c.renovacaoAutomatica,
    ativo: c.ativo,
    observacoes: c.observacoes,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));
}

export const indicators = Router();

indicators.get('/maintenance-cost', async (req, res) => {
  try {
    const ano = req.query.ano ? Number(req.query.ano) : new Date().getFullYear();
    const cacheKey = generateCacheKey('indicators:maintenance-cost', { ano });
    
    // Tentar buscar do cache primeiro
    let cachedData: any = null;
    if (!USE_MOCK) {
      cachedData = await getCache<any>(cacheKey, CACHE_TTL);
      if (cachedData) {
        console.log('[indicators:maintenance-cost] Dados carregados do cache');
        return res.json(cachedData);
      }
    }
    
    const contratos = await readContracts();
    const indicator = await calculateMaintenanceCostIndicator(ano, contratos);
    
    // Salvar no cache (apenas se não for mock)
    if (!USE_MOCK && indicator) {
      await setCache(cacheKey, indicator);
      console.log('[indicators:maintenance-cost] Dados salvos no cache');
    }
    
    res.json(indicator);
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

indicators.get('/maintenance-cost/evolution', async (req, res) => {
  try {
    const ano = req.query.ano ? Number(req.query.ano) : new Date().getFullYear();
    const cacheKey = generateCacheKey('indicators:maintenance-cost-evolution', { ano });
    
    // Tentar buscar do cache primeiro
    let cachedData: any = null;
    if (!USE_MOCK) {
      cachedData = await getCache<any>(cacheKey, CACHE_TTL);
      if (cachedData) {
        console.log('[indicators:maintenance-cost-evolution] Dados carregados do cache');
        return res.json(cachedData);
      }
    }
    
    const contratos = await readContracts();
    const evolution = await calculateMaintenanceCostEvolution(ano, contratos);
    
    // Salvar no cache (apenas se não for mock)
    if (!USE_MOCK && evolution) {
      await setCache(cacheKey, evolution);
      console.log('[indicators:maintenance-cost-evolution] Dados salvos no cache');
    }
    
    res.json(evolution);
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// GET /api/ecm/indicators/clinical-engineering - Indicadores gerais de engenharia clínica
indicators.get('/clinical-engineering', async (req, res) => {
  try {
    const setoresFilter = req.query.setores 
      ? (req.query.setores as string).split(',').map(s => parseInt(s.trim())).filter(Boolean)
      : null;
    const periodo = (req.query.periodo as string) || 'AnoCorrente';
    const ano = req.query.ano ? Number(req.query.ano) : new Date().getFullYear();
    const oficinaFilter = req.query.oficina as string | undefined; // Filtro opcional por oficina

    const cacheKey = generateCacheKey('indicators:clinical-engineering', { setoresFilter, periodo, ano, oficinaFilter });
    
    // Tentar buscar do cache primeiro (mas sempre invalidar se forceRefresh=true)
    let cachedData: any = null;
    if (!USE_MOCK && req.query.forceRefresh !== 'true') {
      cachedData = await getCache<any>(cacheKey, CACHE_TTL);
      if (cachedData) {
        console.log('[indicators:clinical-engineering] Dados carregados do cache');
        return res.json(cachedData);
      }
    } else if (req.query.forceRefresh === 'true') {
      console.log('[indicators:clinical-engineering] forceRefresh=true, ignorando cache');
    }

    const { dataSource } = await import('../adapters/dataSource');
    const { filterOSByWorkshopClassification } = await import('../services/workshopFilterService');
    const { getSectorIdFromItem } = await import('../utils/sectorMapping');

    // Buscar equipamentos
    const equipamentosRaw = await dataSource.equipamentos({
      apenasAtivos: true,
      incluirComponentes: false,
      incluirCustoSubstituicao: false,
    });
    const equipamentos = Array.isArray(equipamentosRaw) ? equipamentosRaw : [];

    // Filtrar por setores se fornecido
    let equipamentosFiltrados = equipamentos;
    if (setoresFilter && setoresFilter.length > 0) {
      equipamentosFiltrados = equipamentos.filter((eq: any) => {
        const sectorId = getSectorIdFromItem(eq);
        return sectorId !== null && setoresFilter.includes(sectorId);
      });
    }

    const totalEquipamentos = equipamentosFiltrados.length;

    // Buscar OS
    let osData: any[] = [];
    let paginaAtual = 0;
    const qtdPorPagina = 50000;
    let temMaisDados = true;
    
    while (temMaisDados && paginaAtual < 10) {
      const dadosPagina = await dataSource.osResumida({
        tipoManutencao: 'Todos',
        periodo: periodo as any,
        pagina: paginaAtual,
        qtdPorPagina: qtdPorPagina,
      });
      
      let dadosArray: any[] = [];
      if (Array.isArray(dadosPagina)) {
        dadosArray = dadosPagina;
      } else if (dadosPagina && typeof dadosPagina === 'object') {
        dadosArray = (dadosPagina as any).Itens || (dadosPagina as any).data || [];
      }
      
      if (dadosArray.length === 0) {
        temMaisDados = false;
      } else {
        osData = osData.concat(dadosArray);
        if (dadosArray.length < qtdPorPagina) {
          temMaisDados = false;
        } else {
          paginaAtual++;
        }
      }
    }

    // Aplicar filtro de oficinas - apenas oficinas habilitadas (value="enabled" e active=true)
    console.log(`[indicators:clinical-engineering] ==========================================`);
    console.log(`[indicators:clinical-engineering] APLICANDO FILTRO DE OFICINAS`);
    if (oficinaFilter) {
      console.log(`[indicators:clinical-engineering] Filtro de oficina específica: "${oficinaFilter}"`);
    }
    console.log(`[indicators:clinical-engineering] Antes do filtro: ${osData.length} OS`);
    
    // Verificar oficinas únicas antes do filtro
    const oficinasAntes = new Set<string>();
    osData.slice(0, 100).forEach((os: any) => { // Primeiras 100 para não poluir
      if (os && os.Oficina && typeof os.Oficina === 'string') {
        oficinasAntes.add(os.Oficina.trim().toUpperCase());
      }
    });
    console.log(`[indicators:clinical-engineering] Exemplo de oficinas ANTES do filtro (primeiras 100 OS): ${Array.from(oficinasAntes).sort().slice(0, 10).join(', ')}...`);
    
    osData = await filterOSByWorkshopClassification(osData);
    
    console.log(`[indicators:clinical-engineering] Depois do filtro de oficinas habilitadas: ${osData.length} OS`);
    
    // Aplicar filtro por oficina específica se fornecido
    if (oficinaFilter && oficinaFilter.trim() !== '' && oficinaFilter.toLowerCase() !== 'todas') {
      const oficinaFilterNormalizada = oficinaFilter.trim().toUpperCase();
      const antesFiltroOficina = osData.length;
      osData = osData.filter((os: any) => {
        const oficina = (os.Oficina || '').trim().toUpperCase();
        return oficina === oficinaFilterNormalizada;
      });
      console.log(`[indicators:clinical-engineering] Depois do filtro de oficina "${oficinaFilter}": ${osData.length} OS (${antesFiltroOficina - osData.length} excluídas)`);
    }
    
    // Verificar oficinas únicas depois do filtro
    const oficinasDepois = new Set<string>();
    osData.forEach((os: any) => {
      if (os && os.Oficina && typeof os.Oficina === 'string') {
        oficinasDepois.add(os.Oficina.trim().toUpperCase());
      }
    });
    console.log(`[indicators:clinical-engineering] Oficinas únicas DEPOIS do filtro: ${Array.from(oficinasDepois).sort().join(', ')}`);
    console.log(`[indicators:clinical-engineering] ==========================================`);

    // Filtrar por ano se necessário
    if (periodo === 'AnoCorrente' || periodo === 'Todos') {
      osData = osData.filter((os: any) => {
        if (!os.Abertura && !os.DataAbertura) return false;
        const dataOS = new Date(os.Abertura || os.DataAbertura);
        return dataOS.getFullYear() === ano;
      });
    }

    // Calcular indicadores

    // 1. Disponibilidade
    const { isOSInMaintenance } = await import('./dashboard');
    const osAbertas = await Promise.all(
      osData.map(async (os: any) => ({
        os,
        isInMaintenance: await isOSInMaintenance(os),
      }))
    );
    const equipamentosEmManutencao = new Set<number>();
    
    const tagToIdMap = new Map<string, number>();
    equipamentosFiltrados.forEach((eq: any) => {
      if (eq.Tag) tagToIdMap.set(eq.Tag.trim().toUpperCase(), eq.Id);
    });

    osAbertas.forEach(({ os, isInMaintenance }) => {
      if (!isInMaintenance) return;
      
      let equipamentoId: number | undefined;
      if (os.EquipamentoId) {
        equipamentoId = os.EquipamentoId;
      } else if (os.Tag) {
        equipamentoId = tagToIdMap.get(os.Tag.trim().toUpperCase());
      }
      
      if (equipamentoId) {
        equipamentosEmManutencao.add(equipamentoId);
      }
    });

    const disponivel = totalEquipamentos - equipamentosEmManutencao.size;
    const disponibilidadePercent = totalEquipamentos > 0 
      ? (disponivel / totalEquipamentos) * 100 
      : 0;

    // 2. Distribuição de OS por tipo
    console.log(`[indicators:clinical-engineering] Calculando distribuições com ${osData.length} OS filtradas`);
    
    // Contar oficinas únicas que estão sendo usadas nos cálculos
    const oficinasNosDados = new Set<string>();
    const osSemOficina = new Set<string>(); // Para identificar OS sem oficina
    osData.forEach((os: any) => {
      if (os.Oficina && typeof os.Oficina === 'string' && os.Oficina.trim() !== '') {
        oficinasNosDados.add(os.Oficina.trim().toUpperCase());
      } else {
        // Identificar OS sem oficina
        const osId = os.OS || os.CodigoSerial || 'N/A';
        osSemOficina.add(osId);
      }
    });
    
    console.log(`[indicators:clinical-engineering] === OFICINAS NOS DADOS DOS GRÁFICOS ===`);
    console.log(`[indicators:clinical-engineering] Oficinas únicas encontradas: ${oficinasNosDados.size}`);
    console.log(`[indicators:clinical-engineering] Lista de oficinas: ${Array.from(oficinasNosDados).sort().join(', ')}`);
    if (osSemOficina.size > 0) {
      console.warn(`[indicators:clinical-engineering] ⚠️ ATENÇÃO: ${osSemOficina.size} OS sem oficina definida encontradas (devem ter sido excluídas pelo filtro)`);
    }
    console.log(`[indicators:clinical-engineering] ========================================`);
    
    const osPorTipo: Record<string, number> = {};
    const tipoEOficina: Record<string, Set<string>> = {}; // Para rastrear tipos e suas oficinas
    
    osData.forEach((os: any) => {
      const tipo = os.TipoDeManutencao || os.TipoManutencao || 'Não Informado';
      const oficina = (os.Oficina && typeof os.Oficina === 'string') ? os.Oficina.trim().toUpperCase() : 'SEM OFICINA';
      
      osPorTipo[tipo] = (osPorTipo[tipo] || 0) + 1;
      
      // Rastrear quais oficinas aparecem em cada tipo
      if (!tipoEOficina[tipo]) {
        tipoEOficina[tipo] = new Set();
      }
      tipoEOficina[tipo].add(oficina);
    });
    
    // Log dos tipos e suas oficinas
    console.log(`[indicators:clinical-engineering] Tipos de manutenção e suas oficinas:`);
    Object.entries(tipoEOficina).forEach(([tipo, oficinas]) => {
      console.log(`[indicators:clinical-engineering]   - "${tipo}": ${Array.from(oficinas).sort().join(', ')} (${osPorTipo[tipo]} OS)`);
    });

    // 3. OS por situação
    const osPorSituacao: Record<string, number> = {};
    osData.forEach((os: any) => {
      const situacao = os.SituacaoDaOS || os.Situacao || 'Não Informado';
      osPorSituacao[situacao] = (osPorSituacao[situacao] || 0) + 1;
    });

    // 4. OS por setor
    const osPorSetor: Record<string, number> = {};
    osData.forEach((os: any) => {
      const setor = os.Setor || 'Não Informado';
      osPorSetor[setor] = (osPorSetor[setor] || 0) + 1;
    });
    
    console.log(`[indicators:clinical-engineering] Distribuições calculadas - Tipos: ${Object.keys(osPorTipo).length}, Situações: ${Object.keys(osPorSituacao).length}, Setores: ${Object.keys(osPorSetor).length}`);

    // 5. Tempo médio de manutenção (dias entre abertura e fechamento) - APENAS OS CORRETIVAS
    const { isOSCorretiva } = await import('./dashboard');
    
    // Filtrar apenas OS fechadas e corretivas (já filtradas por oficina se fornecido)
    const osFechadasCorretivas = await Promise.all(
      osData.map(async (os: any) => {
        const situacao = (os.SituacaoDaOS || os.Situacao || '').toLowerCase();
        const estaFechada = situacao.includes('fechada') || situacao.includes('concluída') || situacao.includes('concluida');
        if (!estaFechada) return null;
        
        const eCorretiva = await isOSCorretiva(os);
        return eCorretiva ? os : null;
      })
    );
    
    const osFechadas = osFechadasCorretivas.filter(os => os !== null);

    let tempoMedioManutencao = 0;
    if (osFechadas.length > 0) {
      const tempos: number[] = [];
      osFechadas.forEach((os: any) => {
        if (os.Abertura && os.Fechamento) {
          const abertura = new Date(os.Abertura);
          const fechamento = new Date(os.Fechamento);
          if (!isNaN(abertura.getTime()) && !isNaN(fechamento.getTime()) && fechamento > abertura) {
            const dias = Math.ceil((fechamento.getTime() - abertura.getTime()) / (1000 * 60 * 60 * 24));
            tempos.push(dias);
          }
        }
      });
      if (tempos.length > 0) {
        tempoMedioManutencao = tempos.reduce((a, b) => a + b, 0) / tempos.length;
        console.log(`[indicators:clinical-engineering] Tempo médio calculado com ${tempos.length} OS corretivas fechadas`);
      }
    } else {
      console.log(`[indicators:clinical-engineering] Nenhuma OS corretiva fechada encontrada para calcular tempo médio`);
    }

    // 6. OS fechadas por tempo de duração
    const osFechadasPorTempo = {
      ate24h: 0,
      ate1Semana: 0,
      ate1Mes: 0,
      maisDe1Mes: 0,
    };

    osFechadas.forEach((os: any) => {
      if (os.Abertura && os.Fechamento) {
        const abertura = new Date(os.Abertura);
        const fechamento = new Date(os.Fechamento);
        if (!isNaN(abertura.getTime()) && !isNaN(fechamento.getTime()) && fechamento > abertura) {
          const dias = Math.ceil((fechamento.getTime() - abertura.getTime()) / (1000 * 60 * 60 * 24));
          
          if (dias <= 1) {
            osFechadasPorTempo.ate24h++;
          } else if (dias <= 7) {
            osFechadasPorTempo.ate1Semana++;
          } else if (dias <= 30) {
            osFechadasPorTempo.ate1Mes++;
          } else {
            osFechadasPorTempo.maisDe1Mes++;
          }
        }
      }
    });

    console.log(`[indicators:clinical-engineering] OS fechadas por tempo: até 24h=${osFechadasPorTempo.ate24h}, até 1 semana=${osFechadasPorTempo.ate1Semana}, até 1 mês=${osFechadasPorTempo.ate1Mes}, mais de 1 mês=${osFechadasPorTempo.maisDe1Mes}`);

    // 7. Total de OS
    const totalOS = osData.length;
    const totalOSAbertas = osAbertas.filter(({ isInMaintenance }) => isInMaintenance).length;
    const totalOSFechadas = osFechadas.length;

    // 8. Top 5 equipamentos com mais OS
    const osPorEquipamento: Record<string, number> = {};
    osData.forEach((os: any) => {
      const equipamento = os.Equipamento || 'Não Informado';
      osPorEquipamento[equipamento] = (osPorEquipamento[equipamento] || 0) + 1;
    });
    const topEquipamentos = Object.entries(osPorEquipamento)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([nome, count]) => ({ nome, count }));

    const result = {
      disponibilidade: {
        totalEquipamentos,
        disponivel,
        emManutencao: equipamentosEmManutencao.size,
        percentual: Number(disponibilidadePercent.toFixed(2)),
      },
      ordensServico: {
        total: totalOS,
        abertas: totalOSAbertas,
        fechadas: totalOSFechadas,
      },
      distribuicaoTipo: osPorTipo,
      distribuicaoSituacao: osPorSituacao,
      distribuicaoSetor: osPorSetor,
      tempoMedioManutencao: Number(tempoMedioManutencao.toFixed(1)),
      osFechadasPorTempo,
      topEquipamentos,
      periodo,
      ano,
      setoresFiltrados: setoresFilter || null,
    };

    // Salvar no cache
    if (!USE_MOCK && result) {
      await setCache(cacheKey, result);
      console.log('[indicators:clinical-engineering] Dados salvos no cache');
    }

    res.json(result);
  } catch (e: any) {
    console.error('[indicators:clinical-engineering] Erro:', e);
    res.status(500).json({ error: true, message: e?.message || 'Erro ao calcular indicadores' });
  }
});

