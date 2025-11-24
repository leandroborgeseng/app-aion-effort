// src/services/prismaService.ts
const USE_MOCK = process.env.USE_MOCK === 'true';

// Lazy load Prisma apenas quando necessário (modo não-mock)
let prisma: any = null;
let prismaInitializing = false;
let _prismaPromise: Promise<any> | null = null;
let initializationError: Error | null = null;

export async function getPrisma() {
  // Se estiver em modo mock, retornar null
  if (USE_MOCK) {
    return null;
  }

  // Se já está inicializado, retornar
  if (prisma) {
    return prisma;
  }

  // Se houve erro na última tentativa e não estamos inicializando, limpar e tentar novamente
  if (initializationError && !prismaInitializing) {
    console.log('[prismaService] Tentando reinicializar após erro anterior');
    initializationError = null;
    _prismaPromise = null;
  }

  // Se já está inicializando, aguardar a promise
  if (_prismaPromise) {
    return _prismaPromise;
  }

  // Criar promise de inicialização
  _prismaPromise = (async () => {
    try {
      prismaInitializing = true;
      initializationError = null;
      
      const { PrismaClient } = await import('@prisma/client');
      prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      });
      
      // Testar conexão
      await prisma.$connect();
      
      console.log('[prismaService] Prisma Client inicializado com sucesso');
      initializationError = null;
      return prisma;
    } catch (error: any) {
      console.error('[prismaService] Erro ao inicializar Prisma Client:', error);
      console.error('[prismaService] Stack:', error?.stack);
      initializationError = error;
      prisma = null;
      _prismaPromise = null;
      // Não fazer throw aqui - retornar null para que o código possa continuar
      // Alguns serviços podem funcionar sem Prisma (modo mock)
      return null;
    } finally {
      prismaInitializing = false;
    }
  })();

  return _prismaPromise;
}

