// src/services/warmupService.ts
// Serviço para fazer warm-up periódico das APIs e manter o cache atualizado

const USE_MOCK = process.env.USE_MOCK === 'true';
const WARMUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hora em milissegundos

interface WarmupTask {
  name: string;
  fn: () => Promise<void>;
  enabled: boolean;
}

/**
 * Faz warm-up de uma rota específica fazendo uma requisição HTTP interna
 * Usa fetch para chamar as rotas diretamente, populando o cache
 */
async function warmupRoute(path: string, name: string): Promise<void> {
  try {
    // Usar localhost para chamadas internas
    const port = Number(process.env.PORT) || 4000;
    const url = `http://localhost:${port}${path}`;
    
    console.log(`[warmup] Aquecendo ${name}...`);
    const startTime = Date.now();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // Timeout de 30 segundos
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      if (response.ok) {
        await response.json(); // Consumir a resposta para garantir que o cache seja populado
        console.log(`[warmup] ✅ ${name} aquecido com sucesso (${duration}ms)`);
      } else {
        const errorText = await response.text().catch(() => '');
        console.warn(`[warmup] ⚠️ ${name} retornou status ${response.status}: ${errorText.substring(0, 100)}`);
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.warn(`[warmup] ⏱️ ${name} timeout após 30s`);
      } else {
        throw fetchError;
      }
    }
  } catch (error: any) {
    console.error(`[warmup] ❌ Erro ao aquecer ${name}:`, error?.message || error);
  }
}

/**
 * Faz warm-up das rotas principais que usam cache
 */
async function performWarmup(): Promise<void> {
  if (USE_MOCK) {
    console.log('[warmup] Modo MOCK ativo - pulando warm-up');
    return;
  }

  console.log('[warmup] 🔥 Iniciando warm-up das APIs...');
  const startTime = Date.now();

  const tasks: WarmupTask[] = [
    {
      name: 'Setores de Investimentos',
      fn: () => warmupRoute('/api/ecm/investments/sectors/list', 'Setores de Investimentos'),
      enabled: true,
    },
    {
      name: 'Investimentos',
      fn: () => warmupRoute('/api/ecm/investments', 'Investimentos'),
      enabled: true,
    },
    {
      name: 'Rondas',
      fn: () => warmupRoute('/api/ecm/rounds', 'Rondas'),
      enabled: true,
    },
    {
      name: 'OS Disponíveis (Abertas)',
      fn: () => warmupRoute('/api/ecm/rounds/os/available?situacao=Aberta', 'OS Disponíveis (Abertas)'),
      enabled: true,
    },
    {
      name: 'OS Disponíveis (Fechadas)',
      fn: () => warmupRoute('/api/ecm/rounds/os/available?situacao=Fechada', 'OS Disponíveis (Fechadas)'),
      enabled: true,
    },
    {
      name: 'OS Disponíveis (Todas)',
      fn: () => warmupRoute('/api/ecm/rounds/os/available?situacao=Todas', 'OS Disponíveis (Todas)'),
      enabled: true,
    },
    {
      name: 'Inventário',
      fn: () => warmupRoute('/api/ecm/lifecycle/inventario?page=1&pageSize=100', 'Inventário'),
      enabled: true,
    },
    {
      name: 'Cronograma',
      fn: async () => {
        const year = new Date().getFullYear();
        const dataInicio = `${year}-01-01`;
        const dataFim = `${year}-12-31`;
        await warmupRoute(`/api/ecm/lifecycle/cronograma?dataInicio=${dataInicio}&dataFim=${dataFim}`, 'Cronograma');
      },
      enabled: true,
    },
    {
      name: 'Equipamentos Críticos',
      fn: () => warmupRoute('/api/ecm/critical?page=1&pageSize=100', 'Equipamentos Críticos'),
      enabled: true,
    },
    {
      name: 'Contratos',
      fn: () => warmupRoute('/api/ecm/contracts', 'Contratos'),
      enabled: true,
    },
  ];

  // Executar todas as tarefas em paralelo (mais rápido)
  const enabledTasks = tasks.filter(t => t.enabled);
  await Promise.allSettled(enabledTasks.map(task => task.fn()));

  const duration = Date.now() - startTime;
  console.log(`[warmup] ✅ Warm-up concluído em ${duration}ms (${enabledTasks.length} rotas)`);
}

/**
 * Inicia o serviço de warm-up periódico
 */
export function startWarmupService(): void {
  if (USE_MOCK) {
    console.log('[warmup] Modo MOCK ativo - serviço de warm-up desabilitado');
    return;
  }

  console.log(`[warmup] 🚀 Serviço de warm-up iniciado (intervalo: ${WARMUP_INTERVAL_MS / 1000 / 60} minutos)`);

  // Fazer warm-up imediatamente ao iniciar (após 5 segundos para dar tempo do servidor inicializar)
  setTimeout(() => {
    performWarmup().catch((error) => {
      console.error('[warmup] Erro no warm-up inicial:', error);
    });
  }, 5000);

  // Fazer warm-up periódico a cada hora
  setInterval(() => {
    performWarmup().catch((error) => {
      console.error('[warmup] Erro no warm-up periódico:', error);
    });
  }, WARMUP_INTERVAL_MS);
}

/**
 * Força um warm-up imediato (útil para testes ou após mudanças)
 */
export async function forceWarmup(): Promise<void> {
  console.log('[warmup] 🔥 Forçando warm-up imediato...');
  await performWarmup();
}

