// src/services/cacheService.ts
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

async function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

/**
 * TTL padrão para cache (em milissegundos)
 * 1 hora = 3600000ms
 * 30 minutos = 1800000ms
 */
const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutos

/**
 * Gera uma chave de cache baseada na URL e parâmetros
 */
function generateCacheKey(url: string, params?: any): string {
  const paramsStr = params ? JSON.stringify(params) : '';
  return `${url}:${paramsStr}`;
}

/**
 * Obtém dados do cache se ainda válidos
 */
export async function getCache<T>(key: string, ttl: number = DEFAULT_TTL): Promise<T | null> {
  try {
    const prismaClient = await getPrisma();
    const cached = await prismaClient.httpCache.findUnique({
      where: { key },
    });

    if (!cached) {
      return null;
    }

    // Verificar se o cache ainda é válido
    const age = Date.now() - cached.createdAt.getTime();
    if (age > ttl) {
      // Cache expirado, remover
      await prismaClient.httpCache.delete({ where: { key } });
      return null;
    }

    // Deserializar o payload
    const payload = JSON.parse(cached.payload.toString('utf-8'));
    return payload as T;
  } catch (error) {
    console.error('[cacheService] Erro ao buscar cache:', error);
    return null;
  }
}

/**
 * Salva dados no cache
 */
export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    const prismaClient = await getPrisma();
    const payload = Buffer.from(JSON.stringify(data), 'utf-8');

    await prismaClient.httpCache.upsert({
      where: { key },
      create: {
        key,
        payload,
      },
      update: {
        payload,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error('[cacheService] Erro ao salvar cache:', error);
  }
}

/**
 * Remove um item específico do cache
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    const prismaClient = await getPrisma();
    await prismaClient.httpCache.delete({ where: { key } }).catch(() => {
      // Ignorar erro se não existir
    });
  } catch (error) {
    console.error('[cacheService] Erro ao deletar cache:', error);
  }
}

/**
 * Limpa todo o cache
 */
export async function clearCache(): Promise<void> {
  try {
    const prismaClient = await getPrisma();
    await prismaClient.httpCache.deleteMany();
  } catch (error) {
    console.error('[cacheService] Erro ao limpar cache:', error);
  }
}

/**
 * Limpa cache antigo (mais antigo que o TTL)
 */
export async function cleanExpiredCache(ttl: number = DEFAULT_TTL): Promise<number> {
  try {
    const prismaClient = await getPrisma();
    const cutoff = new Date(Date.now() - ttl);
    const result = await prismaClient.httpCache.deleteMany({
      where: {
        createdAt: {
          lt: cutoff,
        },
      },
    });
    return result.count;
  } catch (error) {
    console.error('[cacheService] Erro ao limpar cache expirado:', error);
    return 0;
  }
}

export { generateCacheKey };

