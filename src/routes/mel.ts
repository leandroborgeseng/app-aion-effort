// src/routes/mel.ts
// Rotas para gerenciamento de MEL (Minimum Equipment List)

import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import {
  calcularDisponibilidadeMel,
  listarMelPorSetor,
  listarGruposEquipamentosPorSetor,
  recalcularAlertasMel,
  buscarAlertasMel,
  type MelItem,
} from '../services/melService';
import { getPrisma } from '../services/prismaService';
import { getCache, setCache, generateCacheKey } from '../services/cacheService';
import { dataSource } from '../adapters/dataSource';

const USE_MOCK = process.env.USE_MOCK === 'true';

export const mel = Router();

/**
 * GET /api/ecm/mel/sector/:sectorId/equipments
 * Lista equipamentos reais do setor agrupados por tipo
 */
mel.get('/sector/:sectorId/equipments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const sectorId = parseInt(req.params.sectorId);
    if (isNaN(sectorId)) {
      return res.status(400).json({ error: true, message: 'ID do setor inválido' });
    }

    console.log(`[mel:sector:equipments] Buscando equipamentos para setor ${sectorId}`);

    const grupos = await listarGruposEquipamentosPorSetor(sectorId);

    console.log(`[mel:sector:equipments] Encontrados ${grupos.length} grupos de equipamentos`);

    // Buscar informações do setor
    const prismaClient = await getPrisma();
    let sectorName = `Setor ${sectorId}`;
    if (prismaClient) {
      const sectorMapping = await prismaClient.sectorMapping.findFirst({
        where: { systemSectorId: sectorId, active: true },
      });
      if (sectorMapping) {
        sectorName = sectorMapping.systemSectorName || sectorName;
      }
    }

    res.json({
      success: true,
      sectorId,
      sectorName,
      grupos: grupos.map((g) => ({
        equipmentGroupKey: g.grupo.key,
        equipmentGroupName: g.grupo.name,
        quantidade: g.quantidade,
        indisponiveis: g.indisponiveis,
        disponiveis: g.disponiveis,
        minimumQuantity: g.minimumQuantity,
        emAlerta: g.emAlerta,
        equipamentos: g.equipamentos.map((eq) => ({
          id: eq.Id,
          tag: eq.Tag,
          equipamento: eq.Equipamento,
          modelo: eq.Modelo,
          fabricante: eq.Fabricante,
          status: eq.Status || eq.Situacao,
        })),
      })),
    });
  } catch (error: any) {
    console.error('[mel:sector:equipments] Erro completo:', error);
    console.error('[mel:sector:equipments] Stack:', error?.stack);
    
    // Verificar se é erro de autenticação
    if (error?.message?.includes('autenticação') || error?.message?.includes('token') || error?.status === 401) {
      return res.status(401).json({ error: true, message: 'Erro na autenticação. Faça login novamente.' });
    }
    
    // Verificar se é erro de acesso à API Effort
    if (error?.message?.includes('Effort') || error?.message?.includes('API')) {
      return res.status(503).json({ 
        error: true, 
        message: 'Erro ao conectar com a API Effort. Verifique se a API está disponível.' 
      });
    }
    
    res.status(500).json({ 
      error: true, 
      message: error?.message || 'Erro ao buscar equipamentos do setor',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
});

/**
 * GET /api/ecm/mel/sector/:sectorId
 * Lista MEL configurado para um setor com situação atual
 */
mel.get('/sector/:sectorId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const sectorId = parseInt(req.params.sectorId);
    if (isNaN(sectorId)) {
      return res.status(400).json({ error: true, message: 'ID do setor inválido' });
    }

    const melItems = await listarMelPorSetor(sectorId);

    // Buscar informações do setor
    const prismaClient = await getPrisma();
    let sectorName = `Setor ${sectorId}`;
    if (prismaClient) {
      const sectorMapping = await prismaClient.sectorMapping.findFirst({
        where: { systemSectorId: sectorId, active: true },
      });
      if (sectorMapping) {
        sectorName = sectorMapping.systemSectorName || sectorName;
      }
    }

    res.json({
      success: true,
      sectorId,
      sectorName,
      items: melItems,
      totalItems: melItems.length,
      itemsEmAlerta: melItems.filter((item) => item.emAlerta).length,
    });
  } catch (error: any) {
    console.error('[mel:sector] Erro:', error);
    res.status(500).json({ error: true, message: error?.message || 'Erro ao buscar MEL do setor' });
  }
});

