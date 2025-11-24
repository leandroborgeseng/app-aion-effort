// src/services/cacheService.ts
import { getPrisma } from './prismaService';

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
    if (!prismaClient) {
      // Em modo mock ou quando Prisma não está disponível, retornar null silenciosamente
      return null;
    }
    
    const cached = await prismaClient.httpCache.findUnique({
      where: { key },
    });

    if (!cached) {
      return null;
    }

    // Verificar se o cache ainda é válido
    const age = Date.now() - cached.createdAt.getTime();
    if (age > ttl) {
      // Cache expirado, remover (não aguardar erro se falhar)
      prismaClient.httpCache.delete({ where: { key } }).catch(() => {
        // Ignorar erros ao deletar cache expirado
      });
      return null;
    }

    // Deserializar o payload
    const payload = JSON.parse(cached.payload.toString('utf-8'));
    return payload as T;
  } catch (error: any) {
    // Log apenas em desenvolvimento, não quebrar o fluxo
    if (process.env.NODE_ENV === 'development') {
      console.warn('[cacheService] Erro ao buscar cache (continuando sem cache):', error?.message);
    }
    return null;
  }
}

/**
 * Salva dados no cache
 */
export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    const prismaClient = await getPrisma();
    if (!prismaClient) {
      // Em modo mock ou quando Prisma não está disponível, retornar silenciosamente
      return;
    }
    
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
  } catch (error: any) {
    // Log apenas em desenvolvimento, não quebrar o fluxo
    if (process.env.NODE_ENV === 'development') {
      console.warn('[cacheService] Erro ao salvar cache (continuando sem cache):', error?.message);
    }
    // Não fazer throw - cache é opcional, não deve quebrar o fluxo principal
  }
}

/**
 * Remove um item específico do cache
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return;
    }
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
    if (!prismaClient) {
      return;
    }
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
    if (!prismaClient) {
      return 0;
    }
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

