// src/adapters/dataSource.ts
import * as sdk from '../sdk/effortSdk';
import fs from 'node:fs/promises';

const USE_MOCK = process.env.USE_MOCK === 'true';

async function readFixture<T>(name: string): Promise<T> {
  const buf = await fs.readFile(`./mocks/${name}`, 'utf-8');
  return JSON.parse(buf) as T;
}

export const dataSource = {
  equipamentos: (p: any) =>
    USE_MOCK ? readFixture('equipamentos.json') : sdk.getEquipamentos(p),
  osResumida: (p: any) =>
    USE_MOCK ? readFixture('os_resumida.json') : sdk.getOSResumida(p),
  osAnalitica: (p: any) =>
    USE_MOCK ? readFixture('os_resumida.json') : sdk.getOSAnalitica(p), // Usar mesmo mock temporariamente, depois criar mock específico
  dispMes: (p: any) =>
    USE_MOCK ? readFixture('disp_mes_a_mes.json') : sdk.getDisponibilidadeMesAMes(p),
  tipos: (p: any) =>
    USE_MOCK ? readFixture('tipos_manutencao.json') : sdk.getTiposManutencao(p),
  oficinas: (p: any) =>
    USE_MOCK ? readFixture('oficinas.json') : sdk.getOficinas(p),
  anexosEq: (p: any) =>
    USE_MOCK ? readFixture('anexos_equip.json') : sdk.getAnexosEquipamento(p),
  anexosOS: (p: any) =>
    USE_MOCK ? readFixture('anexos_os.json') : sdk.getAnexosOS(p),
  cronograma: (p: any) =>
    USE_MOCK ? Promise.resolve([]) : sdk.getCronograma(p),
};