/**
 * POST /api/ecm/mel/sector/:sectorId
 * Configura/atualiza MEL de um setor
 */
mel.post('/sector/:sectorId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const sectorId = parseInt(req.params.sectorId);
    if (isNaN(sectorId)) {
      return res.status(400).json({ error: true, message: 'ID do setor inválido' });
    }

    const { items } = req.body as {
      items: Array<{
        equipmentGroupKey: string;
        equipmentGroupName: string;
        minimumQuantity: number;
        groupPattern?: string;
        justificativa?: string;
        equipmentIds?: number[]; // IDs dos equipamentos selecionados para grupos customizados
      }>;
    };

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: true, message: 'Items deve ser um array' });
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Sistema temporariamente indisponível' });
    }

    // Buscar nome do setor
    const sectorMapping = await prismaClient.sectorMapping.findFirst({
      where: { systemSectorId: sectorId, active: true },
    });
    const sectorName = sectorMapping?.systemSectorName || `Setor ${sectorId}`;

    // Validar e criar/atualizar cada item
    const resultados = [];
    for (const item of items) {
      if (
        !item.equipmentGroupKey ||
        !item.equipmentGroupName ||
        typeof item.minimumQuantity !== 'number' ||
        item.minimumQuantity < 0
      ) {
        continue;
      }

      // Preparar groupPattern se equipmentIds foram fornecidos
      let groupPattern: string | null = item.groupPattern || null;
      if (item.equipmentIds && Array.isArray(item.equipmentIds) && item.equipmentIds.length > 0) {
        groupPattern = JSON.stringify({
          type: 'custom',
          equipmentIds: item.equipmentIds,
        });
      }

      // Criar ou atualizar MEL
      const sectorMel = await prismaClient.sectorMel.upsert({
        where: {
          sectorId_equipmentGroupKey: {
            sectorId,
            equipmentGroupKey: item.equipmentGroupKey,
          },
        },
        create: {
          sectorId,
          sectorName,
          equipmentGroupKey: item.equipmentGroupKey,
          equipmentGroupName: item.equipmentGroupName,
          groupPattern: groupPattern,
          minimumQuantity: item.minimumQuantity,
          justificativa: item.justificativa || null,
          active: true,
          createdBy: req.userId || undefined,
        },
        update: {
          minimumQuantity: item.minimumQuantity,
          equipmentGroupName: item.equipmentGroupName,
          sectorName,
          justificativa: item.justificativa || null,
          groupPattern: groupPattern || undefined,
          updatedBy: req.userId || undefined,
        },
      });

      resultados.push({
        equipmentGroupKey: sectorMel.equipmentGroupKey,
        equipmentGroupName: sectorMel.equipmentGroupName,
        minimumQuantity: sectorMel.minimumQuantity,
      });
    }

    // Recalcular alertas após atualizar MEL
    await recalcularAlertasMel();

    res.json({
      success: true,
      sectorId,
      sectorName,
      items: resultados,
      message: `MEL configurado com sucesso para ${resultados.length} tipo(s) de equipamento`,
    });
  } catch (error: any) {
    console.error('[mel:sector:post] Erro:', error);
    res.status(500).json({ error: true, message: error?.message || 'Erro ao configurar MEL' });
  }
});

/**
 * GET /api/ecm/mel/rule/:id
 * Busca uma regra MEL específica por ID
 */
mel.get('/rule/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const ruleId = req.params.id;
    if (!ruleId) {
      return res.status(400).json({ error: true, message: 'ID da regra inválido' });
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Sistema temporariamente indisponível' });
    }

    const rule = await prismaClient.sectorMel.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      return res.status(404).json({ error: true, message: 'Regra MEL não encontrada' });
    }

    res.json(rule);
  } catch (error: any) {
    console.error('[mel:rule:get] Erro:', error);
    res.status(500).json({ error: true, message: error?.message || 'Erro ao buscar regra MEL' });
  }
});

