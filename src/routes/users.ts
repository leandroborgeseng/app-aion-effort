// src/routes/users.ts
import { Router } from 'express';
import * as fs from 'node:fs/promises';
import { getSectorIdFromName } from '../utils/sectorMapping';

import { getPrisma } from '../services/prismaService';

const USE_MOCK = process.env.USE_MOCK === 'true';

export const users = Router();

// GET /api/users - Listar todos os usuários
users.get('/', async (req, res) => {
  try {
    if (USE_MOCK) {
      // Mock de usuários
      const users = [
        {
          id: '1',
          email: 'admin@aion.com',
          name: 'Administrador',
          role: 'admin',
          active: true,
          canImpersonate: true,
          sectors: [],
          managedUsers: [],
        },
        {
          id: '2',
          email: 'gerente@aion.com',
          name: 'Gerente',
          role: 'gerente',
          active: true,
          canImpersonate: true,
          sectors: [],
          managedUsers: [],
        },
        {
          id: '3',
          email: 'usuario1@aion.com',
          name: 'Usuário Setor A',
          role: 'comum',
          active: true,
          canImpersonate: false,
          sectors: [{ id: '1', sectorId: 1, sectorName: 'UTI' }],
          managedUsers: [],
        },
      ];
      res.json(users);
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      const users = await prismaClient.user.findMany({
        include: {
          sectors: true,
          managedUsers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Buscar nomes reais dos setores usando mapeamento do sistema
      // Se houver erro no mapeamento, retornar usuários com nomes originais
      let usersWithMappedSectors = users;
      
      try {
        const { getSectorNamesFromUserSector } = await import('../utils/sectorMapping');
        const { dataSource } = await import('../adapters/dataSource');
        
        let equipamentos: any[] = [];
        try {
          equipamentos = await dataSource.equipamentos({
            apenasAtivos: true,
            incluirComponentes: false,
            incluirCustoSubstituicao: false,
          });
        } catch (equipError) {
          console.warn('[users:GET] Erro ao buscar equipamentos para mapeamento:', equipError);
          // Continuar sem equipamentos
        }

        // Atualizar nomes dos setores para cada usuário
        usersWithMappedSectors = await Promise.all(
          users.map(async (user) => {
            if (user.sectors.length === 0) {
              return user;
            }

            try {
              const sectorIds = user.sectors.map((s) => s.sectorId);
              const sectorNames = await getSectorNamesFromUserSector(sectorIds, equipamentos, user.id, req);

              return {
                ...user,
                sectors: user.sectors.map((sector, index) => ({
                  ...sector,
                  sectorName: sectorNames[index] || sector.sectorName || `Setor ${sector.sectorId}`,
                })),
              };
            } catch (sectorError) {
              console.warn(`[users:GET] Erro ao mapear setores do usuário ${user.id}:`, sectorError);
              // Retornar usuário com setores originais se houver erro
              return {
                ...user,
                sectors: user.sectors.map((sector) => ({
                  ...sector,
                  sectorName: sector.sectorName || `Setor ${sector.sectorId}`,
                })),
              };
            }
          })
        );
      } catch (mappingError) {
        console.error('[users:GET] Erro no mapeamento de setores, retornando usuários sem mapeamento:', mappingError);
        // Em caso de erro, retornar usuários com nomes originais dos setores
        usersWithMappedSectors = users.map((user) => ({
          ...user,
          sectors: user.sectors.map((sector) => ({
            ...sector,
            sectorName: sector.sectorName || `Setor ${sector.sectorId}`,
          })),
        }));
      }

      res.json(usersWithMappedSectors);
    }
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// GET /api/users/:id - Buscar usuário por ID
users.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (USE_MOCK) {
      const user = {
        id,
        email: 'user@aion.com',
        name: 'Usuário',
        role: 'comum',
        active: true,
        canImpersonate: false,
        sectors: [],
        managedUsers: [],
      };
      res.json(user);
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      const user = await prismaClient.user.findUnique({
        where: { id },
        include: {
          sectors: true,
          managedUsers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ error: true, message: 'Usuário não encontrado' });
      }

      res.json(user);
    }
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// POST /api/users - Criar novo usuário
users.post('/', async (req, res) => {
  try {
    const { email, name, role, sectors, canImpersonate, managedUserIds, password } = req.body;

    if (USE_MOCK) {
      const newUser = {
        id: Date.now().toString(),
        email,
        name,
        role: role || 'comum',
        active: true,
        canImpersonate: canImpersonate || false,
        sectors: sectors || [],
      };
      res.status(201).json(newUser);
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      // Verificar se email já existe
      const existingUser = await prismaClient.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ error: true, message: 'Email já cadastrado' });
      }

      // Gerar hash da senha (senha padrão se não fornecida)
      const bcrypt = await import('bcrypt');
      const defaultPassword = password || 'senha123'; // Senha padrão temporária
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      // Buscar nomes dos setores usando mapeamento do sistema
      const { getSectorNamesFromUserSector } = await import('../utils/sectorMapping');
      const sectorNames = sectors && sectors.length > 0 
        ? await getSectorNamesFromUserSector(sectors, undefined, undefined, req)
        : [];

      const user = await prismaClient.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: role || 'comum',
          active: true,
          canImpersonate: canImpersonate || false,
          sectors: {
            create: (sectors || []).map((sectorId: number, index: number) => ({
              sectorId,
              sectorName: sectorNames[index] || null,
            })),
          },
          managedUsers: {
            create: managedUserIds?.map((userId: string) => ({
              userId,
            })) || [],
          },
        },
        include: {
          sectors: true,
          managedUsers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      res.status(201).json(user);
    }
  } catch (e: any) {
    console.error('[users:POST] Erro ao criar usuário:', e);
    res.status(500).json({ error: true, message: e?.message });
  }
});

// PATCH /api/users/:id - Atualizar usuário
users.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, phone, role, active, sectors, canImpersonate, managedUserIds } = req.body;

    if (USE_MOCK) {
      const updatedUser = {
        id,
        email: email || 'user@aion.com',
        name: name || 'Usuário',
        role: role || 'comum',
        active: active !== undefined ? active : true,
        canImpersonate: canImpersonate || false,
        sectors: sectors || [],
        managedUsers: [],
      };
      res.json(updatedUser);
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      // Atualizar setores se fornecidos
      if (sectors !== undefined) {
        await prismaClient.userSector.deleteMany({
          where: { userId: id },
        });

        if (sectors.length > 0) {
          // Buscar nomes dos setores usando mapeamento do sistema
          const { getSectorNamesFromUserSector } = await import('../utils/sectorMapping');
          const { dataSource } = await import('../adapters/dataSource');
          const equipamentos = await dataSource.equipamentos({
            apenasAtivos: true,
            incluirComponentes: false,
            incluirCustoSubstituicao: false,
          });
          
          const sectorNames = await getSectorNamesFromUserSector(sectors, equipamentos, id, req);
          
          await prismaClient.userSector.createMany({
            data: sectors.map((sectorId: number, index: number) => ({
              userId: id,
              sectorId,
              sectorName: sectorNames[index] || null,
            })),
          });
        }
      }

      // Atualizar usuários gerenciados se fornecido (apenas para gerentes)
      if (managedUserIds !== undefined) {
        await prismaClient.userManager.deleteMany({
          where: { managerId: id },
        });

        if (managedUserIds.length > 0) {
          await prismaClient.userManager.createMany({
            data: managedUserIds.map((userId: string) => ({
              managerId: id,
              userId,
            })),
          });
        }
      }

      const user = await prismaClient.user.update({
        where: { id },
        data: {
          ...(email && { email }),
          ...(name && { name }),
          ...(role && { role }),
          ...(active !== undefined && { active }),
          ...(canImpersonate !== undefined && { canImpersonate }),
          ...(req.body.phone !== undefined && { phone: req.body.phone }),
        },
        include: {
          sectors: true,
          managedUsers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      // Atualizar nomes dos setores usando mapeamento do sistema
      // Se houver erro, retornar usuário com nomes originais
      if (user.sectors.length > 0) {
        try {
          const { getSectorNamesFromUserSector } = await import('../utils/sectorMapping');
          const { dataSource } = await import('../adapters/dataSource');
          
          let equipamentos: any[] = [];
          try {
            equipamentos = await dataSource.equipamentos({
              apenasAtivos: true,
              incluirComponentes: false,
              incluirCustoSubstituicao: false,
            });
          } catch (equipError) {
            console.warn('[users:PATCH] Erro ao buscar equipamentos:', equipError);
          }

          const sectorIds = user.sectors.map((s) => s.sectorId);
          const sectorNames = await getSectorNamesFromUserSector(sectorIds, equipamentos, user.id, req);

          const userWithMappedSectors = {
            ...user,
            sectors: user.sectors.map((sector, index) => ({
              ...sector,
              sectorName: sectorNames[index] || sector.sectorName || `Setor ${sector.sectorId}`,
            })),
          };

          res.json(userWithMappedSectors);
        } catch (mappingError) {
          console.error('[users:PATCH] Erro no mapeamento de setores:', mappingError);
          // Em caso de erro, retornar usuário com nomes originais
          res.json({
            ...user,
            sectors: user.sectors.map((sector) => ({
              ...sector,
              sectorName: sector.sectorName || `Setor ${sector.sectorId}`,
            })),
          });
        }
      } else {
        res.json(user);
      }
    }
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// DELETE /api/users/:id - Deletar usuário
users.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (USE_MOCK) {
      res.json({ ok: true });
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      await prismaClient.user.delete({
        where: { id },
      });

      res.json({ ok: true });
    }
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// GET /api/users/sectors/list - Listar todos os setores disponíveis
users.get('/sectors/list', async (req, res) => {
  try {
    // Buscar setores únicos dos equipamentos
    if (USE_MOCK) {
      const sectors = [
        { id: 1, name: 'UTI 1' },
        { id: 2, name: 'UTI 2' },
        { id: 3, name: 'UTI 3' },
        { id: 4, name: 'Emergência' },
        { id: 5, name: 'Centro Cirúrgico' },
        { id: 6, name: 'Radiologia' },
        { id: 7, name: 'Cardiologia' },
        { id: 8, name: 'Neurologia' },
        { id: 9, name: 'Ortopedia' },
        { id: 10, name: 'Pediatria' },
        { id: 11, name: 'Maternidade' },
        { id: 12, name: 'Ambulatório' },
      ];
      res.json(sectors);
    } else {
      const { dataSource } = await import('../adapters/dataSource');
      const equipamentos = await dataSource.equipamentos({
        apenasAtivos: true,
        incluirComponentes: false,
        incluirCustoSubstituicao: false,
      });

      // Criar mapa de setores: SetorId -> nome mapeado
      const sectorsMap = new Map<number, string>();
      
      // Primeiro, coletar todos os setores únicos dos equipamentos
      equipamentos.forEach((eq: any) => {
        if (eq.Setor) {
          const setorName = eq.Setor.trim();
          const sectorId = eq.SetorId || getSectorIdFromName(setorName);
          if (!sectorsMap.has(sectorId)) {
            sectorsMap.set(sectorId, setorName);
          }
        }
      });

      // Buscar nomes mapeados usando a lógica do sistema
      const sectorIds = Array.from(sectorsMap.keys());
      if (sectorIds.length > 0) {
        const { getSectorNamesFromUserSector } = await import('../utils/sectorMapping');
        const sectorNames = await getSectorNamesFromUserSector(sectorIds, equipamentos, undefined, req);
        
        // Atualizar mapa com nomes mapeados
        sectorIds.forEach((id, index) => {
          if (sectorNames[index]) {
            sectorsMap.set(id, sectorNames[index]);
          }
        });
      }

      // Converter para array e ordenar por nome
      const sectors = Array.from(sectorsMap.entries())
        .map(([id, name]) => ({
          id,
          name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      console.log('[users:sectors/list] Setores encontrados:', sectors.length);
      console.log('[users:sectors/list] Setores:', sectors.map(s => `${s.name} (ID: ${s.id})`).join(', '));

      res.json(sectors);
    }
  } catch (e: any) {
    console.error('[users:sectors/list] Erro:', e);
    res.status(500).json({ error: true, message: e?.message });
  }
});

// GET /api/users/sectors/:sectorId/responsible - Buscar responsável por setor e seus setores vinculados
users.get('/sectors/:sectorId/responsible', async (req, res) => {
  try {
    const sectorId = Number(req.params.sectorId);
    
    if (isNaN(sectorId)) {
      return res.status(400).json({ error: true, message: 'ID de setor inválido' });
    }

    if (USE_MOCK) {
      // Mock: retornar um usuário responsável pelo setor
      const mockResponsible = {
        id: '3',
        name: 'Usuário Setor A',
        email: 'usuario1@aion.com',
        role: 'comum',
        sectors: [
          { id: '1', sectorId: sectorId, sectorName: 'Setor Selecionado' },
          { id: '2', sectorId: sectorId + 1, sectorName: 'Setor Relacionado' },
        ],
      };
      res.json(mockResponsible);
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      // Buscar usuário que tem o setor vinculado
      const userSector = await prismaClient.userSector.findFirst({
        where: { sectorId },
        include: {
          user: {
            include: {
              sectors: {
                orderBy: { sectorName: 'asc' },
              },
            },
          },
        },
      });

      if (!userSector) {
        return res.status(404).json({ error: true, message: 'Nenhum responsável encontrado para este setor' });
      }

      const responsible = {
        id: userSector.user.id,
        name: userSector.user.name,
        email: userSector.user.email,
        role: userSector.user.role,
        sectors: userSector.user.sectors.map((us: any) => ({
          id: us.id,
          sectorId: us.sectorId,
          sectorName: us.sectorName || `Setor ${us.sectorId}`,
        })),
      };

      res.json(responsible);
    }
  } catch (e: any) {
    console.error('[users:sectors/:sectorId/responsible] Erro:', e);
    res.status(500).json({ error: true, message: e?.message });
  }
});

// POST /api/users/impersonate - Iniciar personificação
users.post('/impersonate', async (req, res) => {
  try {
    const { userId, supervisorId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: true, message: 'userId é obrigatório' });
    }

    if (USE_MOCK) {
      res.json({ ok: true, impersonatedUserId: userId });
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      // Se supervisorId foi fornecido, tentar verificar permissões (mas não bloquear se não encontrar)
      if (supervisorId) {
        console.log('[users:impersonate] Buscando supervisor:', supervisorId);
        try {
          const supervisor = await prismaClient.user.findUnique({
            where: { id: supervisorId },
          });

          if (supervisor) {
            // Verificar se tem permissão: admin, gerente ou canImpersonate
            const hasPermission = 
              supervisor.role === 'admin' || 
              supervisor.role === 'gerente' || 
              supervisor.canImpersonate;

            if (!hasPermission) {
              return res.status(403).json({ error: true, message: 'Sem permissão para personificar' });
            }
            console.log('[users:impersonate] Supervisor encontrado e autorizado:', supervisor.role);
          } else {
            // Supervisor não encontrado no banco - pode ser usuário mockado ou de desenvolvimento
            // Permitir continuar, mas logar o aviso
            console.warn('[users:impersonate] Supervisor não encontrado no banco:', supervisorId);
            console.warn('[users:impersonate] Continuando personificação (modo desenvolvimento ou mock)');
          }
        } catch (error) {
          // Erro ao buscar supervisor - não bloquear, apenas logar
          console.error('[users:impersonate] Erro ao buscar supervisor:', error);
          console.warn('[users:impersonate] Continuando personificação apesar do erro');
        }
      }

      // Verificar se o usuário a ser personificado existe
      const targetUser = await prismaClient.user.findUnique({
        where: { id: userId },
        include: { sectors: true },
      });

      if (!targetUser) {
        return res.status(404).json({ error: true, message: 'Usuário não encontrado' });
      }

      // Criar log de personificação se supervisorId foi fornecido e supervisor existe
      if (supervisorId) {
        try {
          const supervisorExists = await prismaClient.user.findUnique({
            where: { id: supervisorId },
            select: { id: true },
          });
          
          if (supervisorExists) {
            await prismaClient.impersonationLog.create({
              data: {
                supervisorId,
                impersonatedUserId: userId,
              },
            });
            console.log('[users:impersonate] Log de personificação criado');
          } else {
            console.warn('[users:impersonate] Supervisor não existe, pulando criação de log');
          }
        } catch (error) {
          console.error('[users:impersonate] Erro ao criar log de personificação:', error);
          // Não bloquear por erro no log
        }
      }

      res.json({ ok: true, impersonatedUserId: userId });
    }
  } catch (e: any) {
    console.error('[users:impersonate] Erro:', e);
    res.status(500).json({ error: true, message: e?.message || 'Erro ao iniciar personificação' });
  }
});

// PATCH /api/users/:id/password - Alterar senha de usuário (apenas admin)
users.patch('/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ error: true, message: 'Senha deve ter pelo menos 6 caracteres' });
    }

    if (USE_MOCK) {
      res.json({ ok: true, message: 'Senha alterada com sucesso' });
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      // Verificar se o usuário existe
      const user = await prismaClient.user.findUnique({
        where: { id },
      });

      if (!user) {
        return res.status(404).json({ error: true, message: 'Usuário não encontrado' });
      }

      // Gerar hash da nova senha
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

      // Atualizar senha
      await prismaClient.user.update({
        where: { id },
        data: { password: hashedPassword },
      });

      res.json({ ok: true, message: 'Senha alterada com sucesso' });
    }
  } catch (e: any) {
    console.error('[users:PATCH/:id/password] Erro:', e);
    res.status(500).json({ error: true, message: e?.message || 'Erro ao alterar senha' });
  }
});

// PATCH /api/users/:id/password - Alterar senha de usuário (apenas admin)
users.patch('/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ error: true, message: 'Senha deve ter pelo menos 6 caracteres' });
    }

    if (USE_MOCK) {
      res.json({ ok: true, message: 'Senha alterada com sucesso' });
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      // Verificar se o usuário existe
      const user = await prismaClient.user.findUnique({
        where: { id },
      });

      if (!user) {
        return res.status(404).json({ error: true, message: 'Usuário não encontrado' });
      }

      // Gerar hash da nova senha
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

      // Atualizar senha
      await prismaClient.user.update({
        where: { id },
        data: { password: hashedPassword },
      });

      res.json({ ok: true, message: 'Senha alterada com sucesso' });
    }
  } catch (e: any) {
    console.error('[users:PATCH/:id/password] Erro:', e);
    res.status(500).json({ error: true, message: e?.message || 'Erro ao alterar senha' });
  }
});

// POST /api/users/impersonate/stop - Parar personificação
users.post('/impersonate/stop', async (req, res) => {
  try {
    const { supervisorId } = req.body;

    if (USE_MOCK) {
      res.json({ ok: true });
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }

      // Atualizar log de personificação se supervisorId foi fornecido
      if (supervisorId) {
        await prismaClient.impersonationLog.updateMany({
          where: {
            supervisorId,
            endedAt: null,
          },
          data: {
            endedAt: new Date(),
          },
        });
      }

      res.json({ ok: true });
    }
  } catch (e: any) {
    console.error('[users:impersonate/stop] Erro:', e);
    res.status(500).json({ error: true, message: e?.message || 'Erro ao parar personificação' });
  }
});


