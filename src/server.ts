// src/server.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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
import { helmetConfig, apiLimiter } from './middleware/security';

const app = express();

// Segurança HTTP
app.use(helmetConfig);

// CORS configurado
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting geral
app.use('/api', apiLimiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos de uploads
app.use('/uploads', express.static('uploads'));

// Health check (antes de tudo)
app.get('/health', (_req, res) =>
  res.json({ ok: true, mock: process.env.USE_MOCK === 'true' })
);

// Rotas da API (devem vir ANTES do catch-all do frontend)
app.use('/api/ecm/lifecycle', lifecycle);
app.use('/api/ecm/critical', critical);
app.use('/api/ecm/rounds', rounds);
app.use('/api/ecm/contracts', contracts);
app.use('/api/ecm/indicators', indicators);
app.use('/api/ecm/alerts', alerts);
app.use('/api/ecm/investments', investments);
app.use('/api/ecm/os', os);
app.use('/api/auth', auth);
app.use('/api/users', users);
app.use('/api/dashboard', dashboard);
app.use('/api/config', config);

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

// Servir arquivos estáticos do frontend em produção (DEPOIS de todas as rotas da API)
const nodeEnv = process.env.NODE_ENV || 'development';
console.log(`NODE_ENV: ${nodeEnv}`);
console.log(`Serving frontend: ${nodeEnv === 'production' ? 'YES' : 'NO'}`);

if (nodeEnv === 'production') {
  const path = require('path');
  const distPath = path.join(process.cwd(), 'dist');
  console.log(`Frontend dist path: ${distPath}`);
  
  // Servir arquivos estáticos
  app.use(express.static(distPath));
  
  // Catch-all: retornar index.html para todas as rotas que não são API
  app.get('*', (_req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    console.log(`Serving index.html from: ${indexPath}`);
    res.sendFile(indexPath);
  });
} else {
  console.log('Frontend não será servido (modo desenvolvimento)');
}

const port = Number(process.env.PORT) || 4000;
app.listen(port, () =>
  console.log(`API up on :${port} (USE_MOCK=${process.env.USE_MOCK})`)
);

