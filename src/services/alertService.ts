// src/services/alertService.ts
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

export interface Alert {
  id: string;
  effortId: number;
  tag: string;
  equipamento: string;
  osCodigo: string;
  osCodigoSerial: number;
  tipo: 'os_aberta' | 'os_atrasada' | 'manutencao_preventiva';
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  mensagem: string;
  dataAbertura: string;
  situacao: 'pendente' | 'visualizada' | 'resolvida';
  visualizadaEm?: string;
  visualizadaPor?: string;
  resolvidaEm?: string;
  createdAt: string;
}

async function readAlerts(): Promise<Alert[]> {
  if (USE_MOCK) {
    try {
      const buf = await fs.readFile('./mocks/alerts.json', 'utf-8');
      return JSON.parse(buf);
    } catch {
      return [];
    }
  }
  
  const prismaClient = await getPrisma();
  if (!prismaClient) return [];
  
  const alerts = await prismaClient.alert.findMany({
    orderBy: { createdAt: 'desc' },
  });
  
  return alerts.map((a) => ({
    id: a.id,
    effortId: a.effortId,
    tag: a.tag,
    equipamento: a.equipamento,
    osCodigo: a.osCodigo,
    osCodigoSerial: a.osCodigoSerial,
    tipo: a.tipo as Alert['tipo'],
    prioridade: a.prioridade as Alert['prioridade'],
    mensagem: a.mensagem,
    dataAbertura: a.dataAbertura.toISOString(),
    situacao: a.situacao as Alert['situacao'],
    visualizadaEm: a.visualizadaEm?.toISOString(),
    visualizadaPor: a.visualizadaPor,
    resolvidaEm: a.resolvidaEm?.toISOString(),
    createdAt: a.createdAt.toISOString(),
  }));
}

async function saveAlerts(alerts: Alert[]): Promise<void> {
  if (USE_MOCK) {
    await fs.writeFile('./mocks/alerts.json', JSON.stringify(alerts, null, 2));
  }
  // Em produção, salvar no Prisma (já é feito diretamente nas funções)
}

/**
 * Verifica se um equipamento é monitorado
 */
export async function isEquipmentMonitored(effortId: number): Promise<boolean> {
  const flags = await readEquipmentFlags();
  return flags.monitoredFlags?.[String(effortId)] === true;
}

async function readEquipmentFlags(): Promise<{
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
  
  const flags = await prismaClient.equipmentFlag.findMany({
    where: {
      OR: [{ criticalFlag: true }, { monitoredFlag: true }],
    },
  });
  
  const criticalFlags: Record<string, boolean> = {};
  const monitoredFlags: Record<string, boolean> = {};
  
  flags.forEach((flag) => {
    const id = String(flag.effortId);
    if (flag.criticalFlag) criticalFlags[id] = true;
    if (flag.monitoredFlag) monitoredFlags[id] = true;
  });
  
  return { criticalFlags, monitoredFlags };
}

/**
 * Cria alerta quando OS é aberta para equipamento monitorado
 */
