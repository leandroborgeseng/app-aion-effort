// src/lib/apiTokens.ts
// Mapeamento de endpoints para tokens de API

export const API_TOKEN_MAP: Record<string, string> = {
  // Cronograma de Manutenção
  '/api/pbi/v1/cronograma': 'API_PBI_REL_CRONO_MANU',
  
  // Tipos de Manutenção
  '/api/pbi/v1/tipo_manutencao': 'API_PBI_TIP_MANU',
  
  // OS Analítico Resumida
  '/api/pbi/v1/listagem_analitica_das_os_resumida': 'API_PBI_REL_OS_ANALITICO_RESUMIDO',
  
  // OS Analítico Completa (pode ter custos)
  '/api/pbi/v1/listagem_analitica_das_os': 'API_PBI_REL_OS_ANALITICO',
  
  // Equipamentos
  '/api/pbi/v1/equipamentos': 'API_PBI_REL_EQUIPAMENTOS',
  
  // TMEF (Tempo Médio Entre Falhas)
  '/api/pbi/v1/tempo_medio_entre_falhas': 'API_PBI_REL_TMEF',
  
  // TPM (Tempo de Parada Médio)
  '/api/pbi/v1/tempo_de_parada_medio': 'API_PBI_REL_TPM',
  
  // Disponibilidade de Equipamento
  '/api/pbi/v1/disponibilidade_equipamento': 'API_PBI_REL_DISP_EQUIPAMENTO',
  
  // Disponibilidade Mês a Mês
  '/api/pbi/v1/disponibilidade_equipamento_mes_a_mes': 'API_PBI_REL_DISP_EQUIPAMENTO_MES',
  
  // Monitor de Reação
  '/api/pbi/v1/monitor_reacao': 'API_PBI_MONITOR_REACAO',
  
  // Monitor de Atendimento
  '/api/pbi/v1/monitor_atendimento': 'API_PBI_MONITOR_ATENDIMENTO',
  
  // Anexos de Equipamento
  '/api/pbi/v1/anexos_equipamento': 'API_PBI_ANEXOS_EQUIPAMENTO',
  
  // Anexos de OS
  '/api/pbi/v1/anexos_os': 'API_PBI_ANEXOS_OS',
  
  // Oficina
  '/api/pbi/v1/oficina': 'API_PBI_OFICINA',
};

// Tokens reais (devem ser configurados via variáveis de ambiente)
export const API_TOKENS: Record<string, string> = {
  API_PBI_REL_CRONO_MANU: process.env.API_PBI_REL_CRONO_MANU || '',
  API_PBI_TIP_MANU: process.env.API_PBI_TIP_MANU || '',
  API_PBI_REL_OS_ANALITICO: process.env.API_PBI_REL_OS_ANALITICO || '',
  API_PBI_REL_EQUIPAMENTOS: process.env.API_PBI_REL_EQUIPAMENTOS || '',
  API_PBI_REL_TMEF: process.env.API_PBI_REL_TMEF || '',
  API_PBI_REL_TPM: process.env.API_PBI_REL_TPM || '',
  API_PBI_REL_DISP_EQUIPAMENTO: process.env.API_PBI_REL_DISP_EQUIPAMENTO || '',
  API_PBI_REL_DISP_EQUIPAMENTO_MES: process.env.API_PBI_REL_DISP_EQUIPAMENTO_MES || '',
  API_PBI_MONITOR_REACAO: process.env.API_PBI_MONITOR_REACAO || '',
  API_PBI_MONITOR_ATENDIMENTO: process.env.API_PBI_MONITOR_ATENDIMENTO || '',
  API_PBI_ANEXOS_EQUIPAMENTO: process.env.API_PBI_ANEXOS_EQUIPAMENTO || '',
  API_PBI_ANEXOS_OS: process.env.API_PBI_ANEXOS_OS || '',
  API_PBI_REL_OS_ANALITICO_RESUMIDO: process.env.API_PBI_REL_OS_ANALITICO_RESUMIDO || '',
  API_PBI_OFICINA: process.env.API_PBI_OFICINA || '',
};

/**
 * Obtém o token apropriado para um endpoint específico
 */
export function getTokenForEndpoint(url: string): string {
  // Encontra o endpoint correspondente no mapa
  const endpoint = Object.keys(API_TOKEN_MAP).find((key) => url.includes(key));
  
  if (!endpoint) {
    // Fallback para token genérico se não encontrar mapeamento específico
    return process.env.EFFORT_API_KEY || '';
  }
  
  const tokenKey = API_TOKEN_MAP[endpoint];
  const token = API_TOKENS[tokenKey];
  
  if (!token) {
    console.warn(`Token não configurado para ${tokenKey}, usando token genérico`);
    return process.env.EFFORT_API_KEY || '';
  }
  
  return token;
}

