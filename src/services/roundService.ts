// src/services/roundService.ts
import { dataSource } from '../adapters/dataSource';
import { filterOSByWorkshop } from './workshopFilterService';

export async function getRoundsResumo() {
  // stub: em produção, buscaria do Prisma
  let osData = await dataSource.osResumida({
    tipoManutencao: 'Todos',
    periodo: 'MesCorrente',
  });
  
  // Aplicar filtro de oficinas habilitadas
  osData = await filterOSByWorkshop(osData);

  // Agrupar por setor
  const setores = new Map<string, { openOs: number; closedOs: number }>();

  osData.forEach((os) => {
    const setor = os.Setor || 'Desconhecido';
    if (!setores.has(setor)) {
      setores.set(setor, { openOs: 0, closedOs: 0 });
    }
    const stats = setores.get(setor)!;
    if (os.SituacaoDaOS === 'Aberta') {
      stats.openOs++;
    } else if (os.SituacaoDaOS === 'Fechada') {
      stats.closedOs++;
    }
  });

  return Array.from(setores.entries()).map(([sectorName, stats], idx) => ({
    sectorId: 100 + idx,
    sectorName,
    weekStart: new Date().toISOString(),
    openOs: stats.openOs,
    closedOs: stats.closedOs,
  }));
}

