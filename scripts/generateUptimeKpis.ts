// scripts/generateUptimeKpis.ts
import fs from 'node:fs/promises';

interface EquipmentUptimeKpi {
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

async function generateUptimeKpis() {
  // IDs dos equipamentos críticos (exemplo)
  const criticalIds = [1001, 1002, 1003];
  const tags = ['RADIO-CT-01', 'RADIO-CT-02', 'RADIO-RM-01'];
  const equipamentos = [
    'Tomógrafo Computadorizado',
    'Tomógrafo Computadorizado',
    'Ressonância Magnética',
  ];

  const year = 2025;
  const kpis: Record<string, EquipmentUptimeKpi[]> = {};

  criticalIds.forEach((id, idx) => {
    const tag = tags[idx];
    const equipamento = equipamentos[idx];
    const monthlyKpis: EquipmentUptimeKpi[] = [];

    // Gerar KPIs para cada mês do ano
    for (let month = 1; month <= 12; month++) {
      // Simular variação de uptime entre 95% e 99%
      const baseUptime = 97 + Math.sin(month / 2) * 2; // Variação suave
      const uptimePercent = Math.max(95, Math.min(99, baseUptime + (Math.random() - 0.5) * 2));

      // Calcular horas (assumindo mês com ~730 horas)
      const horasTotais = 730;
      const horasFuncionando = (uptimePercent / 100) * horasTotais;
      const horasParado = horasTotais - horasFuncionando;

      monthlyKpis.push({
        effortId: id,
        tag,
        equipamento,
        year,
        month,
        uptimePercent: Number(uptimePercent.toFixed(2)),
        horasFuncionando: Number(horasFuncionando.toFixed(2)),
        horasParado: Number(horasParado.toFixed(2)),
        horasTotais,
      });
    }

    kpis[String(id)] = monthlyKpis;
  });

  await fs.writeFile(
    './mocks/equipment_kpis.json',
    JSON.stringify({ monthlyKpis: kpis }, null, 2)
  );

  console.log('✅ KPIs de uptime gerados com sucesso!');
  console.log(`   - ${criticalIds.length} equipamentos`);
  console.log(`   - ${criticalIds.length * 12} registros mensais`);
}

generateUptimeKpis().catch(console.error);

