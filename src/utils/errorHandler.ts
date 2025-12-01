// src/utils/errorHandler.ts
// Utilitário centralizado para tratamento de erros

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export class OperationalError extends Error implements AppError {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'OperationalError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends OperationalError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends OperationalError {
  constructor(message: string = 'Recurso não encontrado') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends OperationalError {
  constructor(message: string = 'Não autorizado') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends OperationalError {
  constructor(message: string = 'Acesso negado') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

/**
 * Wrapper para tratamento seguro de erros em rotas async
 */
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Formata erro para resposta HTTP
 */
export function formatError(error: any): { error: boolean; message: string; code?: string } {
  // Erro operacional (conhecido)
  if (error.isOperational) {
    return {
      error: true,
      message: error.message,
      code: error.code,
    };
  }

  // Erro do Prisma
  if (error.code === 'P2002') {
    return {
      error: true,
      message: 'Registro duplicado. Este item já existe.',
      code: 'DUPLICATE_ENTRY',
    };
  }

  if (error.code === 'P2025') {
    return {
      error: true,
      message: 'Registro não encontrado.',
      code: 'NOT_FOUND',
    };
  }

  if (error.code === 'P2003') {
    return {
      error: true,
      message: 'Erro de integridade referencial.',
      code: 'FOREIGN_KEY_ERROR',
    };
  }

  // Erro de validação do Prisma
  if (error.name === 'PrismaClientValidationError') {
    return {
      error: true,
      message: 'Dados inválidos fornecidos.',
      code: 'VALIDATION_ERROR',
    };
  }

  // Erro de conexão com banco
  if (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED') {
    return {
      error: true,
      message: 'Banco de dados temporariamente indisponível. Tente novamente.',
      code: 'DATABASE_BUSY',
    };
  }

  if (error.code === 14 || error.message?.includes('Unable to open the database file')) {
    return {
      error: true,
      message: 'Erro ao acessar banco de dados. Verifique permissões.',
      code: 'DATABASE_ACCESS_ERROR',
    };
  }

  // Erro de API externa (Effort) retornando 503
  if (error.response?.status === 503 || error.status === 503) {
    return {
      error: true,
      message: 'A API Effort está temporariamente indisponível. Por favor, tente novamente em alguns instantes.',
      code: 'EFFORT_API_UNAVAILABLE',
      externalError: true,
    };
  }

  // Erro de API externa (Effort) - qualquer erro 5xx
  if (error.response?.status >= 500 && error.response?.status < 600) {
    return {
      error: true,
      message: 'Erro na API Effort. Por favor, tente novamente em alguns instantes.',
      code: 'EFFORT_API_ERROR',
      externalError: true,
    };
  }

  // Erro de API externa (Effort) retornando 503
  if (error.response?.status === 503 || error.status === 503) {
    return {
      error: true,
      message: 'A API Effort está temporariamente indisponível. Por favor, tente novamente em alguns instantes.',
      code: 'EFFORT_API_UNAVAILABLE',
      externalError: true,
    };
  }

  // Erro de API externa (Effort) - qualquer erro 5xx
  if (error.response?.status >= 500 && error.response?.status < 600) {
    return {
      error: true,
      message: 'Erro na API Effort. Por favor, tente novamente em alguns instantes.',
      code: 'EFFORT_API_ERROR',
      externalError: true,
    };
  }

  // Detectar erros axios da API Effort
  if (error.isAxiosError && error.response?.status) {
    if (error.response.status === 503) {
      return {
        error: true,
        message: 'A API Effort está temporariamente indisponível. Por favor, tente novamente em alguns instantes.',
        code: 'EFFORT_API_UNAVAILABLE',
        externalError: true,
      };
    }
    if (error.response.status >= 500 && error.response.status < 600) {
      return {
        error: true,
        message: 'Erro na API Effort. Por favor, tente novamente em alguns instantes.',
        code: 'EFFORT_API_ERROR',
        externalError: true,
      };
    }
  }

  // Erro genérico (não expor detalhes em produção)
  const isDevelopment = process.env.NODE_ENV !== 'production';
  return {
    error: true,
    message: isDevelopment ? error.message : 'Erro interno do servidor',
    code: 'INTERNAL_ERROR',
  };
}

/**
 * Middleware de tratamento de erros global
 */
export function errorMiddleware(error: any, req: any, res: any, next: any) {
  const formatted = formatError(error);
  
  // Log estruturado do erro
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    statusCode: error.statusCode || 500,
    code: formatted.code,
    message: formatted.message,
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    userId: (req as any).user?.id,
  };

  // Usar console.error apenas em desenvolvimento, em produção usar logger estruturado
  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR]', logData);
  } else {
    // Em produção, você pode integrar com um serviço de logging
    console.error(JSON.stringify(logData));
  }

  res.status(error.statusCode || 500).json(formatted);
}

