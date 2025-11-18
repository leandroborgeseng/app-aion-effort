// src/sdk/effortSdk.ts
import { effort, toMulti } from '../lib/effortClient';
import type {
  CronogramaDTO,
  TipoManutencaoFiltro,
  TipoManutencaoDTO,
  ListagemAnaliticaOsResumidaDTO,
  EquipamentoDTO,
  TempoMedioEntreFalhasDTO,
  TempoDeParadaMedioDTO,
  DisponibilidadeEquipamentoDTO,
  DisponibilidadeEquipamentoResponse,
  AnexoEquipamentoResponse,
  AnexoOSResponse,
} from '../types/effort';

export async function getCronograma(params: {
  dataInicio: string;
  dataFim: string;
  listaEmpresaId?: number[];
}) {
  const multi = toMulti('listaEmpresaId', params.listaEmpresaId);
  const { data } = await effort.get<CronogramaDTO[]>('/api/pbi/v1/cronograma', {
    params: { ...params, ...multi },
  });
  return data;
}

export async function getTiposManutencao(params: {
  apenasAtivos: boolean;
  tipo: TipoManutencaoFiltro;
}) {
  const { data } = await effort.get<TipoManutencaoDTO[]>('/api/pbi/v1/tipo_manutencao', {
    params,
  });
  return data;
}

export async function getOSResumida(params: {
  tipoManutencao: TipoManutencaoFiltro;
  periodo:
    | 'Todos'
    | 'SemanaAtual'
    | 'MesAtual'
    | 'MesCorrente'
    | 'MesAnterior'
    | 'AnoAtual'
    | 'AnoCorrente'
    | 'AnoAnterior'
    | 'DoisAnosAtuais'
    | 'DoisAnosCorrente';
  listaEmpresaId?: number[];
  tiposManutencoes?: number[];
  situacaoOs?: number[];
  oficinas?: number[];
  pagina?: number;
  qtdPorPagina?: number;
}) {
  const { listaEmpresaId, tiposManutencoes, situacaoOs, oficinas, ...rest } = params;
  const multi = {
    ...toMulti('listaEmpresaId', listaEmpresaId),
    ...toMulti('tiposManutencoes', tiposManutencoes),
    ...toMulti('situacaoOs', situacaoOs),
    ...toMulti('oficinas', oficinas),
  };
  const { data } = await effort.get<ListagemAnaliticaOsResumidaDTO[]>(
    '/api/pbi/v1/listagem_analitica_das_os_resumida',
    { params: { ...rest, ...multi } }
  );
  return data;
}

/**
 * Busca OS analítica completa (não resumida) que pode incluir campos adicionais como custo
 */
export async function getOSAnalitica(params: {
  tipoManutencao: TipoManutencaoFiltro;
  periodo:
    | 'Todos'
    | 'SemanaAtual'
    | 'MesAtual'
    | 'MesCorrente'
    | 'MesAnterior'
    | 'AnoAtual'
    | 'AnoCorrente'
    | 'AnoAnterior'
    | 'DoisAnosAtuais'
    | 'DoisAnosCorrente';
  listaEmpresaId?: number[];
  tiposManutencoes?: number[];
  situacaoOs?: number[];
  oficinas?: number[];
  pagina?: number;
  qtdPorPagina?: number;
}) {
  const { listaEmpresaId, tiposManutencoes, situacaoOs, oficinas, ...rest } = params;
  const multi = {
    ...toMulti('listaEmpresaId', listaEmpresaId),
    ...toMulti('tiposManutencoes', tiposManutencoes),
    ...toMulti('situacaoOs', situacaoOs),
    ...toMulti('oficinas', oficinas),
  };
  // Tentar endpoint sem "resumida" que pode ter mais campos
  const { data } = await effort.get<any[]>(
    '/api/pbi/v1/listagem_analitica_das_os',
    { params: { ...rest, ...multi } }
  );
  return data;
}

