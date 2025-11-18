// scripts/generateEquipamentos.ts
import { faker } from '@faker-js/faker';
import fs from 'node:fs/promises';

faker.seed(Number(process.env.MOCK_SEED) || 12345);

interface Equipamento {
  Id: number;
  Equipamento: string;
  Fabricante: string;
  Modelo: string;
  Tag: string;
  Setor: string;
  CentroDeCusto: string;
  DataDeAquisicao: string;
  RegistroAnvisa: string;
  ValidadeDoRegistroAnvisa: string;
  EndOfLife: string;
  EndOfService: string;
  ValorDeSubstituicao: string;
  Criticidade: string;
  Status: string;
  NumeroDeSerie: string;
  Patrimonio: string;
  DataDeFabricacao: string;
  DataDeInstalação: string;
}

const setores = [
  'UTI 1',
  'UTI 2',
  'UTI 3',
  'Emergência',
  'Centro Cirúrgico',
  'Radiologia',
  'Cardiologia',
  'Neurologia',
  'Ortopedia',
  'Pediatria',
  'Maternidade',
  'Ambulatório',
];

const centrosDeCusto = [
  'UTI Adulto',
  'UTI Pediátrica',
  'Emergência',
  'Bloco Cirúrgico',
  'Diagnóstico por Imagem',
  'Cardiologia',
  'Neurologia',
  'Ortopedia',
  'Pediatria',
  'Maternidade',
  'Ambulatório',
];

const fabricantes = [
  'Philips',
  'Siemens',
  'GE Healthcare',
  'Toshiba',
  'Canon Medical',
  'Samsung',
  'Mindray',
  'Fujifilm',
  'Hitachi',
  'Braile',
  'Magnamed',
  'Maquet',
  'B. Braun',
  'Stryker',
];

function generateEquipamentoImagem(
  id: number,
  tipo: string,
  fabricante: string,
  modelo: string,
  tag: string,
  setor: string,
  centroDeCusto: string,
  valor: number,
  anoAquisicao: number
): Equipamento {
  const dataAquisicao = faker.date.between({
    from: new Date(`${anoAquisicao}-01-01`),
    to: new Date(`${anoAquisicao}-12-31`),
  });

  const dataFabricacao = faker.date.between({
    from: new Date(`${anoAquisicao - 1}-01-01`),
    to: dataAquisicao,
  });

  const dataInstalacao = faker.date.between({
    from: dataAquisicao,
    to: new Date(dataAquisicao.getTime() + 15 * 24 * 60 * 60 * 1000),
  });

  const validadeAnvisa = faker.date.future({ years: 5, refDate: dataAquisicao });
  const eol = faker.date.future({ years: 7, refDate: dataAquisicao });
  const eos = faker.date.future({ years: 10, refDate: dataAquisicao });

  return {
    Id: id,
    Equipamento: tipo,
    Fabricante: fabricante,
    Modelo: modelo,
    Tag: tag,
    Setor: setor,
    CentroDeCusto: centroDeCusto,
    DataDeAquisicao: dataAquisicao.toISOString(),
    RegistroAnvisa: faker.string.numeric(11),
    ValidadeDoRegistroAnvisa: validadeAnvisa.toISOString(),
    EndOfLife: eol.toISOString(),
    EndOfService: eos.toISOString(),
    ValorDeSubstituicao: valor.toFixed(2),
    Criticidade: 'Alta',
    Status: 'Ativo',
    NumeroDeSerie: `SN-${fabricante.substring(0, 3).toUpperCase()}-${dataAquisicao.getFullYear()}-${faker.string.numeric(3)}`,
    Patrimonio: `PAT-${dataAquisicao.getFullYear()}-${faker.string.numeric(4)}`,
    DataDeFabricacao: dataFabricacao.toISOString(),
    DataDeInstalação: dataInstalacao.toISOString(),
  };
}

