// src/utils/prismaHelper.ts
// Helper para operações Prisma com retry e tratamento de erros

import { logger } from './logger';
import { OperationalError } from './errorHandler';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

/**
 * Executa uma operação Prisma com retry automático em caso de erro de conexão
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Erros que devem ser retentados
      const shouldRetry =
        error.code === 'SQLITE_BUSY' ||
        error.code === 'SQLITE_LOCKED' ||
        error.code === 14 ||
        error.message?.includes('Unable to open the database file') ||
        error.message?.includes('database is locked');

      if (shouldRetry && attempt < retries) {
        const delay = RETRY_DELAY * attempt;
        logger.warn(`${operationName} falhou (tentativa ${attempt}/${retries}), tentando novamente em ${delay}ms`, {
          error: error.message,
          code: error.code,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Não deve retentar ou esgotou tentativas
      throw error;
    }
  }

  throw lastError;
}

/**
 * Wrapper para operações Prisma que verifica se o cliente está disponível
 */
export async function safePrismaOperation<T>(
  prismaClient: any,
  operation: (client: any) => Promise<T>,
  operationName: string
): Promise<T> {
  if (!prismaClient) {
    throw new OperationalError('Banco de dados não disponível', 503, 'DATABASE_UNAVAILABLE');
  }

  try {
    return await withRetry(() => operation(prismaClient), operationName);
  } catch (error: any) {
    logger.error(`Erro em operação Prisma: ${operationName}`, error, {
      operation: operationName,
    });
    throw error;
  }
}

/**
 * Valida se o resultado de uma query não está vazio
 */
export function requireResult<T>(result: T | null | undefined, errorMessage: string = 'Registro não encontrado'): T {
  if (!result) {
    throw new OperationalError(errorMessage, 404, 'NOT_FOUND');
  }
  return result;
}

