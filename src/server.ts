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
const distPath = path.join(process.cwd(), 'dist');

console.log(`NODE_ENV: ${nodeEnv}`);
console.log(`Frontend dist path: ${distPath}`);
console.log(`Serving frontend: ${nodeEnv === 'production' ? 'YES' : 'NO'}`);

// Sempre tentar servir frontend se dist existir (para produção e desenvolvimento)
try {
  const distExists = fs.existsSync(distPath);
  console.log(`Dist directory exists: ${distExists}`);
  
  if (distExists) {
    // Middleware para log e headers corretos ANTES de servir arquivos estáticos
    app.use((req, res, next) => {
      if (req.path.startsWith('/assets') || req.path.startsWith('/images')) {
        console.log(`[STATIC] ${req.method} ${req.path}`);
        // Garantir headers corretos para módulos ES6
        if (req.path.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (req.path.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
        }
      }
      next();
    });
    
    // Servir arquivos estáticos do frontend (assets, imagens, etc)
    // IMPORTANTE: Deve vir ANTES do catch-all para garantir que assets sejam servidos primeiro
    app.use(express.static(distPath, {
      maxAge: '1y',
      etag: true,
      index: false, // Não servir index.html automaticamente, vamos fazer isso manualmente
      setHeaders: (res, filePath) => {
        // Garantir headers corretos para módulos ES6
        if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        }
      },
    }));
    console.log(`Frontend static files configured from: ${distPath}`);
    
    // Listar arquivos no dist para debug
    try {
      const files = fs.readdirSync(distPath);
      console.log(`Files in dist: ${files.join(', ')}`);
      if (fs.existsSync(path.join(distPath, 'assets'))) {
        const assets = fs.readdirSync(path.join(distPath, 'assets'));
        console.log(`Assets found: ${assets.length} files`);
        console.log(`Asset files: ${assets.slice(0, 5).join(', ')}${assets.length > 5 ? '...' : ''}`);
      }
    } catch (e) {
      console.log('Could not list dist files:', e);
    }
    
    // Catch-all: retornar index.html para todas as rotas que não são API ou assets
    // IMPORTANTE: Deve ser a última rota registrada
    app.get('*', (req, res) => {
      // Ignorar requisições para API (já tratadas antes)
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      
      // Se chegou aqui, é uma rota do frontend (React Router)
      const indexPath = path.join(distPath, 'index.html');
      console.log(`[FRONTEND] Serving index.html for route: ${req.path}`);
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`Error serving index.html:`, err);
          res.status(404).json({ error: 'Frontend not found', path: req.path });
        }
      });
    });
  } else {
    console.log('Dist directory not found - frontend will not be served');
  }
} catch (error) {
  console.error('Error setting up frontend:', error);
}

const port = Number(process.env.PORT) || 4000;
app.listen(port, () =>
  console.log(`API up on :${port} (USE_MOCK=${process.env.USE_MOCK})`)
);

