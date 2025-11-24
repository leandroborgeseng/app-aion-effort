// ... existing code ...
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

/**
 * Interface para OS Analítica Completa (não resumida)
 * IMPORTANTE: Este endpoint retorna campos ESSENCIAIS que não existem na versão resumida:
 * - Tag (obrigatória para vincular OS ao equipamento correto)
 * - Patrimonio
 * - NumeroDeSerie
 * - CodigoExtra
 * - EquipamentoId (ID interno do equipamento)
 * - CentroDeCusto
 * 
 * A API resumida NÃO retorna Tag, portanto NÃO deve ser usada para vincular OS a equipamentos.
 * Use sempre esta interface quando precisar vincular OS a equipamentos por Tag.
 */
export interface ListagemAnaliticaOsCompletaDTO {
  CodigoSerialOS: number;
  OS: string;
  Empresa: string;
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
  
  // Campos essenciais que só existem na versão analítica completa:
  Tag?: string; // OBRIGATÓRIO para vincular OS ao equipamento correto - NÃO existe na versão resumida
  Patrimonio?: string;
  NumeroDeSerie?: string;
  CodigoExtra?: string;
  EquipamentoId?: number; // ID interno do equipamento
  CentroDeCusto?: string;
  
  // Datas completas
  Abertura: string;
  Fechamento: string | null;
  DataParada?: string | null;
  DataFuncionamento?: string | null;
  DataDaSolucao: string | null;
  
  // Dados adicionais
  Ocorrencia: string;
  Causa: string;
  Status: string;
  
  // Campos adicionais que podem existir
  Custo?: number | string;
  Assistencia?: string;
  [key: string]: any; // Para campos adicionais que possam existir
}

/**
 * Interface para OS Analítica Completa (não resumida)
 * Este endpoint retorna campos adicionais essenciais para vincular OS ao equipamento:
 * - Tag (obrigatória para vínculo correto)
 * - Patrimonio
 * - NumeroDeSerie
 * - CodigoExtra
 * - EquipamentoId (ID interno do equipamento)
 * - CentroDeCusto
 * - E muito mais campos detalhados
 */
export interface ListagemAnaliticaOsCompletaDTO {
  CodigoSerialOS: number;
  OS: string;
  Empresa: string;
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
  
  // Campos essenciais que só existem na versão analítica completa:
  Tag?: string; // OBRIGATÓRIO para vincular OS ao equipamento correto
  Patrimonio?: string;
  NumeroDeSerie?: string;
  CodigoExtra?: string;
  EquipamentoId?: number; // ID interno do equipamento
  CentroDeCusto?: string;
  
  // Datas completas
  Abertura: string;
  Fechamento: string | null;
  DataParada?: string | null;
  DataFuncionamento?: string | null;
  DataDaSolucao: string | null;
  
  // Dados adicionais
  Ocorrencia: string;
  Causa: string;
  Status: string;
  
  // Campos adicionais que podem existir
  Custo?: number | string;
  Assistencia?: string;
  [key: string]: any; // Para campos adicionais que possam existir
}

// ... existing code ...
