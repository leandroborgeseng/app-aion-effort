// src/routes/contracts.ts
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { getCache, setCache, generateCacheKey, deleteCache } from '../services/cacheService';
import fs from 'node:fs/promises';

const USE_MOCK = process.env.USE_MOCK === 'true';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = './uploads/contracts';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `contract-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(pdf|doc|docx|jpg|jpeg|png)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use: PDF, DOC, DOCX, JPG, PNG'));
    }
  },
});

let prisma: any = null;
async function getPrisma() {
  if (!prisma && !USE_MOCK) {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

async function readContracts(): Promise<any[]> {
  if (USE_MOCK) {
    try {
      const buf = await fs.readFile('./mocks/contratos.json', 'utf-8');
      return JSON.parse(buf);
    } catch {
      return [];
    }
  }
  const prismaClient = await getPrisma();
  if (!prismaClient) return [];
  const contracts = await prismaClient.maintenanceContract.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return contracts.map((c) => ({
    id: c.id,
    nome: c.nome,
    fornecedor: c.fornecedor,
    equipamentoIds: c.equipamentoIds,
    tipoContrato: c.tipoContrato,
    valorAnual: c.valorAnual.toString(),
    dataInicio: c.dataInicio.toISOString(),
    dataFim: c.dataFim.toISOString(),
    renovacaoAutomatica: c.renovacaoAutomatica,
    ativo: c.ativo,
    descricao: c.descricao,
    arquivoUrl: c.arquivoUrl,
    arquivoNome: c.arquivoNome,
    observacoes: c.observacoes,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));
}

async function saveContracts(contracts: any[]): Promise<void> {
  if (USE_MOCK) {
    await fs.writeFile('./mocks/contratos.json', JSON.stringify(contracts, null, 2));
  }
  // Em produção, salvar no Prisma (já é feito diretamente nas rotas)
}

export const contracts = Router();

contracts.get('/', async (req, res) => {
  try {
    // Filtro de setores (array de IDs de setores)
    const setoresFilter = req.query.setores 
      ? (req.query.setores as string).split(',').map(s => parseInt(s.trim())).filter(Boolean)
      : null;

    const cacheKey = generateCacheKey('contracts:list', { setoresFilter });
    
    // Limpar cache se solicitado
    if (req.query.forceRefresh === 'true') {
      await deleteCache(cacheKey);
      console.log('[contracts] Cache limpo, forçando nova busca');
    }
    
    // Tentar buscar do cache primeiro
    let cachedData: any = null;
    if (!USE_MOCK && req.query.forceRefresh !== 'true') {
      cachedData = await getCache<any>(cacheKey, CACHE_TTL);
      if (cachedData) {
        console.log('[contracts] Dados carregados do cache');
        return res.json(cachedData);
      }
    }
    
    let data = await readContracts();
    console.log('[contracts:GET] Total de contratos encontrados:', data.length);
    
    // Filtrar por setores se fornecido
    if (setoresFilter && setoresFilter.length > 0) {
      // Buscar equipamentos para mapear contratos aos setores
      const { dataSource } = await import('../adapters/dataSource');
      const equipamentos = await dataSource.equipamentos({
        apenasAtivos: true,
        incluirComponentes: false,
        incluirCustoSubstituicao: false,
      });

      // Função auxiliar para obter SetorId do equipamento
      const getEquipamentoSectorId = (eq: any): number | null => {
        if (eq.SetorId) return eq.SetorId;
        if (eq.Setor) {
          const sectorNameToIdMap: Record<string, number> = {
            'UTI 1': 1, 'UTI 2': 2, 'UTI 3': 3, 'Emergência': 4,
            'Centro Cirúrgico': 5, 'Radiologia': 6, 'Cardiologia': 7,
            'Neurologia': 8, 'Ortopedia': 9, 'Pediatria': 10,
            'Maternidade': 11, 'Ambulatório': 12,
          };
          if (sectorNameToIdMap[eq.Setor]) return sectorNameToIdMap[eq.Setor];
          let hash = 0;
          for (let i = 0; i < eq.Setor.length; i++) {
            hash = ((hash << 5) - hash) + eq.Setor.charCodeAt(i);
            hash = hash & hash;
          }
          return Math.abs(hash % 999) + 1;
        }
        return null;
      };

      // Criar Set com IDs de equipamentos dos setores permitidos
      const equipamentosPermitidos = new Set<number>();
      equipamentos.forEach((eq: any) => {
        const sectorId = getEquipamentoSectorId(eq);
        if (sectorId !== null && setoresFilter.includes(sectorId)) {
          equipamentosPermitidos.add(eq.Id);
        }
      });
      console.log('[contracts] Filtro de setores:', setoresFilter);
      console.log('[contracts] Equipamentos permitidos:', equipamentosPermitidos.size);

      // Filtrar contratos que referenciam equipamentos dos setores permitidos
      data = data.filter((contract: any) => {
        // Se o contrato é para TODOS, incluir apenas se admin (já filtrado acima)
        if (contract.equipamentoIds === 'TODOS' || !contract.equipamentoIds) {
          return false; // Contratos globais não são visíveis para usuários com setores específicos
        }
        
        // Verificar se algum equipamento do contrato está nos setores permitidos
        const equipIds = contract.equipamentoIds.split(',').map((id: string) => parseInt(id.trim())).filter(Boolean);
        return equipIds.some((id: number) => equipamentosPermitidos.has(id));
      });
    }
    
    // Salvar no cache (apenas se não for mock)
    if (!USE_MOCK && data) {
      await setCache(cacheKey, data);
      console.log('[contracts] Dados salvos no cache:', data.length, 'contratos');
    }
    
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

contracts.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const contracts = await readContracts();
    const contract = contracts.find((c) => c.id === id);
    if (!contract) {
      return res.status(404).json({ error: true, message: 'Contrato não encontrado' });
    }
    res.json(contract);
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

contracts.post('/', upload.single('arquivo'), async (req, res) => {
  // Invalidar TODOS os caches de contratos (com e sem filtro de setores)
  const cacheKeys = [
    generateCacheKey('contracts:list', {}),
    generateCacheKey('contracts:list', { setoresFilter: null }),
  ];
  for (const key of cacheKeys) {
    await deleteCache(key).catch(() => {});
  }
  try {
    console.log('[contracts:POST] Body recebido:', req.body);
    console.log('[contracts:POST] File recebido:', req.file?.originalname || 'nenhum');
    
    const {
      nome,
      fornecedor,
      equipamentoIds,
      tipoContrato,
      valorAnual,
      dataInicio,
      dataFim,
      renovacaoAutomatica,
      ativo,
      descricao,
      observacoes,
    } = req.body;
    
    // Converter strings para booleanos (FormData envia tudo como string)
    console.log('[contracts:POST] Valores recebidos (antes da conversão):', {
      renovacaoAutomatica,
      ativo,
      tipoRenovacao: typeof renovacaoAutomatica,
      tipoAtivo: typeof ativo,
    });
    
    const renovacaoAutomaticaBool = renovacaoAutomatica === 'true' || renovacaoAutomatica === true;
    const ativoBool = ativo !== 'false' && ativo !== false; // Default true se não especificado
    
    console.log('[contracts:POST] Valores convertidos (depois da conversão):', {
      renovacaoAutomaticaBool,
      ativoBool,
      tipoRenovacaoBool: typeof renovacaoAutomaticaBool,
      tipoAtivoBool: typeof ativoBool,
    });
    
    console.log('[contracts:POST] Campos extraídos:', {
      nome,
      fornecedor,
      equipamentoIds,
      tipoContrato,
      valorAnual,
      dataInicio,
      dataFim,
      renovacaoAutomatica: renovacaoAutomaticaBool,
      ativo: ativoBool,
    });

    // Processar arquivo se houver
    let arquivoUrl: string | null = null;
    let arquivoNome: string | null = null;
    if (req.file) {
      arquivoUrl = `/uploads/contracts/${req.file.filename}`;
      arquivoNome = req.file.originalname;
    }

    if (!nome || !fornecedor || !tipoContrato || !valorAnual || !dataInicio || !dataFim) {
      console.log('[contracts:POST] Validação falhou - campos faltando:', {
        nome: !!nome,
        fornecedor: !!fornecedor,
        tipoContrato: !!tipoContrato,
        valorAnual: !!valorAnual,
        dataInicio: !!dataInicio,
        dataFim: !!dataFim,
      });
      return res.status(400).json({
        error: true,
        message: 'Campos obrigatórios: nome, fornecedor, tipoContrato, valorAnual, dataInicio, dataFim',
      });
    }
    
    console.log('[contracts:POST] Validação passou, criando contrato...');

    if (USE_MOCK) {
      const contracts = await readContracts();
      const newContract = {
        id: `contract-${Date.now()}`,
        nome,
        fornecedor,
        equipamentoIds: equipamentoIds || 'TODOS',
        tipoContrato,
        valorAnual: parseFloat(valorAnual),
        dataInicio,
        dataFim,
        renovacaoAutomatica: renovacaoAutomaticaBool,
        ativo: ativoBool,
        descricao: descricao || null,
        arquivoUrl,
        arquivoNome,
        observacoes: observacoes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      contracts.push(newContract);
      await saveContracts(contracts);
      // Invalidar cache após criar
      await deleteCache(cacheKey).catch(() => {});
      res.status(201).json(newContract);
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }
      console.log('[contracts:POST] Criando contrato no Prisma com valores booleanos:', {
        renovacaoAutomatica: renovacaoAutomaticaBool,
        ativo: ativoBool,
        tipoRenovacao: typeof renovacaoAutomaticaBool,
        tipoAtivo: typeof ativoBool,
      });
      
      const contract = await prismaClient.maintenanceContract.create({
        data: {
          nome,
          fornecedor,
          equipamentoIds: equipamentoIds || 'TODOS',
          tipoContrato,
          valorAnual: parseFloat(valorAnual),
          dataInicio: new Date(dataInicio),
          dataFim: new Date(dataFim),
          renovacaoAutomatica: Boolean(renovacaoAutomaticaBool), // Garantir que é boolean
          ativo: Boolean(ativoBool), // Garantir que é boolean
          descricao: descricao || null,
          arquivoUrl,
          arquivoNome,
          observacoes: observacoes || null,
        },
      });
      res.status(201).json({
        id: contract.id,
        nome: contract.nome,
        fornecedor: contract.fornecedor,
        equipamentoIds: contract.equipamentoIds,
        tipoContrato: contract.tipoContrato,
        valorAnual: contract.valorAnual.toString(),
        dataInicio: contract.dataInicio.toISOString(),
        dataFim: contract.dataFim.toISOString(),
        renovacaoAutomatica: contract.renovacaoAutomatica,
        ativo: contract.ativo,
        descricao: contract.descricao,
        arquivoUrl: contract.arquivoUrl,
        arquivoNome: contract.arquivoNome,
        observacoes: contract.observacoes,
        createdAt: contract.createdAt.toISOString(),
        updatedAt: contract.updatedAt.toISOString(),
      });
      // Invalidar cache após criar
      await deleteCache(cacheKey).catch(() => {});
    }
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message });
  }
});

contracts.patch('/:id', upload.single('arquivo'), async (req, res) => {
  // Invalidar TODOS os caches de contratos
  const cacheKeys = [
    generateCacheKey('contracts:list', {}),
    generateCacheKey('contracts:list', { setoresFilter: null }),
  ];
  for (const key of cacheKeys) {
    await deleteCache(key).catch(() => {});
  }
  
  try {
    const { id } = req.params;
    console.log('[contracts:PATCH] Atualizando contrato:', id);
    console.log('[contracts:PATCH] Body recebido:', req.body);
    console.log('[contracts:PATCH] File recebido:', req.file?.originalname || 'nenhum');
    
    const updateData: any = {};
    const {
      nome,
      fornecedor,
      equipamentoIds,
      tipoContrato,
      valorAnual,
      dataInicio,
      dataFim,
      renovacaoAutomatica,
      ativo,
      descricao,
      observacoes,
    } = req.body;

    // Processar arquivo se houver novo upload
    if (req.file) {
      // Deletar arquivo antigo se existir
      const prismaClient = await getPrisma();
      if (prismaClient) {
        const existing = await prismaClient.maintenanceContract.findUnique({ where: { id } });
        if (existing?.arquivoUrl) {
          const oldFilePath = existing.arquivoUrl.replace('/uploads/contracts/', './uploads/contracts/');
          try {
            await fs.unlink(oldFilePath);
          } catch {
            // Ignorar erro se arquivo não existir
          }
        }
      }
      updateData.arquivoUrl = `/uploads/contracts/${req.file.filename}`;
      updateData.arquivoNome = req.file.originalname;
    }

    if (nome !== undefined) updateData.nome = nome;
    if (fornecedor !== undefined) updateData.fornecedor = fornecedor;
    if (equipamentoIds !== undefined) updateData.equipamentoIds = equipamentoIds;
    if (tipoContrato !== undefined) updateData.tipoContrato = tipoContrato;
    if (valorAnual !== undefined) updateData.valorAnual = parseFloat(valorAnual);
    if (dataInicio !== undefined) updateData.dataInicio = new Date(dataInicio);
    if (dataFim !== undefined) updateData.dataFim = new Date(dataFim);
    if (renovacaoAutomatica !== undefined) {
      updateData.renovacaoAutomatica = renovacaoAutomatica === 'true' || renovacaoAutomatica === true;
    }
    if (ativo !== undefined) {
      updateData.ativo = ativo !== 'false' && ativo !== false;
    }
    if (descricao !== undefined) updateData.descricao = descricao;
    if (observacoes !== undefined) updateData.observacoes = observacoes;

    if (USE_MOCK) {
      const contracts = await readContracts();
      const index = contracts.findIndex((c) => c.id === id);
      if (index === -1) {
        return res.status(404).json({ error: true, message: 'Contrato não encontrado' });
      }
      contracts[index] = {
        ...contracts[index],
        ...updateData,
        updatedAt: new Date().toISOString(),
      };
      await saveContracts(contracts);
      res.json(contracts[index]);
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }
      
      console.log('[contracts:PATCH] Dados para atualizar:', updateData);
      
      const contract = await prismaClient.maintenanceContract.update({
        where: { id },
        data: updateData,
      });
      
      console.log('[contracts:PATCH] Contrato atualizado com sucesso:', contract.id);
      res.json({
        id: contract.id,
        nome: contract.nome,
        fornecedor: contract.fornecedor,
        equipamentoIds: contract.equipamentoIds,
        tipoContrato: contract.tipoContrato,
        valorAnual: contract.valorAnual.toString(),
        dataInicio: contract.dataInicio.toISOString(),
        dataFim: contract.dataFim.toISOString(),
        renovacaoAutomatica: contract.renovacaoAutomatica,
        ativo: contract.ativo,
        descricao: contract.descricao,
        arquivoUrl: contract.arquivoUrl,
        arquivoNome: contract.arquivoNome,
        observacoes: contract.observacoes,
        createdAt: contract.createdAt.toISOString(),
        updatedAt: contract.updatedAt.toISOString(),
      });
    }
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return res.status(404).json({ error: true, message: 'Contrato não encontrado' });
    }
    res.status(500).json({ error: true, message: e?.message });
  }
});

contracts.delete('/:id', async (req, res) => {
  // Invalidar cache ao deletar contrato
  const cacheKey = generateCacheKey('contracts:list', {});
  await deleteCache(cacheKey).catch(() => {});
  
  try {
    const { id } = req.params;

    if (USE_MOCK) {
      const contracts = await readContracts();
      const filtered = contracts.filter((c) => c.id !== id);
      if (filtered.length === contracts.length) {
        return res.status(404).json({ error: true, message: 'Contrato não encontrado' });
      }
      await saveContracts(filtered);
      res.json({ ok: true });
    } else {
      const prismaClient = await getPrisma();
      if (!prismaClient) {
        return res.status(500).json({ error: true, message: 'Prisma não disponível' });
      }
      await prismaClient.maintenanceContract.delete({
        where: { id },
      });
      res.json({ ok: true });
    }
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return res.status(404).json({ error: true, message: 'Contrato não encontrado' });
    }
    res.status(500).json({ error: true, message: e?.message });
  }
});

