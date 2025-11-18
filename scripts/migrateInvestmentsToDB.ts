// scripts/migrateInvestmentsToDB.ts
// Script para migrar investimentos do arquivo mock para o banco de dados

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { getSectorIdFromName } from '../src/utils/sectorMapping';

// Mapeamento manual de setores (mesmo do investmentSectorMapper.ts)
const INVESTMENT_SECTOR_MAPPING: Record<string, number> = {
  'PEDIATRIA': 10,
  'UTI 2': 2,
  'UTI 1': 1,
  'UTI 3': 3,
  'CENTRO CIRÚRGICO': 5,
  'Centro Cirúrgico': 5,
  'CENTRO CIRÚRGICO - 10A': 5,
  'Centro Cirúrgico Ambulatorial': 5,
  'UNIDADE DE EMERGÊNCIA': 4,
  'UTI/UNIDADE DE EMERGÊNCIA': 4,
  'Emergência': 4,
  'TOMOGRAFIA': 6,
  'TOMOGRAFIA 2': 6,
  'RESSONÂNCIA MAGNÉTICA': 6,
  'RESSONANCIA MAGNÉTICA': 6,
  'ULTRASSONOGRAFIA': 6,
  'HEMODINÂMICA': 7,
  'HEMODINAMICA': 7,
  'CDC': 7,
  'BERÇÁRIO': 11,
  'BERÇARIO': 11,
  'UTI NEONATAL E PEDIÁTRICA': 1,
  'UTI Neonatal e Pediátrica': 1,
  'UTI INFANTIL - 8': 1,
  'UTI INFANTIL-8': 1,
  'UTI ADULTO I': 1,
  'UTI Adulto I': 1,
  'UNIDADES DE INTERNAÇÃO': 12,
  'EDUCAÇÃO CORPORATIVA': 12,
  'Educação Corporativa': 12,
  'CME': 5,
  'ENDOSCOPIA': 5,
  'MANUTENÇÃO': 12,
  'MANUTENCAO': 12,
  'ROUPARIA': 12,
  'UNIDADE 1': 12,
  'Unidade 1': 12,
  'CENTRO CIRÚRGICO AMBULATORIAL': 5,
  'Centro Cirúrgico Ambulatorial': 5,
};

function mapSectorToId(setorName: string | null | undefined): number | null {
  if (!setorName || !setorName.trim()) return null;
  
  const normalizedName = setorName.trim().toUpperCase();
  
  // Tentar mapeamento manual primeiro
  if (INVESTMENT_SECTOR_MAPPING[normalizedName]) {
    return INVESTMENT_SECTOR_MAPPING[normalizedName];
  }
  
  // Tentar correspondência parcial
  for (const [mappedName, sectorId] of Object.entries(INVESTMENT_SECTOR_MAPPING)) {
    if (normalizedName.includes(mappedName) || mappedName.includes(normalizedName)) {
      return sectorId;
    }
  }
  
  // Usar mapeamento fixo como último recurso
  return getSectorIdFromName(setorName);
}

function mapInvestmentsSectors(investments: any[]): any[] {
  return investments.map((inv) => {
    if (!inv.setor) {
      return { ...inv, sectorId: null };
    }
    
    const sectorId = mapSectorToId(inv.setor);
    return { ...inv, sectorId };
  });
}

const prisma = new PrismaClient();

