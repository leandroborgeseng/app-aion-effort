// EXEMPLO: Como aplicar as melhorias em uma rota existente
// Este arquivo mostra o padrão ANTES e DEPOIS

import { Router } from 'express';
import { asyncHandler, NotFoundError, ValidationError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { validateNumber, validateString, validateId } from '../utils/validation';
import { safePrismaOperation, requireResult } from '../utils/prismaHelper';

const investments = Router();

// ============================================
// ANTES (código atual com problemas)
// ============================================

investments.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const prismaClient = await getPrisma();
    if (!prismaClient) {
      return res.status(500).json({ error: true, message: 'Prisma não disponível' });
    }
    const investment = await prismaClient.investment.findUnique({ where: { id } });
    if (!investment) {
      return res.status(404).json({ error: true, message: 'Investimento não encontrado' });
    }
    res.json(investment);
  } catch (e: any) {
    console.error('Erro:', e);
    res.status(500).json({ error: true, message: e?.message });
  }
});

// ============================================
// DEPOIS (código otimizado)
// ============================================

investments.get('/:id', asyncHandler(async (req, res) => {
  // 1. Validação de entrada
  const id = validateId(req.params.id, 'ID do Investimento');
  
  // 2. Operação Prisma com retry e tratamento de erros
  const investment = await safePrismaOperation(
    prismaClient,
    (client) => client.investment.findUnique({ where: { id } }),
    'buscar investimento'
  );
  
  // 3. Validação de resultado
  requireResult(investment, 'Investimento não encontrado');
  
  // 4. Log estruturado
  logger.info('Investimento recuperado', { investmentId: id });
  
  // 5. Resposta
  res.json(investment);
}));

// ============================================
// EXEMPLO: POST com validação completa
// ============================================

investments.post('/', asyncHandler(async (req, res) => {
  // 1. Validação de todos os campos obrigatórios
  const titulo = validateString(req.body.titulo, 'Título', 1, 255);
  const categoria = validateString(req.body.categoria, 'Categoria', 1, 100);
  const valorEstimado = validateNumber(req.body.valorEstimado, 'Valor Estimado', 0);
  const prioridade = validateString(req.body.prioridade, 'Prioridade', 1, 50);
  
  // 2. Campos opcionais com validação condicional
  const descricao = req.body.descricao 
    ? validateString(req.body.descricao, 'Descrição', 0, 1000)
    : null;
  
  // 3. Operação Prisma com retry
  const investment = await safePrismaOperation(
    prismaClient,
    (client) => client.investment.create({
      data: {
        titulo,
        categoria,
        valorEstimado,
        prioridade,
        descricao,
        status: req.body.status || 'Proposto',
      },
    }),
    'criar investimento'
  );
  
  // 4. Log estruturado
  logger.info('Investimento criado', { 
    investmentId: investment.id,
    titulo,
    valorEstimado,
  });
  
  // 5. Resposta
  res.status(201).json(investment);
}));

// ============================================
// EXEMPLO: Tratamento de erros específicos
// ============================================

investments.patch('/:id', asyncHandler(async (req, res) => {
  const id = validateId(req.params.id);
  
  // Validar se existe
  const existing = await safePrismaOperation(
    prismaClient,
    (client) => client.investment.findUnique({ where: { id } }),
    'verificar investimento'
  );
  
  if (!existing) {
    throw new NotFoundError('Investimento não encontrado');
  }
  
  // Validar dados de atualização
  const updateData: any = {};
  if (req.body.titulo !== undefined) {
    updateData.titulo = validateString(req.body.titulo, 'Título', 1, 255);
  }
  if (req.body.valorEstimado !== undefined) {
    updateData.valorEstimado = validateNumber(req.body.valorEstimado, 'Valor Estimado', 0);
  }
  
  // Atualizar
  const updated = await safePrismaOperation(
    prismaClient,
    (client) => client.investment.update({
      where: { id },
      data: updateData,
    }),
    'atualizar investimento'
  );
  
  logger.info('Investimento atualizado', { investmentId: id });
  res.json(updated);
}));

