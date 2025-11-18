// scripts/mockSeed.ts
import { faker } from '@faker-js/faker';
import fs from 'node:fs/promises';

faker.seed(Number(process.env.MOCK_SEED) || 12345);

async function main() {
  // exemplo mínimo — pode ser expandido conforme necessidade
  const equipamentos = JSON.parse(
    await fs.readFile('mocks/equipamentos.json', 'utf-8')
  );
  const os = JSON.parse(await fs.readFile('mocks/os_resumida.json', 'utf-8'));
  const disp = JSON.parse(await fs.readFile('mocks/disp_mes_a_mes.json', 'utf-8'));

  // Apenas valida e re-salva (aqui poderia gerar grandes volumes aleatórios)
  await fs.writeFile('mocks/equipamentos.json', JSON.stringify(equipamentos, null, 2));
  await fs.writeFile('mocks/os_resumida.json', JSON.stringify(os, null, 2));
  await fs.writeFile('mocks/disp_mes_a_mes.json', JSON.stringify(disp, null, 2));

  console.log('✅ Mocks validados e salvos');
}

main().catch(console.error);