async function migrateInvestments() {
  try {
    console.log('🚀 Iniciando migração de investimentos para o banco de dados...\n');

    // Ler investimentos do arquivo mock
    const mockFile = path.join(process.cwd(), 'mocks', 'investments.json');
    console.log(`📖 Lendo arquivo: ${mockFile}`);
    
    const fileContent = await fs.readFile(mockFile, 'utf-8');
    const mockInvestments = JSON.parse(fileContent);
    
    if (!Array.isArray(mockInvestments)) {
      throw new Error('O arquivo de investimentos não contém um array válido');
    }

    console.log(`✅ Encontrados ${mockInvestments.length} investimentos no arquivo mock\n`);

    // Mapear setores para IDs
    console.log('🗺️  Mapeando setores para IDs da API...');
    const mappedInvestments = await mapInvestmentsSectors(mockInvestments);
    console.log(`✅ Mapeamento concluído\n`);

    // Verificar investimentos existentes no banco
    console.log('🔍 Verificando investimentos existentes no banco de dados...');
    const existingInvestments = await prisma.investment.findMany({
      select: { id: true, titulo: true, setor: true },
    });
    const existingTitles = new Set(
      existingInvestments.map((inv) => `${inv.titulo}|${inv.setor || ''}`)
    );
    console.log(`📊 Encontrados ${existingInvestments.length} investimentos já existentes\n`);

    // Preparar dados para inserção
    const investmentsToCreate: any[] = [];
    const skipped: any[] = [];
    const errors: Array<{ investment: any; error: string }> = [];

    for (const inv of mappedInvestments) {
      try {
        // Verificar se já existe (por título + setor)
        const key = `${inv.titulo}|${inv.setor || ''}`;
        if (existingTitles.has(key)) {
          skipped.push({ ...inv, reason: 'Já existe no banco' });
          continue;
        }

        // Converter valorEstimado para número
        let valorEstimado = null;
        if (inv.valorEstimado !== null && inv.valorEstimado !== undefined) {
          if (typeof inv.valorEstimado === 'string') {
            valorEstimado = parseFloat(inv.valorEstimado.replace(/[^\d.,-]/g, '').replace(',', '.'));
          } else {
            valorEstimado = Number(inv.valorEstimado);
          }
          if (isNaN(valorEstimado)) {
            valorEstimado = null;
          }
        }

        // Converter dataPrevista
        let dataPrevista = null;
        if (inv.dataPrevista) {
          const date = new Date(inv.dataPrevista);
          if (!isNaN(date.getTime())) {
            dataPrevista = date;
          }
        }

        investmentsToCreate.push({
          titulo: inv.titulo || 'Sem título',
          descricao: inv.descricao || null,
          categoria: inv.categoria || 'Equipamento',
          valorEstimado: valorEstimado,
          prioridade: inv.prioridade || 'Média',
          status: inv.status || 'Proposto',
          setor: inv.setor || null,
          sectorId: inv.sectorId || null,
          responsavel: inv.responsavel || null,
          dataPrevista: dataPrevista,
          observacoes: inv.observacoes || null,
          sectorRoundId: inv.sectorRoundId || null,
        });
      } catch (err: any) {
        errors.push({
          investment: inv,
          error: err?.message || 'Erro desconhecido',
        });
      }
    }

    console.log(`📝 Preparados ${investmentsToCreate.length} investimentos para inserção`);
    console.log(`⏭️  ${skipped.length} investimentos serão pulados (já existem)`);
    console.log(`❌ ${errors.length} investimentos com erros\n`);

    if (errors.length > 0) {
      console.log('⚠️  Erros encontrados:');
      errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.investment.titulo}: ${err.error}`);
      });
      console.log('');
    }

    // Inserir investimentos no banco
    if (investmentsToCreate.length > 0) {
      console.log('💾 Inserindo investimentos no banco de dados...');
      
      let created = 0;
      let failed = 0;
      
      // Inserir um por um para evitar duplicatas e capturar erros individuais
      for (const inv of investmentsToCreate) {
        try {
          await prisma.investment.create({
            data: inv,
          });
          created++;
          if (created % 10 === 0) {
            console.log(`  ✅ Inseridos ${created}/${investmentsToCreate.length} investimentos`);
          }
        } catch (err: any) {
          // Se for erro de duplicata, ignorar
          if (err?.code === 'P2002' || err?.message?.includes('Unique constraint')) {
            skipped.push({ ...inv, reason: 'Duplicata detectada durante inserção' });
          } else {
            failed++;
            console.error(`  ❌ Erro ao inserir "${inv.titulo}": ${err?.message}`);
          }
        }
      }
      
      console.log(`\n✅ Migração concluída!`);
      console.log(`   • ${created} investimentos criados`);
      console.log(`   • ${skipped.length} investimentos já existiam ou foram pulados`);
      console.log(`   • ${failed} investimentos falharam`);
      console.log(`   • ${errors.length} investimentos com erros na preparação`);
    } else {
      console.log('ℹ️  Nenhum investimento novo para inserir.');
    }

  } catch (error: any) {
    console.error('❌ Erro durante a migração:', error?.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateInvestments();