/**
 * PATCH /api/ecm/mel/rule/:id
 * Edita uma regra MEL (atualiza quantidade mínima, justificativa, ativa/inativa, nome do grupo, equipamentos)
 */
mel.patch('/rule/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const ruleId = req.params.id;
    const { minimumQuantity, justificativa, active, equipmentGroupName, equipmentIds } = req.body as {
      minimumQuantity?: number;
      justificativa?: string;
      active?: boolean;
      equipmentGroupName?: string;
      equipmentIds?: number[]; // IDs dos equipamentos selecionados
    };

    if (!ruleId) {
      return res.status(400).json({ error: true, message: 'ID da regra inválido' });
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Sistema temporariamente indisponível' });
    }

    // Buscar a regra existente
    const existingRule = await prismaClient.sectorMel.findUnique({
      where: { id: ruleId },
    });

    if (!existingRule) {
      return res.status(404).json({ error: true, message: 'Regra MEL não encontrada' });
    }

    const updateData: any = {
      updatedBy: req.userId || undefined,
    };

    if (minimumQuantity !== undefined) {
      if (typeof minimumQuantity !== 'number' || minimumQuantity < 0) {
        return res.status(400).json({ error: true, message: 'Quantidade mínima inválida' });
      }
      updateData.minimumQuantity = minimumQuantity;
    }

    if (justificativa !== undefined) {
      updateData.justificativa = justificativa || null;
    }

    if (active !== undefined) {
      updateData.active = active;
    }

    if (equipmentGroupName !== undefined && equipmentGroupName.trim() !== '') {
      updateData.equipmentGroupName = equipmentGroupName.trim();
    }

    // Se foram fornecidos IDs de equipamentos, atualizar o groupPattern para armazená-los
    if (equipmentIds && Array.isArray(equipmentIds) && equipmentIds.length > 0) {
      // Armazenar os IDs dos equipamentos no groupPattern como JSON
      // Isso permite identificar quais equipamentos pertencem a este grupo customizado
      updateData.groupPattern = JSON.stringify({
        type: 'custom',
        equipmentIds: equipmentIds,
      });
      console.log(`[mel:rule:patch] Atualizando grupo MEL ${ruleId} com ${equipmentIds.length} equipamentos selecionados`);
    }

    const updatedRule = await prismaClient.sectorMel.update({
      where: { id: ruleId },
      data: updateData,
    });

    // Recalcular alertas após atualizar MEL
    await recalcularAlertasMel();

    res.json({
      success: true,
      message: 'Regra MEL atualizada com sucesso',
      rule: updatedRule,
    });
  } catch (error: any) {
    console.error('[mel:patch:rule] Erro:', error);
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: true, message: 'Regra não encontrada' });
    }
    res.status(500).json({ error: true, message: error?.message || 'Erro ao atualizar regra MEL' });
  }
});

/**
 * DELETE /api/ecm/mel/rule/:id
 * Remove uma regra MEL por ID
 */
mel.delete('/rule/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const ruleId = req.params.id;

    if (!ruleId) {
      return res.status(400).json({ error: true, message: 'ID da regra inválido' });
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Sistema temporariamente indisponível' });
    }

    await prismaClient.sectorMel.delete({
      where: { id: ruleId },
    });

    // Recalcular alertas após remover regra (para remover alertas órfãos)
    await recalcularAlertasMel();

    // Recalcular alertas após remover MEL
    await recalcularAlertasMel();

    res.json({ success: true, message: 'Regra MEL removida com sucesso' });
  } catch (error: any) {
    console.error('[mel:delete:rule] Erro:', error);
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: true, message: 'Regra não encontrada' });
    }
    res.status(500).json({ error: true, message: error?.message || 'Erro ao remover regra MEL' });
  }
});

/**
 * DELETE /api/ecm/mel/sector/:sectorId
 * Remove todas as regras MEL de um setor
 */
