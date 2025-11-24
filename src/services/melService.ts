// src/services/melService.ts
// Serviço de domínio para cálculo e verificação de MEL (Minimum Equipment List)
// Refatorado para trabalhar com equipamentos reais agrupados por tipo

import { getPrisma } from './prismaService';
import { dataSource } from '../adapters/dataSource';
import type { EquipamentoDTO, ListagemAnaliticaOsResumidaDTO } from '../types/effort';
import {
  agruparEquipamentos,
  filtrarEquipamentosPorSetor,
  obterGruposComContagem,
  DEFAULT_EQUIPMENT_GROUPS,
  type EquipmentGroup,
} from './melEquipmentGrouping';

const USE_MOCK = process.env.USE_MOCK === 'true';

/**
 * Status que indicam equipamento indisponível
 */
const STATUS_INDISPONIVEL = ['sucateado', 'baixado', 'emprestado'];

/**
 * Status de OS que bloqueiam o equipamento
 * QUALQUER OS com status "aberta" ou "em_andamento" torna o equipamento indisponível,
 * independentemente do tipo de manutenção (corretiva, preventiva, etc.)
 */
const OS_STATUS_BLOQUEANTES = ['aberta', 'em_andamento'];

/**
 * Interface para resultado de disponibilidade por setor e grupo
 */
export interface DisponibilidadeMel {
  sectorId: number;
  sectorName: string;
  equipmentGroupKey: string;
  equipmentGroupName: string;
  totalNoSetor: number;
  indisponiveis: number;
  disponiveis: number;
  minimumQuantity: number | null; // null se não houver MEL configurado
  emAlerta: boolean; // true se disponiveis < minimumQuantity
}

/**
 * Interface para item de MEL configurado
 */
export interface MelItem {
  equipmentGroupKey: string;
  equipmentGroupName: string;
  minimumQuantity: number;
  totalNoSetor: number;
  indisponiveis: number;
  disponiveis: number;
  emAlerta: boolean;
}

/**
 * Interface para grupo de equipamentos com informações de disponibilidade
 */
export interface EquipmentGroupWithAvailability {
  grupo: EquipmentGroup;
  equipamentos: EquipamentoDTO[];
  quantidade: number;
  indisponiveis: number;
  disponiveis: number;
  minimumQuantity: number | null;
  emAlerta: boolean;
}

/**
 * Verifica se um equipamento está indisponível por causa de OS aberta
 * 
 * REGRAS OBRIGATÓRIAS (conforme especificação):
 * 1. A Tag só existe na API analítica completa (NÃO na resumida)
 * 2. Tag é a única chave estável para vincular OS → Equipamento
 * 3. NUNCA vincular por nome/modelo/fabricante/setor (inconfiável)
 * 4. Se a OS não tem Tag (API resumida), NÃO podemos vincular com segurança
 * 
 * @param equipment - O equipamento que estamos verificando
 * @param osList - Lista de OS (analítica completa com Tag ou resumida sem Tag)
 */