export async function getEquipamentos(params: {
  apenasAtivos: boolean;
  incluirComponentes: boolean;
  incluirCustoSubstituicao: boolean;
  listaEmpresaId?: number[];
}) {
  const multi = toMulti('listaEmpresaId', params.listaEmpresaId);
  const { data } = await effort.get<EquipamentoDTO[]>('/api/pbi/v1/equipamentos', {
    params: { ...params, ...multi },
  });
  return data;
}

export async function getMTBF(params: {
  dataInicio: string;
  dataFim: string;
  listaEmpresaId?: number[];
}) {
  const multi = toMulti('listaEmpresaId', params.listaEmpresaId);
  const { data } = await effort.get<TempoMedioEntreFalhasDTO[]>(
    '/api/pbi/v1/tempo_medio_entre_falhas',
    { params: { ...params, ...multi } }
  );
  return data;
}

export async function getTPM(params: {
  dataInicio: string;
  dataFim: string;
  listaEmpresaId?: number[];
}) {
  const multi = toMulti('listaEmpresaId', params.listaEmpresaId);
  const { data } = await effort.get<TempoDeParadaMedioDTO[]>('/api/pbi/v1/tempo_de_parada_medio', {
    params: { ...params, ...multi },
  });
  return data;
}

export async function getDisponibilidade(params: {
  dataInicio: string;
  dataFim: string;
  listaEmpresaId?: number[];
}) {
  const multi = toMulti('listaEmpresaId', params.listaEmpresaId);
  const { data } = await effort.get<DisponibilidadeEquipamentoDTO[]>(
    '/api/pbi/v1/disponibilidade_equipamento',
    { params: { ...params, ...multi } }
  );
  return data;
}

export async function getDisponibilidadeMesAMes(params: {
  empresasId: number[];
  periodo?:
    | 'Todos'
    | 'SemanaAtual'
    | 'MesAtual'
    | 'MesCorrente'
    | 'MesAnterior'
    | 'AnoAtual'
    | 'AnoCorrente'
    | 'AnoAnterior'
    | 'DoisAnosAtuais'
    | 'DoisAnosCorrente';
  dataInicio?: string;
  dataFim?: string;
  familiasEquipamento?: number[];
  tipoManutencaoIds?: number[];
  centroDeCustoIds?: number[];
  criticidadeIds?: number[];
  fabricanteIds?: number[];
  modeloIds?: number[];
  incluirSabado?: boolean;
  incluirDomingo?: boolean;
  incluirFeriado?: boolean;
  incluirComponentes?: boolean;
}) {
  const multi = {
    ...toMulti('empresasId', params.empresasId),
    ...toMulti('familiasEquipamento', params.familiasEquipamento),
    ...toMulti('tipoManutencaoIds', params.tipoManutencaoIds),
    ...toMulti('centroDeCustoIds', params.centroDeCustoIds),
    ...toMulti('criticidadeIds', params.criticidadeIds),
    ...toMulti('fabricanteIds', params.fabricanteIds),
    ...toMulti('modeloIds', params.modeloIds),
  };
  const { data } = await effort.get<DisponibilidadeEquipamentoResponse[]>(
    '/api/pbi/v1/disponibilidade_equipamento_mes_a_mes',
    { params: { ...params, ...multi } }
  );
  return data;
}

export async function getAnexosEquipamento(params: any) {
  const { data } = await effort.get<AnexoEquipamentoResponse[]>(
    '/api/pbi/v1/anexos_equipamento',
    { params }
  );
  return data;
}

export async function getAnexosOS(params: any) {
  const { data } = await effort.get<AnexoOSResponse[]>('/api/pbi/v1/anexos_os', { params });
  return data;
}

export async function getOficinas(params: { companyId: number; apenasAtivos: boolean }) {
  const { data } = await effort.get('/api/pbi/v1/oficina', { params });
  return data as { Id: number; Codigo: string; Descricao: string; Ativo: string }[];
}

