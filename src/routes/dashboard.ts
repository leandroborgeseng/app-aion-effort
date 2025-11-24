// src/routes/dashboard.ts
import { Router } from 'express';
import { dataSource } from '../adapters/dataSource';
import { getCache, setCache, generateCacheKey } from '../services/cacheService';
import { getSectorIdFromItem, getSectorNamesFromIds, getSectorNamesFromUserSector } from '../utils/sectorMapping';
import { filterOSByWorkshop } from '../services/workshopFilterService';

const USE_MOCK = process.env.USE_MOCK === 'true';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

// Cache para tipos de manutenção (evita múltiplas queries)
declare global {
  var _maintenanceTypesCache: any[] | undefined;
}

export const dashboard = Router();

// Endpoint para normalizar e atualizar tipos na tabela SystemConfig
dashboard.post('/debug/normalize-types', async (req, res) => {
  try {
    if (USE_MOCK) {
      return res.json({ message: 'Modo mock ativo - não é possível normalizar' });
    }

    const { getPrisma } = await import('../services/prismaService');
    const prisma = await getPrisma();
    if (!prisma) {
      return res.status(500).json({ error: 'Prisma não disponível' });
    }

    // Buscar TODOS os tipos únicos das OS
    console.log('[normalize-types] Buscando tipos das OS...');
    let osData: any[] = [];
    let paginaAtual = 0;
    const qtdPorPagina = 50000;
    let temMaisDados = true;
    
    while (temMaisDados && paginaAtual < 5) {
      const dadosPagina = await dataSource.osResumida({
        tipoManutencao: 'Todos',
        periodo: 'AnoCorrente',
        pagina: paginaAtual,
        qtdPorPagina: qtdPorPagina,
      });
      
      let dadosArray: any[] = [];
      if (Array.isArray(dadosPagina)) {
        dadosArray = dadosPagina;
      } else if (dadosPagina && typeof dadosPagina === 'object') {
        dadosArray = (dadosPagina as any).Itens || (dadosPagina as any).data || (dadosPagina as any).items || [];
      }
      
      osData = osData.concat(dadosArray);
      
      if (dadosArray.length < qtdPorPagina) {
        temMaisDados = false;
      } else {
        paginaAtual++;
      }
    }

    // Garantir que osData é um array válido antes de aplicar filtro
    if (!Array.isArray(osData)) {
      osData = [];
    }

    // Aplicar filtro de oficinas habilitadas
    osData = await filterOSByWorkshop(osData);

    // Extrair tipos únicos das OS
    const tiposUnicosOS = new Set<string>();
    osData.forEach((os: any) => {
      const tipo = (os.TipoDeManutencao || os.TipoManutencao || '').toString().trim();
      if (tipo && tipo !== '') {
        tiposUnicosOS.add(tipo);
      }
    });

    console.log(`[normalize-types] Encontrados ${tiposUnicosOS.size} tipos únicos nas OS`);

    // Buscar todas as configurações existentes
    const configsExistentes = await prisma.systemConfig.findMany({
      where: {
        category: 'maintenance_type',
      },
    });

    console.log(`[normalize-types] Encontradas ${configsExistentes.length} configurações existentes`);

    // Criar mapa de tipos normalizados (lowercase, trimmed) para configs existentes
    const configMap = new Map<string, any>();
    configsExistentes.forEach((config) => {
      const keyNormalizada = config.key.toLowerCase().trim();
      if (!configMap.has(keyNormalizada)) {
        configMap.set(keyNormalizada, config);
      }
    });

    // Processar cada tipo encontrado nas OS
    const resultados: any[] = [];
    let criados = 0;
    let atualizados = 0;
    let mantidos = 0;

    for (const tipoOS of tiposUnicosOS) {
      const tipoNormalizado = tipoOS.toLowerCase().trim();
      
      // Procurar configuração existente (case-insensitive)
      const configExistente = configMap.get(tipoNormalizado);
      
      if (configExistente) {
        // Se encontrou, verificar se precisa atualizar a key para corresponder exatamente
        if (configExistente.key !== tipoOS) {
          // Atualizar a key para corresponder exatamente ao tipo da OS
          await prisma.systemConfig.update({
            where: { id: configExistente.id },
            data: { key: tipoOS },
          });
          resultados.push({
            tipo: tipoOS,
            acao: 'atualizado',
            keyAntiga: configExistente.key,
            keyNova: tipoOS,
            value: configExistente.value,
          });
          atualizados++;
          console.log(`[normalize-types] ✅ Atualizado: "${configExistente.key}" → "${tipoOS}"`);
        } else {
          resultados.push({
            tipo: tipoOS,
            acao: 'mantido',
            key: tipoOS,
            value: configExistente.value,
          });
          mantidos++;
        }
      } else {
        // Não encontrou - criar nova configuração (não classificada)
        // NÃO criar automaticamente - apenas reportar
        resultados.push({
          tipo: tipoOS,
          acao: 'não encontrado',
          key: tipoOS,
          value: null,
          mensagem: 'Tipo não está na tabela SystemConfig - precisa ser classificado manualmente',
        });
      }
    }

    // Limpar cache
    global._maintenanceTypesCache = undefined;

    res.json({
      totalTiposOS: tiposUnicosOS.size,
      totalConfigsExistentes: configsExistentes.length,
      criados: 0, // Não criamos automaticamente
      atualizados: atualizados,
      mantidos: mantidos,
      naoEncontrados: resultados.filter(r => r.acao === 'não encontrado').length,
      resultados: resultados,
      mensagem: 'Tipos normalizados. Tipos não encontrados precisam ser classificados manualmente na página de Configurações.',
    });
  } catch (e: any) {
    console.error('[normalize-types] Erro:', e);
    res.status(500).json({ error: e?.message });
  }
});

