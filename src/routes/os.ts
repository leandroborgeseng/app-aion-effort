// src/routes/os.ts
import { Router } from 'express';
import { isOSInMaintenanceList } from './dashboard';
import { filterOSByWorkshop } from '../services/workshopFilterService';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const USE_MOCK = process.env.USE_MOCK === 'true';

import { getPrisma } from '../services/prismaService';

export const os = Router();

// GET /api/ecm/os - Listar ordens de serviço com paginação
os.get('/', async (req, res) => {
  try {
    // Parâmetros de paginação
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    
    console.log('[os] Buscando OS usando lógica do dashboard...');
    console.log('[os] Paginação:', { page, pageSize });

    const { dataSource } = await import('../adapters/dataSource');
    
    // Verificar se dataSource está disponível
    if (!dataSource || !dataSource.osResumida) {
      console.error('[os] dataSource não disponível ou método osResumida não encontrado');
      return res.status(500).json({ 
        error: true, 
        message: 'Serviço de dados não disponível' 
      });
    }
    
    // Buscar OS do ano corrente (mesma lógica do dashboard)
    const periodo = 'AnoCorrente';
    let todasOS: any[] = [];
    let paginaAtual = 0;
    const qtdPorPagina = 50000;
    let temMaisDados = true;
    
    // Buscar todas as páginas disponíveis (mesma estratégia do dashboard)
    while (temMaisDados && paginaAtual < 10) {
      try {
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
        
        console.log(`[os] Página ${paginaAtual}: ${dadosArray.length} OS encontradas na resposta da API`);
        
        if (dadosArray.length === 0) {
          console.log(`[os] Página ${paginaAtual} vazia, parando busca`);
          temMaisDados = false;
        } else {
          // Aplicar filtro de oficinas habilitadas (mesma lógica do dashboard)
          const dadosArrayFiltrados = await filterOSByWorkshop(dadosArray);
          console.log(`[os] Página ${paginaAtual}: ${dadosArrayFiltrados.length} OS após filtro de oficinas (de ${dadosArray.length})`);
          todasOS = todasOS.concat(dadosArrayFiltrados);
          
          if (dadosArray.length < qtdPorPagina) {
            console.log(`[os] Página ${paginaAtual} tem menos que ${qtdPorPagina} itens, última página`);
            temMaisDados = false;
          } else {
            paginaAtual++;
          }
        }
      } catch (pageError: any) {
        console.error(`[os] Erro ao buscar página ${paginaAtual}:`, pageError?.message);
        console.error(`[os] Stack:`, pageError?.stack);
        // Se for a primeira página e der erro, retornar erro
        if (paginaAtual === 0) {
          throw pageError;
        }
        // Se não for a primeira página, parar a busca mas retornar o que já foi coletado
        console.warn(`[os] Parando busca devido a erro na página ${paginaAtual}, retornando ${todasOS.length} OS já coletadas`);
        temMaisDados = false;
      }
    }
    
    console.log(`[os] Total de OS coletadas após filtros: ${todasOS.length}`);
    
    // Se não encontrou nenhuma OS, retornar resposta vazia mas válida
    if (todasOS.length === 0) {
      console.warn('[os] Nenhuma OS encontrada após buscar da API e aplicar filtros');
      return res.json({
        items: [],
        page,
        pageSize,
        totalItems: 0,
        totalPages: 0,
        statistics: {
          total: 0,
          abertas: 0,
          fechadas: 0,
          custoTotal: 0,
        },
      });
    }
    
    // Aplicar paginação client-side
    const inicio = (page - 1) * pageSize;
    const fim = inicio + pageSize;
    const osList = todasOS.slice(inicio, fim);
    
    // Calcular estatísticas usando a mesma lógica do dashboard
    const osAbertas = (await Promise.all(
      todasOS.map(async (os: any) => ({
        os,
        isValid: await isOSInMaintenanceList(os),
      }))
    )).filter(item => item.isValid).map(item => item.os);
    
    const total = todasOS.length;
    const totalPages = Math.ceil(total / pageSize);
    const abertas = osAbertas.length;
    const fechadas = total - abertas;
    const custoTotal = 0;
    
    console.log('[os] Retornando:', {
      items: osList.length,
      total,
      totalPages,
      page,
      pageSize,
      abertas,
      fechadas,
    });
    
    // Retornar no formato esperado: { items, page, pageSize, totalItems, totalPages }
    res.json({
      items: osList,
      page,
      pageSize,
      totalItems: total,
      totalPages,
      statistics: {
        total,
        abertas,
        fechadas,
        custoTotal,
      },
    });
  } catch (e: any) {
    console.error('[os] Erro:', e?.message);
    console.error('[os] Stack:', e?.stack);
    
    // Detectar se é erro da API Effort (503 ou 5xx)
    const statusCode = e?.response?.status || e?.status || 500;
    const isEffortError = statusCode === 503 || (statusCode >= 500 && statusCode < 600);
    
    res.status(isEffortError ? 503 : 500).json({ 
      error: true, 
      message: isEffortError 
        ? 'A API Effort está temporariamente indisponível. Por favor, tente novamente em alguns instantes.'
        : e?.message || 'Erro ao buscar ordens de serviço',
      code: isEffortError ? 'EFFORT_API_UNAVAILABLE' : 'INTERNAL_ERROR',
    });
  }
});