function equipamentoTemOSBloqueante(
  equipment: EquipamentoDTO,
  osList: any[] // Pode ser ListagemAnaliticaOsResumidaDTO[] ou ListagemAnaliticaOsCompletaDTO[]
): boolean {
  const eqId = equipment.Id;
  const eqTag = (equipment.Tag || (equipment as any).tag || '').trim().toUpperCase();
  
  if (!eqTag && !eqId) {
    return false;
  }
  
  // Log para mostrar TODOS os campos da OS quando estamos verificando a Tag HSJ-02406
  if (eqTag === 'HSJ-02406' && osList.length > 0) {
        // Log de debug removido para melhorar performance
  }
  
  return osList.some((os) => {
    // Verificar se a OS está aberta ou em andamento (deve ser bloqueante)
    const osStatus = (os.Status || os.SituacaoDaOS || '').toLowerCase();
    if (!OS_STATUS_BLOQUEANTES.some((s) => osStatus.includes(s.toLowerCase()))) {
      return false; // OS não está bloqueante
    }

    // 1. PRIORIDADE MÁXIMA: Comparar por Tag diretamente da OS analítica
    // A Tag é a única chave estável e só existe na API analítica completa
    const osTag = ((os as any).Tag || (os as any).tag || '').trim().toUpperCase();
    if (osTag && eqTag && osTag === eqTag) {
      // Log removido para melhorar performance
      return true;
    }

    // 2. SEGUNDA PRIORIDADE: Comparar por EquipamentoId (se existir na OS analítica)
    const osEquipamentoId = (os as any).EquipamentoId;
    if (osEquipamentoId !== undefined && osEquipamentoId !== null && eqId) {
      if (osEquipamentoId === eqId || osEquipamentoId === String(eqId) || Number(osEquipamentoId) === eqId) {
        // Log removido para melhorar performance
        return true;
      }
      // Se tem ID mas não corresponde, não é para este equipamento
      return false;
    }

    // 3. Se a OS não tem Tag nem EquipamentoId, NÃO podemos vincular com segurança
    // Não devemos tentar vincular por nome/modelo/fabricante pois é inconfiável
    if (!osTag && !osEquipamentoId) {
      // Log apenas para debug da Tag específica
      if (eqTag === 'HSJ-02406') {
          // Log de debug removido para melhorar performance
      }
      return false; // Não vincular sem Tag ou EquipamentoId
    }

    // Se chegou aqui, não encontrou correspondência por Tag nem por EquipamentoId
    // NÃO bloquear - a OS é para outro equipamento específico
    // IMPORTANTE: Não bloqueamos por nome/modelo/fabricante - apenas por Tag ou EquipamentoId (conforme especificação)
    return false;
  });
}

/**
 * Calcula disponibilidade de equipamentos por setor e grupo
 * 
 * @param sectorId - ID do setor
 * @param equipmentGroupKey - Chave do grupo de equipamentos
 * @param equipamentosArrayCache - (Opcional) Array de equipamentos já carregados para reutilização
 * @param osArrayCache - (Opcional) Array de OS já carregadas para reutilização
 */