function generateEquipamentoComum(id: number): Equipamento {
  const tipo = faker.helpers.arrayElement([
    'Ventilador Pulmonar',
    'Bomba de Infusão',
    'Monitor Multiparâmetros',
    'Desfibrilador',
    'Mesa Cirúrgica',
    'Lâmpada Cirúrgica',
    'Aspirador Cirúrgico',
    'Eletrocardiógrafo',
    'Oxímetro',
    'Capnógrafo',
    'Nebulizador',
    'Cama Hospitalar',
    'Macro',
    'Micro',
    'Autoclave',
    'Centrífuga',
    'Estufa',
    'Refrigerador',
    'Freezer',
  ]);

  const fabricante = faker.helpers.arrayElement(fabricantes);
  const setor = faker.helpers.arrayElement(setores);
  const centroDeCusto = faker.helpers.arrayElement(centrosDeCusto);

  const anoAquisicao = faker.number.int({ min: 2018, max: 2024 });
  const dataAquisicao = faker.date.between({
    from: new Date(`${anoAquisicao}-01-01`),
    to: new Date(`${anoAquisicao}-12-31`),
  });

  const dataFabricacao = faker.date.between({
    from: new Date(`${anoAquisicao - 1}-01-01`),
    to: dataAquisicao,
  });

  const dataInstalacao = faker.date.between({
    from: dataAquisicao,
    to: new Date(dataAquisicao.getTime() + 15 * 24 * 60 * 60 * 1000),
  });

  const validadeAnvisa = faker.date.future({ years: 5, refDate: dataAquisicao });
  const eol = faker.date.future({ years: 7, refDate: dataAquisicao });
  const eos = faker.date.future({ years: 10, refDate: dataAquisicao });

  const valor = faker.number.int({ min: 15000, max: 350000 });
  const criticidade = faker.helpers.arrayElement(['Alta', 'Média', 'Baixa']);

  return {
    Id: id,
    Equipamento: tipo,
    Fabricante: fabricante,
    Modelo: `${fabricante.substring(0, 3).toUpperCase()}-${faker.string.alpha(3).toUpperCase()}-${faker.string.numeric(3)}`,
    Tag: `${setor.substring(0, 4).toUpperCase().replace(' ', '')}-${tipo.substring(0, 3).toUpperCase()}-${faker.string.numeric(2)}`,
    Setor: setor,
    CentroDeCusto: centroDeCusto,
    DataDeAquisicao: dataAquisicao.toISOString(),
    RegistroAnvisa: faker.string.numeric(11),
    ValidadeDoRegistroAnvisa: validadeAnvisa.toISOString(),
    EndOfLife: eol.toISOString(),
    EndOfService: eos.toISOString(),
    ValorDeSubstituicao: valor.toFixed(2),
    Criticidade: criticidade,
    Status: faker.helpers.arrayElement(['Ativo', 'Ativo', 'Ativo', 'Inativo']), // 75% ativo
    NumeroDeSerie: `SN-${fabricante.substring(0, 3).toUpperCase()}-${dataAquisicao.getFullYear()}-${faker.string.numeric(3)}`,
    Patrimonio: `PAT-${dataAquisicao.getFullYear()}-${faker.string.numeric(4)}`,
    DataDeFabricacao: dataFabricacao.toISOString(),
    DataDeInstalação: dataInstalacao.toISOString(),
  };
}

