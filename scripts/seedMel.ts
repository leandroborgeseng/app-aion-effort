// scripts/seedMel.ts
// Script para criar dados de exemplo de MEL (Minimum Equipment List)
// Refatorado para usar grupos de equipamentos em vez de tipos pré-definidos

import { PrismaClient } from '@prisma/client';
import { DEFAULT_EQUIPMENT_GROUPS } from '../src/services/melEquipmentGrouping';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de MEL...');

  // Buscar setores existentes (via SectorMapping ou criar exemplos)
  console.log('\n🏥 Configurando MEL por setor...');

  // Buscar setores mapeados ou criar exemplos
  const setoresExemplo = [
    { id: 1, name: 'UTI 1' },
    { id: 2, name: 'UTI 2' },
    { id: 3, name: 'Centro Cirúrgico' },
    { id: 4, name: 'Pronto Socorro' },
    { id: 5, name: 'Emergência' },
  ];

  // Verificar se existem setores mapeados
  const setoresMapeados = await prisma.sectorMapping.findMany({
    where: { active: true },
    distinct: ['systemSectorId'],
  });

  const setoresParaUsar =
    setoresMapeados.length > 0
      ? setoresMapeados.slice(0, 5).map((s) => ({
          id: s.systemSectorId,
          name: s.systemSectorName || `Setor ${s.systemSectorId}`,
        }))
      : setoresExemplo;

  console.log(`  📍 Setores encontrados: ${setoresParaUsar.length}`);

  // Configurar MEL para alguns setores usando grupos padrão
  const melConfigs = [
    {
      setor: 'UTI 1',
      items: [
        { grupoKey: 'desfibrilador', minimo: 2 },
        { grupoKey: 'monitor', minimo: 12 },
        { grupoKey: 'ventilador', minimo: 12 },
        { grupoKey: 'bomba-infusao', minimo: 20 },
        { grupoKey: 'oximetro', minimo: 12 },
      ],
    },
    {
      setor: 'UTI 2',
      items: [
        { grupoKey: 'desfibrilador', minimo: 2 },
        { grupoKey: 'monitor', minimo: 10 },
        { grupoKey: 'ventilador', minimo: 10 },
        { grupoKey: 'bomba-infusao', minimo: 18 },
        { grupoKey: 'oximetro', minimo: 10 },
      ],
    },
    {
      setor: 'Centro Cirúrgico',
      items: [
        { grupoKey: 'anestesia', minimo: 4 },
        { grupoKey: 'mesa-cirurgica', minimo: 6 },
        { grupoKey: 'foco-cirurgico', minimo: 6 },
        { grupoKey: 'bisturi-eletronico', minimo: 4 },
        { grupoKey: 'aspirador-cirurgico', minimo: 6 },
        { grupoKey: 'monitor', minimo: 6 },
      ],
    },
    {
      setor: 'Pronto Socorro',
      items: [
        { grupoKey: 'desfibrilador', minimo: 2 },
        { grupoKey: 'monitor', minimo: 6 },
        { grupoKey: 'bomba-infusao', minimo: 8 },
        { grupoKey: 'oximetro', minimo: 6 },
      ],
    },
    {
      setor: 'Emergência',
      items: [
        { grupoKey: 'desfibrilador', minimo: 1 },
        { grupoKey: 'monitor', minimo: 4 },
        { grupoKey: 'bomba-infusao', minimo: 6 },
        { grupoKey: 'oximetro', minimo: 4 },
      ],
    },
  ];

  let totalConfigurado = 0;

  for (const config of melConfigs) {
    // Encontrar setor correspondente
    const setor = setoresParaUsar.find((s) => s.name.toLowerCase().includes(config.setor.toLowerCase()));
    if (!setor) {
      console.log(`  ⚠️  Setor "${config.setor}" não encontrado, pulando...`);
      continue;
    }

    for (const item of config.items) {
      // Buscar grupo correspondente
      const grupo = DEFAULT_EQUIPMENT_GROUPS.find((g) => g.key === item.grupoKey);
      if (!grupo) {
        console.log(`  ⚠️  Grupo "${item.grupoKey}" não encontrado, pulando...`);
        continue;
      }

      // Criar padrão de grupo (primeiro padrão do grupo)
      const groupPattern = grupo.patterns[0] || `*${grupo.key}*`;

      await prisma.sectorMel.upsert({
        where: {
          sectorId_equipmentGroupKey: {
            sectorId: setor.id,
            equipmentGroupKey: grupo.key,
          },
        },
        create: {
          sectorId: setor.id,
          sectorName: setor.name,
          equipmentGroupKey: grupo.key,
          equipmentGroupName: grupo.name,
          groupPattern: groupPattern,
          minimumQuantity: item.minimo,
        },
        update: {
          minimumQuantity: item.minimo,
          equipmentGroupName: grupo.name,
          sectorName: setor.name,
        },
      });
    }
    console.log(`  ✅ MEL configurado para: ${setor.name}`);
    totalConfigurado++;
  }

  console.log('\n✅ Seed de MEL concluído com sucesso!');
  console.log('\n📊 Resumo:');
  console.log(`  - Grupos de equipamentos disponíveis: ${DEFAULT_EQUIPMENT_GROUPS.length}`);
  console.log(`  - Setores com MEL configurado: ${totalConfigurado}`);
  console.log('\n💡 Próximos passos:');
  console.log('  1. Execute a migração do Prisma: pnpm prisma:db:push');
  console.log('  2. Recalcule os alertas: POST /api/ecm/mel/recalculate');
  console.log('  3. Acesse a página MEL no frontend: /mel');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
