// src/routes/indicators.ts
import { Router } from 'express';
import {
  calculateMaintenanceCostIndicator,
  calculateMaintenanceCostEvolution,
} from '../services/maintenanceCostService';
import { getCache, setCache, generateCacheKey } from '../services/cacheService';
import fs from 'node:fs/promises';

const USE_MOCK = process.env.USE_MOCK === 'true';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

let prisma: any = null;
async function getPrisma() {
  if (!prisma && !USE_MOCK) {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

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