// Endpoint de debug para verificar tipos classificados como corretiva
dashboard.get('/debug/corretivas', async (req, res) => {
  try {
    if (USE_MOCK) {
      return res.json({ message: 'Modo mock ativo', tipos: ['corretiva', 'corretivo', 'correção', 'correcao'] });
    }

    const { getPrisma } = await import('../services/prismaService');
    const prisma = await getPrisma();
    if (!prisma) {
      return res.json({ error: 'Prisma não disponível' });
    }

    // Buscar TODAS as configurações de tipos de manutenção
    const todasConfigs = await prisma.systemConfig.findMany({
      where: {
        category: 'maintenance_type',
      },
    });

    // Separar por classificação
    const corretivas = todasConfigs.filter(c => c.value.toLowerCase() === 'corretiva' && c.active);
    const preventivas = todasConfigs.filter(c => c.value.toLowerCase() === 'preventiva' && c.active);
    const aguardando = todasConfigs.filter(c => c.value.toLowerCase() === 'aguardando_compras' && c.active);
    const outros = todasConfigs.filter(c => 
      !['corretiva', 'preventiva', 'aguardando_compras'].includes(c.value.toLowerCase())
    );

    res.json({
      totalConfigs: todasConfigs.length,
      corretivas: {
        total: corretivas.length,
        tipos: corretivas.map(c => ({ key: c.key, value: c.value, active: c.active })),
      },
      preventivas: {
        total: preventivas.length,
        tipos: preventivas.map(c => ({ key: c.key, value: c.value, active: c.active })),
      },
      aguardando_compras: {
        total: aguardando.length,
        tipos: aguardando.map(c => ({ key: c.key, value: c.value, active: c.active })),
      },
      outros: {
        total: outros.length,
        tipos: outros.map(c => ({ key: c.key, value: c.value, active: c.active })),
      },
      todas: todasConfigs.map(c => ({ key: c.key, value: c.value, active: c.active })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

// Endpoint de debug para testar uma OS específica
dashboard.get('/debug/test-os', async (req, res) => {
  try {
    const tipoTeste = req.query.tipo as string;
    if (!tipoTeste) {
      return res.status(400).json({ error: 'Parâmetro "tipo" é obrigatório' });
    }

    // Simular uma OS
    const osTeste = {
      OS: 'TEST-001',
      TipoDeManutencao: tipoTeste,
      SituacaoDaOS: 'Aberta',
    };

    const resultado = await isOSCorretiva(osTeste);

    // Buscar configuração correspondente
    let configEncontrada = null;
    if (!USE_MOCK) {
      const { getPrisma } = await import('../services/prismaService');
      const prisma = await getPrisma();
      if (prisma) {
        // Busca exata
        configEncontrada = await prisma.systemConfig.findUnique({
          where: {
            category_key: {
              category: 'maintenance_type',
              key: tipoTeste,
            },
          },
        });

        // Se não encontrou, buscar todas e fazer match case-insensitive
        if (!configEncontrada) {
          const todasConfigs = await prisma.systemConfig.findMany({
            where: {
              category: 'maintenance_type',
              active: true,
            },
          });
          configEncontrada = todasConfigs.find(c => 
            c.key.toLowerCase().trim() === tipoTeste.toLowerCase().trim()
          ) || null;
        }
      }
    }

    res.json({
      tipoTestado: tipoTeste,
      resultado: resultado,
      configEncontrada: configEncontrada ? {
        key: configEncontrada.key,
        value: configEncontrada.value,
        active: configEncontrada.active,
      } : null,
      mensagem: resultado 
        ? '✅ Este tipo É corretiva e será INCLUÍDO'
        : configEncontrada
          ? `❌ Este tipo está classificado como "${configEncontrada.value}" e será EXCLUÍDO`
          : '❌ Este tipo NÃO está classificado e será EXCLUÍDO',
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

/**
 * Verifica se uma OS está classificada como CORRETIVA nas configurações do sistema
 * Retorna true APENAS se o tipo estiver explicitamente classificado como "corretiva"
 * Retorna false se:
 * - Não estiver classificado
 * - Estiver classificado como "preventiva"
 * - Estiver classificado como "aguardando_compras"
 */
export async function isOSCorretiva(os: any): Promise<boolean> {
  const tipoManutencao = (os.TipoDeManutencao || os.TipoManutencao || '').toString().trim();
  
  if (!tipoManutencao || tipoManutencao.trim() === '') {
    return false; // Sem tipo = não é corretiva
  }
  
  if (USE_MOCK) {
    // Em mock, verificar padrões conhecidos de corretivas
    const tipoNormalizado = tipoManutencao.toLowerCase();
    const padroesCorretivos = ['corretiva', 'corretivo', 'correção', 'correcao'];
    const isCorretiva = padroesCorretivos.some(padrao => tipoNormalizado.includes(padrao));
    if (isCorretiva) {
      console.log(`[isOSCorretiva] MOCK ✅ É corretiva: OS ${os.OS || os.CodigoSerialOS || 'N/A'}: Tipo "${tipoManutencao}" - INCLUIR`);
    }
    return isCorretiva;
  }
  
  try {
    const { getPrisma } = await import('../services/prismaService');
    const prisma = await getPrisma();
    if (!prisma) {
      console.error(`[isOSCorretiva] Prisma não disponível para OS ${os.OS || os.CodigoSerialOS || 'N/A'}`);
      return false; // Sem Prisma = não verificar, excluir por segurança
    }
    
    // Buscar classificação específica do tipo de manutenção na tabela SystemConfig
    // IMPORTANTE: A busca é case-sensitive no campo 'key', então precisa ser exatamente igual
    let config = await prisma.systemConfig.findUnique({
      where: {
        category_key: {
          category: 'maintenance_type',
          key: tipoManutencao, // Busca exata do tipo (case-sensitive)
        },
      },
    });
    
    // Se não encontrou com busca exata, tentar buscar todas e fazer comparação case-insensitive
    // Cache das configurações para evitar múltiplas queries
    if (!config) {
      // Usar cache estático para evitar múltiplas queries
      if (!global._maintenanceTypesCache) {
        global._maintenanceTypesCache = await prisma.systemConfig.findMany({
          where: {
            category: 'maintenance_type',
            active: true,
          },
        });
        console.log(`[isOSCorretiva] Cache de tipos carregado: ${global._maintenanceTypesCache.length} tipos`);
      }
      
      // Procurar por match case-insensitive no cache
      const configEncontrada = global._maintenanceTypesCache.find(c => 
        c.key.toLowerCase().trim() === tipoManutencao.toLowerCase().trim()
      );
      
      if (configEncontrada) {
        config = configEncontrada;
        console.log(`[isOSCorretiva] ⚠️ Match case-insensitive: Tipo na OS "${tipoManutencao}" encontrado como "${config.key}" na tabela`);
      }
    }
    
    // Se não encontrou classificação, EXCLUIR (não classificado)
    if (!config) {
      // Log apenas para os primeiros 10 tipos não encontrados para não poluir muito
      if (Math.random() < 0.1) {
        console.log(`[isOSCorretiva] ❌ Não classificado: Tipo "${tipoManutencao}" - EXCLUIR`);
      }
      return false;
    }
    
    if (!config.active) {
      console.log(`[isOSCorretiva] ❌ Inativo: Tipo "${tipoManutencao}" classificado como "${config.value}" mas inativo - EXCLUIR`);
      return false;
    }
    
    const classificacao = config.value.toLowerCase().trim();
    const isCorretiva = classificacao === 'corretiva';
    
    if (isCorretiva) {
      console.log(`[isOSCorretiva] ✅ É corretiva: OS ${os.OS || os.CodigoSerialOS || 'N/A'}: Tipo "${tipoManutencao}" classificado como "${classificacao}" - INCLUIR`);
    } else {
      // Log apenas ocasionalmente para não poluir
      if (Math.random() < 0.05) {
        console.log(`[isOSCorretiva] ❌ Não é corretiva: Tipo "${tipoManutencao}" classificado como "${classificacao}" - EXCLUIR`);
      }
    }
    
    // Apenas retornar true se for EXPLICITAMENTE classificado como "corretiva"
    return isCorretiva;
  } catch (e) {
    console.error(`[isOSCorretiva] Erro ao verificar tipo "${tipoManutencao}":`, e);
    return false; // Em caso de erro, excluir por segurança
  }
}

/**
 * Verifica se uma OS deve ser considerada como "em manutenção" para o cálculo de disponibilidade
 * Critérios:
 * - Situação deve ser "Aberta" (não pode ser "Cancelada", "Fechada", etc)
 * - Tipo de manutenção deve ser EXPLICITAMENTE classificado como "Corretiva" nas configurações
 */
export async function isOSInMaintenance(os: any): Promise<boolean> {
  // Verificar situação - excluir canceladas e outras situações fechadas
  const situacao = (os.SituacaoDaOS || os.Situacao || '').toString().trim().toLowerCase();
  const situacoesExcluidas = ['cancelada', 'cancelado', 'fechada', 'fechado', 'concluída', 'concluida', 'encerrada', 'encerrado'];
  if (situacoesExcluidas.includes(situacao)) {
    return false;
  }
  
  // Verificar se está aberta
  const situacoesAbertas = ['aberta', 'aberto', 'em andamento', 'pendente'];
  if (!situacoesAbertas.includes(situacao)) {
    return false;
  }
  
  // Verificar se é corretiva usando a função que verifica explicitamente nas configurações
  return await isOSCorretiva(os);
}

/**
 * Verifica se uma OS deve aparecer na lista de equipamentos em manutenção
 * Critérios:
 * - Situação deve ser "Aberta" (não pode ser "Cancelada", "Fechada", etc)
 * - Tipo de manutenção deve ser EXPLICITAMENTE classificado como "Corretiva" nas configurações
 */
export async function isOSInMaintenanceList(os: any): Promise<boolean> {
  // Verificar situação - excluir canceladas e outras situações fechadas
  const situacao = (os.SituacaoDaOS || os.Situacao || '').toString().trim().toLowerCase();
  const situacoesExcluidas = ['cancelada', 'cancelado', 'fechada', 'fechado', 'concluída', 'concluida', 'encerrada', 'encerrado'];
  if (situacoesExcluidas.includes(situacao)) {
    return false;
  }
  
  // Verificar se está aberta
  const situacoesAbertas = ['aberta', 'aberto', 'em andamento', 'pendente'];
  if (!situacoesAbertas.includes(situacao)) {
    return false;
  }
  
  // Verificar se é corretiva usando a função que verifica explicitamente nas configurações
  return await isOSCorretiva(os);
}

// GET /api/dashboard/availability - Calcular disponibilidade de equipamentos
dashboard.get('/availability', async (req, res) => {
  try {
    // Filtro de setores (array de IDs de setores)
    const setoresFilter = req.query.setores 
      ? (req.query.setores as string).split(',').map(s => parseInt(s.trim())).filter(Boolean)
      : null;

    const cacheKey = generateCacheKey('dashboard:availability', { setoresFilter });
    
    // Tentar buscar do cache primeiro
    let cachedData: any = null;
    // SEMPRE invalidar cache para garantir dados atualizados das configurações
    // if (!USE_MOCK && req.query.forceRefresh !== 'true') {
    //   cachedData = await getCache<any>(cacheKey, CACHE_TTL);
    //   if (cachedData) {
    //     console.log('[dashboard:availability] Dados carregados do cache');
    //     return res.json(cachedData);
    //   }
    // }

    // Buscar equipamentos
    const equipamentosRaw = await dataSource.equipamentos({
      apenasAtivos: true,
      incluirComponentes: false,
      incluirCustoSubstituicao: false,
    });
    
    // Garantir que equipamentos é um array (mesma lógica do inventário)
    const equipamentos = Array.isArray(equipamentosRaw) 
      ? equipamentosRaw 
      : (equipamentosRaw as any)?.Itens || (equipamentosRaw as any)?.data || (equipamentosRaw as any)?.items || [];
    
    console.log('[dashboard:availability] Equipamentos carregados:', equipamentos.length);
    console.log('[dashboard:availability] Tipo de equipamentos:', Array.isArray(equipamentos) ? 'array' : typeof equipamentos);

    // Filtrar por setores se fornecido - mesma lógica do inventário
    let equipamentosFiltrados = equipamentos;
    if (setoresFilter && setoresFilter.length > 0) {
      // Buscar nomes dos setores usando SectorMapping do banco (mesma lógica do inventário)
      let sectorNamesToMatch: string[] = [];
      try {
        const { getPrisma } = await import('../services/prismaService');
        const prismaClient = await getPrisma();
        if (prismaClient) {
          const sectorMappings = await prismaClient.sectorMapping.findMany({
            where: {
              systemSectorId: { in: setoresFilter },
              active: true,
            },
          });
          
          // Criar lista com todos os nomes de setores (effortSectorName prioritário)
          sectorMappings.forEach((mapping) => {
            if (mapping.effortSectorName) {
              sectorNamesToMatch.push(mapping.effortSectorName);
            }
            if (mapping.systemSectorName && mapping.systemSectorName !== mapping.effortSectorName) {
              sectorNamesToMatch.push(mapping.systemSectorName);
            }
          });
          
          console.log('[dashboard:availability] Setores mapeados encontrados no banco:', sectorNamesToMatch);
        }
        
        // Se não encontrou mapeamento no banco, buscar nomes dos setores da API de investimentos
        if (sectorNamesToMatch.length === 0) {
          try {
            const sectorsRes = await fetch(`${req.protocol}://${req.get('host')}/api/ecm/investments/sectors/list`);
            if (sectorsRes.ok) {
              const sectorsData = await sectorsRes.json();
              const sectorsFromApi = sectorsData.sectors
                ?.filter((s: any) => setoresFilter.includes(s.id))
                .map((s: any) => s.name) || [];
              
              sectorNamesToMatch = sectorsFromApi;
              console.log('[dashboard:availability] Setores encontrados na API de investimentos:', sectorNamesToMatch);
            }
          } catch (apiError: any) {
            console.warn('[dashboard:availability] Erro ao buscar setores da API:', apiError?.message);
          }
        }
      } catch (error: any) {
        console.warn('[dashboard:availability] Erro ao buscar mapeamento de setores:', error?.message);
      }
      
      // Função auxiliar para normalizar string (remove acentos, espaços extras)
      const normalizarString = (str: string): string => {
        return str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove acentos
          .replace(/\s+/g, ' ') // Normaliza espaços
          .trim();
      };
      
      // Usar utilitário getSectorIdFromItem como fallback
      equipamentosFiltrados = equipamentos.filter((eq: any) => {
        const eqSetor = eq.Setor || '';
        
        // Se temos mapeamento do banco, usar comparação flexível por nome do setor
        if (sectorNamesToMatch.length > 0) {
          const eqSetorNormalizado = normalizarString(eqSetor);
          for (const sectorName of sectorNamesToMatch) {
            const sectorNameNormalizado = normalizarString(sectorName);
            
            // Comparação exata
            if (eqSetorNormalizado === sectorNameNormalizado) {
              return true;
            }
            
            // Verificar se o nome do setor está contido no setor do equipamento
            if (eqSetorNormalizado.includes(sectorNameNormalizado) || sectorNameNormalizado.includes(eqSetorNormalizado)) {
              return true;
            }
            
            // Verificar palavras principais (para nomes compostos)
            const palavrasSetor = sectorNameNormalizado.split(/\s+/).filter(w => w.length >= 3);
            if (palavrasSetor.length >= 2) {
              const palavrasCoincidentes = palavrasSetor.filter(palavra => eqSetorNormalizado.includes(palavra));
              if (palavrasCoincidentes.length >= 2) {
                return true;
              }
            }
          }
        }
        
        // Fallback: usar SetorId do equipamento ou converter nome para ID
        const sectorId = getSectorIdFromItem(eq);
        if (!sectorId) return false;
        return setoresFilter.includes(sectorId);
      });
      
      console.log('[dashboard:availability] Filtro de setores (IDs):', setoresFilter);
      console.log('[dashboard:availability] Nomes de setores para filtrar:', sectorNamesToMatch);
      console.log('[dashboard:availability] Equipamentos antes do filtro:', equipamentos.length);
      console.log('[dashboard:availability] Equipamentos após filtro de setores:', equipamentosFiltrados.length);
      
      // Debug: mostrar alguns exemplos de setores encontrados nos equipamentos
      if (equipamentosFiltrados.length === 0 && equipamentos.length > 0) {
        const setoresEncontrados = new Set(equipamentos.slice(0, 50).map((eq: any) => eq.Setor || '').filter((s: string) => s));
        console.log('[dashboard:availability] Exemplos de setores encontrados nos equipamentos (primeiros 50):', Array.from(setoresEncontrados).slice(0, 10));
      } else if (equipamentosFiltrados.length > 0) {
        console.log('[dashboard:availability] Exemplo de equipamento filtrado:', {
          Id: equipamentosFiltrados[0].Id,
          Setor: equipamentosFiltrados[0].Setor,
          SetorId: equipamentosFiltrados[0].SetorId || getSectorIdFromItem(equipamentosFiltrados[0]),
        });
      }
    } else {
      console.log('[dashboard:availability] Sem filtro de setores, usando todos os equipamentos:', equipamentos.length);
    }

    // Buscar OS abertas do ano corrente - APENAS CORRETIVAS
    const currentYear = new Date().getFullYear();
    const periodo = 'AnoCorrente';
    
    let osAbertas: any[] = [];
    let paginaAtual = 0;
    const qtdPorPagina = 50000;
    let temMaisDados = true;
    
    while (temMaisDados && paginaAtual < 10) {
      const dadosPagina = await dataSource.osResumida({
        tipoManutencao: 'Todos',
        periodo: periodo,
        pagina: paginaAtual,
        qtdPorPagina: qtdPorPagina,
      });
      
      let dadosArray: any[] = [];
      if (Array.isArray(dadosPagina)) {
        dadosArray = dadosPagina;
      } else if (dadosPagina && typeof dadosPagina === 'object') {
        dadosArray = (dadosPagina as any).Itens || (dadosPagina as any).data || (dadosPagina as any).items || [];
      }
      
      if (dadosArray.length === 0) {
        temMaisDados = false;
      } else {
        // Aplicar filtro de oficinas habilitadas primeiro
        const dadosArrayFiltrados = await filterOSByWorkshop(dadosArray);
        
        // Filtrar APENAS OS corretivas abertas (não canceladas)
        const osAbertasPagina = (await Promise.all(
          dadosArrayFiltrados.map(async (os: any) => ({
            os,
            isValid: await isOSInMaintenance(os),
          }))
        )).filter(item => item.isValid).map(item => item.os);
        
        console.log(`[dashboard:availability] Página ${paginaAtual}: ${osAbertasPagina.length} OS corretivas de ${dadosArray.length} total`);
        
        osAbertas = osAbertas.concat(osAbertasPagina);
        
        if (dadosArray.length < qtdPorPagina) {
          temMaisDados = false;
        } else {
          paginaAtual++;
        }
      }
    }

    // Criar mapas para facilitar busca de equipamentos
    const tagToIdMap = new Map<string, number>();
    const nomeToIdMap = new Map<string, number>();
    
    equipamentosFiltrados.forEach((eq: any) => {
      if (eq.Tag) tagToIdMap.set(eq.Tag.trim().toUpperCase(), eq.Id);
      if (eq.Equipamento) nomeToIdMap.set(eq.Equipamento.trim().toUpperCase(), eq.Id);
    });

    // Criar Set com IDs de equipamentos que têm OS corretiva aberta
    const equipamentosEmManutencao = new Set<number>();
    
    osAbertas.forEach((os: any) => {
      let equipamentoId: number | undefined;
      
      // Prioridade 1: EquipamentoId direto
      if (os.EquipamentoId) {
        equipamentoId = os.EquipamentoId;
      }
      // Prioridade 2: Tag (mais confiável)
      else if (os.Tag) {
        const tagNormalizada = os.Tag.trim().toUpperCase();
        equipamentoId = tagToIdMap.get(tagNormalizada);
      }
      // Prioridade 3: Nome do equipamento
      else if (os.Equipamento) {
        const nomeNormalizado = os.Equipamento.trim().toUpperCase();
        equipamentoId = nomeToIdMap.get(nomeNormalizado);
      }
      
      if (equipamentoId) {
        equipamentosEmManutencao.add(equipamentoId);
      }
    });

    // Calcular estatísticas
    const totalEquipamentos = equipamentosFiltrados.length;
    const emManutencao = equipamentosFiltrados.filter((eq: any) => {
      return equipamentosEmManutencao.has(eq.Id);
    }).length;
    const disponiveis = totalEquipamentos - emManutencao;

    const percentualDisponivel = totalEquipamentos > 0 
      ? (disponiveis / totalEquipamentos) * 100 
      : 0;
    const percentualEmManutencao = totalEquipamentos > 0 
      ? (emManutencao / totalEquipamentos) * 100 
      : 0;

    // Buscar nomes dos setores - mesma lógica do inventário
    const setoresFiltradosNomes: string[] = setoresFilter && setoresFilter.length > 0
      ? await getSectorNamesFromUserSector(setoresFilter, equipamentos, undefined, req)
      : [];

    const result = {
      totalEquipamentos,
      disponiveis,
      emManutencao,
      percentualDisponivel: Number(percentualDisponivel.toFixed(2)),
      percentualEmManutencao: Number(percentualEmManutencao.toFixed(2)),
      setoresFiltrados: setoresFilter || null,
      setoresFiltradosNomes: setoresFiltradosNomes.length > 0 ? setoresFiltradosNomes : null,
    };

    // Salvar no cache
    if (!USE_MOCK) {
      await setCache(cacheKey, result);
      console.log('[dashboard:availability] Dados salvos no cache');
    }

    res.json(result);
  } catch (e: any) {
    console.error('[dashboard:availability] Erro:', e);
    res.status(500).json({ error: true, message: e?.message });
  }
});

// GET /api/dashboard/equipment-in-maintenance - Listar equipamentos em manutenção
dashboard.get('/equipment-in-maintenance', async (req, res) => {
  try {
    // Filtro de setores (array de IDs de setores)
    const setoresFilter = req.query.setores 
      ? (req.query.setores as string).split(',').map(s => parseInt(s.trim())).filter(Boolean)
      : null;

    const limit = parseInt(req.query.limit as string) || 20; // Limite padrão de 20 itens

    const cacheKey = generateCacheKey('dashboard:equipment-in-maintenance', { setoresFilter, limit });
    
    // Tentar buscar do cache primeiro
    let cachedData: any = null;
    // SEMPRE invalidar cache para garantir dados atualizados das configurações
    // if (!USE_MOCK && req.query.forceRefresh !== 'true') {
    //   cachedData = await getCache<any>(cacheKey, CACHE_TTL);
    //   if (cachedData) {
    //     console.log('[dashboard:equipment-in-maintenance] Dados carregados do cache');
    //     return res.json(cachedData);
    //   }
    // }

    // Buscar equipamentos
    const equipamentosRaw = await dataSource.equipamentos({
      apenasAtivos: true,
      incluirComponentes: false,
      incluirCustoSubstituicao: false,
    });
    const equipamentos = Array.isArray(equipamentosRaw) ? equipamentosRaw : [];

    // Filtrar por setores se fornecido - mesma lógica do inventário
    let equipamentosFiltrados = equipamentos;
    if (setoresFilter && setoresFilter.length > 0) {
      // Buscar nomes dos setores usando SectorMapping do banco (mesma lógica do inventário)
      let sectorNamesToMatch: string[] = [];
      try {
        const { getPrisma } = await import('../services/prismaService');
        const prismaClient = await getPrisma();
        if (prismaClient) {
          const sectorMappings = await prismaClient.sectorMapping.findMany({
            where: {
              systemSectorId: { in: setoresFilter },
              active: true,
            },
          });
          
          // Criar lista com todos os nomes de setores (effortSectorName prioritário)
          sectorMappings.forEach((mapping) => {
            if (mapping.effortSectorName) {
              sectorNamesToMatch.push(mapping.effortSectorName);
            }
            if (mapping.systemSectorName && mapping.systemSectorName !== mapping.effortSectorName) {
              sectorNamesToMatch.push(mapping.systemSectorName);
            }
          });
        }
        
        // Se não encontrou mapeamento no banco, buscar nomes dos setores da API de investimentos
        if (sectorNamesToMatch.length === 0) {
          try {
            const sectorsRes = await fetch(`${req.protocol}://${req.get('host')}/api/ecm/investments/sectors/list`);
            if (sectorsRes.ok) {
              const sectorsData = await sectorsRes.json();
              const sectorsFromApi = sectorsData.sectors
                ?.filter((s: any) => setoresFilter.includes(s.id))
                .map((s: any) => s.name) || [];
              
              sectorNamesToMatch = sectorsFromApi;
            }
          } catch (apiError: any) {
            console.warn('[dashboard:equipment-in-maintenance] Erro ao buscar setores da API:', apiError?.message);
          }
        }
      } catch (error: any) {
        console.warn('[dashboard:equipment-in-maintenance] Erro ao buscar mapeamento de setores:', error?.message);
      }
      
      // Função auxiliar para normalizar string (remove acentos, espaços extras)
      const normalizarString = (str: string): string => {
        return str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove acentos
          .replace(/\s+/g, ' ') // Normaliza espaços
          .trim();
      };
      
      // Usar utilitário getSectorIdFromItem como fallback
      equipamentosFiltrados = equipamentos.filter((eq: any) => {
        const eqSetor = eq.Setor || '';
        
        // Se temos mapeamento do banco, usar comparação flexível por nome do setor
        if (sectorNamesToMatch.length > 0) {
          const eqSetorNormalizado = normalizarString(eqSetor);
          for (const sectorName of sectorNamesToMatch) {
            const sectorNameNormalizado = normalizarString(sectorName);
            
            // Comparação exata
            if (eqSetorNormalizado === sectorNameNormalizado) {
              return true;
            }
            
            // Verificar se o nome do setor está contido no setor do equipamento
            if (eqSetorNormalizado.includes(sectorNameNormalizado) || sectorNameNormalizado.includes(eqSetorNormalizado)) {
              return true;
            }
            
            // Verificar palavras principais (para nomes compostos)
            const palavrasSetor = sectorNameNormalizado.split(/\s+/).filter(w => w.length >= 3);
            if (palavrasSetor.length >= 2) {
              const palavrasCoincidentes = palavrasSetor.filter(palavra => eqSetorNormalizado.includes(palavra));
              if (palavrasCoincidentes.length >= 2) {
                return true;
              }
            }
          }
        }
        
        // Fallback: usar SetorId do equipamento ou converter nome para ID
        const sectorId = getSectorIdFromItem(eq);
        if (!sectorId) return false;
        return setoresFilter.includes(sectorId);
      });
    }

    // Buscar OS abertas do ano corrente - APENAS CORRETIVAS para a lista
    const currentYear = new Date().getFullYear();
    const periodo = 'AnoCorrente';
    
    let osAbertas: any[] = [];
    let paginaAtual = 0;
    const qtdPorPagina = 50000;
    let temMaisDados = true;
    
    while (temMaisDados && paginaAtual < 10) {
      const dadosPagina = await dataSource.osResumida({
        tipoManutencao: 'Todos',
        periodo: periodo,
        pagina: paginaAtual,
        qtdPorPagina: qtdPorPagina,
      });
      
      let dadosArray: any[] = [];
      if (Array.isArray(dadosPagina)) {
        dadosArray = dadosPagina;
      } else if (dadosPagina && typeof dadosPagina === 'object') {
        dadosArray = (dadosPagina as any).Itens || (dadosPagina as any).data || (dadosPagina as any).items || [];
      }
      
      if (dadosArray.length === 0) {
        temMaisDados = false;
      } else {
        // Aplicar filtro de oficinas habilitadas primeiro
        const dadosArrayFiltrados = await filterOSByWorkshop(dadosArray);
        
        // Filtrar APENAS OS corretivas abertas (não canceladas) - apenas corretivas para a lista
        const osAbertasPagina = (await Promise.all(
          dadosArrayFiltrados.map(async (os: any) => ({
            os,
            isValid: await isOSInMaintenanceList(os),
          }))
        )).filter(item => item.isValid).map(item => item.os);
        
        console.log(`[dashboard:equipment-in-maintenance] Página ${paginaAtual}: ${osAbertasPagina.length} OS corretivas de ${dadosArray.length} total`);
        
        osAbertas = osAbertas.concat(osAbertasPagina);
        
        if (dadosArray.length < qtdPorPagina) {
          temMaisDados = false;
        } else {
          paginaAtual++;
        }
      }
    }

    // Criar mapas para facilitar busca de equipamentos
    const tagToIdMap = new Map<string, number>();
    const nomeToIdMap = new Map<string, number>();
    const equipamentoMap = new Map<number, any>();
    
    equipamentosFiltrados.forEach((eq: any) => {
      if (eq.Tag) tagToIdMap.set(eq.Tag.trim().toUpperCase(), eq.Id);
      if (eq.Equipamento) nomeToIdMap.set(eq.Equipamento.trim().toUpperCase(), eq.Id);
      equipamentoMap.set(eq.Id, eq);
    });

    // Criar uma entrada para cada OS individualmente (sem agrupar por equipamento)
    const osEmManutencao: any[] = [];
    
    osAbertas.forEach((os: any) => {
      let equipamentoId: number | undefined;
      
      // Prioridade 1: EquipamentoId direto
      if (os.EquipamentoId) {
        equipamentoId = os.EquipamentoId;
      }
      // Prioridade 2: Tag (mais confiável)
      else if (os.Tag) {
        const tagNormalizada = os.Tag.trim().toUpperCase();
        equipamentoId = tagToIdMap.get(tagNormalizada);
      }
      // Prioridade 3: Nome do equipamento
      else if (os.Equipamento) {
        const nomeNormalizado = os.Equipamento.trim().toUpperCase();
        equipamentoId = nomeToIdMap.get(nomeNormalizado);
      }
      
      if (equipamentoId && equipamentoMap.has(equipamentoId)) {
        const equipamento = equipamentoMap.get(equipamentoId);
        
        // Criar uma entrada individual para cada OS
        osEmManutencao.push({
          id: equipamento.Id,
          tag: equipamento.Tag || 'N/A',
          nome: equipamento.Equipamento || 'Sem nome',
          setor: equipamento.Setor || 'Não informado',
          setorId: getSectorIdFromItem(equipamento),
          os: {
            codigo: os.OS || os.CodigoSerialOS || 'N/A',
            codigoSerial: os.CodigoSerialOS,
            abertura: os.Abertura || os.DataAbertura || null,
            tipoManutencao: os.TipoDeManutencao || os.TipoManutencao || 'Não informado',
            prioridade: os.Prioridade || 'Não informado',
            situacao: os.SituacaoDaOS || os.Situacao || 'Aberta',
            ocorrencia: os.Ocorrencia || os.Ocorrência || os.Descricao || os.Descrição || os.Problema || os.Relato || null,
            // Incluir todos os dados completos da OS
            dadosCompletos: os,
          },
        });
      }
    });

    // Ordenar por data de abertura (mais antiga primeiro) e limitar resultados
    const equipamentosEmManutencao = osEmManutencao
      .sort((a, b) => {
        const dataA = a.os.abertura ? new Date(a.os.abertura).getTime() : 0;
        const dataB = b.os.abertura ? new Date(b.os.abertura).getTime() : 0;
        return dataA - dataB; // Mais antiga primeiro
      })
      .slice(0, limit); // Limitar resultados

    // Buscar nomes dos setores - mesma lógica do inventário
    const setoresFiltradosNomes: string[] = setoresFilter && setoresFilter.length > 0
      ? await getSectorNamesFromUserSector(setoresFilter, equipamentos, undefined, req)
      : [];

    const result = {
      equipamentos: equipamentosEmManutencao,
      total: equipamentosEmManutencao.length,
      setoresFiltrados: setoresFilter || null,
      setoresFiltradosNomes: setoresFiltradosNomes.length > 0 ? setoresFiltradosNomes : null,
    };

    // Salvar no cache
    if (!USE_MOCK) {
      await setCache(cacheKey, result);
      console.log('[dashboard:equipment-in-maintenance] Dados salvos no cache');
    }

    res.json(result);
  } catch (e: any) {
    console.error('[dashboard:equipment-in-maintenance] Erro:', e);
    res.status(500).json({ error: true, message: e?.message || 'Erro ao buscar equipamentos em manutenção' });
  }
});

// GET /api/dashboard/critical-monitored-alerts - Buscar alertas de equipamentos críticos/monitorados com OS
dashboard.get('/critical-monitored-alerts', async (req, res) => {
  try {
    // Filtro de setores (array de IDs de setores)
    const setoresFilter = req.query.setores 
      ? (req.query.setores as string).split(',').map(s => parseInt(s.trim())).filter(Boolean)
      : null;

    // Buscar equipamentos críticos e monitorados
    // Função auxiliar para ler flags de equipamentos
    async function readEquipmentFlags(): Promise<{
      criticalFlags: Record<string, boolean>;
      monitoredFlags: Record<string, boolean>;
    }> {
      if (USE_MOCK) {
        try {
          const fs = await import('node:fs/promises');
          const buf = await fs.readFile('./mocks/equipment_flags.json', 'utf-8');
          const data = JSON.parse(buf);
          return {
            criticalFlags: data.criticalFlags || {},
            monitoredFlags: data.monitoredFlags || {},
          };
        } catch {
          return { criticalFlags: {}, monitoredFlags: {} };
        }
      }
      
      const { getPrisma } = await import('../services/prismaService');
      const prismaClient = await getPrisma();
      if (!prismaClient) return { criticalFlags: {}, monitoredFlags: {} };
      
      const flags = await prismaClient.equipmentFlag.findMany({
        where: {
          OR: [{ criticalFlag: true }, { monitoredFlag: true }],
        },
      });
      
      const criticalFlags: Record<string, boolean> = {};
      const monitoredFlags: Record<string, boolean> = {};
      
      flags.forEach((flag) => {
        const id = String(flag.effortId);
        if (flag.criticalFlag) criticalFlags[id] = true;
        if (flag.monitoredFlag) monitoredFlags[id] = true;
      });
      
      return { criticalFlags, monitoredFlags };
    }

    const flags = await readEquipmentFlags();
    
    const criticalEquipmentIds = Object.keys(flags.criticalFlags || {}).map(Number).filter(Boolean);
    const monitoredEquipmentIds = Object.keys(flags.monitoredFlags || {}).map(Number).filter(Boolean);
    const allFlaggedIds = [...new Set([...criticalEquipmentIds, ...monitoredEquipmentIds])];

    if (allFlaggedIds.length === 0) {
      return res.json([]);
    }

    // Buscar equipamentos
    const equipamentos = await dataSource.equipamentos({
      apenasAtivos: true,
      incluirComponentes: false,
      incluirCustoSubstituicao: false,
    });

    const equipamentosArray = Array.isArray(equipamentos) ? equipamentos : (equipamentos?.data || equipamentos?.items || []);

    // Filtrar equipamentos críticos/monitorados
    let equipamentosFlagged = equipamentosArray.filter((eq: any) => {
      return allFlaggedIds.includes(eq.Id);
    });

    // Aplicar filtro de setores se fornecido
    if (setoresFilter && setoresFilter.length > 0) {
      equipamentosFlagged = equipamentosFlagged.filter((eq: any) => {
        const sectorId = getSectorIdFromItem(eq);
        return sectorId && setoresFilter.includes(sectorId);
      });
    }

    // Buscar OS abertas - usar período maior para garantir que encontramos todas
    let osData: any[] = [];
    let paginaAtual = 0;
    const qtdPorPagina = 50000;
    let temMaisDados = true;

    console.log(`[dashboard:critical-monitored-alerts] Buscando OS para ${allFlaggedIds.length} equipamentos críticos/monitorados`);

    while (temMaisDados && paginaAtual < 5) {
      const dadosPagina = await dataSource.osResumida({
        tipoManutencao: 'Todos',
        periodo: 'AnoCorrente', // Mudado de MesCorrente para AnoCorrente
        pagina: paginaAtual,
        qtdPorPagina: qtdPorPagina,
      });

      let dadosArray: any[] = [];
      if (Array.isArray(dadosPagina)) {
        dadosArray = dadosPagina;
      } else if (dadosPagina && typeof dadosPagina === 'object') {
        dadosArray = (dadosPagina as any).Itens || (dadosPagina as any).data || (dadosPagina as any).items || [];
      }

      if (dadosArray.length === 0) {
        temMaisDados = false;
      } else {
        // Aplicar filtro de oficinas habilitadas
        const dadosArrayFiltrados = await filterOSByWorkshop(dadosArray);
        
        // Filtrar apenas OS corretivas abertas - verificação mais abrangente
        const osAbertasPagina = (await Promise.all(
          dadosArrayFiltrados.map(async (os: any) => {
            // Verificar se está aberta
            const situacao = (os.SituacaoDaOS || os.Situacao || os.Status || '').toString().trim().toLowerCase();
            const situacoesExcluidas = ['cancelada', 'cancelado', 'fechada', 'fechado', 'concluída', 'concluida', 'encerrada', 'encerrado', 'resolvida', 'resolvido'];
            
            // Se está nas situações excluídas, não é aberta
            if (situacoesExcluidas.includes(situacao)) {
              return { os, isValid: false };
            }
            
            // Se está nas situações abertas, verificar se é corretiva
            const situacoesAbertas = ['aberta', 'aberto', 'em andamento', 'pendente', 'em execução', 'em execucao', 'aberta - em andamento'];
            if (situacoesAbertas.includes(situacao)) {
              // Verificar se é corretiva
              const isCorretiva = await isOSCorretiva(os);
              return { os, isValid: isCorretiva };
            }
            
            // Se não está em nenhuma lista conhecida, considerar como aberta se não estiver explicitamente fechada
            // (algumas APIs podem retornar valores diferentes)
            if (situacao !== '' && !situacoesExcluidas.some(excluida => situacao.includes(excluida))) {
              const isCorretiva = await isOSCorretiva(os);
              return { os, isValid: isCorretiva };
            }
            
            return { os, isValid: false };
          })
        )).filter(item => item.isValid).map(item => item.os);

        console.log(`[dashboard:critical-monitored-alerts] Página ${paginaAtual}: ${osAbertasPagina.length} OS corretivas abertas de ${dadosArray.length} total`);

        osData = osData.concat(osAbertasPagina);

        if (dadosArray.length < qtdPorPagina) {
          temMaisDados = false;
        } else {
          paginaAtual++;
        }
      }
    }

    console.log(`[dashboard:critical-monitored-alerts] Total de ${osData.length} OS corretivas abertas encontradas`);

    // Criar mapas para facilitar busca
    const tagToIdMap = new Map<string, number>();
    const nomeToIdMap = new Map<string, number>();
    const equipamentoMap = new Map<number, any>();

    equipamentosFlagged.forEach((eq: any) => {
      if (eq.Tag) tagToIdMap.set(eq.Tag.trim().toUpperCase(), eq.Id);
      if (eq.Equipamento) nomeToIdMap.set(eq.Equipamento.trim().toUpperCase(), eq.Id);
      equipamentoMap.set(eq.Id, eq);
    });

    // Encontrar OS para equipamentos críticos/monitorados
    const alerts: any[] = [];
    let matchedCount = 0;
    let unmatchedOSCount = 0;

    osData.forEach((os: any) => {
      let equipamentoId: number | undefined;

      // Prioridade 1: EquipamentoId direto
      if (os.EquipamentoId) {
        equipamentoId = Number(os.EquipamentoId);
      }
      // Prioridade 2: Tag (mais confiável)
      else if (os.Tag) {
        const tagNormalizada = os.Tag.trim().toUpperCase();
        equipamentoId = tagToIdMap.get(tagNormalizada);
      }
      // Prioridade 3: Nome do equipamento
      else if (os.Equipamento) {
        const nomeNormalizado = os.Equipamento.trim().toUpperCase();
        equipamentoId = nomeToIdMap.get(nomeNormalizado);
      }

      if (equipamentoId && equipamentoMap.has(equipamentoId)) {
        const equipamento = equipamentoMap.get(equipamentoId);
        const isCritical = flags.criticalFlags?.[String(equipamentoId)] === true;
        const isMonitored = flags.monitoredFlags?.[String(equipamentoId)] === true;

        // Só adicionar se for crítico ou monitorado
        if (isCritical || isMonitored) {
          matchedCount++;
          alerts.push({
            equipamentoId: equipamento.Id,
            tag: equipamento.Tag || 'N/A',
            nome: equipamento.Equipamento || 'Sem nome',
            setor: equipamento.Setor || 'Não informado',
            setorId: getSectorIdFromItem(equipamento),
            isCritical,
            isMonitored,
            os: {
              codigo: os.OS || os.CodigoSerialOS || 'N/A',
              codigoSerial: os.CodigoSerialOS,
              abertura: os.Abertura || os.DataAbertura || null,
              tipoManutencao: os.TipoDeManutencao || os.TipoManutencao || 'Não informado',
              prioridade: os.Prioridade || 'Não informado',
              situacao: os.SituacaoDaOS || os.Situacao || 'Não informado',
              ocorrencia: os.Ocorrencia || os.Ocorrência || os.Descricao || os.Descrição || os.Problema || os.Relato || null,
            },
          });
        }
      } else {
        unmatchedOSCount++;
        // Log para debug - apenas as primeiras 5 para não poluir
        if (unmatchedOSCount <= 5) {
          console.log(`[dashboard:critical-monitored-alerts] OS não encontrada para equipamento: OS=${os.OS}, Tag=${os.Tag}, Equipamento=${os.Equipamento}, EquipamentoId=${os.EquipamentoId}`);
        }
      }
    });

    console.log(`[dashboard:critical-monitored-alerts] ${matchedCount} OS encontradas para equipamentos críticos/monitorados, ${unmatchedOSCount} OS sem correspondência`);

    // Remover duplicatas (mesmo equipamento pode ter múltiplas OS)
    const uniqueAlerts = new Map<number, any>();
    alerts.forEach((alert) => {
      if (!uniqueAlerts.has(alert.equipamentoId) || 
          new Date(alert.os.abertura || '9999-12-31') < new Date(uniqueAlerts.get(alert.equipamentoId).os.abertura || '9999-12-31')) {
        uniqueAlerts.set(alert.equipamentoId, alert);
      }
    });

    const result = Array.from(uniqueAlerts.values())
      .sort((a, b) => {
        // Priorizar críticos sobre monitorados
        if (a.isCritical && !b.isCritical) return -1;
        if (!a.isCritical && b.isCritical) return 1;
        // Depois ordenar por data de abertura (mais antiga primeiro)
        const dateA = new Date(a.os.abertura || '9999-12-31').getTime();
        const dateB = new Date(b.os.abertura || '9999-12-31').getTime();
        return dateA - dateB;
      });

    console.log(`[dashboard:critical-monitored-alerts] Retornando ${result.length} alertas (${result.filter(a => a.isCritical).length} críticos, ${result.filter(a => a.isMonitored && !a.isCritical).length} monitorados)`);
    
    // Log detalhado para debug
    if (result.length > 0) {
      console.log(`[dashboard:critical-monitored-alerts] Exemplos de alertas:`, result.slice(0, 3).map(a => ({
        equipamento: a.nome,
        tag: a.tag,
        isCritical: a.isCritical,
        isMonitored: a.isMonitored,
        os: a.os.codigo,
      })));
    } else {
      console.log(`[dashboard:critical-monitored-alerts] Nenhum alerta encontrado. Verificando...`);
      console.log(`[dashboard:critical-monitored-alerts] Equipamentos críticos/monitorados:`, allFlaggedIds.slice(0, 5));
      console.log(`[dashboard:critical-monitored-alerts] Equipamentos encontrados na API:`, equipamentosFlagged.slice(0, 3).map((eq: any) => ({ Id: eq.Id, Tag: eq.Tag, Nome: eq.Equipamento })));
      console.log(`[dashboard:critical-monitored-alerts] Total de OS abertas processadas: ${osData.length}`);
    }
    
    res.json(result);
  } catch (e: any) {
    console.error('[dashboard:critical-monitored-alerts] Erro:', e);
    res.status(500).json({ error: true, message: e?.message || 'Erro ao buscar alertas' });
  }
});
