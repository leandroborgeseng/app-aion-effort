// scripts/listSectors.ts
// Script para listar todos os setores únicos retornados pela API

import { dataSource } from '../src/adapters/dataSource';
import { getSectorIdFromName } from '../src/utils/sectorMapping';

async function listSectors() {
  try {
    console.log('Buscando setores da API...\n');
    
    const equipamentos = await dataSource.equipamentos({});
    
    if (!Array.isArray(equipamentos)) {
      console.error('Erro: A API não retornou um array de equipamentos');
      return;
    }
    
    const sectorMap = new Map<string, number>();
    
    equipamentos.forEach((eq: any) => {
      if (eq.Setor) {
        const setorNormalizado = eq.Setor.trim();
        // Se tem SetorId, usar ele
        if (eq.SetorId) {
          if (!sectorMap.has(setorNormalizado)) {
            sectorMap.set(setorNormalizado, eq.SetorId);
          }
        } else {
          // Se não tem SetorId, usar o mapeamento fixo
          const sectorId = getSectorIdFromName(eq.Setor);
          if (!sectorMap.has(setorNormalizado)) {
            sectorMap.set(setorNormalizado, sectorId);
          }
        }
      }
    });
    
    // Também buscar de OS resumida
    try {
      const osData = await dataSource.osResumida({
        tipoManutencao: 'Todos',
        periodo: 'Todos',
      });
      
      if (Array.isArray(osData)) {
        osData.forEach((os: any) => {
          if (os.Setor) {
            const setorNormalizado = os.Setor.trim();
            if (!sectorMap.has(setorNormalizado)) {
              if (os.SetorId) {
                sectorMap.set(setorNormalizado, os.SetorId);
              } else {
                const sectorId = getSectorIdFromName(os.Setor);
                sectorMap.set(setorNormalizado, sectorId);
              }
            }
          }
        });
      }
    } catch (osError) {
      console.warn('Erro ao buscar setores de OS:', osError);
    }
    
    // Converter para array e ordenar
    const sectors = Array.from(sectorMap.entries())
      .map(([name, id]) => ({ name, id }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    
    console.log(`Total de setores encontrados: ${sectors.length}\n`);
    console.log('Setores disponíveis na API:\n');
    console.log('ID\tNome do Setor');
    console.log('─'.repeat(50));
    
    sectors.forEach(({ name, id }) => {
      console.log(`${id}\t${name}`);
    });
    
    console.log('\n─'.repeat(50));
    console.log(`\nTotal: ${sectors.length} setores`);
    
    // Também salvar em JSON
    const fs = await import('fs/promises');
    const path = await import('path');
    const outputFile = path.join(process.cwd(), 'setores-api.json');
    await fs.writeFile(outputFile, JSON.stringify({ sectors, total: sectors.length }, null, 2), 'utf-8');
    console.log(`\nLista salva em: ${outputFile}`);
    
  } catch (error: any) {
    console.error('Erro ao listar setores:', error?.message);
    process.exit(1);
  }
}

listSectors();

