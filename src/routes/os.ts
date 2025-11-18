// src/routes/os.ts
import { Router } from 'express';
import { dataSource } from '../adapters/dataSource';
import { getCache, setCache, generateCacheKey } from '../services/cacheService';
import { filterOSByWorkshop, filterOSByWorkshopClassification } from '../services/workshopFilterService';

const USE_MOCK = process.env.USE_MOCK === 'true';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

export const os = Router();

os.get('/', async (req, res) => {
  try {
    // Parâmetros de paginação
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const skip = (page - 1) * pageSize;
    
    // Filtros: apenas abertas ou todas, apenas com custo ou todas
    const apenasAbertas = req.query.apenasAbertas === 'true';
    const apenasComCusto = req.query.apenasComCusto === 'true';
    
    // Filtro de setores (array de IDs de setores)
    const setoresFilter = req.query.setores 
      ? (req.query.setores as string).split(',').map(s => parseInt(s.trim())).filter(Boolean)
      : null;

    // Ano vigente (ano atual)
    const currentYear = new Date().getFullYear();
    const periodo = 'AnoCorrente'; // Buscar do ano corrente

    console.log('[os] Iniciando busca de ordens de serviço...');
    console.log('[os] USE_MOCK:', USE_MOCK);
    console.log('[os] Ano vigente:', currentYear);
    console.log('[os] Apenas abertas:', apenasAbertas);
    console.log('[os] Apenas com custo:', apenasComCusto);
    console.log('[os] Paginação:', { page, pageSize, skip });

    // Chave de cache para a lista completa de OS do ano vigente
    const cacheKey = generateCacheKey('os:ano-vigente', { ano: currentYear });
    
    // Limpar cache antigo se necessário
    if (req.query.forceRefresh === 'true') {
      const { deleteCache } = await import('../services/cacheService');
      await deleteCache(cacheKey);
      console.log('[os] Cache limpo, forçando nova busca');
    }
    
    // Tentar buscar do cache primeiro
    let osList: any[] | null = null;
    if (!USE_MOCK && req.query.forceRefresh !== 'true') {
      osList = await getCache<any[]>(cacheKey, CACHE_TTL);
      if (osList) {
        console.log('[os] Dados carregados do cache');
        // Aplicar filtro de oficinas mesmo quando vem do cache (pode ter mudado)
        osList = await filterOSByWorkshop(osList);
        console.log(`[os] OS após filtro de oficinas habilitadas (cache): ${osList.length}`);
        
        // Aplicar filtro de oficinas com classificação (excluir oficinas sem classificação)
        osList = await filterOSByWorkshopClassification(osList);
        console.log(`[os] OS após filtro de oficinas com classificação (cache): ${osList.length}`);
      }
    }

    // Se não estiver em cache, buscar da API
    if (!osList) {
      console.log('[os] Buscando dados da API...');
      
      // Buscar todas as OS do ano (aumentar limite para garantir que pegamos todas)
      // Fazer múltiplas requisições se necessário
      let osData: any[] = [];
      let paginaAtual = 0;
      const qtdPorPagina = 50000; // Aumentar limite
      let temMaisDados = true;
      
      while (temMaisDados && paginaAtual < 10) { // Limite de segurança: máximo 10 páginas
        console.log(`[os] Buscando página ${paginaAtual}...`);
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
          osData = osData.concat(dadosArray);
          // Se retornou menos que o solicitado, provavelmente é a última página
          if (dadosArray.length < qtdPorPagina) {
            temMaisDados = false;
          } else {
            paginaAtual++;
          }
        }
      }
      
      console.log(`[os] Total de OS retornadas da API: ${osData.length}`);

      // Filtrar apenas OS do ano vigente
      const anoInicio = new Date(currentYear, 0, 1);
      const anoFim = new Date(currentYear, 11, 31, 23, 59, 59);
      
      osList = osData.filter((os: any) => {
        // Filtrar apenas por ano
        if (!os.Abertura || os.Abertura.trim() === '') return false;
        try {
          const dataAbertura = new Date(os.Abertura);
          if (isNaN(dataAbertura.getTime())) return false;
          return dataAbertura >= anoInicio && dataAbertura <= anoFim;
        } catch {
          return false;
        }
      });
      
      console.log(`[os] OS do ano vigente após filtro: ${osList.length}`);

      // Aplicar filtro de oficinas habilitadas
      osList = await filterOSByWorkshop(osList);
      console.log(`[os] OS após filtro de oficinas habilitadas: ${osList.length}`);
      
      // Aplicar filtro de oficinas com classificação (excluir oficinas sem classificação)
      osList = await filterOSByWorkshopClassification(osList);
      console.log(`[os] OS após filtro de oficinas com classificação: ${osList.length}`);

      // Log detalhado para debug
      const oficinasEncontradas = [...new Set(osList.map((os: any) => os.Oficina))];
      const situacoesEncontradas = [...new Set(osList.map((os: any) => os.SituacaoDaOS))];
      const abertasDebug = osList.filter((os: any) => {
        const situacao = (os.SituacaoDaOS || '').toString().trim();
        return situacao.toLowerCase() === 'aberta';
      }).length;
      console.log('[os] OS encontradas (todas as oficinas):', osList.length);
      console.log('[os] OS abertas:', abertasDebug);
      console.log('[os] Oficinas encontradas:', oficinasEncontradas.slice(0, 10), '... (total:', oficinasEncontradas.length, ')');
      console.log('[os] Situações encontradas:', situacoesEncontradas);

      // Salvar no cache (apenas se não for mock)
      if (!USE_MOCK && osList) {
        await setCache(cacheKey, osList);
        console.log('[os] Dados salvos no cache');
      }
    }

    // Garantir que osList é um array válido
    if (!osList || !Array.isArray(osList)) {
      osList = [];
    }

    // Aplicar filtros se solicitados
    let osListFiltrada = osList;
    
    // FILTRO OBRIGATÓRIO: Apenas ordens de serviço corretivas
    const { isOSCorretiva } = await import('./dashboard');
    osListFiltrada = [];
    for (const os of osList) {
      const isCorretiva = await isOSCorretiva(os);
      if (isCorretiva) {
        osListFiltrada.push(os);
      }
    }
    console.log(`[os] OS após filtro de corretivas: ${osListFiltrada.length} de ${osList.length}`);
    
    // Função auxiliar para converter moeda brasileira para número (reutilizar da função de custo)
    const parseBrazilianCurrency = (value: string): number => {
      if (!value || value.trim() === '') return 0;
      let cleaned = value.trim().replace(/\s/g, '').replace(/[^\d,.-]/g, '');
      if (!cleaned || cleaned === '') return 0;
      if (!cleaned.includes(',')) {
        return parseFloat(cleaned) || 0;
      }
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    };
    
    // Filtro: apenas abertas
    if (apenasAbertas) {
      osListFiltrada = osListFiltrada.filter((os: any) => {
        const situacao = (os.SituacaoDaOS || os.Situacao || '').toString().trim();
        return situacao.toLowerCase() === 'aberta' || situacao.toLowerCase() === 'aberto' || situacao.toLowerCase() === 'em andamento';
      });
      console.log('[os] Filtro aplicado - apenas abertas:', osListFiltrada.length, 'de', osList.length);
    }
    
    // Filtro: apenas com custo > 0
    // Para isso, precisamos buscar os custos da API analítica completa
    if (apenasComCusto) {
      try {
        const { getOSAnalitica } = await import('../sdk/effortSdk');
        
        // Buscar OS analítica para obter custos
        let osAnaliticaData: any[] = [];
        let paginaAtual = 0;
        const qtdPorPagina = 50000;
        let temMaisDados = true;
        const maxPaginas = 5; // Limitar para não demorar muito
        
        while (temMaisDados && paginaAtual < maxPaginas) {
          try {
            const dadosPagina = await getOSAnalitica({
              tipoManutencao: 'Todos',
              periodo: 'AnoCorrente',
              pagina: paginaAtual,
              qtdPorPagina: qtdPorPagina,
            });
            
            let dadosArray: any[] = [];
            if (Array.isArray(dadosPagina)) {
              dadosArray = dadosPagina;
            } else if (dadosPagina?.Itens && Array.isArray(dadosPagina.Itens)) {
              dadosArray = dadosPagina.Itens;
            } else if (dadosPagina?.data && Array.isArray(dadosPagina.data)) {
              dadosArray = dadosPagina.data;
            } else if (dadosPagina?.items && Array.isArray(dadosPagina.items)) {
              dadosArray = dadosPagina.items;
            }
            
            if (dadosArray.length === 0) {
              temMaisDados = false;
            } else {
              osAnaliticaData = osAnaliticaData.concat(dadosArray);
              if (dadosArray.length < qtdPorPagina) {
                temMaisDados = false;
              } else {
                paginaAtual++;
              }
            }
          } catch (err: any) {
            console.warn('[os] Erro ao buscar OS analítica para filtro de custo:', err?.message);
            temMaisDados = false;
          }
        }
        
        // Criar Set com CodigoSerialOS das OS que têm custo > 0
        const osComCustoSet = new Set<number>();
        osAnaliticaData.forEach((os: any) => {
          const custo = os.Custo || '0';
          const valorCusto = parseBrazilianCurrency(custo);
          if (valorCusto > 0) {
            osComCustoSet.add(os.CodigoSerialOS);
          }
        });
        
        // Filtrar apenas OS que estão no Set
        osListFiltrada = osListFiltrada.filter((os: any) => {
          return osComCustoSet.has(os.CodigoSerialOS);
        });
        
        console.log('[os] Filtro aplicado - apenas com custo > 0:', osListFiltrada.length, 'de', osList.length);
        console.log('[os] Total de OS com custo encontradas:', osComCustoSet.size);
      } catch (error: any) {
        console.warn('[os] Erro ao aplicar filtro de custo:', error?.message);
        // Em caso de erro, não aplicar o filtro
      }
    }

    // Função auxiliar para obter SetorId da OS
    const getOSSectorId = (os: any): number | null => {
      if (os.SetorId !== undefined) return os.SetorId;
      if (os.Setor) {
        const sectorNameToIdMap: Record<string, number> = {
          'UTI 1': 1, 'UTI 2': 2, 'UTI 3': 3, 'Emergência': 4,
          'Centro Cirúrgico': 5, 'Radiologia': 6, 'Cardiologia': 7,
          'Neurologia': 8, 'Ortopedia': 9, 'Pediatria': 10,
          'Maternidade': 11, 'Ambulatório': 12,
        };
        if (sectorNameToIdMap[os.Setor]) return sectorNameToIdMap[os.Setor];
        let hash = 0;
        for (let i = 0; i < os.Setor.length; i++) {
          hash = ((hash << 5) - hash) + os.Setor.charCodeAt(i);
          hash = hash & hash;
        }
        return Math.abs(hash % 999) + 1;
      }
      return null;
    };

    // Filtro: por setores (se fornecido)
    if (setoresFilter && setoresFilter.length > 0) {
      osListFiltrada = osListFiltrada.filter((os: any) => {
        const sectorId = getOSSectorId(os);
        return sectorId !== null && setoresFilter.includes(sectorId);
      });
      console.log('[os] Filtro aplicado - setores:', setoresFilter, '- Resultado:', osListFiltrada.length);
    }

    const total = osListFiltrada.length;

    // Aplicar paginação
    const paginatedData = osListFiltrada.slice(skip, skip + pageSize);
    const totalPages = Math.ceil(total / pageSize);

    // Contar OS abertas e fechadas (verificar diferentes variações de status)
    const abertas = osList.filter((os: any) => {
      const situacao = (os.SituacaoDaOS || os.Situacao || '').toString().trim();
      return situacao.toLowerCase() === 'aberta' || situacao.toLowerCase() === 'aberto' || situacao.toLowerCase() === 'em andamento';
    }).length;
    
    const fechadas = osList.filter((os: any) => {
      const situacao = (os.SituacaoDaOS || os.Situacao || '').toString().trim();
      return situacao.toLowerCase() === 'fechada' || situacao.toLowerCase() === 'fechado' || situacao.toLowerCase() === 'concluída' || situacao.toLowerCase() === 'concluida';
    }).length;

    // Calcular custo total das OS do ano vigente
    // Tentar usar endpoint de OS analítica completa que pode ter campo de custo
    let custoTotal = 0;
    try {
      // Tentar buscar da API analítica completa (não resumida) que pode ter custos
      const { getOSAnalitica } = await import('../sdk/effortSdk');
      
      // Função auxiliar para converter moeda brasileira para número
      // Lida com valores como "               0,00" (com espaços)
      const parseBrazilianCurrency = (value: string): number => {
        if (!value || value.trim() === '') return 0;
        // Remove todos os espaços primeiro, depois remove caracteres não numéricos exceto vírgula e ponto
        let cleaned = value.trim().replace(/\s/g, '').replace(/[^\d,.-]/g, '');
        if (!cleaned || cleaned === '') return 0;
        if (!cleaned.includes(',')) {
          return parseFloat(cleaned) || 0;
        }
        // Remove pontos (separador de milhar) e substitui vírgula por ponto (separador decimal)
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        return parseFloat(cleaned) || 0;
      };
      
      // Buscar todas as OS do ano vigente usando endpoint analítico completo
      let osAnaliticaData: any[] = [];
      let paginaAtual = 0;
      const qtdPorPagina = 50000;
      let temMaisDados = true;
      const maxPaginas = 20; // Aumentar limite de páginas
      let totalBuscado = 0;
      let errosConsecutivos = 0;
      const maxErrosConsecutivos = 3;
      
      console.log('[os] Iniciando busca de OS analítica para cálculo de custos...');
      
      while (temMaisDados && paginaAtual < maxPaginas && errosConsecutivos < maxErrosConsecutivos) {
        try {
          console.log(`[os] Buscando página ${paginaAtual} de OS analítica...`);
          const dadosPagina = await getOSAnalitica({
            tipoManutencao: 'Todos',
            periodo: 'AnoCorrente',
            pagina: paginaAtual,
            qtdPorPagina: qtdPorPagina,
          });
          
          let dadosArray: any[] = [];
          if (Array.isArray(dadosPagina)) {
            dadosArray = dadosPagina;
          } else if (dadosPagina?.Itens && Array.isArray(dadosPagina.Itens)) {
            dadosArray = dadosPagina.Itens;
          } else if (dadosPagina?.data && Array.isArray(dadosPagina.data)) {
            dadosArray = dadosPagina.data;
          } else if (dadosPagina?.items && Array.isArray(dadosPagina.items)) {
            dadosArray = dadosPagina.items;
          }
          
          if (dadosArray.length === 0) {
            console.log(`[os] Página ${paginaAtual} retornou 0 resultados, finalizando busca`);
            temMaisDados = false;
          } else {
            osAnaliticaData = osAnaliticaData.concat(dadosArray);
            totalBuscado += dadosArray.length;
            console.log(`[os] Página ${paginaAtual}: ${dadosArray.length} OS retornadas (total acumulado: ${totalBuscado})`);
            
            // Se retornou menos que o solicitado, provavelmente é a última página
            if (dadosArray.length < qtdPorPagina) {
              console.log(`[os] Última página detectada (retornou ${dadosArray.length} < ${qtdPorPagina})`);
              temMaisDados = false;
            } else {
              paginaAtual++;
              errosConsecutivos = 0; // Reset contador de erros em caso de sucesso
            }
          }
        } catch (err: any) {
          errosConsecutivos++;
          console.warn(`[os] Erro ao buscar OS analítica (página ${paginaAtual}, erro ${errosConsecutivos}/${maxErrosConsecutivos}):`, err?.message);
          if (errosConsecutivos >= maxErrosConsecutivos) {
            console.error('[os] Muitos erros consecutivos, interrompendo busca');
            break;
          }
          // Tentar próxima página mesmo com erro
          paginaAtual++;
        }
      }
      
      console.log('[os] Total de OS analítica retornadas:', osAnaliticaData.length);
      
      // Filtrar apenas OS do ano vigente e somar custos
      const anoInicio = new Date(currentYear, 0, 1);
      const anoFim = new Date(currentYear, 11, 31, 23, 59, 59);
      
      let osComCusto = 0;
      let osSemCusto = 0;
      let osForaDoAno = 0;
      let custosInvalidos = 0;
      
      osAnaliticaData.forEach((os: any) => {
        // Verificar se é do ano vigente
        if (!os.Abertura || os.Abertura.trim() === '') {
          osForaDoAno++;
          return;
        }
        
        try {
          const dataAbertura = new Date(os.Abertura);
          if (isNaN(dataAbertura.getTime())) {
            osForaDoAno++;
            return;
          }
          if (dataAbertura < anoInicio || dataAbertura > anoFim) {
            osForaDoAno++;
            return;
          }
        } catch {
          osForaDoAno++;
          return;
        }
        
        // Tentar diferentes campos possíveis para custo
        const custo = os.Custo || os.Valor || os.ValorTotal || os.CustoTotal || os.CustoDaOS || os.ValorDaOS || os.CustoOS || os.ValorOS || '0';
        const valorCusto = parseBrazilianCurrency(custo);
        
        if (valorCusto > 0) {
          custoTotal += valorCusto;
          osComCusto++;
        } else {
          osSemCusto++;
          // Log alguns exemplos de OS sem custo para debug
          if (osSemCusto <= 5) {
            console.log(`[os] Exemplo OS sem custo: OS=${os.OS}, Custo="${custo}"`);
          }
        }
      });
      
      console.log('[os] Estatísticas de custos:');
      console.log(`[os] - OS com custo > 0: ${osComCusto}`);
      console.log(`[os] - OS com custo = 0: ${osSemCusto}`);
      console.log(`[os] - OS fora do ano vigente: ${osForaDoAno}`);
      console.log(`[os] - Custo total calculado: R$ ${custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      
      // Se ainda estiver muito baixo, tentar método alternativo como validação
      if (custoTotal < 100000 && osComCusto > 0) {
        console.warn('[os] Custo total parece baixo para o número de OS com custo. Verificando método alternativo...');
        try {
          const { calculateMaintenanceCostIndicator } = await import('../services/maintenanceCostService');
          const indicator = await calculateMaintenanceCostIndicator(currentYear, []);
          console.log('[os] Custo via calculateMaintenanceCostIndicator (validação):', indicator.valorOS);
          // Não substituir, apenas logar para comparação
        } catch (altError: any) {
          console.warn('[os] Erro ao validar com método alternativo:', altError?.message);
        }
      }
    } catch (error: any) {
      console.error('[os] Erro ao calcular custo:', error?.message);
      console.error('[os] Stack:', error?.stack);
      custoTotal = 0;
    }

    console.log('[os] Retornando', paginatedData.length, 'de', total, 'OS (página', page, 'de', totalPages, ')');
    console.log('[os] Estatísticas - Total:', total, 'Abertas:', abertas, 'Fechadas:', fechadas);
    console.log('[os] Custo total das OS:', custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    
    res.json({
      data: paginatedData,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      statistics: {
        total,
        abertas,
        fechadas,
        custoTotal,
        anoVigente: currentYear,
      },
    });
  } catch (e: any) {
    console.error('[os] Erro:', e?.message);
    console.error('[os] Stack:', e?.stack);
    const errorMessage = e?.response?.data?.message || e?.message || 'Erro desconhecido ao buscar ordens de serviço';
    const statusCode = e?.response?.status || 500;
    res.status(statusCode).json({ error: true, message: errorMessage });
  }
});