export async function createOSAlert(
  effortId: number,
  osData: {
    CodigoSerialOS: number;
    OS: string;
    Equipamento: string;
    Abertura: string;
    Prioridade?: string;
    TipoDeManutencao?: string;
    SituacaoDaOS?: string;
  }
): Promise<Alert | null> {
  const isMonitored = await isEquipmentMonitored(effortId);
  if (!isMonitored) {
    return null;
  }

  // Verificar se já existe alerta para esta OS
  let existingAlert: Alert | null = null;
  
  if (USE_MOCK) {
    const alerts = await readAlerts();
    existingAlert = alerts.find(
      (a) => a.osCodigoSerial === osData.CodigoSerialOS && a.situacao !== 'resolvida'
    ) || null;
  } else {
    const prismaClient = await getPrisma();
    if (prismaClient) {
      const existing = await prismaClient.alert.findFirst({
      where: {
        osCodigoSerial: osData.CodigoSerialOS,
        situacao: { not: 'resolvida' },
      },
    });
    if (existing) {
      existingAlert = {
        id: existing.id,
        effortId: existing.effortId,
        tag: existing.tag,
        equipamento: existing.equipamento,
        osCodigo: existing.osCodigo,
        osCodigoSerial: existing.osCodigoSerial,
        tipo: existing.tipo as Alert['tipo'],
        prioridade: existing.prioridade as Alert['prioridade'],
        mensagem: existing.mensagem,
        dataAbertura: existing.dataAbertura.toISOString(),
        situacao: existing.situacao as Alert['situacao'],
        visualizadaEm: existing.visualizadaEm?.toISOString(),
        visualizadaPor: existing.visualizadaPor,
        resolvidaEm: existing.resolvidaEm?.toISOString(),
        createdAt: existing.createdAt.toISOString(),
      };
    }
    }
  }

  if (existingAlert) {
    return existingAlert;
  }

  // Buscar Tag do equipamento
  const { dataSource } = await import('../adapters/dataSource');
  const equipamentos = await dataSource.equipamentos({
    apenasAtivos: true,
    incluirComponentes: false,
    incluirCustoSubstituicao: true,
  });
  const equipamento = equipamentos.find((e: any) => e.Id === effortId);

  const tag = equipamento?.Tag || 'N/A';

  // Determinar prioridade
  let prioridade: 'baixa' | 'media' | 'alta' | 'critica' = 'media';
  if (osData.Prioridade === 'Alta' || osData.TipoDeManutencao === 'Corretiva') {
    prioridade = 'alta';
  } else if (osData.Prioridade === 'Crítica') {
    prioridade = 'critica';
  } else if (osData.Prioridade === 'Baixa') {
    prioridade = 'baixa';
  }

  const alertData: Omit<Alert, 'id' | 'createdAt'> & { createdAt?: string } = {
    effortId,
    tag,
    equipamento: osData.Equipamento,
    osCodigo: osData.OS,
    osCodigoSerial: osData.CodigoSerialOS,
    tipo: 'os_aberta',
    prioridade,
    mensagem: `Ordem de Serviço ${osData.OS} aberta para equipamento monitorado ${tag}`,
    dataAbertura: osData.Abertura,
    situacao: 'pendente',
  };

  if (USE_MOCK) {
    const alerts = await readAlerts();
    const alert: Alert = {
      ...alertData,
      id: `alert-${Date.now()}-${osData.CodigoSerialOS}`,
      createdAt: new Date().toISOString(),
    };
    alerts.push(alert);
    await saveAlerts(alerts);
    return alert;
  } else {
    const prismaClient = await getPrisma();
    if (!prismaClient) return null;
    const alert = await prismaClient.alert.create({
      data: {
        effortId: alertData.effortId,
        tag: alertData.tag,
        equipamento: alertData.equipamento,
        osCodigo: alertData.osCodigo,
        osCodigoSerial: alertData.osCodigoSerial,
        tipo: alertData.tipo,
        prioridade: alertData.prioridade,
        mensagem: alertData.mensagem,
        dataAbertura: new Date(alertData.dataAbertura),
        situacao: alertData.situacao,
      },
    });
    return {
      id: alert.id,
      effortId: alert.effortId,
      tag: alert.tag,
      equipamento: alert.equipamento,
      osCodigo: alert.osCodigo,
      osCodigoSerial: alert.osCodigoSerial,
      tipo: alert.tipo as Alert['tipo'],
      prioridade: alert.prioridade as Alert['prioridade'],
      mensagem: alert.mensagem,
      dataAbertura: alert.dataAbertura.toISOString(),
      situacao: alert.situacao as Alert['situacao'],
      createdAt: alert.createdAt.toISOString(),
    };
  }
}

/**
 * Busca todos os alertas
 */