export async function calcularDisponibilidadeMel(
  sectorId: number,
  equipmentGroupKey: string,
  equipamentosArrayCache?: EquipamentoDTO[],
  osArrayCache?: any[]
): Promise<DisponibilidadeMel | null> {
  const prisma = await getPrisma();
  if (!prisma) {
    throw new Error('Prisma não disponível');
  }

  // Buscar a regra MEL primeiro para obter o sectorName salvo
  const sectorMel = await prisma.sectorMel.findUnique({
    where: {
      sectorId_equipmentGroupKey: {
        sectorId,
        equipmentGroupKey,
      },
    },
  });

  if (!sectorMel) {
    return null;
  }

  // Buscar nome do setor - priorizar o nome salvo no SectorMel, depois o mapeamento
  const sectorMapping = await prisma.sectorMapping.findFirst({
    where: { systemSectorId: sectorId, active: true },
  });
  
  // Priorizar effortSectorName pois é o nome exato que vem na API Effort
  // Mas também considerar o nome salvo no SectorMel (que vem da API de investimentos)
  const sectorNameParaFiltro = sectorMapping?.effortSectorName 
    || sectorMel.sectorName
    || sectorMapping?.systemSectorName 
    || `Setor ${sectorId}`;
  const sectorName = sectorMel.sectorName
    || sectorMapping?.systemSectorName 
    || sectorMapping?.effortSectorName 
    || `Setor ${sectorId}`;

  // Usar cache se fornecido, senão buscar da API
  let equipamentosArray: EquipamentoDTO[] = [];
  if (equipamentosArrayCache && equipamentosArrayCache.length > 0) {
    equipamentosArray = equipamentosArrayCache;
  } else if (!equipamentosArrayCache) {
    const equipamentos = await dataSource.equipamentos({
      apenasAtivos: true,
      incluirComponentes: false,
      incluirCustoSubstituicao: false,
    });
    equipamentosArray = Array.isArray(equipamentos)
      ? equipamentos
      : (equipamentos as any)?.Itens || (equipamentos as any)?.data || [];
  } else {
    // Se equipamentosArrayCache foi fornecido mas está vazio, retornar null
    return null;
  }

  // Filtrar equipamentos do setor usando o nome exato da API Effort
  // IMPORTANTE: Para grupos customizados, os equipmentIds podem estar em qualquer setor,
  // então primeiro filtramos pelo setor apenas para grupos padrão
  let equipamentosDoGrupo: EquipamentoDTO[] = [];

  // Verificar se é um grupo customizado (tem groupPattern com equipmentIds)
  if (sectorMel.groupPattern) {
    try {
      const pattern = JSON.parse(sectorMel.groupPattern);
      if (pattern.type === 'custom' && pattern.equipmentIds && Array.isArray(pattern.equipmentIds)) {
        // Grupo customizado: buscar equipamentos pelos IDs salvos diretamente de TODOS os equipamentos
        // (não filtrar por setor primeiro, pois os IDs são específicos e podem estar em qualquer setor)
        const equipmentIdsSet = new Set(pattern.equipmentIds.map((id: number) => Number(id)));
        equipamentosDoGrupo = equipamentosArray.filter((eq: any) => equipmentIdsSet.has(eq.Id));
      }
    } catch (e) {
      console.warn(`[calcularDisponibilidadeMel] Erro ao parsear groupPattern para ${equipmentGroupKey}:`, e);
    }
  }

  // Se não encontrou equipamentos do grupo customizado, tentar usar agrupamento padrão
  if (equipamentosDoGrupo.length === 0) {
    // Para grupos padrão, filtrar por setor primeiro
    const equipamentosDoSetor = filtrarEquipamentosPorSetor(equipamentosArray, sectorNameParaFiltro);
    // Agrupar equipamentos
    const gruposMap = agruparEquipamentos(equipamentosDoSetor);
    const grupoData = gruposMap.get(equipmentGroupKey);
    
    if (grupoData) {
      equipamentosDoGrupo = grupoData.equipamentos;
    }
  }

  if (equipamentosDoGrupo.length === 0) {
    return null;
  }

  // Usar cache se fornecido, senão buscar da API
  let osArray: any[] = [];
  if (osArrayCache) {
    osArray = osArrayCache;
  } else {
    // Buscar OS analíticas completas (não resumidas) para obter Tag dos equipamentos
    // IMPORTANTE: A API resumida NÃO retorna Tag, portanto NÃO pode ser usada para vincular OS a equipamentos
    // Devemos usar a API analítica completa que retorna Tag, Patrimonio, NumeroDeSerie, EquipamentoId, etc.
    try {
      const osAnalitica = await dataSource.osAnalitica({
        tipoManutencao: 'Todos',
        periodo: 'AnoCorrente',
        pagina: 0,
        qtdPorPagina: 50000,
      });

      osArray = Array.isArray(osAnalitica)
        ? osAnalitica
        : (osAnalitica as any)?.Itens || (osAnalitica as any)?.data || [];
    } catch (error: any) {
      console.error('[calcularDisponibilidadeMel] Erro ao buscar OS analíticas completas:', error);
      // Tentar fallback para API resumida (mas não teremos Tag)
      try {
        const osResumida = await dataSource.osResumida({
          tipoManutencao: 'Todos',
          periodo: 'AnoCorrente',
          pagina: 0,
          qtdPorPagina: 50000,
        });
        osArray = Array.isArray(osResumida)
          ? osResumida
          : (osResumida as any)?.Itens || (osResumida as any)?.data || [];
      } catch (fallbackError: any) {
        console.error('[calcularDisponibilidadeMel] Erro no fallback para API resumida:', fallbackError);
        osArray = [];
      }
    }
  }

  // Não precisamos mais criar mapa de equipamentos
  // A API analítica completa já retorna a Tag diretamente na OS

  // Calcular totais e indisponíveis
  const totalNoSetor = equipamentosDoGrupo.length;
  const indisponiveis = equipamentosDoGrupo.filter((eq: EquipamentoDTO) => {
    // Verificar se está com status indisponível
    const status = (eq.Status || eq.Situacao || '').toLowerCase();
    if (STATUS_INDISPONIVEL.some((s) => status.includes(s))) {
      return true;
    }

    // Verificar se tem OS bloqueante
    // IMPORTANTE: Agora usamos API analítica completa que retorna Tag diretamente na OS
    return equipamentoTemOSBloqueante(eq, osArray);
  }).length;

  const disponiveis = totalNoSetor - indisponiveis;

  // Obter nome do grupo (pode vir do groupPattern customizado ou do agrupamento padrão)
  let equipmentGroupName = sectorMel.equipmentGroupName;
  if (!equipmentGroupName && equipamentosDoGrupo.length > 0) {
    // Tentar obter do agrupamento padrão (criar equipamentosDoSetor apenas se necessário)
    const equipamentosDoSetor = filtrarEquipamentosPorSetor(equipamentosArray, sectorNameParaFiltro);
    const gruposMap = agruparEquipamentos(equipamentosDoSetor);
    const grupoData = gruposMap.get(equipmentGroupKey);
    if (grupoData) {
      equipmentGroupName = grupoData.grupo.name;
    }
  }

  const minimumQuantity = sectorMel.minimumQuantity;
  const emAlerta = sectorMel.active && minimumQuantity !== null && disponiveis < minimumQuantity;

  return {
    sectorId,
    sectorName,
    equipmentGroupKey,
    equipmentGroupName: equipmentGroupName || equipmentGroupKey,
    totalNoSetor,
    indisponiveis,
    disponiveis,
    minimumQuantity,
    emAlerta,
  };
}

