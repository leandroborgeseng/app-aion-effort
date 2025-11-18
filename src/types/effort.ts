// src/types/effort.ts

export interface CronogramaDTO {
  Empresa: string;
  CentroDeCusto: string;
  Setor: string;
  Equipamento: string;
  Fabricante: string;
  Modelo: string;
  Tag: string;
  PlanoDeManutencao: string;
  TipoDeManutencao: string;
  DataDaUltima: string;
  ProximaRealizacao: string;
  Perioridicade: string;
  Observacao: string;
}

export type TipoManutencaoFiltro = 'Todos' | 'ApenasPreventiva' | 'ApenasCorretiva';

export interface TipoManutencaoDTO {
  Id: number;
  Descricao: string;
  Ativo: string;
  TipoPreventivo: string;
  TipoCorretiva: string;
}

export interface ListagemAnaliticaOsResumidaDTO {
  CodigoSerialOS: number;
  Empresa: string;
  OS: string;
  Oficina: string;
  MatriculaResponsavel: string;
  Responsavel: string;
  Tipo: string;
  Prioridade: string;
  TipoDeManutencao: string;
  SituacaoDaOS: string;
  ComplexidadeDaOS: string;
  PlanoDeManutencao: string;
  Equipamento: string;
  Modelo: string;
  Fabricante: string;
  Setor: string;
  Abertura: string;
  Fechamento: string | null;
  Ocorrencia: string;
  Causa: string;
  Status: string;
  DataDaSolucao: string | null;
}

export interface EquipamentoDTO {
  Id: number;
  Tag: string;
  NSerie: string;
  Patrimonio: string;
  Equipamento: string;
  Modelo: string;
  Fabricante: string;
  Criticidade: string;
  Prioridade: string;
  RazaoSocial: string;
  CodigoCliente: string;
  Cliente: string;
  Setor: string;
  GrupoDeSetores: string;
  Endereco: string;
  UF: string;
  Bairro: string;
  Cidade: string;
  Cep: string;
  CentroDeCusto: string;
  DataDeAquisicao: string;
  ValorDeAquisicao: string;
  NotaFiscal: string;
  ValorDeSubstituicao: string;
  DataDeFabricacao: string;
  DataDeInstalação: string;
  DataDeInativação: string;
  DataDeGarantia: string;
  DataDeGarantiaEstendida: string;
  ComponenteDe: string;
  RegistroAnvisa: string;
  ValidadeDoRegistroAnvisa: string;
  Situacao: string;
  Status: string;
  EndOfLife: string;
  EndOfService: string;
  Fornecedor: string;
  Observacao: string;
  GarantiaExterna: string;
  DataDeCadastro: string;
}

export interface TempoMedioEntreFalhasDTO {
  Empresa: string;
  CentroDeCusto: string;
  Tag: string;
  Equipamento: string;
  Setor: string;
  Modelo: string;
  Fabricante: string;
  NumeroDeSerie: string;
  Patrimonio: string;
  Os: string;
  MTBF: string;
}

export interface TempoDeParadaMedioDTO {
  Empresa: string;
  CentroDeCusto: string;
  Tag: string;
  Equipamento: string;
  Modelo: string;
  Fabricante: string;
  TPT: string;
  OS: string;
  TPM: string;
  Custo: string;
}

export interface DisponibilidadeEquipamentoDTO {
  Empresa: string;
  CentroDeCusto: string;
  Tag: string;
  Equipamento: string;
  Modelo: string;
  Fabricante: string;
  NumeroDeSerie: string;
  Patrimonio: string;
  OS: string;
  Disponibilidade: string;
  TotalDeHorasDoPeriodo: string;
  TotalDeHorasParada: string;
}

export interface DisponibilidadeMensal {
  Ano: number;
  Mes: number;
  DisponibilidadePercentual: number;
  TMPR: number;
  TMEF: number;
  DiasParado: number;
  DiasFuncionando: number;
}

export interface DisponibilidadeEquipamentoResponse {
  EmpresaId: number;
  EquipamentoId: number;
  Tag: string;
  EquipamentoDescricaoCompleta: string;
  PlanoDeDescricaoId: number;
  PlanoDeDescricao: string;
  ModeloId: number;
  ModeloDescricao: string;
  FabricanteId: number;
  Fabricante: string;
  CriticidadeId: number;
  Criticidade: string;
  SetorId: number;
  SetorCodigo: string;
  SetorDescricao: string;
  CaminhoSetor: string;
  EquipamentoPaiId: number | null;
  Componente: boolean;
  NumeroDeSerie: string;
  Patrimonio: string;
  CodigoExtra: string;
  QuantidadeOSParadaNoPeriodo: number;
  PossuiOSParadaSemFuncionamento: boolean;
  DisponibilidadePercentualPeriodo: number;
  CentrosDeCusto: string;
  CentrosDeCustoIds: string;
  TMEF: number;
  TMPR: number;
  DiasDoPeriodo: number;
  DiasParado: number;
  DiasFuncionando: number;
  DisponibilidadeMensal: DisponibilidadeMensal[];
}

export interface AnexoEquipamentoResponse {
  EquipamentoId: number;
  Tag: string;
  Anexo: string;
  TipoAnexoId: number;
  TipoAnexo: string;
  LinkAnexo: string;
  DataHoraInclusao: string;
}

export interface AnexoOSResponse {
  OSId: number;
  CodigoOS: string;
  Anexo: string;
  TipoAnexoId: number;
  TipoAnexo: string;
  LinkAnexo: string;
  DataHoraInclusao: string;
}

