// src/routes/purchaseRequests.ts
import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getPrisma } from '../services/prismaService';

const USE_MOCK = process.env.USE_MOCK === 'true';

export const purchaseRequests = Router();

// GET /api/ecm/purchase-requests - Listar todas as solicitações de compra
purchaseRequests.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { status, sectorId } = req.query;

    if (USE_MOCK) {
      return res.json([]);
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Prisma não disponível' });
    }

    const where: any = {};
    if (status) where.status = status;
    if (sectorId) where.sectorId = Number(sectorId);

    let requests;
    try {
      requests = await prismaClient.purchaseRequest.findMany({
        where,
        include: {
          serviceOrders: {
            select: {
              id: true,
              codigoSerialOS: true,
              osCodigo: true,
            },
          },
          investments: {
            include: {
              investment: {
                select: {
                  id: true,
                  titulo: true,
                  categoria: true,
                  valorEstimado: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbError: any) {
      // Se a tabela não existir ou houver erro de schema, retornar array vazio
      const errorMsg = dbError.message?.toLowerCase() || '';
      if (
        errorMsg.includes('no such table') || 
        errorMsg.includes('does not exist') ||
        errorMsg.includes('relation') ||
        errorMsg.includes('unknown column')
      ) {
        console.warn('[purchase-requests] Erro de schema/tabela. Retornando array vazio:', dbError.message);
        console.warn('[purchase-requests] Dica: Execute a migração do Prisma: npx prisma migrate dev');
        return res.json([]);
      }
      throw dbError;
    }
    
    // Se não houver solicitações, retornar array vazio
    if (!requests || !Array.isArray(requests)) {
      return res.json([]);
    }

    res.json(requests.map((pr: any) => {
      // Calcular dias de espera (data de solicitação até hoje)
      let diasEspera: number | null = null;
      if (pr.dataSolicitacao) {
        const dataSolicitacao = new Date(pr.dataSolicitacao);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        dataSolicitacao.setHours(0, 0, 0, 0);
        const diffTime = hoje.getTime() - dataSolicitacao.getTime();
        diasEspera = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }
      
      return {
        id: pr.id,
        numeroSolicitacao: pr.numeroSolicitacao,
        sectorId: pr.sectorId,
        sectorName: pr.sectorName,
        description: pr.description,
        status: pr.status,
        dataSolicitacao: pr.dataSolicitacao?.toISOString(),
        dataEntrega: pr.dataEntrega?.toISOString(),
        observacoes: pr.observacoes,
        diasEspera, // Dias desde a solicitação até hoje
        serviceOrders: pr.serviceOrders,
        investments: pr.investments.map((pi: any) => pi.investment),
        createdAt: pr.createdAt.toISOString(),
        updatedAt: pr.updatedAt.toISOString(),
      };
    }));
  } catch (e: any) {
    console.error('[purchase-requests] Erro completo:', e);
    console.error('[purchase-requests] Stack:', e?.stack);
    res.status(500).json({ 
      error: true, 
      message: e?.message || 'Erro ao buscar solicitações de compra',
      details: process.env.NODE_ENV === 'development' ? e?.stack : undefined,
    });
  }
});

// GET /api/ecm/purchase-requests/:id - Obter uma solicitação específica
purchaseRequests.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (USE_MOCK) {
      return res.status(404).json({ error: true, message: 'Solicitação não encontrada' });
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Prisma não disponível' });
    }

    const request = await prismaClient.purchaseRequest.findUnique({
      where: { id },
      include: {
        serviceOrders: {
          select: {
            id: true,
            codigoSerialOS: true,
            osCodigo: true,
          },
        },
        investments: {
          include: {
            investment: {
              select: {
                id: true,
                titulo: true,
                categoria: true,
                valorEstimado: true,
              },
            },
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ error: true, message: 'Solicitação não encontrada' });
    }

    // Calcular dias de espera
    let diasEspera: number | null = null;
    if (request.dataSolicitacao) {
      const dataSolicitacao = new Date(request.dataSolicitacao);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      dataSolicitacao.setHours(0, 0, 0, 0);
      const diffTime = hoje.getTime() - dataSolicitacao.getTime();
      diasEspera = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    res.json({
      id: request.id,
      numeroSolicitacao: request.numeroSolicitacao,
      sectorId: request.sectorId,
      sectorName: request.sectorName,
      description: request.description,
      status: request.status,
      dataSolicitacao: request.dataSolicitacao?.toISOString(),
      dataEntrega: request.dataEntrega?.toISOString(),
      observacoes: request.observacoes,
      diasEspera,
      serviceOrders: request.serviceOrders,
      investments: request.investments.map((pi: any) => pi.investment),
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    });
  } catch (e: any) {
    console.error('[purchase-requests] Erro:', e?.message);
    res.status(500).json({ 
      error: true, 
      message: e?.message || 'Erro ao buscar solicitação'
    });
  }
});

// POST /api/ecm/purchase-requests - Criar nova solicitação de compra
purchaseRequests.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log('[purchase-requests:POST] Recebido:', JSON.stringify(req.body, null, 2));
    
    if (!req.user) {
      console.error('[purchase-requests:POST] Usuário não autenticado');
      return res.status(401).json({ error: true, message: 'Não autenticado' });
    }

    const {
      numeroSolicitacao,
      sectorId,
      sectorName,
      description,
      status = 'Pendente',
      dataSolicitacao,
      dataEntrega,
      observacoes,
      serviceOrderIds = [],
      investmentIds = [],
    } = req.body;

    console.log('[purchase-requests:POST] Dados processados:', {
      numeroSolicitacao,
      sectorId,
      sectorName,
      description,
      status,
      dataSolicitacao,
      dataEntrega,
      observacoes,
      serviceOrderIds: serviceOrderIds?.length || 0,
      investmentIds: investmentIds?.length || 0,
    });

    if (!description || !sectorId || !dataSolicitacao) {
      console.error('[purchase-requests:POST] Validação falhou:', {
        hasDescription: !!description,
        sectorId,
        hasDataSolicitacao: !!dataSolicitacao,
      });
      return res.status(400).json({
        error: true,
        message: 'Campos obrigatórios: description, sectorId, dataSolicitacao',
      });
    }

    if (USE_MOCK) {
      return res.json({
        id: `mock-${Date.now()}`,
        numeroSolicitacao,
        sectorId,
        sectorName,
        description,
        status,
        dataSolicitacao,
        dataEntrega,
        observacoes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Prisma não disponível' });
    }

    // Criar solicitação de compra
    console.log('[purchase-requests:POST] Criando no banco de dados...');
    
    const purchaseRequestData: any = {
      numeroSolicitacao: numeroSolicitacao || null,
      sectorId: Number(sectorId), // Garantir que é número
      sectorName: sectorName || null,
      description,
      status,
      dataSolicitacao: new Date(dataSolicitacao),
      dataEntrega: dataEntrega ? new Date(dataEntrega) : null,
      observacoes: observacoes || null,
      createdBy: req.user.id,
    };

    // Vincular OS apenas se houver IDs válidos
    if (Array.isArray(serviceOrderIds) && serviceOrderIds.length > 0) {
      console.log('[purchase-requests:POST] Vincular OS:', serviceOrderIds);
      
      // Separar IDs String (cuid - id do ServiceOrder) de números (CodigoSerialOS)
      const stringIds: string[] = [];
      const numberIds: number[] = [];
      
      serviceOrderIds.forEach((id: any) => {
        if (typeof id === 'string' && id.length > 10) {
          // ID cuid tem mais de 10 caracteres
          stringIds.push(id);
        } else {
          // Tentar converter para número (CodigoSerialOS)
          const numId = Number(id);
          if (!isNaN(numId) && numId > 0) {
            numberIds.push(numId);
          }
        }
      });
      
      // Buscar/criar OS
      const osToConnect: string[] = [];
      
      // Buscar por IDs String (cuid) - OS que já existem no banco
      if (stringIds.length > 0) {
        const osById = await prismaClient.serviceOrder.findMany({
          where: {
            id: { in: stringIds },
          },
          select: { id: true },
        });
        osToConnect.push(...osById.map(os => os.id));
        console.log('[purchase-requests:POST] OS encontradas por ID:', osById.length);
      }
      
      // Buscar/criar por CodigoSerialOS (número) - OS da API externa
      if (numberIds.length > 0) {
        // Primeiro, buscar as que já existem
        const osByCodigo = await prismaClient.serviceOrder.findMany({
          where: {
            codigoSerialOS: { in: numberIds },
          },
          select: { id: true, codigoSerialOS: true },
        });
        osToConnect.push(...osByCodigo.map(os => os.id));
        console.log('[purchase-requests:POST] OS encontradas por CodigoSerialOS:', osByCodigo.length);
        
        // Criar as que não existem usando upsert (cria se não existe, atualiza se existe)
        const codigosExistentes = new Set(osByCodigo.map(os => os.codigoSerialOS));
        const codigosParaCriar = numberIds.filter(cod => !codigosExistentes.has(cod));
        
        if (codigosParaCriar.length > 0) {
          console.log('[purchase-requests:POST] Criando OS que não existem:', codigosParaCriar);
          
          // Criar OS usando upsert (cria se não existe)
          for (const codigoSerialOS of codigosParaCriar) {
            try {
              const newOS = await prismaClient.serviceOrder.upsert({
                where: { codigoSerialOS },
                update: {}, // Se já existir, não atualiza
                create: {
                  codigoSerialOS,
                  osCodigo: `OS-${codigoSerialOS}`, // Código temporário, será atualizado depois se necessário
                },
              });
              osToConnect.push(newOS.id);
              console.log('[purchase-requests:POST] OS criada/encontrada:', newOS.id, codigoSerialOS);
            } catch (createError: any) {
              console.error('[purchase-requests:POST] Erro ao criar OS:', codigoSerialOS, createError.message);
              // Se der erro de constraint (já existe), tentar buscar novamente
              try {
                const existingOS = await prismaClient.serviceOrder.findUnique({
                  where: { codigoSerialOS },
                  select: { id: true },
                });
                if (existingOS) {
                  if (!osToConnect.includes(existingOS.id)) {
                    osToConnect.push(existingOS.id);
                    console.log('[purchase-requests:POST] OS encontrada após erro:', existingOS.id);
                  }
                }
              } catch (findError: any) {
                console.error('[purchase-requests:POST] Erro ao buscar OS após tentativa de criar:', findError.message);
              }
            }
          }
        }
      }
      
      if (osToConnect.length > 0) {
        purchaseRequestData.serviceOrders = {
          connect: osToConnect.map(id => ({ id })),
        };
        console.log('[purchase-requests:POST] Total de OS para vincular:', osToConnect.length);
      } else {
        console.warn('[purchase-requests:POST] Nenhuma OS foi vinculada. Verifique os IDs fornecidos.');
      }
    }

    // Vincular investimentos apenas se houver IDs válidos
    if (Array.isArray(investmentIds) && investmentIds.length > 0) {
      console.log('[purchase-requests:POST] Vincular investimentos:', investmentIds);
      
      // Garantir que todos os IDs são strings válidas
      const validInvestmentIds = investmentIds.filter(id => id && typeof id === 'string' && id.length > 0);
      
      console.log('[purchase-requests:POST] IDs de investimento válidos:', validInvestmentIds.length, 'de', investmentIds.length);
      
      if (validInvestmentIds.length > 0) {
        // Verificar se os IDs existem antes de vincular
        const existingInvestments = await prismaClient.investment.findMany({
          where: {
            id: { in: validInvestmentIds },
          },
          select: { id: true },
        });
        
        console.log('[purchase-requests:POST] Investimentos encontrados no banco:', existingInvestments.length);
        
        if (existingInvestments.length > 0) {
          purchaseRequestData.investments = {
            create: existingInvestments.map(inv => ({
              investmentId: inv.id,
            })),
          };
          console.log('[purchase-requests:POST] Investimentos vinculados:', existingInvestments.length);
        } else {
          console.warn('[purchase-requests:POST] Nenhum investimento encontrado. IDs fornecidos:', validInvestmentIds);
        }
      } else {
        console.warn('[purchase-requests:POST] Nenhum ID de investimento válido. IDs recebidos:', investmentIds);
      }
    }

    console.log('[purchase-requests:POST] Dados para criar:', JSON.stringify(purchaseRequestData, null, 2));
    
    const purchaseRequest = await prismaClient.purchaseRequest.create({
      data: purchaseRequestData,
      include: {
        serviceOrders: {
          select: {
            id: true,
            codigoSerialOS: true,
            osCodigo: true,
          },
        },
        investments: {
          include: {
            investment: {
              select: {
                id: true,
                titulo: true,
                categoria: true,
                valorEstimado: true,
              },
            },
          },
        },
      },
    });

    console.log('[purchase-requests:POST] Solicitação criada com sucesso:', purchaseRequest.id);

    // Calcular dias de espera
    let diasEspera: number | null = null;
    if (purchaseRequest.dataSolicitacao) {
      const dataSolicitacao = new Date(purchaseRequest.dataSolicitacao);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      dataSolicitacao.setHours(0, 0, 0, 0);
      const diffTime = hoje.getTime() - dataSolicitacao.getTime();
      diasEspera = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    res.status(201).json({
      id: purchaseRequest.id,
      numeroSolicitacao: purchaseRequest.numeroSolicitacao,
      sectorId: purchaseRequest.sectorId,
      sectorName: purchaseRequest.sectorName,
      description: purchaseRequest.description,
      status: purchaseRequest.status,
      dataSolicitacao: purchaseRequest.dataSolicitacao?.toISOString(),
      dataEntrega: purchaseRequest.dataEntrega?.toISOString(),
      observacoes: purchaseRequest.observacoes,
      diasEspera,
      serviceOrders: purchaseRequest.serviceOrders,
      investments: purchaseRequest.investments.map((pi: any) => pi.investment),
      createdAt: purchaseRequest.createdAt.toISOString(),
      updatedAt: purchaseRequest.updatedAt.toISOString(),
    });
  } catch (e: any) {
    console.error('[purchase-requests:POST] Erro completo:', e);
    console.error('[purchase-requests:POST] Stack:', e?.stack);
    res.status(500).json({ 
      error: true, 
      message: e?.message || 'Erro ao criar solicitação de compra',
      details: process.env.NODE_ENV === 'development' ? e?.stack : undefined,
    });
  }
});

// PATCH /api/ecm/purchase-requests/:id - Atualizar solicitação de compra
purchaseRequests.patch('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: true, message: 'Não autenticado' });
    }

    const { id } = req.params;
    const {
      numeroSolicitacao,
      sectorId,
      sectorName,
      description,
      status,
      dataSolicitacao,
      dataEntrega,
      observacoes,
      serviceOrderIds,
      investmentIds,
    } = req.body;

    if (USE_MOCK) {
      return res.json({
        id,
        numeroSolicitacao,
        sectorId,
        sectorName,
        description,
        status,
        dataSolicitacao,
        dataEntrega,
        observacoes,
        updatedAt: new Date().toISOString(),
      });
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Prisma não disponível' });
    }

    const updateData: any = {};
    if (numeroSolicitacao !== undefined) updateData.numeroSolicitacao = numeroSolicitacao || null;
    if (sectorId !== undefined) updateData.sectorId = sectorId;
    if (sectorName !== undefined) updateData.sectorName = sectorName;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (dataSolicitacao !== undefined) updateData.dataSolicitacao = dataSolicitacao ? new Date(dataSolicitacao) : null;
    if (dataEntrega !== undefined) updateData.dataEntrega = dataEntrega ? new Date(dataEntrega) : null;
    if (observacoes !== undefined) updateData.observacoes = observacoes;

    // Atualizar vínculos de OS
    if (serviceOrderIds !== undefined) {
      // Primeiro, desconectar todas as OS existentes
      await prismaClient.purchaseRequest.update({
        where: { id },
        data: {
          serviceOrders: {
            set: [],
          },
        },
      });
      // Depois, conectar as novas OS
      if (Array.isArray(serviceOrderIds) && serviceOrderIds.length > 0) {
        updateData.serviceOrders = {
          connect: serviceOrderIds.map((osId: string) => ({ id: osId })),
        };
      }
    }

    // Atualizar vínculos de investimentos
    if (investmentIds !== undefined) {
      // Primeiro, deletar todas as relações existentes
      await prismaClient.purchaseRequestInvestment.deleteMany({
        where: { purchaseRequestId: id },
      });
      // Depois, criar as novas relações
      if (Array.isArray(investmentIds) && investmentIds.length > 0) {
        updateData.investments = {
          create: investmentIds.map((invId: string) => ({
            investmentId: invId,
          })),
        };
      }
    }

    const purchaseRequest = await prismaClient.purchaseRequest.update({
      where: { id },
      data: updateData,
      include: {
        serviceOrders: {
          select: {
            id: true,
            codigoSerialOS: true,
            osCodigo: true,
          },
        },
        investments: {
          include: {
            investment: {
              select: {
                id: true,
                titulo: true,
                categoria: true,
                valorEstimado: true,
              },
            },
          },
        },
      },
    });

    res.json({
      id: purchaseRequest.id,
      numeroSolicitacao: purchaseRequest.numeroSolicitacao,
      sectorId: purchaseRequest.sectorId,
      sectorName: purchaseRequest.sectorName,
      description: purchaseRequest.description,
      status: purchaseRequest.status,
      dataSolicitacao: purchaseRequest.dataSolicitacao?.toISOString(),
      dataEntrega: purchaseRequest.dataEntrega?.toISOString(),
      observacoes: purchaseRequest.observacoes,
      serviceOrders: purchaseRequest.serviceOrders,
      investments: purchaseRequest.investments.map((pi: any) => pi.investment),
      createdAt: purchaseRequest.createdAt.toISOString(),
      updatedAt: purchaseRequest.updatedAt.toISOString(),
    });
  } catch (e: any) {
    console.error('[purchase-requests] Erro:', e?.message);
    res.status(500).json({ 
      error: true, 
      message: e?.message || 'Erro ao atualizar solicitação de compra'
    });
  }
});

// DELETE /api/ecm/purchase-requests/:id - Excluir solicitação de compra
purchaseRequests.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: true, message: 'Não autenticado' });
    }

    const { id } = req.params;

    if (USE_MOCK) {
      return res.json({ success: true });
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Prisma não disponível' });
    }

    await prismaClient.purchaseRequest.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error('[purchase-requests] Erro:', e?.message);
    res.status(500).json({ 
      error: true, 
      message: e?.message || 'Erro ao excluir solicitação de compra'
    });
  }
});

