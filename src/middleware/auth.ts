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

    console.log('[auth] authenticateToken chamado, token existe:', !!token);

    if (!token) {
      console.log('[auth] Token não fornecido');
      res.status(401).json({ error: true, message: 'Token de autenticação não fornecido' });
      return;
    }

    // Verificar token no banco de dados (sessão)
    const prisma = await getPrisma();
    console.log('[auth] Prisma disponível:', !!prisma);
    
    if (prisma) {
      console.log('[auth] Buscando sessão no banco...');
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
      });

      console.log('[auth] Sessão encontrada:', !!session);
      if (session) {
        console.log('[auth] Sessão expira em:', session.expiresAt);
        console.log('[auth] Sessão expirada?', session.expiresAt < new Date());
      }

      if (!session || session.expiresAt < new Date()) {
        // Sessão expirada ou inválida
        console.log('[auth] Sessão não encontrada ou expirada');
        if (session) {
          await prisma.session.delete({ where: { id: session.id } });
        }
        
        // Fallback: verificar apenas JWT se sessão não existe
        console.log('[auth] Tentando fallback: verificar apenas JWT');
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
          console.log('[auth] JWT válido, userId:', decoded.userId);
          
          // Buscar usuário diretamente
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
          });
          
          if (!user || !user.active) {
            console.log('[auth] Usuário não encontrado ou inativo');
            res.status(401).json({ error: true, message: 'Usuário não encontrado ou inativo' });
            return;
          }
          
          req.userId = decoded.userId;
          req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
          
          console.log('[auth] Autenticação bem-sucedida via fallback');
          next();
          return;
        } catch (jwtError: any) {
          console.error('[auth] Erro ao verificar JWT:', jwtError);
          res.status(401).json({ error: true, message: 'Token inválido ou expirado' });
          return;
        }
      }

      // Verificar se usuário está ativo
      if (!session.user.active) {
        console.log('[auth] Usuário inativo');
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

      console.log('[auth] Autenticação bem-sucedida via sessão');
      next();
      return;
    }

    // Fallback: verificar apenas JWT se Prisma não disponível
    console.log('[auth] Prisma não disponível, usando fallback JWT');
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    req.userId = decoded.userId;
    next();
  } catch (error: any) {
    console.error('[auth] Erro na autenticação:', error);
    console.error('[auth] Tipo do erro:', error.name);
    console.error('[auth] Mensagem:', error.message);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      res.status(401).json({ error: true, message: 'Token inválido ou expirado' });
      return;
    }
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