/**
 * Lista todos os grupos de equipamentos de um setor com situação atual
 */
export async function listarGruposEquipamentosPorSetor(
  sectorId: number
): Promise<EquipmentGroupWithAvailability[]> {
  try {
    const prisma = await getPrisma();
    if (!prisma) {
      throw new Error('Prisma não disponível');
    }

    console.log(`[melService] Buscando grupos de equipamentos para setor ${sectorId}`);

    // Buscar nome do setor
    const sectorMapping = await prisma.sectorMapping.findFirst({
      where: { systemSectorId: sectorId, active: true },
    });
    
    // Priorizar effortSectorName pois é o nome exato que vem na API Effort
    const sectorNameParaFiltro = sectorMapping?.effortSectorName || sectorMapping?.systemSectorName || `Setor ${sectorId}`;
    const sectorNameParaExibicao = sectorMapping?.systemSectorName || sectorMapping?.effortSectorName || `Setor ${sectorId}`;
    
    console.log(`[melService] Nome do setor para filtro (effortSectorName): "${sectorNameParaFiltro}"`);
    console.log(`[melService] Nome do setor para exibição (systemSectorName): "${sectorNameParaExibicao}"`);
    console.log(`[melService] SectorMapping encontrado:`, sectorMapping ? {
      id: sectorMapping.id,
      systemSectorId: sectorMapping.systemSectorId,
      systemSectorName: sectorMapping.systemSectorName,
      effortSectorId: sectorMapping.effortSectorId,
      effortSectorName: sectorMapping.effortSectorName,
    } : 'Nenhum mapeamento encontrado');

    // Buscar equipamentos da API Effort
    console.log(`[melService] Buscando equipamentos da API Effort...`);
    let equipamentos;
    try {
      equipamentos = await dataSource.equipamentos({
        apenasAtivos: true,
        incluirComponentes: false,
        incluirCustoSubstituicao: false,
      });
    } catch (error: any) {
      console.error(`[melService] Erro ao buscar equipamentos da API Effort:`, error);
      throw new Error(`Erro ao buscar equipamentos da API Effort: ${error?.message || 'Erro desconhecido'}`);
    }

    const equipamentosArray = Array.isArray(equipamentos)
      ? equipamentos
      : (equipamentos as any)?.Itens || (equipamentos as any)?.data || [];

    console.log(`[melService] Total de equipamentos encontrados: ${equipamentosArray.length}`);

    // Filtrar equipamentos do setor usando o nome exato da API Effort
    const equipamentosDoSetor = filtrarEquipamentosPorSetor(equipamentosArray, sectorNameParaFiltro);
    console.log(`[melService] Equipamentos do setor "${sectorNameParaFiltro}": ${equipamentosDoSetor.length}`);

    // Agrupar equipamentos
    const gruposComContagem = obterGruposComContagem(equipamentosDoSetor);
    console.log(`[melService] Grupos encontrados: ${gruposComContagem.length}`);

    // Buscar OS analíticas completas (não resumidas) para obter Tag dos equipamentos
    // IMPORTANTE: A API resumida NÃO retorna Tag, portanto NÃO pode ser usada para vincular OS a equipamentos
    console.log(`[melService] Buscando OS analíticas completas para obter Tags dos equipamentos...`);
    let osArray: any[] = [];
    try {
      const osAnalitica = await dataSource.osAnalitica({
        tipoManutencao: 'Todos',
        periodo: 'AnoCorrente',
        pagina: 0,
        qtdPorPagina: 50000,
      });
      
      osArray = Array.isArray(osAnalitica)
        ? osAnalitica
        : (osAnalitica as any)?.Itens || (osAnalitica as any)?.data || [];
      
      console.log(`[melService] Total de OS analíticas encontradas: ${osArray.length} (com Tag)`);
    } catch (error: any) {
      console.error(`[melService] Erro ao buscar OS analíticas da API Effort:`, error);
      // Tentar fallback para API resumida (mas não teremos Tag)
      console.warn(`[melService] Tentando fallback para API resumida (sem Tag)...`);
      try {
        const osResumida = await dataSource.osResumida({
          tipoManutencao: 'Todos',
          periodo: 'AnoCorrente',
          pagina: 0,
          qtdPorPagina: 50000,
        });
        osArray = Array.isArray(osResumida)
          ? osResumida
          : (osResumida as any)?.Itens || (osResumida as any)?.data || [];
        console.warn(`[melService] ⚠️ Usando API resumida (${osArray.length} OS) - Tags NÃO estarão disponíveis`);
      } catch (fallbackError: any) {
        console.error(`[melService] Erro no fallback para API resumida:`, fallbackError);
        osArray = [];
      }
    }

    // Buscar todos os MEL configurados para este setor
    console.log(`[melService] Buscando MEL configurados para setor ${sectorId}...`);
    const sectorMels = await prisma.sectorMel.findMany({
      where: { sectorId },
    });
    console.log(`[melService] MEL configurados encontrados: ${sectorMels.length}`);

    const melMap = new Map(sectorMels.map((mel) => [mel.equipmentGroupKey, mel.minimumQuantity]));

    // Calcular disponibilidade para cada grupo
    const resultados: EquipmentGroupWithAvailability[] = [];

    for (const grupoData of gruposComContagem) {
      const indisponiveis = grupoData.equipamentos.filter((eq: EquipamentoDTO) => {
        // Verificar se está com status indisponível
        const status = (eq.Status || eq.Situacao || '').toLowerCase();
        if (STATUS_INDISPONIVEL.some((s) => status.includes(s))) {
          return true;
        }

        // Verificar se tem OS bloqueante
        // IMPORTANTE: Agora usamos API analítica completa que retorna Tag diretamente na OS
        return equipamentoTemOSBloqueante(eq, osArray);
      }).length;

      const disponiveis = grupoData.quantidade - indisponiveis;
      const minimumQuantity = melMap.get(grupoData.grupo.key) || null;
      const emAlerta = minimumQuantity !== null && disponiveis < minimumQuantity;

      resultados.push({
        grupo: grupoData.grupo,
        equipamentos: grupoData.equipamentos,
        quantidade: grupoData.quantidade,
        indisponiveis,
        disponiveis,
        minimumQuantity,
        emAlerta,
      });
    }

    console.log(`[melService] Retornando ${resultados.length} grupos com disponibilidade calculada`);
    return resultados;
  } catch (error: any) {
    console.error(`[melService] Erro ao listar grupos de equipamentos para setor ${sectorId}:`, error);
    console.error(`[melService] Stack:`, error?.stack);
    throw error;
  }
}