// GET /api/ecm/os/analitica - Listar OS analíticas completas (com Tag para vínculo com equipamentos)
os.get('/analitica', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Parâmetros de filtro
    const periodo = (req.query.periodo as string) || 'AnoCorrente';
    const tipoManutencao = (req.query.tipoManutencao as string) || 'Todos';
    
    console.log('[os/analitica] Buscando OS analíticas completas (com Tag)...');
    console.log('[os/analitica] Filtros:', { periodo, tipoManutencao });

    const { dataSource } = await import('../adapters/dataSource');
    
    // Buscar OS analíticas completas (não resumidas) que contêm Tag
    let osArray: any[] = [];
    try {
      const osAnalitica = await dataSource.osAnalitica({
        tipoManutencao: tipoManutencao as any,
        periodo: periodo as any,
        pagina: 0,
        qtdPorPagina: 50000,
      });

      osArray = Array.isArray(osAnalitica)
        ? osAnalitica
        : (osAnalitica as any)?.Itens || (osAnalitica as any)?.data || [];
      
      console.log(`[os/analitica] ${osArray.length} OS analíticas carregadas (com Tag)`);
      
      // Aplicar filtro de oficinas habilitadas
      osArray = await filterOSByWorkshop(osArray);
      
      // Log de exemplo para verificar se Tag está presente
      if (osArray.length > 0) {
        const primeiraOS = osArray[0];
        console.log(`[os/analitica] Exemplo de OS analítica:`, {
          OS: primeiraOS.OS,
          Tag: primeiraOS.Tag || '(sem Tag)',
          EquipamentoId: primeiraOS.EquipamentoId || '(sem EquipamentoId)',
          SituacaoDaOS: primeiraOS.SituacaoDaOS,
          temTag: !!primeiraOS.Tag,
        });
      }
    } catch (error: any) {
      console.error('[os/analitica] Erro ao buscar OS analíticas:', error);
      // Tentar fallback para API resumida (mas não teremos Tag)
      console.warn('[os/analitica] Tentando fallback para API resumida (sem Tag)...');
      try {
        const osResumida = await dataSource.osResumida({
          tipoManutencao: tipoManutencao as any,
          periodo: periodo as any,
          pagina: 0,
          qtdPorPagina: 50000,
        });
        osArray = Array.isArray(osResumida)
          ? osResumida
          : (osResumida as any)?.Itens || (osResumida as any)?.data || [];
        osArray = await filterOSByWorkshop(osArray);
        console.warn(`[os/analitica] ⚠️ Usando API resumida (${osArray.length} OS) - Tags NÃO estarão disponíveis`);
      } catch (fallbackError: any) {
        console.error('[os/analitica] Erro no fallback para API resumida:', fallbackError);
        osArray = [];
      }
    }
    
    res.json({
      items: osArray,
      totalItems: osArray.length,
      hasTags: osArray.length > 0 && !!osArray[0]?.Tag,
    });
  } catch (e: any) {
    console.error('[os/analitica] Erro:', e?.message);
    console.error('[os/analitica] Stack:', e?.stack);
    res.status(500).json({ error: true, message: e?.message || 'Erro ao buscar OS analíticas completas' });
  }
});

