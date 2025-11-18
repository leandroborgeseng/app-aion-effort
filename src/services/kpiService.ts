// src/services/kpiService.ts
import { dataSource } from '../adapters/dataSource';

export async function calcKpisCriticosMes(year: number, month: number) {
  // stub: em mock, poderíamos ler fixtures e gerar KPIs; por ora retorna exemplo
  // Em produção, calcularia a partir dos dados reais do Effort
  const dispData = await dataSource.dispMes({
    empresasId: [2],
    periodo: 'AnoCorrente',
  });

  // Exemplo de cálculo simplificado
  const mediaDisponibilidade =
    dispData.length > 0
      ? dispData.reduce((acc, item) => acc + item.DisponibilidadePercentualPeriodo, 0) /
        dispData.length
      : 98.9;

  return {
    mediaDisponibilidade,
    mediaSlaAtendimento: 96.2,
    mediaSlaSolucao: 94.7,
    itens: dispData.map((item) => ({
      effortId: item.EquipamentoId,
      tag: item.Tag,
      disponibilidade: item.DisponibilidadePercentualPeriodo,
      tmef: item.TMEF,
      tmpr: item.TMPR,
    })),
  };
}

