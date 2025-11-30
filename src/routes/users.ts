import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { UserController } from '../controllers/userController';

export const users = Router();

// GET /api/users - Listar todos os usuários
users.get('/', UserController.listUsers);

// GET /api/users/sectors/list - Listar todos os setores disponíveis
users.get('/sectors/list', UserController.listSectors);

// GET /api/users/sectors/:sectorId/responsible - Buscar responsável por setor
users.get('/sectors/:sectorId/responsible', UserController.getSectorResponsible);

// POST /api/users/impersonate - Iniciar personificação
users.post('/impersonate', UserController.impersonate);

// POST /api/users/impersonate/stop - Parar personificação
users.post('/impersonate/stop', UserController.stopImpersonation);

// GET /api/users/:id - Buscar usuário por ID
users.get('/:id', UserController.getUserById);

// POST /api/users - Criar novo usuário
users.post('/', UserController.createUser);

// PATCH /api/users/:id/password - Alterar senha de usuário (apenas admin)
users.patch('/:id/password', authenticateToken, UserController.changePassword);

// PATCH /api/users/:id - Atualizar usuário
users.patch('/:id', authenticateToken, UserController.updateUser);

// DELETE /api/users/:id - Deletar usuário (apenas admin)
users.delete('/:id', authenticateToken, UserController.deleteUser);