// GET /api/ecm/os/tempo-medio-processamento - Tempo médio de processamento por ano
os.get('/tempo-medio-processamento', async (req, res) => {
  try {
    console.log('[os/tempo-medio-processamento] Endpoint simplificado - retornando dados vazios');
    
    // Retornar dados vazios por enquanto - lógica complexa removida
    res.json({
      dados: [],
      periodo: { inicio: 2024, fim: new Date().getFullYear() },
    });
  } catch (e: any) {
    console.error('[os/tempo-medio-processamento] Erro:', e?.message);
    res.status(500).json({ error: true, message: e?.message || 'Erro ao calcular tempo médio de processamento' });
  }
});

// GET /api/ecm/os/equipamentos-com-os-abertas - Listar equipamentos que possuem OS abertas
os.get('/equipamentos-com-os-abertas', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    
    // Filtro de setores (array de IDs de setores) - para personificação
    const setoresFilter = req.query.setores 
      ? (req.query.setores as string).split(',').map(s => parseInt(s.trim())).filter(Boolean)
      : null;
    
    console.log('[os/equipamentos-com-os-abertas] Buscando usando lógica do dashboard...');
    console.log('[os/equipamentos-com-os-abertas] Filtro de setores:', setoresFilter);
    
    const { dataSource } = await import('../adapters/dataSource');
    const { getSectorIdFromItem } = await import('../utils/sectorMapping');
    
    // Buscar equipamentos (mesma lógica do dashboard)
    const equipamentosRaw = await dataSource.equipamentos({
      apenasAtivos: true,
      incluirComponentes: false,
      incluirCustoSubstituicao: false,
    });
    
    // Garantir que equipamentos é um array (mesma lógica do inventário)
    let equipamentos = Array.isArray(equipamentosRaw) 
      ? equipamentosRaw 
      : (equipamentosRaw as any)?.Itens || (equipamentosRaw as any)?.data || (equipamentosRaw as any)?.items || [];
    
    console.log('[os/equipamentos-com-os-abertas] Equipamentos carregados:', equipamentos.length);
    
    // Filtrar por setores se fornecido - mesma lógica do inventário
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
            console.warn('[os/equipamentos-com-os-abertas] Erro ao buscar setores da API:', apiError?.message);
          }
        }
      } catch (error: any) {
        console.warn('[os/equipamentos-com-os-abertas] Erro ao buscar mapeamento de setores:', error?.message);
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
      
      // Guardar quantidade antes do filtro para debug
      const equipamentosAntesFiltro = equipamentos.length;
      
      // Usar utilitário getSectorIdFromItem como fallback
      equipamentos = equipamentos.filter((eq: any) => {
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
      
      console.log('[os/equipamentos-com-os-abertas] Filtro de setores (IDs):', setoresFilter);
      console.log('[os/equipamentos-com-os-abertas] Nomes de setores para filtrar:', sectorNamesToMatch);
      console.log('[os/equipamentos-com-os-abertas] Equipamentos antes do filtro:', equipamentosAntesFiltro);
      console.log('[os/equipamentos-com-os-abertas] Equipamentos após filtro de setores:', equipamentos.length);
      
      // Debug: mostrar alguns exemplos de setores encontrados nos equipamentos
      if (equipamentos.length === 0 && equipamentosAntesFiltro > 0) {
        const equipamentosAntes = Array.isArray(equipamentosRaw) 
          ? equipamentosRaw 
          : (equipamentosRaw as any)?.Itens || (equipamentosRaw as any)?.data || (equipamentosRaw as any)?.items || [];
        const setoresEncontrados = new Set(equipamentosAntes.slice(0, 50).map((eq: any) => eq.Setor || '').filter((s: string) => s));
        console.log('[os/equipamentos-com-os-abertas] Exemplos de setores encontrados nos equipamentos (primeiros 50):', Array.from(setoresEncontrados).slice(0, 10));
      }
    } else {
      console.log('[os/equipamentos-com-os-abertas] Sem filtro de setores, usando todos os equipamentos:', equipamentos.length);
    }

    // Buscar OS abertas do ano corrente - APENAS CORRETIVAS (mesma lógica do dashboard)
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
        
        console.log(`[os/equipamentos-com-os-abertas] Página ${paginaAtual}: ${osAbertasPagina.length} OS corretivas de ${dadosArray.length} total`);
        
        osAbertas = osAbertas.concat(osAbertasPagina);
        
        if (dadosArray.length < qtdPorPagina) {
          temMaisDados = false;
        } else {
          paginaAtual++;
        }
      }
    }

    console.log('[os/equipamentos-com-os-abertas] Total de OS abertas encontradas:', osAbertas.length);
    
    // Criar mapas para facilitar busca de equipamentos
    const tagToIdMap = new Map<string, number>();
    const nomeToIdMap = new Map<string, number>();
    const equipamentoMap = new Map<number, any>();
    
    equipamentos.forEach((eq: any) => {
      if (eq.Tag) tagToIdMap.set(eq.Tag.trim().toUpperCase(), eq.Id);
      if (eq.Equipamento) nomeToIdMap.set(eq.Equipamento.trim().toUpperCase(), eq.Id);
      equipamentoMap.set(eq.Id, eq);
    });
    
    console.log('[os/equipamentos-com-os-abertas] Equipamentos no mapa:', equipamentoMap.size);
    console.log('[os/equipamentos-com-os-abertas] Tags no mapa:', tagToIdMap.size);

    // Agrupar OS por equipamento
    const equipamentosComOS = new Map<number, {
      equipamento: any;
      osList: any[];
      primeiraOS: any;
      totalOS: number;
    }>();
    
    let osVinculadas = 0;
    let osNaoVinculadas = 0;
    
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
        osVinculadas++;
        if (!equipamentosComOS.has(equipamentoId)) {
          equipamentosComOS.set(equipamentoId, {
            equipamento: equipamentoMap.get(equipamentoId),
            osList: [],
            primeiraOS: os,
            totalOS: 0,
          });
        }
        
        const entry = equipamentosComOS.get(equipamentoId)!;
        entry.osList.push(os);
        entry.totalOS = entry.osList.length;
        
        // Manter a OS mais antiga como primeiraOS
        const dataAberturaAtual = new Date(entry.primeiraOS.Abertura || entry.primeiraOS.DataAbertura || '9999-12-31');
        const dataAberturaNova = new Date(os.Abertura || os.DataAbertura || '9999-12-31');
        if (dataAberturaNova < dataAberturaAtual) {
          entry.primeiraOS = os;
        }
      } else {
        osNaoVinculadas++;
      }
    });
    
    console.log('[os/equipamentos-com-os-abertas] OS vinculadas a equipamentos filtrados:', osVinculadas);
    console.log('[os/equipamentos-com-os-abertas] OS não vinculadas:', osNaoVinculadas);
    console.log('[os/equipamentos-com-os-abertas] Equipamentos com OS:', equipamentosComOS.size);

    // Converter para array e ordenar por data de abertura da primeira OS (mais antiga primeiro)
    const equipamentosEmManutencao = Array.from(equipamentosComOS.values())
      .map((entry) => ({
        equipamentoId: entry.equipamento.Id,
        tag: entry.equipamento.Tag || 'N/A',
        equipamento: entry.equipamento.Equipamento || 'Sem nome',
        modelo: entry.equipamento.Modelo || '-',
        fabricante: entry.equipamento.Fabricante || '-',
        setor: entry.equipamento.Setor || 'Não informado',
        osAbertas: entry.osList,
        quantidadeOSAbertas: entry.totalOS,
        primeiraOSAbertura: entry.primeiraOS.Abertura || entry.primeiraOS.DataAbertura || null,
        ultimaOSAbertura: entry.osList[entry.osList.length - 1]?.Abertura || entry.osList[entry.osList.length - 1]?.DataAbertura || null,
      }))
      .sort((a, b) => {
        const dataA = a.primeiraOSAbertura ? new Date(a.primeiraOSAbertura).getTime() : 0;
        const dataB = b.primeiraOSAbertura ? new Date(b.primeiraOSAbertura).getTime() : 0;
        return dataA - dataB; // Mais antiga primeiro
      })
      .slice(0, limit); // Limitar resultados

    // Contar apenas OS vinculadas a equipamentos
    const totalOSAbertasVinculadas = Array.from(equipamentosComOS.values()).reduce(
      (acc, entry) => acc + entry.osList.length,
      0
    );

    const hoje = new Date();
    const resultado = {
      equipamentos: equipamentosEmManutencao,
      totalEquipamentos: equipamentosEmManutencao.length,
      totalOSAbertas: totalOSAbertasVinculadas, // Apenas OS vinculadas a equipamentos
      periodo: { inicio: '2024-01-01', fim: hoje.toISOString().split('T')[0] },
      limitado: false,
    };
    
    console.log(`[os/equipamentos-com-os-abertas] Retornando ${equipamentosEmManutencao.length} equipamentos com ${osAbertas.length} OS abertas`);
    
    res.json(resultado);
  } catch (e: any) {
    console.error('[os/equipamentos-com-os-abertas] Erro:', e?.message);
    console.error('[os/equipamentos-com-os-abertas] Stack:', e?.stack);
    
    // Detectar se é erro da API Effort (503 ou outros 5xx)
    const statusCode = e?.response?.status || e?.status || (e?.code === 'ERR_BAD_RESPONSE' ? 503 : 500);
    const isEffortError = statusCode === 503 || 
                         (statusCode >= 500 && statusCode < 600) || 
                         e?.message?.includes('Request failed with status code 503') ||
                         e?.message?.includes('503');
    
    res.status(isEffortError ? 503 : 500).json({ 
      error: true, 
      message: isEffortError 
        ? 'A API Effort está temporariamente indisponível. Por favor, tente novamente em alguns instantes.'
        : e?.message || 'Erro ao buscar equipamentos com OS abertas',
      code: isEffortError ? 'EFFORT_API_UNAVAILABLE' : 'INTERNAL_ERROR',
    });
  }
});