mel.delete('/sector/:sectorId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const sectorId = parseInt(req.params.sectorId);
    if (isNaN(sectorId)) {
      return res.status(400).json({ error: true, message: 'ID do setor inválido' });
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Sistema temporariamente indisponível' });
    }

    // Buscar todas as regras do setor
    const regras = await prismaClient.sectorMel.findMany({
      where: { sectorId },
    });

    if (regras.length === 0) {
      return res.status(404).json({ error: true, message: 'Nenhuma regra MEL encontrada para este setor' });
    }

    // Deletar todas as regras (os alertas serão deletados em cascade ou set null)
    await prismaClient.sectorMel.deleteMany({
      where: { sectorId },
    });

    // Recalcular alertas
    await recalcularAlertasMel();

    res.json({
      success: true,
      message: `${regras.length} regra(s) MEL removida(s) com sucesso`,
      deletedCount: regras.length,
    });
  } catch (error: any) {
    console.error('[mel:sector:delete] Erro:', error);
    res.status(500).json({ error: true, message: error?.message || 'Erro ao remover regras MEL do setor' });
  }
});

/**
 * DELETE /api/ecm/mel/sector/:sectorId/equipment-group/:equipmentGroupKey
 * Remove um item de MEL de um setor
 */
mel.delete(
  '/sector/:sectorId/equipment-group/:equipmentGroupKey',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const sectorId = parseInt(req.params.sectorId);
      const equipmentGroupKey = req.params.equipmentGroupKey;

      if (isNaN(sectorId) || !equipmentGroupKey) {
        return res.status(400).json({ error: true, message: 'Parâmetros inválidos' });
      }

      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Sistema temporariamente indisponível' });
      }

      await prismaClient.sectorMel.delete({
        where: {
          sectorId_equipmentGroupKey: {
            sectorId,
            equipmentGroupKey,
          },
        },
      });

      // Recalcular alertas após remover MEL
      await recalcularAlertasMel();

      res.json({ success: true, message: 'Item de MEL removido com sucesso' });
    } catch (error: any) {
      console.error('[mel:delete] Erro:', error);
      res.status(500).json({ error: true, message: error?.message || 'Erro ao remover item de MEL' });
    }
  }
);

/**
 * GET /api/ecm/mel/alerts
 * Lista alertas de MEL
 */
mel.get('/alerts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const apenasAtivos = req.query.onlyActive !== 'false';
    const alertas = await buscarAlertasMel(apenasAtivos);

    res.json({
      success: true,
      alertas,
      total: alertas.length,
      ativos: alertas.filter((a) => a.status === 'ativo').length,
      resolvidos: alertas.filter((a) => a.status === 'resolvido').length,
    });
  } catch (error: any) {
    console.error('[mel:alerts] Erro:', error);
    res.status(500).json({ error: true, message: error?.message || 'Erro ao buscar alertas de MEL' });
  }
});

/**
 * POST /api/ecm/mel/recalculate
 * Recalcula todos os alertas de MEL manualmente
 */
mel.post('/recalculate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Verificar se é admin (opcional - pode remover se quiser permitir para todos)
    const prismaClient = await getPrisma();
    if (prismaClient && req.userId) {
      const user = await prismaClient.user.findUnique({
        where: { id: req.userId },
      });
      if (user && user.role !== 'admin') {
        return res.status(403).json({ error: true, message: 'Apenas administradores podem recalcular alertas' });
      }
    }

    await recalcularAlertasMel();

    res.json({
      success: true,
      message: 'Alertas de MEL recalculados com sucesso',
    });
  } catch (error: any) {
    console.error('[mel:recalculate] Erro:', error);
    res.status(500).json({ error: true, message: error?.message || 'Erro ao recalcular alertas' });
  }
});

/**
 * GET /api/ecm/mel/summary
 * Retorna resumo de MEL para dashboards com todas as regras agrupadas por setor
 */