/**
 * Lista todos os itens de MEL de um setor com situação atual
 */
export async function listarMelPorSetor(sectorId: number): Promise<MelItem[]> {
  const grupos = await listarGruposEquipamentosPorSetor(sectorId);

  return grupos
    .filter((g) => g.minimumQuantity !== null)
    .map((g) => ({
      equipmentGroupKey: g.grupo.key,
      equipmentGroupName: g.grupo.name,
      minimumQuantity: g.minimumQuantity!,
      totalNoSetor: g.quantidade,
      indisponiveis: g.indisponiveis,
      disponiveis: g.disponiveis,
      emAlerta: g.emAlerta,
    }));
}

/**
 * Recalcula todos os alertas de MEL
 */
export async function recalcularAlertasMel(): Promise<void> {
  const prisma = await getPrisma();
  if (!prisma) {
    throw new Error('Prisma não disponível');
  }

  console.log('[melService] Iniciando recálculo de alertas MEL...');

  // Buscar todos os MEL configurados (apenas os ativos devem gerar alertas)
  const todosMels = await prisma.sectorMel.findMany({
    where: { active: true }, // Apenas regras ativas devem gerar alertas
  });

  console.log(`[melService] Encontrados ${todosMels.length} registros de MEL ativos para processar`);

  // Criar um Set com as chaves únicas (sectorId + equipmentGroupKey) das regras ativas
  const regrasAtivasKeys = new Set(
    todosMels.map((mel) => `${mel.sectorId}:${mel.equipmentGroupKey}`)
  );
  console.log(`[melService] Chaves de regras ativas: ${Array.from(regrasAtivasKeys).join(', ')}`);

  // Buscar todos os alertas ativos para verificar se ainda têm regras correspondentes
  const todosAlertasAtivos = await prisma.melAlert.findMany({
    where: { status: 'ativo' },
  });
  console.log(`[melService] Encontrados ${todosAlertasAtivos.length} alertas ativos para verificar`);

  // Resolver alertas que não têm mais regras MEL correspondentes (órfãos)
  for (const alerta of todosAlertasAtivos) {
    const alertaKey = `${alerta.sectorId}:${alerta.equipmentGroupKey}`;
    if (!regrasAtivasKeys.has(alertaKey)) {
      console.log(`[melService] Encontrado alerta órfão: ${alertaKey} (ID: ${alerta.id})`);
      await prisma.melAlert.update({
        where: { id: alerta.id },
        data: {
          status: 'resolvido',
          resolvedAt: new Date(),
        },
      });
      console.log(`[melService] Alerta ${alerta.id} marcado como resolvido (regra MEL não existe mais)`);
    }
  }

  // Processar cada regra MEL ativa
  for (const sectorMel of todosMels) {
    try {
      // Pular se a regra não estiver ativa
      if (!sectorMel.active) {
        continue;
      }

      const disponibilidade = await calcularDisponibilidadeMel(
        sectorMel.sectorId,
        sectorMel.equipmentGroupKey
      );

      if (!disponibilidade) {
        // Se não encontrou equipamentos, considerar como se não houvesse disponíveis
        // Isso pode gerar alerta se o mínimo for maior que 0
        const emAlerta = sectorMel.minimumQuantity > 0;
        
        if (emAlerta) {
          // Criar alerta para indicar que não há equipamentos encontrados
          const alertaExistente = await prisma.melAlert.findFirst({
            where: {
              sectorId: sectorMel.sectorId,
              equipmentGroupKey: sectorMel.equipmentGroupKey,
              status: 'ativo',
            },
          });

          if (!alertaExistente) {
            await prisma.melAlert.create({
              data: {
                sectorId: sectorMel.sectorId,
                sectorName: sectorMel.sectorName || `Setor ${sectorMel.sectorId}`,
                equipmentGroupKey: sectorMel.equipmentGroupKey,
                equipmentGroupName: sectorMel.equipmentGroupName,
                sectorMelId: sectorMel.id,
                currentAvailable: 0,
                minimumQuantity: sectorMel.minimumQuantity,
                totalInSector: 0,
                unavailableCount: 0,
                status: 'ativo',
              },
            });
          }
        }
        continue;
      }

      const emAlerta = disponibilidade.disponiveis < sectorMel.minimumQuantity;

      // Buscar ou criar alerta
      const alertaExistente = await prisma.melAlert.findFirst({
        where: {
          sectorId: sectorMel.sectorId,
          equipmentGroupKey: sectorMel.equipmentGroupKey,
          status: 'ativo',
        },
      });

      if (emAlerta) {
        // Criar ou atualizar alerta
        if (alertaExistente) {
          await prisma.melAlert.update({
            where: { id: alertaExistente.id },
            data: {
              currentAvailable: disponibilidade.disponiveis,
              totalInSector: disponibilidade.totalNoSetor,
              unavailableCount: disponibilidade.indisponiveis,
              updatedAt: new Date(),
            },
          });
        } else {
          await prisma.melAlert.create({
            data: {
              sectorId: sectorMel.sectorId,
              sectorName: disponibilidade.sectorName,
              equipmentGroupKey: sectorMel.equipmentGroupKey,
              equipmentGroupName: disponibilidade.equipmentGroupName,
              sectorMelId: sectorMel.id,
              currentAvailable: disponibilidade.disponiveis,
              minimumQuantity: sectorMel.minimumQuantity,
              totalInSector: disponibilidade.totalNoSetor,
              unavailableCount: disponibilidade.indisponiveis,
              status: 'ativo',
            },
          });
        }
      } else {
        // Resolver alerta se existir
        if (alertaExistente) {
          await prisma.melAlert.update({
            where: { id: alertaExistente.id },
            data: {
              status: 'resolvido',
              resolvedAt: new Date(),
            },
          });
        }
      }
    } catch (error: any) {
      console.error(
        `[melService] Erro ao processar MEL para setor ${sectorMel.sectorId}, grupo ${sectorMel.equipmentGroupKey}:`,
        error.message
      );
    }
  }

  console.log('[melService] Recálculo de alertas MEL concluído');
}

/**
 * Busca alertas ativos de MEL
 */
export async function buscarAlertasMel(apenasAtivos: boolean = true) {
  const prisma = await getPrisma();
  if (!prisma) {
    throw new Error('Prisma não disponível');
  }

  const where: any = {};
  if (apenasAtivos) {
    where.status = 'ativo';
  }

  const alertas = await prisma.melAlert.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
  });

  return alertas.map((alerta) => ({
    id: alerta.id,
    sectorId: alerta.sectorId,
    sectorName: alerta.sectorName,
    equipmentGroupKey: alerta.equipmentGroupKey,
    equipmentGroupName: alerta.equipmentGroupName,
    currentAvailable: alerta.currentAvailable,
    minimumQuantity: alerta.minimumQuantity,
    totalInSector: alerta.totalInSector,
    unavailableCount: alerta.unavailableCount,
    status: alerta.status,
    resolvedAt: alerta.resolvedAt,
    createdAt: alerta.createdAt,
  }));
}