// GET /api/ecm/os/:codigoSerialOS - Buscar dados da OS (comentários e vínculo com solicitação de compra)
os.get('/:codigoSerialOS', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const codigoSerialOS = parseInt(req.params.codigoSerialOS);
    
    if (isNaN(codigoSerialOS)) {
      return res.status(400).json({ error: true, message: 'Código serial da OS inválido' });
    }

    if (USE_MOCK) {
      // Em modo mock, retornar estrutura vazia
      return res.json({
        codigoSerialOS,
        comentarios: null,
        purchaseRequestId: null,
        purchaseRequest: null,
      });
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Prisma não disponível' });
    }

    const serviceOrder = await prismaClient.serviceOrder.findUnique({
      where: { codigoSerialOS },
      include: {
        purchaseRequest: {
          select: {
            id: true,
            description: true,
            status: true,
            sectorId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!serviceOrder) {
      // Se não existe, retornar estrutura vazia
      return res.json({
        codigoSerialOS,
        comentarios: null,
        purchaseRequestId: null,
        purchaseRequest: null,
      });
    }

    res.json({
      codigoSerialOS: serviceOrder.codigoSerialOS,
      osCodigo: serviceOrder.osCodigo,
      comentarios: serviceOrder.comentarios,
      purchaseRequestId: serviceOrder.purchaseRequestId,
      purchaseRequest: serviceOrder.purchaseRequest,
      createdAt: serviceOrder.createdAt.toISOString(),
      updatedAt: serviceOrder.updatedAt.toISOString(),
    });
  } catch (e: any) {
    console.error('[os/:codigoSerialOS] Erro:', e?.message);
    console.error('[os/:codigoSerialOS] Stack:', e?.stack);
    res.status(500).json({ 
      error: true, 
      message: e?.message || 'Erro ao buscar dados da OS'
    });
  }
});

// PATCH /api/ecm/os/:codigoSerialOS - Atualizar comentários e vínculo com solicitação de compra
os.patch('/:codigoSerialOS', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: true, message: 'Não autenticado' });
    }

    const codigoSerialOS = parseInt(req.params.codigoSerialOS);
    
    if (isNaN(codigoSerialOS)) {
      return res.status(400).json({ error: true, message: 'Código serial da OS inválido' });
    }

    const { comentarios, purchaseRequestId, osCodigo } = req.body;

    if (USE_MOCK) {
      // Em modo mock, retornar sucesso
      return res.json({
        codigoSerialOS,
        comentarios: comentarios || null,
        purchaseRequestId: purchaseRequestId || null,
        osCodigo: osCodigo || null,
        message: 'Dados atualizados com sucesso (modo mock)',
      });
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Prisma não disponível' });
    }

    // Verificar se purchaseRequestId existe (se fornecido)
    if (purchaseRequestId) {
      const purchaseRequest = await prismaClient.purchaseRequest.findUnique({
        where: { id: purchaseRequestId },
      });
      
      if (!purchaseRequest) {
        return res.status(404).json({ 
          error: true, 
          message: 'Solicitação de compra não encontrada' 
        });
      }
    }

    // Upsert: criar se não existe, atualizar se existe
    const serviceOrder = await prismaClient.serviceOrder.upsert({
      where: { codigoSerialOS },
      update: {
        comentarios: comentarios !== undefined ? comentarios : undefined,
        purchaseRequestId: purchaseRequestId !== undefined ? purchaseRequestId : undefined,
        osCodigo: osCodigo !== undefined ? osCodigo : undefined,
        createdBy: req.user.id,
        updatedAt: new Date(),
      },
      create: {
        codigoSerialOS,
        osCodigo: osCodigo || null,
        comentarios: comentarios || null,
        purchaseRequestId: purchaseRequestId || null,
        createdBy: req.user.id,
      },
      include: {
        purchaseRequest: {
          select: {
            id: true,
            description: true,
            status: true,
            sectorId: true,
            createdAt: true,
          },
        },
      },
    });

    res.json({
      codigoSerialOS: serviceOrder.codigoSerialOS,
      osCodigo: serviceOrder.osCodigo,
      comentarios: serviceOrder.comentarios,
      purchaseRequestId: serviceOrder.purchaseRequestId,
      purchaseRequest: serviceOrder.purchaseRequest,
      createdAt: serviceOrder.createdAt.toISOString(),
      updatedAt: serviceOrder.updatedAt.toISOString(),
      message: 'Dados atualizados com sucesso',
    });
  } catch (e: any) {
    console.error('[os/:codigoSerialOS PATCH] Erro:', e?.message);
    console.error('[os/:codigoSerialOS PATCH] Stack:', e?.stack);
    res.status(500).json({ 
      error: true, 
      message: e?.message || 'Erro ao atualizar dados da OS'
    });
  }
});
