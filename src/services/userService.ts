import { getPrisma } from '../services/prismaService';
import { getSectorIdFromName, getSectorNamesFromUserSector } from '../utils/sectorMapping';
import { dataSource } from '../adapters/dataSource';
import bcrypt from 'bcrypt';
import { Request } from 'express';

const USE_MOCK = process.env.USE_MOCK === 'true';

export class UserService {
  static async listUsers(req: Request) {
    if (USE_MOCK) {
      return [
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
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) throw new Error('Prisma não disponível');

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

    return await this.mapUserSectors(users, req);
  }

  static async getUserById(id: string) {
    if (USE_MOCK) {
      return {
        id,
        email: 'user@aion.com',
        name: 'Usuário',
        role: 'comum',
        active: true,
        canImpersonate: false,
        sectors: [],
        managedUsers: [],
      };
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) throw new Error('Prisma não disponível');

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

    return user;
  }

  static async createUser(data: any, req: Request) {
    const { email, name, role, sectors, canImpersonate, managedUserIds, password } = data;

    if (USE_MOCK) {
      return {
        id: Date.now().toString(),
        email,
        name,
        role: role || 'comum',
        active: true,
        canImpersonate: canImpersonate || false,
        sectors: sectors || [],
      };
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) throw new Error('Prisma não disponível');

    const existingUser = await prismaClient.user.findUnique({ where: { email } });
    if (existingUser) throw new Error('Email já cadastrado');

    const defaultPassword = password || 'senha123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const sectorNames = sectors && sectors.length > 0 
      ? await getSectorNamesFromUserSector(sectors, undefined, undefined, req)
      : [];

    return await prismaClient.user.create({
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
  }

  static async updateUser(id: string, data: any, req: Request) {
    const { email, name, role, active, sectors, canImpersonate, managedUserIds, phone } = data;

    if (USE_MOCK) {
      return {
        id,
        email: email || 'user@aion.com',
        name: name || 'Usuário',
        role: role || 'comum',
        active: active !== undefined ? active : true,
        canImpersonate: canImpersonate || false,
        sectors: sectors || [],
        managedUsers: [],
      };
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) throw new Error('Prisma não disponível');

    if (sectors !== undefined) {
      await prismaClient.userSector.deleteMany({ where: { userId: id } });
      if (sectors.length > 0) {
        const equipamentos = await this.getEquipamentosSafe();
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

    if (managedUserIds !== undefined) {
      await prismaClient.userManager.deleteMany({ where: { managerId: id } });
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
        ...(phone !== undefined && { phone }),
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

    return await this.mapSingleUserSectors(user, req);
  }

  static async changePassword(id: string, newPassword: string, adminEmail?: string) {
    if (USE_MOCK) return { ok: true, message: 'Senha alterada com sucesso' };

    const prismaClient = await getPrisma();
    if (!prismaClient) throw new Error('Prisma não disponível');

    const user = await prismaClient.user.findUnique({ where: { id } });
    if (!user) throw new Error('Usuário não encontrado');

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    await prismaClient.user.update({
      where: { id },
      data: { 
        password: hashedPassword,
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    console.log(`[UserService] Senha alterada para usuário ${user.email} por admin ${adminEmail}`);
    return { ok: true, message: 'Senha alterada com sucesso' };
  }

  static async deleteUser(id: string, adminId: string, adminEmail?: string) {
    if (id === adminId) throw new Error('Você não pode excluir sua própria conta');

    if (USE_MOCK) return { ok: true, message: 'Usuário excluído com sucesso' };

    const prismaClient = await getPrisma();
    if (!prismaClient) throw new Error('Prisma não disponível');

    const user = await prismaClient.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });

    if (!user) throw new Error('Usuário não encontrado');

    try {
      await prismaClient.user.delete({ where: { id } });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.message?.includes('Foreign key constraint')) {
        throw new Error('Não é possível excluir este usuário pois ele possui dados vinculados. Desative o usuário ao invés de excluí-lo.');
      }
      throw e;
    }

    console.log(`[UserService] Usuário ${user.email} excluído por admin ${adminEmail}`);
    return { ok: true, message: 'Usuário excluído com sucesso' };
  }

  static async listSectors(req: Request) {
    if (USE_MOCK) {
      return [
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
    }

    const equipamentos = await this.getEquipamentosSafe();
    const sectorsMap = new Map<number, string>();
    
    equipamentos.forEach((eq: any) => {
      if (eq.Setor) {
        const setorName = eq.Setor.trim();
        const sectorId = eq.SetorId || getSectorIdFromName(setorName);
        if (!sectorsMap.has(sectorId)) {
          sectorsMap.set(sectorId, setorName);
        }
      }
    });

    const sectorIds = Array.from(sectorsMap.keys());
    if (sectorIds.length > 0) {
      const sectorNames = await getSectorNamesFromUserSector(sectorIds, equipamentos, undefined, req);
      sectorIds.forEach((id, index) => {
        if (sectorNames[index]) {
          sectorsMap.set(id, sectorNames[index]);
        }
      });
    }

    return Array.from(sectorsMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  static async getSectorResponsible(sectorId: number) {
    if (isNaN(sectorId)) throw new Error('ID de setor inválido');

    if (USE_MOCK) {
      return {
        id: '3',
        name: 'Usuário Setor A',
        email: 'usuario1@aion.com',
        role: 'comum',
        sectors: [
          { id: '1', sectorId: sectorId, sectorName: 'Setor Selecionado' },
          { id: '2', sectorId: sectorId + 1, sectorName: 'Setor Relacionado' },
        ],
      };
    }

    const prismaClient = await getPrisma();
    if (!prismaClient) throw new Error('Prisma não disponível');

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

    if (!userSector) throw new Error('Nenhum responsável encontrado para este setor');

    return {
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
  }

  static async impersonate(userId: string, supervisorId?: string) {
    if (!userId) throw new Error('userId é obrigatório');

    if (USE_MOCK) return { ok: true, impersonatedUserId: userId };

    const prismaClient = await getPrisma();
    if (!prismaClient) throw new Error('Prisma não disponível');

    if (supervisorId) {
      try {
        const supervisor = await prismaClient.user.findUnique({ where: { id: supervisorId } });
        if (supervisor) {
          const hasPermission = supervisor.role === 'admin' || supervisor.role === 'gerente' || supervisor.canImpersonate;
          if (!hasPermission) throw new Error('Sem permissão para personificar');
        }
      } catch (error: any) {
        if (error.message === 'Sem permissão para personificar') throw error;
        console.warn('[UserService] Erro ao verificar supervisor:', error);
      }
    }

    const targetUser = await prismaClient.user.findUnique({
      where: { id: userId },
      include: { sectors: true },
    });

    if (!targetUser) throw new Error('Usuário não encontrado');

    if (supervisorId) {
      try {
        const supervisorExists = await prismaClient.user.findUnique({ where: { id: supervisorId } });
        if (supervisorExists) {
          await prismaClient.impersonationLog.create({
            data: { supervisorId, impersonatedUserId: userId },
          });
        }
      } catch (error) {
        console.error('[UserService] Erro ao criar log de personificação:', error);
      }
    }

    return { ok: true, impersonatedUserId: userId };
  }

  static async stopImpersonation(supervisorId?: string) {
    if (USE_MOCK) return { ok: true };

    const prismaClient = await getPrisma();
    if (!prismaClient) throw new Error('Prisma não disponível');

    if (supervisorId) {
      await prismaClient.impersonationLog.updateMany({
        where: { supervisorId, endedAt: null },
        data: { endedAt: new Date() },
      });
    }

    return { ok: true };
  }

  // Helpers
  private static async getEquipamentosSafe() {
    try {
      return await dataSource.equipamentos({
        apenasAtivos: true,
        incluirComponentes: false,
        incluirCustoSubstituicao: false,
      });
    } catch (error) {
      console.warn('[UserService] Erro ao buscar equipamentos:', error);
      return [];
    }
  }

  private static async mapUserSectors(users: any[], req: Request) {
    try {
      const equipamentos = await this.getEquipamentosSafe();
      return await Promise.all(users.map(async (user) => {
        if (user.sectors.length === 0) return user;
        try {
          const sectorIds = user.sectors.map((s: any) => s.sectorId);
          const sectorNames = await getSectorNamesFromUserSector(sectorIds, equipamentos, user.id, req);
          return {
            ...user,
            sectors: user.sectors.map((sector: any, index: number) => ({
              ...sector,
              sectorName: sectorNames[index] || sector.sectorName || `Setor ${sector.sectorId}`,
            })),
          };
        } catch (error) {
          console.warn(`[UserService] Erro ao mapear setores do usuário ${user.id}:`, error);
          return user;
        }
      }));
    } catch (error) {
      console.error('[UserService] Erro no mapeamento de setores:', error);
      return users;
    }
  }

  private static async mapSingleUserSectors(user: any, req: Request) {
    if (user.sectors.length === 0) return user;
    try {
      const equipamentos = await this.getEquipamentosSafe();
      const sectorIds = user.sectors.map((s: any) => s.sectorId);
      const sectorNames = await getSectorNamesFromUserSector(sectorIds, equipamentos, user.id, req);
      return {
        ...user,
        sectors: user.sectors.map((sector: any, index: number) => ({
          ...sector,
          sectorName: sectorNames[index] || sector.sectorName || `Setor ${sector.sectorId}`,
        })),
      };
    } catch (error) {
      console.error('[UserService] Erro no mapeamento de setores:', error);
      return user;
    }
  }
}
