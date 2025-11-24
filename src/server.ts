// src/server.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { lifecycle } from './routes/lifecycle';
import { critical } from './routes/critical';
import { rounds } from './routes/rounds';
import { contracts } from './routes/contracts';
import { indicators } from './routes/indicators';
import { alerts } from './routes/alerts';
import { investments } from './routes/investments';
import { os } from './routes/os';
import { users } from './routes/users';
import { dashboard } from './routes/dashboard';
import { config } from './routes/config';
import { auth } from './routes/auth';
import search from './routes/search';
import savedFilters from './routes/savedFilters';
import { purchaseRequests } from './routes/purchaseRequests';
import { mel } from './routes/mel';
import { helmetConfig, apiLimiter } from './middleware/security';
import { errorMiddleware } from './utils/errorHandler';

const app = express();

// Trust proxy (confiar apenas no primeiro proxy - Nginx)
// Isso é necessário para rate limiting funcionar corretamente atrás do proxy
app.set('trust proxy', 1);

// Segurança HTTP
app.use(helmetConfig);

// CORS configurado
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({
  origin: frontendUrl,
  credentials: true,
}));
console.log(`CORS configured for frontend: ${frontendUrl}`);

// Rate limiting geral
app.use('/api', apiLimiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos de uploads
app.use('/uploads', express.static('uploads'));

// Servir arquivo de documentação
app.get('/DOCUMENTACAO_USUARIO.md', (_req, res) => {
  const docPath = path.join(process.cwd(), 'public', 'DOCUMENTACAO_USUARIO.md');
  if (fs.existsSync(docPath)) {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.sendFile(docPath);
  } else {
    res.status(404).json({ error: true, message: 'Documentação não encontrada' });
  }
});

// Health check (antes de tudo)
app.get('/health', (_req, res) =>
  res.json({ ok: true, mock: process.env.USE_MOCK === 'true' })
);

// Debug endpoint para verificar arquivos do frontend
app.get('/debug/frontend', (_req, res) => {
  const distPath = path.join(process.cwd(), 'dist');
  const distExists = fs.existsSync(distPath);
  
  const info: any = {
    distExists,
    distPath,
    nodeEnv: process.env.NODE_ENV,
  };
  
  if (distExists) {
    try {
      const files = fs.readdirSync(distPath);
      info.files = files;
      
      const indexPath = path.join(distPath, 'index.html');
      info.indexExists = fs.existsSync(indexPath);
      
      if (fs.existsSync(path.join(distPath, 'assets'))) {
        const assets = fs.readdirSync(path.join(distPath, 'assets'));
        info.assets = assets;
        info.assetsCount = assets.length;
      }
    } catch (e: any) {
      info.error = e.message;
    }
  }
  
  res.json(info);
});

// Rotas da API (devem vir ANTES do catch-all do frontend)
app.use('/api/ecm/lifecycle', lifecycle);
app.use('/api/ecm/critical', critical);
app.use('/api/ecm/rounds', rounds);
app.use('/api/ecm/contracts', contracts);
app.use('/api/ecm/indicators', indicators);
app.use('/api/ecm/alerts', alerts);
app.use('/api/ecm/investments', investments);
app.use('/api/ecm/os', os);
app.use('/api/ecm/purchase-requests', purchaseRequests);
app.use('/api/ecm/mel', mel);
app.use('/api/auth', auth);
app.use('/api/users', users);
app.use('/api/dashboard', dashboard);
app.use('/api/config', config);
app.use('/api/search', search);
app.use('/api/saved-filters', savedFilters);

// Endpoint adicional para OS resumida
app.get('/api/os/resumida', async (req, res) => {
  try {
    const {
      tipoManutencao = 'Todos',
      periodo = 'MesCorrente',
      pagina = '0',
      qtdPorPagina = '5000',
    } = req.query as any;
    const { dataSource } = await import('./adapters/dataSource');
    let data = await dataSource.osResumida({
      tipoManutencao,
      periodo,
      pagina: Number(pagina),
      qtdPorPagina: Number(qtdPorPagina),
    });
    
    // Aplicar filtro de oficinas habilitadas
    const { filterOSByWorkshop } = await import('./services/workshopFilterService');
    // Garantir que data é um array
    let osArray: any[] = [];
    if (Array.isArray(data)) {
      osArray = data;
    } else if (data && typeof data === 'object') {
      osArray = (data as any).Itens || (data as any).data || (data as any).items || [];
    }
    osArray = await filterOSByWorkshop(osArray);
    
    // Retornar no mesmo formato que recebeu
    if (Array.isArray(data)) {
      res.json(osArray);
    } else {
      res.json({ ...data, Itens: osArray });
    }
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

// Middleware de tratamento de erros (deve ser o último)
app.use(errorMiddleware);

// Frontend agora é servido por um container separado (nginx)
// Não precisamos mais servir arquivos estáticos aqui
console.log('Backend API server - frontend is served by separate nginx container');

const port = Number(process.env.PORT) || 4000;
app.listen(port, async () => {
  console.log(`API up on :${port} (USE_MOCK=${process.env.USE_MOCK})`);
  
  // Iniciar serviço de warm-up das APIs
  const { startWarmupService } = await import('./services/warmupService');
  startWarmupService();
});

