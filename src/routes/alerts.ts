// src/routes/alerts.ts
import { Router } from 'express';
import {
  getAlerts,
  markAlertAsViewed,
  markAlertAsResolved,
  processNewOS,
} from '../services/alertService';

export const alerts = Router();

alerts.get('/', async (req, res) => {
  try {
    const situacao = req.query.situacao as 'pendente' | 'visualizada' | 'resolvida' | 'todos';
    const prioridade = req.query.prioridade as 'baixa' | 'media' | 'alta' | 'critica';
    const effortId = req.query.effortId ? Number(req.query.effortId) : undefined;

    const alerts = await getAlerts({
      situacao: situacao || 'todos',
      prioridade,
      effortId,
    });

    res.json(alerts);
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

alerts.get('/count', async (_req, res) => {
  try {
    const alerts = await getAlerts({ situacao: 'pendente' });
    res.json({ count: alerts.length });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

alerts.patch('/:alertId/view', async (req, res) => {
  try {
    const { alertId } = req.params;
    const userId = req.body.userId;
    await markAlertAsViewed(alertId, userId);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

alerts.patch('/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const userId = req.body.userId;
    await markAlertAsResolved(alertId, userId);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

alerts.post('/process', async (_req, res) => {
  try {
    const newAlerts = await processNewOS();
    res.json({ ok: true, alertsCreated: newAlerts.length, alerts: newAlerts });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

