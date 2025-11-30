import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { AuthRequest } from '../middleware/auth';

export class UserController {
    static async listUsers(req: Request, res: Response) {
        try {
            const users = await UserService.listUsers(req);
            res.json(users);
        } catch (e: any) {
            res.status(500).json({ error: true, message: e?.message });
        }
    }

    static async getUserById(req: Request, res: Response) {
        try {
            const user = await UserService.getUserById(req.params.id);
            if (!user) {
                return res.status(404).json({ error: true, message: 'Usuário não encontrado' });
            }
            res.json(user);
        } catch (e: any) {
            res.status(500).json({ error: true, message: e?.message });
        }
    }

    static async createUser(req: Request, res: Response) {
        try {
            const user = await UserService.createUser(req.body, req);
            res.status(201).json(user);
        } catch (e: any) {
            console.error('[UserController] Erro ao criar usuário:', e);
            if (e.message === 'Email já cadastrado') {
                return res.status(400).json({ error: true, message: e.message });
            }
            res.status(500).json({ error: true, message: e?.message });
        }
    }

    static async updateUser(req: Request, res: Response) {
        try {
            const user = await UserService.updateUser(req.params.id, req.body, req);
            res.json(user);
        } catch (e: any) {
            res.status(500).json({ error: true, message: e?.message });
        }
    }

    static async changePassword(req: AuthRequest, res: Response) {
        try {
            if (req.user?.role !== 'admin') {
                return res.status(403).json({ error: true, message: 'Apenas administradores podem alterar senhas' });
            }

            const { newPassword } = req.body;
            if (!newPassword || newPassword.trim().length < 6) {
                return res.status(400).json({ error: true, message: 'Senha deve ter pelo menos 6 caracteres' });
            }

            const result = await UserService.changePassword(req.params.id, newPassword, req.user?.email);
            res.json(result);
        } catch (e: any) {
            console.error('[UserController] Erro ao alterar senha:', e);
            if (e.message === 'Usuário não encontrado') {
                return res.status(404).json({ error: true, message: e.message });
            }
            res.status(500).json({ error: true, message: e?.message || 'Erro ao alterar senha' });
        }
    }

    static async deleteUser(req: AuthRequest, res: Response) {
        try {
            if (req.user?.role !== 'admin') {
                return res.status(403).json({ error: true, message: 'Apenas administradores podem excluir usuários' });
            }

            const result = await UserService.deleteUser(req.params.id, req.userId!, req.user?.email);
            res.json(result);
        } catch (e: any) {
            console.error('[UserController] Erro ao excluir usuário:', e);
            if (e.message === 'Usuário não encontrado') {
                return res.status(404).json({ error: true, message: e.message });
            }
            if (e.message.includes('não pode excluir sua própria conta') || e.message.includes('possui dados vinculados')) {
                return res.status(400).json({ error: true, message: e.message });
            }
            res.status(500).json({ error: true, message: e?.message || 'Erro ao excluir usuário' });
        }
    }

    static async listSectors(req: Request, res: Response) {
        try {
            const sectors = await UserService.listSectors(req);
            console.log('[UserController] Setores encontrados:', sectors.length);
            res.json(sectors);
        } catch (e: any) {
            console.error('[UserController] Erro ao listar setores:', e);
            res.status(500).json({ error: true, message: e?.message });
        }
    }

    static async getSectorResponsible(req: Request, res: Response) {
        try {
            const responsible = await UserService.getSectorResponsible(Number(req.params.sectorId));
            res.json(responsible);
        } catch (e: any) {
            console.error('[UserController] Erro ao buscar responsável:', e);
            if (e.message === 'ID de setor inválido') {
                return res.status(400).json({ error: true, message: e.message });
            }
            if (e.message === 'Nenhum responsável encontrado para este setor') {
                return res.status(404).json({ error: true, message: e.message });
            }
            res.status(500).json({ error: true, message: e?.message });
        }
    }

    static async impersonate(req: Request, res: Response) {
        try {
            const { userId, supervisorId } = req.body;
            const result = await UserService.impersonate(userId, supervisorId);
            res.json(result);
        } catch (e: any) {
            console.error('[UserController] Erro ao iniciar personificação:', e);
            if (e.message === 'userId é obrigatório') {
                return res.status(400).json({ error: true, message: e.message });
            }
            if (e.message === 'Sem permissão para personificar') {
                return res.status(403).json({ error: true, message: e.message });
            }
            if (e.message === 'Usuário não encontrado') {
                return res.status(404).json({ error: true, message: e.message });
            }
            res.status(500).json({ error: true, message: e?.message || 'Erro ao iniciar personificação' });
        }
    }

    static async stopImpersonation(req: Request, res: Response) {
        try {
            const { supervisorId } = req.body;
            const result = await UserService.stopImpersonation(supervisorId);
            res.json(result);
        } catch (e: any) {
            console.error('[UserController] Erro ao parar personificação:', e);
            res.status(500).json({ error: true, message: e?.message || 'Erro ao parar personificação' });
        }
    }
}
