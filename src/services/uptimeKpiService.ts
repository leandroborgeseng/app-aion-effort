// src/services/uptimeKpiService.ts
import fs from 'node:fs/promises';

const USE_MOCK = process.env.USE_MOCK === 'true';

let prisma: any = null;
async function getPrisma() {
  if (!prisma && !USE_MOCK) {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

export interface EquipmentUptimeKpi {
  effortId: number;
  tag: string;
  equipamento: string;
  year: number;
  month: number;
  uptimePercent: number;
  horasFuncionando: number;
  horasParado: number;
  horasTotais: number;
}

export interface AggregatedUptimeKpi {
  year: number;
  month: number;
  uptimePercent: number;
  equipamentosCount: number;
  horasFuncionandoTotal: number;
  horasParadoTotal: number;
}

async function readKpis(): Promise<Record<string, EquipmentUptimeKpi[]>> {
  if (USE_MOCK) {
    try {
      const buf = await fs.readFile('./mocks/equipment_kpis.json', 'utf-8');
      const data = JSON.parse(buf);
      return data.monthlyKpis || {};
    } catch {
      return {};
    }
  }
  
  const prismaClient = await getPrisma();
  if (!prismaClient) return {};
  
  // Buscar KPIs do Prisma e agrupar por effortId
  const kpis = await prismaClient.equipmentKpiMonthly.findMany({
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });
  
  const grouped: Record<string, EquipmentUptimeKpi[]> = {};
  
  for (const kpi of kpis) {
    const key = String(kpi.effortId);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    
    // Buscar tag e nome do equipamento (precisamos buscar do dataSource)
    const { dataSource } = await import('../adapters/dataSource');
    const equipamentos = await dataSource.equipamentos({
      apenasAtivos: true,
      incluirComponentes: false,
      incluirCustoSubstituicao: false,
    });
    const equipamento = equipamentos.find((e: any) => e.Id === kpi.effortId);
    
    // Calcular horas funcionando e parado baseado na disponibilidade
    const horasTotais = 730; // Horas em um mês
    const horasFuncionando = (kpi.availability / 100) * horasTotais;
    const horasParado = horasTotais - horasFuncionando;
    
    grouped[key].push({
      effortId: kpi.effortId,
      tag: equipamento?.Tag || 'N/A',
      equipamento: equipamento?.Equipamento || 'N/A',
      year: kpi.year,
      month: kpi.month,
      uptimePercent: kpi.availability,
      horasFuncionando,
      horasParado,
      horasTotais,
    });
  }
  
  return grouped;
}

async function saveKpis(kpis: Record<string, EquipmentUptimeKpi[]>): Promise<void> {
  if (USE_MOCK) {
    await fs.writeFile('./mocks/equipment_kpis.json', JSON.stringify({ monthlyKpis: kpis }, null, 2));
  }
  // Em produção, salvar no Prisma (já é feito diretamente na função saveEquipmentUptimeKpi)
}

/**
 * Busca KPIs mensais de uptime para um equipamento específico
 */
export async function getEquipmentUptimeKpis(
  effortId: number,
  year?: number
): Promise<EquipmentUptimeKpi[]> {
  const kpis = await readKpis();
  const key = String(effortId);
  const equipamentoKpis = kpis[key] || [];

  if (year) {
    return equipamentoKpis.filter((kpi) => kpi.year === year);
  }

  return equipamentoKpis;
}

/**
 * Busca KPIs mensais de uptime para todos os equipamentos críticos
 */
export async function getAllCriticalEquipmentUptimeKpis(
  criticalIds: number[],
  year?: number
): Promise<EquipmentUptimeKpi[]> {
  const kpis = await readKpis();
  const allKpis: EquipmentUptimeKpi[] = [];

  criticalIds.forEach((id) => {
    const key = String(id);
    const equipamentoKpis = kpis[key] || [];
    const filtered = year
      ? equipamentoKpis.filter((kpi) => kpi.year === year)
      : equipamentoKpis;
    allKpis.push(...filtered);
  });

  return allKpis;
}

/**
 * Calcula KPI agregado de uptime para todos os equipamentos críticos
 */
export async function getAggregatedUptimeKpi(
  criticalIds: number[],
  year?: number
): Promise<AggregatedUptimeKpi[]> {
  const allKpis = await getAllCriticalEquipmentUptimeKpis(criticalIds, year);

  // Agrupar por ano/mês
  const grouped = new Map<string, EquipmentUptimeKpi[]>();

  allKpis.forEach((kpi) => {
    const key = `${kpi.year}-${kpi.month}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(kpi);
  });

  // Calcular agregado para cada mês
  const aggregated: AggregatedUptimeKpi[] = [];

  grouped.forEach((kpis, key) => {
    const [yearStr, monthStr] = key.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const horasFuncionandoTotal = kpis.reduce((acc, kpi) => acc + kpi.horasFuncionando, 0);
    const horasParadoTotal = kpis.reduce((acc, kpi) => acc + kpi.horasParado, 0);
    const horasTotais = horasFuncionandoTotal + horasParadoTotal;

    const uptimePercent = horasTotais > 0 ? (horasFuncionandoTotal / horasTotais) * 100 : 0;

    aggregated.push({
      year,
      month,
      uptimePercent,
      equipamentosCount: kpis.length,
      horasFuncionandoTotal,
      horasParadoTotal,
    });
  });

  // Ordenar por ano e mês
  return aggregated.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}

/**
 * Salva ou atualiza KPI de uptime para um equipamento
 */
export async function saveEquipmentUptimeKpi(kpi: EquipmentUptimeKpi): Promise<void> {
  if (USE_MOCK) {
    const kpis = await readKpis();
    const key = String(kpi.effortId);

    if (!kpis[key]) {
      kpis[key] = [];
    }

    // Remover KPI existente para o mesmo ano/mês
    kpis[key] = kpis[key].filter(
      (existing) => !(existing.year === kpi.year && existing.month === kpi.month)
    );

    // Adicionar novo KPI
    kpis[key].push(kpi);

    // Ordenar por ano e mês
    kpis[key].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    await saveKpis(kpis);
  } else {
    const prismaClient = await getPrisma();
    if (!prismaClient) return;
    
    // Salvar no Prisma
    await prismaClient.equipmentKpiMonthly.upsert({
      where: {
        effortId_year_month: {
          effortId: kpi.effortId,
          year: kpi.year,
          month: kpi.month,
        },
      },
      update: {
        availability: kpi.uptimePercent,
        // Podemos calcular mtbf e mttr se necessário
      },
      create: {
        effortId: kpi.effortId,
        year: kpi.year,
        month: kpi.month,
        availability: kpi.uptimePercent,
      },
    });
  }
}

