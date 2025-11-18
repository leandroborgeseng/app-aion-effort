// scripts/fixInvestmentSectors.ts
// Script para atualizar os sectorId dos investimentos usando o mesmo mapeamento usado para equipamentos e OS

import { PrismaClient } from '@prisma/client';
import { getSectorIdFromName } from '../src/utils/sectorMapping';

const prisma = new PrismaClient();

async function fixInvestmentSectors() {
  try {
    console.log('🔧 Iniciando correção dos sectorId dos investimentos...\n');

    // Buscar todos os investimentos
    const investments = await prisma.investment.findMany({
      select: {
        id: true,
        setor: true,
        sectorId: true,
      },
    });

    console.log(`📊 Total de investimentos encontrados: ${investments.length}\n`);

    let atualizados = 0;
    let mantidos = 0;
    let erros = 0;

    for (const inv of investments) {
      if (!inv.setor) {
        console.warn(`⚠️  Investimento ${inv.id} não tem setor definido`);
        continue;
      }

      // Usar o mesmo mapeamento usado para equipamentos e OS
      const novoSectorId = getSectorIdFromName(inv.setor);

      if (inv.sectorId !== novoSectorId) {
        try {
          await prisma.investment.update({
            where: { id: inv.id },
            data: { sectorId: novoSectorId },
          });
          console.log(`✅ Atualizado: "${inv.setor}" (ID antigo: ${inv.sectorId} → novo: ${novoSectorId})`);
          atualizados++;
        } catch (error: any) {
          console.error(`❌ Erro ao atualizar investimento ${inv.id}:`, error.message);
          erros++;
        }
      } else {
        mantidos++;
      }
    }

    console.log('\n📈 Resumo:');
    console.log(`   ✅ Atualizados: ${atualizados}`);
    console.log(`   ➡️  Mantidos (já corretos): ${mantidos}`);
    console.log(`   ❌ Erros: ${erros}`);
    console.log(`   📊 Total: ${investments.length}`);

    // Mostrar estatísticas por setor
    console.log('\n📋 Estatísticas por setor:');
    const setoresMap = new Map<string, { count: number; sectorId: number }>();
    
    const investmentsAtualizados = await prisma.investment.findMany({
      select: {
        setor: true,
        sectorId: true,
      },
    });

    investmentsAtualizados.forEach((inv) => {
      if (inv.setor) {
        const key = inv.setor;
        if (!setoresMap.has(key)) {
          setoresMap.set(key, { count: 0, sectorId: inv.sectorId || 0 });
        }
        const entry = setoresMap.get(key)!;
        entry.count++;
      }
    });

    setoresMap.forEach((stats, setor) => {
      console.log(`   "${setor}": ${stats.count} investimento(s) → sectorId: ${stats.sectorId}`);
    });

    console.log('\n✅ Correção concluída!');
  } catch (error: any) {
    console.error('❌ Erro ao corrigir investimentos:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixInvestmentSectors();

