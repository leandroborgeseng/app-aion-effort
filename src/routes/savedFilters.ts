// Rotas para gerenciar filtros salvos
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getPrisma } from '../services/prismaService';
import crypto from 'crypto';

const savedFilters = Router();

// GET /api/saved-filters - Listar filtros salvos do usuário
savedFilters.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { page } = req.query;
    const prisma = await getPrisma();
    
    if (!prisma) {
      return res.status(500).json({ error: 'Sistema temporariamente indisponível' });
    }

    const where: any = { userId };
    if (page) {
      where.page = page;
    }

    const filters = await prisma.savedFilter.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    res.json(filters);
  } catch (error: any) {
    console.error('[savedFilters] Erro ao listar filtros:', error);
    res.status(500).json({ error: 'Erro ao buscar filtros salvos' });
  }
});

// GET /api/saved-filters/shared/:token - Buscar filtro compartilhado
savedFilters.get('/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const prisma = await getPrisma();
    
    if (!prisma) {
      return res.status(500).json({ error: 'Sistema temporariamente indisponível' });
    }

    const filter = await prisma.savedFilter.findUnique({
      where: { shareToken: token },
    });

    if (!filter || !filter.isPublic) {
      return res.status(404).json({ error: 'Filtro não encontrado ou não compartilhável' });
    }

    res.json(filter);
  } catch (error: any) {
    console.error('[savedFilters] Erro ao buscar filtro compartilhado:', error);
    res.status(500).json({ error: 'Erro ao buscar filtro compartilhado' });
  }
});

// POST /api/saved-filters - Salvar novo filtro
savedFilters.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { page, name, filters, isPublic } = req.body;

    if (!page || !name || !filters) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const prisma = await getPrisma();
    
    if (!prisma) {
      return res.status(500).json({ error: 'Sistema temporariamente indisponível' });
    }
    
    // Gerar token de compartilhamento se for público
    const shareToken = isPublic ? crypto.randomBytes(16).toString('hex') : null;

    const savedFilter = await prisma.savedFilter.create({
      data: {
        userId,
        page,
        name,
        filters: JSON.stringify(filters),
        isPublic: isPublic || false,
        shareToken,
      },
    });

    res.json(savedFilter);
  } catch (error: any) {
    console.error('[savedFilters] Erro ao salvar filtro:', error);
    res.status(500).json({ error: 'Erro ao salvar filtro' });
  }
});

// PATCH /api/saved-filters/:id - Atualizar filtro
savedFilters.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { id } = req.params;
    const { name, filters, isPublic } = req.body;

    const prisma = await getPrisma();
    
    if (!prisma) {
      return res.status(500).json({ error: 'Sistema temporariamente indisponível' });
    }

    // Verificar se o filtro pertence ao usuário
    const existing = await prisma.savedFilter.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      return res.status(403).json({ error: 'Filtro não encontrado ou sem permissão' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (filters !== undefined) updateData.filters = JSON.stringify(filters);
    if (isPublic !== undefined) {
      updateData.isPublic = isPublic;
      // Gerar token se tornar público e não tiver
      if (isPublic && !existing.shareToken) {
        updateData.shareToken = crypto.randomBytes(16).toString('hex');
      }
      // Remover token se tornar privado
      if (!isPublic) {
        updateData.shareToken = null;
      }
    }

    const updated = await prisma.savedFilter.update({
      where: { id },
      data: updateData,
    });

    res.json(updated);
  } catch (error: any) {
    console.error('[savedFilters] Erro ao atualizar filtro:', error);
    res.status(500).json({ error: 'Erro ao atualizar filtro' });
  }
});

// DELETE /api/saved-filters/:id - Deletar filtro
savedFilters.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { id } = req.params;
    const prisma = await getPrisma();
    
    if (!prisma) {
      return res.status(500).json({ error: 'Sistema temporariamente indisponível' });
    }

    // Verificar se o filtro pertence ao usuário
    const existing = await prisma.savedFilter.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      return res.status(403).json({ error: 'Filtro não encontrado ou sem permissão' });
    }

    await prisma.savedFilter.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[savedFilters] Erro ao deletar filtro:', error);
    res.status(500).json({ error: 'Erro ao deletar filtro' });
  }
});

export default savedFilters;

