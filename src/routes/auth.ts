// src/routes/auth.ts
import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { getPrisma } from '../services/prismaService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { loginLimiter } from '../middleware/security';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutos

export const auth = Router();

/**
 * POST /api/auth/login - Login do usuário
 */
auth.post(
  '/login',
  loginLimiter, // Rate limiting para login
  [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Senha é obrigatória'),
  ],
  async (req: Request, res: Response) => {
    try {
      console.log('[auth:login] 📥 Requisição de login recebida:', {
        email: req.body.email,
        ip: req.ip || req.socket.remoteAddress,
        timestamp: new Date().toISOString(),
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('[auth:login] ❌ Erros de validação:', errors.array());
        return res.status(400).json({ error: true, message: 'Dados inválidos', errors: errors.array() });
      }

      const { email, password } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || 'unknown';

      const prisma = await getPrisma();
      if (!prisma) {
        console.error('[auth:login] ❌ Prisma não disponível');
        return res.status(500).json({ error: true, message: 'Sistema temporariamente indisponível' });
      }

      // Buscar usuário
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      console.log('[auth:login] 👤 Usuário encontrado:', {
        exists: !!user,
        email: email.toLowerCase(),
        active: user?.active,
        lockedUntil: user?.lockedUntil,
        loginAttempts: user?.loginAttempts,
      });

      if (!user) {
        // Não revelar se o usuário existe ou não (segurança)
        console.log('[auth:login] ❌ Usuário não encontrado');
        return res.status(401).json({ error: true, message: 'Email ou senha incorretos' });
      }

      // Verificar se usuário está bloqueado
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        console.log('[auth:login] 🔒 Usuário bloqueado:', { minutesLeft, lockedUntil: user.lockedUntil });
        return res.status(423).json({
          error: true,
          message: `Conta bloqueada. Tente novamente em ${minutesLeft} minuto(s)`,
        });
      }

      // Verificar senha
      console.log('[auth:login] 🔐 Verificando senha...');
      const passwordMatch = await bcrypt.compare(password, user.password);
      console.log('[auth:login] 🔐 Senha válida:', passwordMatch);
      
      if (!passwordMatch) {
        // Incrementar tentativas de login
        const newAttempts = user.loginAttempts + 1;
        const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;

        console.log('[auth:login] ❌ Senha incorreta:', {
          attempts: newAttempts,
          maxAttempts: MAX_LOGIN_ATTEMPTS,
          willLock: shouldLock,
        });

        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: newAttempts,
            lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION) : null,
          },
        });

        return res.status(401).json({ error: true, message: 'Email ou senha incorretos' });
      }

      // Verificar se usuário está ativo
      if (!user.active) {
        console.log('[auth:login] ❌ Usuário inativo');
        return res.status(403).json({ error: true, message: 'Usuário inativo' });
      }

      // Resetar tentativas de login
      console.log('[auth:login] ✅ Login válido, resetando tentativas...');
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: 0,
          lockedUntil: null,
          lastLogin: new Date(),
        },
      });

      // Gerar token JWT
      console.log('[auth:login] 🎫 Gerando token JWT...');
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      console.log('[auth:login] 🎫 Token gerado com sucesso');

      // Calcular expiração
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

      // Criar sessão no banco
      try {
        await prisma.session.create({
          data: {
            userId: user.id,
            token,
            ipAddress,
            userAgent,
            expiresAt,
          },
        });
      } catch (sessionError: any) {
        console.error('[auth:login] Erro ao criar sessão:', sessionError);
        // Se falhar ao criar sessão, ainda retornar o token (fallback)
        // mas logar o erro para debug
      }

      // Limpar sessões expiradas do usuário
      await prisma.session.deleteMany({
        where: {
          userId: user.id,
          expiresAt: { lt: new Date() },
        },
      });

      const responseData = {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        expiresAt: expiresAt.toISOString(),
      };

      console.log('[auth:login] ✅ Login bem-sucedido:', {
        userId: user.id,
        email: user.email,
        role: user.role,
        hasToken: !!token,
      });

      res.json(responseData);
    } catch (error: any) {
      console.error('[auth:login] ❌ Erro:', error);
      console.error('[auth:login] Stack:', error?.stack);
      res.status(500).json({ 
        error: true, 
        message: 'Erro ao fazer login',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  }
);

/**
 * POST /api/auth/logout - Logout do usuário
 */
auth.post('/logout', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const prisma = await getPrisma();
      if (prisma) {
        await prisma.session.deleteMany({
          where: { token },
        });
      }
    }

    res.json({ success: true, message: 'Logout realizado com sucesso' });
  } catch (error: any) {
    console.error('[auth:logout] Erro:', error);
    res.status(500).json({ error: true, message: 'Erro ao fazer logout' });
  }
});

/**
 * GET /api/auth/me - Obter informações do usuário atual
 */
auth.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma = await getPrisma();
    if (!prisma || !req.userId) {
      return res.status(401).json({ error: true, message: 'Não autenticado' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        active: true,
        canImpersonate: true,
        lastLogin: true,
        sectors: {
          select: {
            sectorId: true,
            sectorName: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: true, message: 'Usuário não encontrado' });
    }

    res.json({ success: true, user });
  } catch (error: any) {
    console.error('[auth:me] Erro:', error);
    res.status(500).json({ error: true, message: 'Erro ao buscar informações do usuário' });
  }
});

/**
 * POST /api/auth/change-password - Alterar senha
 */
auth.post(
  '/change-password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Senha atual é obrigatória'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Nova senha deve ter no mínimo 8 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Nova senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: true, message: 'Dados inválidos', errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      if (!req.userId) {
        return res.status(401).json({ error: true, message: 'Não autenticado' });
      }

      const prisma = await getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: true, message: 'Sistema temporariamente indisponível' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
      });

      if (!user) {
        return res.status(404).json({ error: true, message: 'Usuário não encontrado' });
      }

      // Verificar senha atual
      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: true, message: 'Senha atual incorreta' });
      }

      // Hash da nova senha
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Atualizar senha
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          loginAttempts: 0, // Resetar tentativas
          lockedUntil: null,
        },
      });

      res.json({ success: true, message: 'Senha alterada com sucesso' });
    } catch (error: any) {
      console.error('[auth:change-password] Erro:', error);
      res.status(500).json({ error: true, message: 'Erro ao alterar senha' });
    }
  }
);

