// Rota de busca global
import { Router } from 'express';
import { dataSource } from '../adapters/dataSource';
import { getPrisma } from '../services/prismaService';

const search = Router();

interface SearchResult {
  type: 'equipamento' | 'os' | 'investimento' | 'usuario';
  id: string;
  title: string;
  subtitle?: string;
  url: string;
}

search.get('/', async (req, res) => {
  try {
    const query = (req.query.q as string) || '';
    
    if (!query || query.trim().length < 2) {
      return res.json([]);
    }

    const searchTerm = query.trim().toLowerCase();
    const results: SearchResult[] = [];

    // Buscar equipamentos
    try {
      const equipamentos = await dataSource.equipamentos({});
      const equipamentosFiltered = equipamentos
        .filter((eq: any) => {
          const searchFields = [
            eq.Tag,
            eq.Equipamento,
            eq.Modelo,
            eq.Fabricante,
            eq.Setor,
            eq.Patrimonio,
            eq.NSerie,
          ];
          return searchFields.some((field) => 
            field && field.toString().toLowerCase().includes(searchTerm)
          );
        })
        .slice(0, 5); // Limitar a 5 resultados

      equipamentosFiltered.forEach((eq: any) => {
        results.push({
          type: 'equipamento',
          id: String(eq.Id),
          title: eq.Equipamento || eq.Tag || 'Equipamento',
          subtitle: `${eq.Tag || ''} - ${eq.Setor || ''}`.trim(),
          url: `/inventario?search=${encodeURIComponent(searchTerm)}`,
        });
      });
    } catch (error) {
      console.error('[search] Erro ao buscar equipamentos:', error);
    }

    // Buscar Ordens de Serviço
    try {
      const osList = await dataSource.osResumida({
        tipoManutencao: 'Todos',
        periodo: 'Todos',
        pagina: 0,
        qtdPorPagina: 100,
      });

      const osFiltered = osList
        .filter((os: any) => {
          const searchFields = [
            os.OS,
            os.Equipamento,
            os.Setor,
            os.Oficina,
            os.Responsavel,
          ];
          return searchFields.some((field) => 
            field && field.toString().toLowerCase().includes(searchTerm)
          );
        })
        .slice(0, 5);

      osFiltered.forEach((os: any) => {
        results.push({
          type: 'os',
          id: String(os.CodigoSerialOS || os.OS),
          title: `OS ${os.OS || ''}`,
          subtitle: `${os.Equipamento || ''} - ${os.Setor || ''}`.trim(),
          url: `/os?search=${encodeURIComponent(searchTerm)}`,
        });
      });
    } catch (error) {
      console.error('[search] Erro ao buscar OS:', error);
    }

    // Buscar Investimentos
    try {
      const prisma = getPrisma();
      const investments = await prisma.investment.findMany({
        where: {
          OR: [
            { titulo: { contains: query, mode: 'insensitive' } },
            { descricao: { contains: query, mode: 'insensitive' } },
            { setor: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
      });

      investments.forEach((inv) => {
        results.push({
          type: 'investimento',
          id: inv.id,
          title: inv.titulo,
          subtitle: `${inv.setor || ''} - ${inv.categoria || ''}`.trim(),
          url: `/investimentos?search=${encodeURIComponent(searchTerm)}`,
        });
      });
    } catch (error) {
      console.error('[search] Erro ao buscar investimentos:', error);
    }

    // Buscar Usuários
    try {
      const prisma = getPrisma();
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
      });

      users.forEach((user) => {
        results.push({
          type: 'usuario',
          id: user.id,
          title: user.name,
          subtitle: user.email,
          url: `/usuarios?search=${encodeURIComponent(searchTerm)}`,
        });
      });
    } catch (error) {
      console.error('[search] Erro ao buscar usuários:', error);
    }

    // Ordenar resultados por relevância (equipamentos primeiro, depois OS, etc)
    const typeOrder = { equipamento: 0, os: 1, investimento: 2, usuario: 3 };
    results.sort((a, b) => {
      const orderA = typeOrder[a.type];
      const orderB = typeOrder[b.type];
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title);
    });

    res.json(results.slice(0, 20)); // Limitar a 20 resultados totais
  } catch (error) {
    console.error('[search] Erro na busca:', error);
    res.status(500).json({ error: 'Erro ao realizar busca' });
  }
});

export default search;