async function main() {
  const equipamentos: Equipamento[] = [];
  let id = 1001;

  // Equipamentos de Imagem Críticos
  console.log('Gerando equipamentos de imagem críticos...');

  // 2 CT (Tomógrafos)
  equipamentos.push(
    generateEquipamentoImagem(
      id++,
      'Tomógrafo Computadorizado',
      'Siemens',
      'SOMATOM go.Now',
      'RADIO-CT-01',
      'Radiologia',
      'Diagnóstico por Imagem',
      2500000,
      2022
    )
  );
  equipamentos.push(
    generateEquipamentoImagem(
      id++,
      'Tomógrafo Computadorizado',
      'Philips',
      'Ingenuity Core',
      'RADIO-CT-02',
      'Radiologia',
      'Diagnóstico por Imagem',
      2800000,
      2023
    )
  );

  // 1 RM (Ressonância Magnética)
  equipamentos.push(
    generateEquipamentoImagem(
      id++,
      'Ressonância Magnética',
      'Siemens',
      'MAGNETOM Sola',
      'RADIO-RM-01',
      'Radiologia',
      'Diagnóstico por Imagem',
      8500000,
      2021
    )
  );

  // 6 US (Ultrassons)
  const modelosUS = [
    'Vivid S70',
    'LOGIQ E10',
    'Aplio i800',
    'EPIQ Elite',
    'ACUSON Sequoia',
    'ARIETTA 850',
  ];
  const fabricantesUS = ['GE Healthcare', 'GE Healthcare', 'Canon Medical', 'Philips', 'Siemens', 'Hitachi'];
  const setoresUS = ['UTI 1', 'UTI 2', 'Cardiologia', 'Maternidade', 'Emergência', 'Ambulatório'];

  for (let i = 0; i < 6; i++) {
    equipamentos.push(
      generateEquipamentoImagem(
        id++,
        'Ultrassom',
        fabricantesUS[i],
        modelosUS[i],
        `${setoresUS[i].substring(0, 4).toUpperCase().replace(' ', '')}-US-${String(i + 1).padStart(2, '0')}`,
        setoresUS[i],
        i < 2 ? 'UTI Adulto' : i === 2 ? 'Cardiologia' : i === 3 ? 'Maternidade' : i === 4 ? 'Emergência' : 'Ambulatório',
        180000 + i * 50000,
        2020 + i
      )
    );
  }

  // 3 Arcos Cirúrgicos
  equipamentos.push(
    generateEquipamentoImagem(
      id++,
      'Arco Cirúrgico',
      'Siemens',
      'CIOS Flow',
      'CC-ARCO-01',
      'Centro Cirúrgico',
      'Bloco Cirúrgico',
      1200000,
      2022
    )
  );
  equipamentos.push(
    generateEquipamentoImagem(
      id++,
      'Arco Cirúrgico',
      'Philips',
      'Zenition',
      'CC-ARCO-02',
      'Centro Cirúrgico',
      'Bloco Cirúrgico',
      1350000,
      2023
    )
  );
  equipamentos.push(
    generateEquipamentoImagem(
      id++,
      'Arco Cirúrgico',
      'GE Healthcare',
      'OEC Elite',
      'CC-ARCO-03',
      'Centro Cirúrgico',
      'Bloco Cirúrgico',
      1100000,
      2021
    )
  );

  // 2 RX Fixos
  equipamentos.push(
    generateEquipamentoImagem(
      id++,
      'Raio-X Fixo',
      'Siemens',
      'Mobilett Mira Max',
      'RADIO-RX-01',
      'Radiologia',
      'Diagnóstico por Imagem',
      320000,
      2023
    )
  );
  equipamentos.push(
    generateEquipamentoImagem(
      id++,
      'Raio-X Fixo',
      'Philips',
      'DigitalDiagnost',
      'RADIO-RX-02',
      'Radiologia',
      'Diagnóstico por Imagem',
      350000,
      2022
    )
  );

  console.log(`✅ ${equipamentos.length} equipamentos de imagem críticos gerados`);

  // Gerar equipamentos comuns até completar 100+
  const totalNecessario = 100;
  const restantes = totalNecessario - equipamentos.length;

  console.log(`Gerando ${restantes} equipamentos comuns...`);

  for (let i = 0; i < restantes; i++) {
    equipamentos.push(generateEquipamentoComum(id++));
  }

  console.log(`✅ Total de ${equipamentos.length} equipamentos gerados`);

  // Salvar arquivo
  await fs.writeFile('mocks/equipamentos.json', JSON.stringify(equipamentos, null, 2));
  console.log('✅ Arquivo mocks/equipamentos.json atualizado');

  // Estatísticas
  const criticos = equipamentos.filter((e) => e.Criticidade === 'Alta').length;
  const ativos = equipamentos.filter((e) => e.Status === 'Ativo').length;
  const imagem = equipamentos.filter((e) =>
    ['Tomógrafo', 'Ressonância', 'Ultrassom', 'Arco Cirúrgico', 'Raio-X'].some((tipo) =>
      e.Equipamento.includes(tipo)
    )
  ).length;

  console.log('\n📊 Estatísticas:');
  console.log(`   Total: ${equipamentos.length}`);
  console.log(`   Críticos: ${criticos}`);
  console.log(`   Ativos: ${ativos}`);
  console.log(`   Equipamentos de Imagem: ${imagem}`);
}

main().catch(console.error);