mel.get('/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  const startTime = Date.now();
  try {
    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Sistema temporariamente indisponível' });
    }

    // Verificar se deve recalcular alertas (apenas se solicitado explicitamente via query param)
    const shouldRecalculate = req.query.recalculate === 'true';
    let alertasFinais: any[] = [];
    
    if (shouldRecalculate) {
      try {
        await recalcularAlertasMel();
        alertasFinais = await buscarAlertasMel(true);
      } catch (error: any) {
        alertasFinais = await buscarAlertasMel(true);
      }
    } else {
      // Usar alertas existentes sem recalculá-los para melhorar performance
      alertasFinais = await buscarAlertasMel(true);
    }

    // Buscar todos os MEL configurados (incluindo inativos para mostrar no resumo)
    const todosMels = await prismaClient.sectorMel.findMany({
      orderBy: [
        { sectorId: 'asc' },
        { equipmentGroupName: 'asc' },
      ],
    });

    // Buscar setores reais da API de investimentos (fonte principal)
    const sectorNameMap = new Map<number, string>();
    const sectorNameToIdMap = new Map<string, number>(); // Para busca reversa
    
    try {
      // Buscar setores da API de investimentos (fonte mais confiável - dados reais)
      const sectorsRes = await fetch(`${req.protocol}://${req.get('host')}/api/ecm/investments/sectors/list`);
      if (sectorsRes.ok) {
        const sectorsData = await sectorsRes.json();
        if (sectorsData.success && sectorsData.sectors && Array.isArray(sectorsData.sectors)) {
          sectorsData.sectors.forEach((sector: any) => {
            const sectorId = sector.id || sector.sectorId;
            const sectorName = sector.name || sector.sectorName;
            if (sectorId && sectorName) {
              const normalizedName = sectorName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
              sectorNameMap.set(sectorId, sectorName);
              sectorNameToIdMap.set(normalizedName, sectorId);
            }
          });
        }
      }
    } catch (error: any) {
      // Erro ao buscar setores - continuar sem eles
    }

    // Fallback: usar mapeamentos do banco de dados
    const sectorMappings = await prismaClient.sectorMapping.findMany({
      where: { active: true },
    });
    
    sectorMappings.forEach((mapping) => {
      // Só adicionar se não estiver já no mapa (API de investimentos tem prioridade)
      if (!sectorNameMap.has(mapping.systemSectorId)) {
        const nomeSetor = mapping.systemSectorName || mapping.effortSectorName || `Setor ${mapping.systemSectorId}`;
        sectorNameMap.set(mapping.systemSectorId, nomeSetor);
      }
    });

    // Tentar mapear setores do MEL pelos nomes salvos (correspondência por nome)
    todosMels.forEach((mel) => {
      if (!sectorNameMap.has(mel.sectorId) || sectorNameMap.get(mel.sectorId) === `Setor ${mel.sectorId}`) {
        // Se tem nome salvo, tentar encontrar na API de investimentos pelo nome
        if (mel.sectorName && mel.sectorName !== `Setor ${mel.sectorId}` && mel.sectorName.trim() !== '') {
          const normalizedName = mel.sectorName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const foundId = sectorNameToIdMap.get(normalizedName);
          
            if (foundId && foundId === mel.sectorId) {
              // ID corresponde, usar o nome da API
              const apiName = sectorNameMap.get(foundId);
              if (apiName) {
                sectorNameMap.set(mel.sectorId, apiName);
              } else {
                sectorNameMap.set(mel.sectorId, mel.sectorName);
              }
            } else {
              // Não encontrou correspondência, usar o nome salvo
              sectorNameMap.set(mel.sectorId, mel.sectorName);
            }
        }
      }
    });

    // Agrupar MEL por setor
    const melsPorSetor = new Map<number, typeof todosMels>();
    todosMels.forEach((mel) => {
      if (!melsPorSetor.has(mel.sectorId)) {
        melsPorSetor.set(mel.sectorId, []);
      }
      melsPorSetor.get(mel.sectorId)!.push(mel);
    });

    // Criar estrutura de regras por setor com situação atual
    const regrasPorSetor: Array<{
      sectorId: number;
      sectorName: string;
      regras: Array<{
        equipmentGroupKey: string;
        equipmentGroupName: string;
        minimumQuantity: number;
        disponivel?: number;
        total?: number;
        indisponiveis?: number;
        emAlerta: boolean;
      }>;
      totalRegras: number;
      regrasEmAlerta: number;
    }> = [];

    // Buscar dados da API uma vez com cache (evitar múltiplas chamadas e melhorar performance)
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutos de cache para equipamentos e OS
    
    // Buscar equipamentos com cache
    const equipamentosCacheKey = generateCacheKey('mel:equipamentos', { apenasAtivos: true });
    let equipamentosArray: any[] = [];
    let equipamentosFromCache = await getCache<any[]>(equipamentosCacheKey, CACHE_TTL);
    
    if (equipamentosFromCache) {
      equipamentosArray = equipamentosFromCache;
    } else {
      try {
        const equipamentosPromise = dataSource.equipamentos({
          apenasAtivos: true,
          incluirComponentes: false,
          incluirCustoSubstituicao: false,
        });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao buscar equipamentos')), 30000)
        );
        
        const equipamentos = await Promise.race([equipamentosPromise, timeoutPromise]);
        equipamentosArray = Array.isArray(equipamentos)
          ? equipamentos
          : (equipamentos as any)?.Itens || (equipamentos as any)?.data || [];
        
        // Salvar no cache (não bloquear se falhar)
        setCache(equipamentosCacheKey, equipamentosArray).catch(() => {});
      } catch (error: any) {
        console.error('[mel:summary] Erro ao buscar equipamentos:', error?.message);
      }
    }

    // Buscar OS analíticas com cache
    const osCacheKey = generateCacheKey('mel:os-analitica', { tipoManutencao: 'Todos', periodo: 'AnoCorrente' });
    let osArray: any[] = [];
    let osFromCache = await getCache<any[]>(osCacheKey, CACHE_TTL);
    
    if (osFromCache) {
      osArray = osFromCache;
    } else {
      try {
        const osPromise = dataSource.osAnalitica({
          tipoManutencao: 'Todos',
          periodo: 'AnoCorrente',
          pagina: 0,
          qtdPorPagina: 50000,
        });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao buscar OS')), 30000)
        );
        
        const osAnalitica = await Promise.race([osPromise, timeoutPromise]);
        osArray = Array.isArray(osAnalitica)
          ? osAnalitica
          : (osAnalitica as any)?.Itens || (osAnalitica as any)?.data || [];
        
        // Salvar no cache (não bloquear se falhar)
        setCache(osCacheKey, osArray).catch(() => {});
      } catch (error: any) {
        console.error('[mel:summary] Erro ao buscar OS analítica:', error?.message);
      }
    }

    for (const [sectorId, mels] of melsPorSetor.entries()) {
      // Buscar nome do setor do mapeamento, com fallback para o nome salvo no SectorMel
      let sectorName = sectorNameMap.get(sectorId);
      
      // Se não encontrou no mapeamento, tentar usar o nome do primeiro MEL do setor
      if (!sectorName || sectorName === `Setor ${sectorId}`) {
        const primeiroMel = mels[0];
        if (primeiroMel?.sectorName && primeiroMel.sectorName !== `Setor ${sectorId}`) {
          sectorName = primeiroMel.sectorName;
          sectorNameMap.set(sectorId, sectorName); // Atualizar o mapa para uso futuro
        } else {
          sectorName = `Setor ${sectorId}`; // Último fallback
        }
      }
      
      // Calcular situação de cada regra usando calcularDisponibilidadeMel() com dados já carregados
      // Isso garante que usamos EXATAMENTE a mesma lógica que funciona nos alertas, mas com dados em cache
      const regrasComSituacao = await Promise.all(
        mels.map(async (melConfig) => {
          try {
            // Passar equipamentos e OS já carregados para evitar múltiplas chamadas à API
            const disponibilidade = await calcularDisponibilidadeMel(
              sectorId, 
              melConfig.equipmentGroupKey,
              equipamentosArray,
              osArray
            );
            
            if (!disponibilidade) {
              return {
                id: melConfig.id,
                equipmentGroupKey: melConfig.equipmentGroupKey,
                equipmentGroupName: melConfig.equipmentGroupName,
                minimumQuantity: melConfig.minimumQuantity,
                active: melConfig.active,
                justificativa: melConfig.justificativa || null,
                disponivel: 0,
                total: 0,
                indisponiveis: 0,
                emAlerta: melConfig.active && 0 < melConfig.minimumQuantity,
              };
            }
            
            return {
              id: melConfig.id,
              equipmentGroupKey: melConfig.equipmentGroupKey,
              equipmentGroupName: disponibilidade.equipmentGroupName || melConfig.equipmentGroupName,
              minimumQuantity: melConfig.minimumQuantity,
              active: melConfig.active,
              justificativa: melConfig.justificativa || null,
              disponivel: disponibilidade.disponiveis,
              total: disponibilidade.totalNoSetor,
              indisponiveis: disponibilidade.indisponiveis,
              emAlerta: disponibilidade.emAlerta,
            };
          } catch (error: any) {
            console.error(`[mel:summary] Erro ao calcular disponibilidade para ${melConfig.equipmentGroupKey}:`, error);
            return {
              id: melConfig.id,
              equipmentGroupKey: melConfig.equipmentGroupKey,
              equipmentGroupName: melConfig.equipmentGroupName,
              minimumQuantity: melConfig.minimumQuantity,
              active: melConfig.active,
              justificativa: melConfig.justificativa || null,
              disponivel: 0,
              total: 0,
              indisponiveis: 0,
              emAlerta: false,
            };
          }
        })
      );

      regrasPorSetor.push({
        sectorId,
        sectorName,
        regras: regrasComSituacao,
        totalRegras: regrasComSituacao.length,
        regrasEmAlerta: regrasComSituacao.filter((r) => r.emAlerta).length,
      });
    }


    // Agrupar por setor para problemas
    const setoresComMel = new Set(todosMels.map((mel) => mel.sectorId));
    const setoresComProblema = new Set(alertasFinais.map((a) => a.sectorId));

    // Lista resumida de problemas (com alertas atualizados)
    // Usar os nomes reais dos setores do mapeamento já criado (sectorNameMap)
    const problemasResumo = alertasFinais.map((alerta) => {
      // Buscar nome real do setor no mapeamento criado anteriormente
      const nomeRealSetor = sectorNameMap.get(alerta.sectorId) || alerta.sectorName || `Setor ${alerta.sectorId}`;
      
      return {
        sectorId: alerta.sectorId,
        sectorName: nomeRealSetor, // Usar nome real da API de investimentos
        equipmentGroupName: alerta.equipmentGroupName,
        disponivel: alerta.currentAvailable,
        minimo: alerta.minimumQuantity,
        falta: alerta.minimumQuantity - alerta.currentAvailable,
      };
    });


          const resposta = {
            success: true,
            totalSetoresComMel: setoresComMel.size,
            totalSetoresComProblema: setoresComProblema.size,
            totalAlertasAtivos: alertasFinais.length,
            problemasResumo,
            regrasPorSetor,
          };

          const duration = Date.now() - startTime;
          if (duration > 5000) {
            console.log(`[mel:summary] ⚠️ Resumo gerado em ${duration}ms (lento - considerar otimizações)`);
          }

          res.json(resposta);
  } catch (error: any) {
    console.error('[mel:summary] Erro crítico:', error);
    console.error('[mel:summary] Stack:', error?.stack);
    res.status(500).json({ 
      error: true, 
      message: error?.message || 'Erro ao buscar resumo de MEL',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });
  }
});

/**
 * GET /api/ecm/mel/equipment-groups
 * Lista todos os grupos de equipamentos disponíveis (padrões configurados)
 */
mel.get('/equipment-groups', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { DEFAULT_EQUIPMENT_GROUPS } = await import('../services/melEquipmentGrouping');
    
    res.json({
      success: true,
      grupos: DEFAULT_EQUIPMENT_GROUPS.map((grupo) => ({
        key: grupo.key,
        name: grupo.name,
        patterns: grupo.patterns,
      })),
    });
  } catch (error: any) {
    console.error('[mel:equipment-groups] Erro:', error);
    res.status(500).json({ error: true, message: error?.message || 'Erro ao buscar grupos de equipamentos' });
  }
});

