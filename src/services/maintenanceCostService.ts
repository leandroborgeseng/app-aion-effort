// src/services/maintenanceCostService.ts
import { dataSource } from '../adapters/dataSource';
import { getEquipmentCosts, EquipmentCost } from './equipmentCostService';

/**
 * Converte valor monetário brasileiro (ex: "4.500,00") para número
 * Remove pontos (separador de milhar) e substitui vírgula por ponto (separador decimal)
 */
function parseBrazilianCurrency(value: string): number {
  if (!value || value.trim() === '') return 0;
  // Remove espaços e caracteres não numéricos exceto vírgula e ponto
  let cleaned = value.trim().replace(/[^\d,.-]/g, '');
  // Se não tem vírgula, trata como número simples
  if (!cleaned.includes(',')) {
    return parseFloat(cleaned) || 0;
  }
  // Remove pontos (separador de milhar) e substitui vírgula por ponto
  cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export interface MaintenanceCostIndicator {
  valorContratos: number;
  valorOS: number;
  custoTotalManutencao: number;
  valorTotalSubstituicao: number;
  percentualAnual: number;
  metaPercentual: number;
  status: 'dentro' | 'acima' | 'critico';
  diferencaMeta: number;
  ano: number;
  mes?: number;
}

/**
 * Calcula o indicador de custo total de manutenção
 * Fórmula: (Valor Contratos + Valor OS) / Valor Total Substituição * 100
 * Meta: < 4% ao ano
 */
export async function calculateMaintenanceCostIndicator(
  ano: number = new Date().getFullYear(),
  contratos: any[] = []
): Promise<MaintenanceCostIndicator> {
  // Buscar valores gastos em OS
  const costsMap = await getEquipmentCosts();
  const valorOS = Array.from(costsMap.values()).reduce((acc, cost) => acc + cost.totalGasto, 0);

  // Calcular valor total dos contratos ativos no ano
  const valorContratos = contratos
    .filter((c) => {
      const inicio = new Date(c.dataInicio);
      const fim = new Date(c.dataFim);
      const anoInicio = inicio.getFullYear();
      const anoFim = fim.getFullYear();
      return c.ativo && ano >= anoInicio && ano <= anoFim;
    })
    .reduce((acc, c) => acc + parseFloat(c.valorAnual || '0'), 0);

  // Buscar valor total de substituição do parque
  const equipamentos = await dataSource.equipamentos({
    apenasAtivos: true,
    incluirComponentes: false,
    incluirCustoSubstituicao: true,
  });

  const valorTotalSubstituicao = equipamentos.reduce((acc, eq) => {
    const valor = parseBrazilianCurrency(eq.ValorDeSubstituicao || '0');
    return acc + valor;
  }, 0);

  // Calcular custo total de manutenção
  const custoTotalManutencao = valorContratos + valorOS;

  // Calcular percentual anual
  const percentualAnual =
    valorTotalSubstituicao > 0
      ? (custoTotalManutencao / valorTotalSubstituicao) * 100
      : 0;

  const metaPercentual = 4.0;
  const diferencaMeta = percentualAnual - metaPercentual;

  // Determinar status
  let status: 'dentro' | 'acima' | 'critico';
  if (percentualAnual < metaPercentual) {
    status = 'dentro';
  } else if (percentualAnual < metaPercentual * 1.5) {
    status = 'acima';
  } else {
    status = 'critico';
  }

  return {
    valorContratos,
    valorOS,
    custoTotalManutencao,
    valorTotalSubstituicao,
    percentualAnual,
    metaPercentual,
    status,
    diferencaMeta,
    ano,
  };
}

/**
 * Calcula a evolução mês a mês do indicador de custo de manutenção
 */
export async function calculateMaintenanceCostEvolution(
  ano: number = new Date().getFullYear(),
  contratos: any[] = []
): Promise<MaintenanceCostIndicator[]> {
  const evolution: MaintenanceCostIndicator[] = [];
  const equipamentos = await dataSource.equipamentos({
    apenasAtivos: true,
    incluirComponentes: false,
    incluirCustoSubstituicao: true,
  });

  const valorTotalSubstituicao = equipamentos.reduce((acc, eq) => {
    const valor = parseBrazilianCurrency(eq.ValorDeSubstituicao || '0');
    return acc + valor;
  }, 0);

  const nomeToIdMap = new Map<string, number>();
  equipamentos.forEach((eq) => {
    if (eq.Equipamento) nomeToIdMap.set(eq.Equipamento, eq.Id);
  });

  // Buscar todas as OS
  let osData = await dataSource.osResumida({
    tipoManutencao: 'Todos',
    periodo: 'Todos',
  });
  
  // Aplicar filtro de oficinas habilitadas
  const { filterOSByWorkshop } = await import('./workshopFilterService');
  osData = await filterOSByWorkshop(osData);

  // Para cada mês do ano
  for (let mes = 1; mes <= 12; mes++) {
    // Filtrar OS até o mês atual
    const osAteMes = osData.filter((os: any) => {
      if (!os.Abertura) return false;
      const dataOS = new Date(os.Abertura);
      return dataOS.getFullYear() === ano && dataOS.getMonth() + 1 <= mes;
    });

    // Calcular custos acumulados até o mês
    const costsMap = new Map<number, EquipmentCost>();

    osAteMes.forEach((os: any) => {
      let equipamentoId: number | undefined = os.EquipamentoId;
      if (!equipamentoId) {
        const equipamento = equipamentos.find(
          (e) =>
            e.Equipamento === os.Equipamento &&
            e.Modelo === os.Modelo &&
            e.Fabricante === os.Fabricante
        );
        equipamentoId = equipamento?.Id;
      }
      if (!equipamentoId) {
        equipamentoId = nomeToIdMap.get(os.Equipamento);
      }
      if (!equipamentoId) return;

      const custo = parseBrazilianCurrency(os.Custo || '0');
      if (costsMap.has(equipamentoId)) {
        const existing = costsMap.get(equipamentoId)!;
        existing.totalGasto += custo;
        existing.quantidadeOS += 1;
      } else {
        const equipamento = equipamentos.find((e) => e.Id === equipamentoId);
        costsMap.set(equipamentoId, {
          equipamentoId,
          tag: equipamento?.Tag || '',
          equipamento: os.Equipamento || '',
          totalGasto: custo,
          quantidadeOS: 1,
          ultimaOS: os.Abertura,
        });
      }
    });

    const valorOS = Array.from(costsMap.values()).reduce((acc, cost) => acc + cost.totalGasto, 0);

    // Calcular valor dos contratos (proporcional ao mês)
    const valorContratos = contratos
      .filter((c) => {
        const inicio = new Date(c.dataInicio);
        const fim = new Date(c.dataFim);
        const dataFimMesAtual = new Date(ano, mes, 0);
        return (
          c.ativo &&
          inicio <= dataFimMesAtual &&
          fim >= new Date(ano, mes - 1, 1)
        );
      })
      .reduce((acc, c) => {
        const valorAnual = parseFloat(c.valorAnual || '0');
        // Valor proporcional ao mês (considerando apenas meses completos)
        return acc + valorAnual / 12;
      }, 0);

    const custoTotalManutencao = valorContratos + valorOS;
    const percentualAnual =
      valorTotalSubstituicao > 0
        ? (custoTotalManutencao / valorTotalSubstituicao) * 100
        : 0;

    const metaPercentual = 4.0;
    const diferencaMeta = percentualAnual - metaPercentual;

    let status: 'dentro' | 'acima' | 'critico';
    if (percentualAnual < metaPercentual) {
      status = 'dentro';
    } else if (percentualAnual < metaPercentual * 1.5) {
      status = 'acima';
    } else {
      status = 'critico';
    }

    evolution.push({
      valorContratos,
      valorOS,
      custoTotalManutencao,
      valorTotalSubstituicao,
      percentualAnual,
      metaPercentual,
      status,
      diferencaMeta,
      ano,
      mes,
    });
  }

  return evolution;
}

/**
 * Retorna o custo total de um equipamento específico
 */
export async function getEquipmentCost(equipamentoId: number): Promise<number> {
  const costs = await getEquipmentCosts();
  return costs.get(equipamentoId)?.totalGasto || 0;
}