export async function getAlerts(filters?: {
  situacao?: 'pendente' | 'visualizada' | 'resolvida' | 'todos';
  prioridade?: 'baixa' | 'media' | 'alta' | 'critica';
  effortId?: number;
}): Promise<Alert[]> {
  let alerts = await readAlerts();

  if (filters) {
    if (filters.situacao && filters.situacao !== 'todos') {
      alerts = alerts.filter((a) => a.situacao === filters.situacao);
    }
    if (filters.prioridade) {
      alerts = alerts.filter((a) => a.prioridade === filters.prioridade);
    }
    if (filters.effortId) {
      alerts = alerts.filter((a) => a.effortId === filters.effortId);
    }
  }

  // Ordenar por data de criação (mais recentes primeiro)
  return alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Marca alerta como visualizado
 */
export async function markAlertAsViewed(alertId: string, userId?: string): Promise<void> {
  if (USE_MOCK) {
    const alerts = await readAlerts();
    const alert = alerts.find((a) => a.id === alertId);

    if (alert && alert.situacao === 'pendente') {
      alert.situacao = 'visualizada';
      alert.visualizadaEm = new Date().toISOString();
      alert.visualizadaPor = userId || 'system';
      await saveAlerts(alerts);
    }
  } else {
    const prismaClient = await getPrisma();
    if (!prismaClient) return;
    await prismaClient.alert.updateMany({
      where: {
        id: alertId,
        situacao: 'pendente',
      },
      data: {
        situacao: 'visualizada',
        visualizadaEm: new Date(),
        visualizadaPor: userId || 'system',
      },
    });
  }
}

/**
 * Marca alerta como resolvido
 */
export async function markAlertAsResolved(alertId: string, userId?: string): Promise<void> {
  if (USE_MOCK) {
    const alerts = await readAlerts();
    const alert = alerts.find((a) => a.id === alertId);

    if (alert) {
      alert.situacao = 'resolvida';
      alert.resolvidaEm = new Date().toISOString();
      await saveAlerts(alerts);
    }
  } else {
    const prismaClient = await getPrisma();
    if (!prismaClient) return;
    await prismaClient.alert.update({
      where: { id: alertId },
      data: {
        situacao: 'resolvida',
        resolvidaEm: new Date(),
      },
    });
  }
}

/**
 * Processa novas OS e cria alertas para equipamentos monitorados
 */
export async function processNewOS(): Promise<Alert[]> {
  const { dataSource } = await import('../adapters/dataSource');
  let osData = await dataSource.osResumida({
    tipoManutencao: 'Todos',
    periodo: 'MesCorrente',
  });
  
  // Aplicar filtro de oficinas habilitadas
  const { filterOSByWorkshop } = await import('./workshopFilterService');
  osData = await filterOSByWorkshop(osData);

  const flags = await readEquipmentFlags();
  const monitoredIds = Object.keys(flags.monitoredFlags || {})
    .map(Number)
    .filter((id) => flags.monitoredFlags?.[String(id)] === true);

  const newAlerts: Alert[] = [];

  for (const os of osData) {
    // Tentar encontrar ID do equipamento
    const equipamentos = await dataSource.equipamentos({
      apenasAtivos: true,
      incluirComponentes: false,
      incluirCustoSubstituicao: true,
    });

    let effortId: number | undefined = (os as any).EquipamentoId;
    if (!effortId) {
      const equipamento = equipamentos.find(
        (e: any) =>
          e.Equipamento === os.Equipamento &&
          e.Modelo === os.Modelo &&
          e.Fabricante === os.Fabricante
      );
      effortId = equipamento?.Id;
    }

    if (effortId && monitoredIds.includes(effortId) && os.SituacaoDaOS === 'Aberta') {
      const alert = await createOSAlert(effortId, {
        CodigoSerialOS: os.CodigoSerialOS,
        OS: os.OS,
        Equipamento: os.Equipamento,
        Abertura: os.Abertura,
        Prioridade: os.Prioridade,
        TipoDeManutencao: os.TipoDeManutencao,
        SituacaoDaOS: os.SituacaoDaOS,
      });

      if (alert) {
        newAlerts.push(alert);
      }
    }
  }

  return newAlerts;
}

