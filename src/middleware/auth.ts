// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getPrisma } from '../services/prismaService';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Middleware de autenticação JWT
 */
export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: true, message: 'Token de autenticação não fornecido' });
      return;
    }

    // Verificar token no banco de dados (sessão)
    const prisma = await getPrisma();
    if (prisma) {
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!session || session.expiresAt < new Date()) {
        // Sessão expirada ou inválida
        if (session) {
          await prisma.session.delete({ where: { id: session.id } });
        }
        res.status(401).json({ error: true, message: 'Sessão expirada ou inválida' });
        return;
      }

      // Verificar se usuário está ativo
      if (!session.user.active) {
        res.status(403).json({ error: true, message: 'Usuário inativo' });
        return;
      }

      // Atualizar lastUsedAt
      await prisma.session.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() },
      });

      // Verificar JWT
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      
      req.userId = decoded.userId;
      req.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      };

      next();
      return;
    }

    // Fallback: verificar apenas JWT se Prisma não disponível
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    req.userId = decoded.userId;
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      res.status(401).json({ error: true, message: 'Token inválido ou expirado' });
      return;
    }
    console.error('[auth] Erro na autenticação:', error);
    res.status(500).json({ error: true, message: 'Erro na autenticação' });
  }
}

/**
 * Middleware para verificar se usuário tem role específica
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: true, message: 'Não autenticado' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: true, message: 'Acesso negado' });
      return;
    }

    next();
  };
}

/**
 * Middleware opcional - não retorna erro se não autenticado
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const prisma = await getPrisma();
      if (prisma) {
        const session = await prisma.session.findUnique({
          where: { token },
          include: { user: true },
        });

        if (session && session.expiresAt >= new Date() && session.user.active) {
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
          req.userId = decoded.userId;
          req.user = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: session.user.role,
          };
        }
      }
    }
    next();
  } catch {
    // Ignorar erros e continuar sem autenticação
    next();
  }
}

