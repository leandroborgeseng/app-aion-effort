// src/services/aiSummaryService.ts
/**
 * Serviço para gerar resumos inteligentes de rondas usando IA
 */

interface RoundData {
  id: string;
  sectorId: number;
  sectorName: string;
  weekStart: string;
  responsibleName?: string;
  openOsCount: number;
  closedOsCount: number;
  notes?: string;
  osIds?: string;
  purchaseRequestIds?: string;
}

interface OSDetail {
  CodigoSerialOS: number;
  OS: string;
  Equipamento: string;
  SituacaoDaOS?: string;
  Abertura?: string;
  Prioridade?: string;
  TipoDeManutencao?: string;
}

interface PurchaseRequestDetail {
  id: string;
  description: string;
  status: string;
  numeroSolicitacao?: string;
}

interface InvestmentDetail {
  id: string;
  titulo: string;
  categoria?: string;
  valorEstimado?: number;
  prioridade?: string;
}

interface AIRoundSummary {
  summary: string;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
  insights?: string[];
}

/**
 * Gera um prompt estruturado para a IA baseado nos dados da ronda
 */
function buildRoundPrompt(
  round: RoundData,
  osDetails: OSDetail[] = [],
  purchaseRequests: PurchaseRequestDetail[] = [],
  investments: InvestmentDetail[] = []
): string {
  const osList = osDetails
    .map(
      (os) =>
        `- ${os.OS} - ${os.Equipamento} (${os.SituacaoDaOS || 'N/A'})${os.Prioridade ? ` - Prioridade: ${os.Prioridade}` : ''}`
    )
    .join('\n');

  const purchaseRequestsList = purchaseRequests
    .map((pr) => `- ${pr.description} (Status: ${pr.status})${pr.numeroSolicitacao ? ` - Nº: ${pr.numeroSolicitacao}` : ''}`)
    .join('\n');

  const investmentsList = investments
    .map(
      (inv) =>
        `- ${inv.titulo}${inv.categoria ? ` (${inv.categoria})` : ''}${inv.valorEstimado ? ` - R$ ${inv.valorEstimado.toFixed(2)}` : ''}${inv.prioridade ? ` - Prioridade: ${inv.prioridade}` : ''}`
    )
    .join('\n');

  return `Você é um analista especializado em gestão de equipamentos médicos hospitalares.

Analise os seguintes dados de uma ronda executada:

SETOR: ${round.sectorName}
SEMANA: ${new Date(round.weekStart).toLocaleDateString('pt-BR')}
RESPONSÁVEL: ${round.responsibleName || 'Não informado'}

ESTATÍSTICAS:
- OS Abertas: ${round.openOsCount}
- OS Fechadas: ${round.closedOsCount}

${osDetails.length > 0 ? `OS VINCULADAS (${osDetails.length}):\n${osList}\n` : 'OS VINCULADAS: Nenhuma\n'}

${purchaseRequests.length > 0 ? `SOLICITAÇÕES DE COMPRA (${purchaseRequests.length}):\n${purchaseRequestsList}\n` : 'SOLICITAÇÕES DE COMPRA: Nenhuma\n'}

${investments.length > 0 ? `INVESTIMENTOS IDENTIFICADOS (${investments.length}):\n${investmentsList}\n` : 'INVESTIMENTOS IDENTIFICADOS: Nenhum\n'}

${round.notes ? `OBSERVAÇÕES DO RESPONSÁVEL:\n${round.notes}\n` : 'OBSERVAÇÕES: Nenhuma\n'}

Gere um resumo executivo em português brasileiro estruturado em JSON com as seguintes seções:

{
  "summary": "Situação geral do setor em 2-3 parágrafos",
  "highlights": ["Destaque 1", "Destaque 2", "Destaque 3"],
  "concerns": ["Preocupação 1", "Preocupação 2"],
  "recommendations": ["Recomendação 1", "Recomendação 2", "Recomendação 3"],
  "insights": ["Insight 1", "Insight 2"]
}

Seja conciso, objetivo e acionável. Use linguagem técnica mas acessível. Foque em insights práticos para a gestão.`;
}

/**
 * Gera resumo usando OpenAI (se configurado) ou retorna resumo mock
 */
export async function generateRoundSummary(
  round: RoundData,
  osDetails: OSDetail[] = [],
  purchaseRequests: PurchaseRequestDetail[] = [],
  investments: InvestmentDetail[] = []
): Promise<AIRoundSummary> {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  // Se não houver chave OpenAI, retornar resumo mock (para desenvolvimento/testes)
  if (!openaiApiKey) {
    console.log('[aiSummaryService] OpenAI API key não configurada, gerando resumo mock');
    return generateMockSummary(round, osDetails, purchaseRequests, investments);
  }

  try {
    // Importar OpenAI dinamicamente
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const prompt = buildRoundPrompt(round, osDetails, purchaseRequests, investments);

    console.log('[aiSummaryService] Enviando requisição para OpenAI...');

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'Você é um analista especializado em gestão de equipamentos médicos hospitalares. Sempre retorne respostas em formato JSON válido, sem markdown ou código adicional. Seja objetivo e acionável.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    // Tentar fazer parse do JSON
    let parsed: AIRoundSummary;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // Se não conseguir fazer parse, tentar extrair JSON do texto
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Não foi possível extrair JSON da resposta');
      }
    }

    // Validar estrutura
    if (!parsed.summary || !Array.isArray(parsed.highlights)) {
      throw new Error('Estrutura de resposta inválida');
    }

    console.log('[aiSummaryService] Resumo gerado com sucesso');
    return parsed;
  } catch (error: any) {
    console.error('[aiSummaryService] Erro ao gerar resumo com OpenAI:', error?.message);
    // Em caso de erro, retornar resumo mock como fallback
    console.log('[aiSummaryService] Usando resumo mock como fallback');
    return generateMockSummary(round, osDetails, purchaseRequests, investments);
  }
}

/**
 * Gera um resumo mock quando IA não está disponível
 */
function generateMockSummary(
  round: RoundData,
  osDetails: OSDetail[] = [],
  purchaseRequests: PurchaseRequestDetail[] = [],
  investments: InvestmentDetail[] = []
): AIRoundSummary {
  const totalOs = round.openOsCount + round.closedOsCount;
  const osRatio = totalOs > 0 ? (round.closedOsCount / totalOs) * 100 : 0;

  const summary = `
O setor ${round.sectorName} apresentou ${round.openOsCount} ordens de serviço abertas e ${round.closedOsCount} fechadas durante a semana de ${new Date(round.weekStart).toLocaleDateString('pt-BR')}.
${osDetails.length > 0 ? `Foram vinculadas ${osDetails.length} OS específicas nesta ronda.` : ''}
${purchaseRequests.length > 0 ? `Foram identificadas ${purchaseRequests.length} solicitações de compra.` : ''}
${investments.length > 0 ? `Foram identificados ${investments.length} investimentos prioritários.` : ''}
${round.notes ? `Observações do responsável: ${round.notes}` : ''}
`;

  const highlights: string[] = [];
  if (round.closedOsCount > 0) {
    highlights.push(`${round.closedOsCount} OS foram fechadas durante o período`);
  }
  if (investments.length > 0) {
    highlights.push(`${investments.length} investimentos identificados para priorização`);
  }
  if (purchaseRequests.length > 0) {
    highlights.push(`${purchaseRequests.length} solicitações de compra criadas`);
  }
  if (highlights.length === 0) {
    highlights.push('Ronda executada conforme planejado');
  }

  const concerns: string[] = [];
  if (round.openOsCount > 10) {
    concerns.push(`Alto número de OS abertas (${round.openOsCount}) - requer atenção`);
  }
  if (osRatio < 50 && totalOs > 0) {
    concerns.push('Taxa de fechamento de OS abaixo de 50%');
  }
  if (round.openOsCount > 0 && osDetails.length === 0) {
    concerns.push('Há OS abertas mas nenhuma foi vinculada à ronda');
  }

  const recommendations: string[] = [];
  if (round.openOsCount > 5) {
    recommendations.push('Priorizar fechamento de OS críticas');
  }
  if (investments.length > 0) {
    recommendations.push('Revisar investimentos identificados para alocação de recursos');
  }
  if (purchaseRequests.length > 0) {
    recommendations.push('Acompanhar status das solicitações de compra');
  }
  recommendations.push('Manter monitoramento contínuo do setor');

  return {
    summary: summary.trim(),
    highlights,
    concerns: concerns.length > 0 ? concerns : ['Nenhuma preocupação crítica identificada'],
    recommendations,
    insights: [
      `Taxa de fechamento de OS: ${osRatio.toFixed(1)}%`,
      `Total de itens identificados: ${osDetails.length + purchaseRequests.length + investments.length}`,
    ],
  };
}

/**
 * Gera resumo semanal agregado de múltiplas rondas
 */
export async function generateWeeklySummary(rounds: RoundData[]): Promise<string> {
  if (rounds.length === 0) {
    return 'Nenhuma ronda encontrada para o período.';
  }

  const totalOpenOs = rounds.reduce((sum, r) => sum + r.openOsCount, 0);
  const totalClosedOs = rounds.reduce((sum, r) => sum + r.closedOsCount, 0);
  const totalSectors = new Set(rounds.map((r) => r.sectorName)).size;

  return `
RESUMO SEMANAL DE RONDAS

Período: ${new Date(rounds[0].weekStart).toLocaleDateString('pt-BR')}

Total de Rondas: ${rounds.length}
Setores Visitados: ${totalSectors}
Total de OS Abertas: ${totalOpenOs}
Total de OS Fechadas: ${totalClosedOs}
Taxa de Fechamento: ${totalOpenOs + totalClosedOs > 0 ? ((totalClosedOs / (totalOpenOs + totalClosedOs)) * 100).toFixed(1) : 0}%

Setores com mais OS abertas:
${rounds
  .sort((a, b) => b.openOsCount - a.openOsCount)
  .slice(0, 5)
  .map((r) => `- ${r.sectorName}: ${r.openOsCount} OS abertas`)
  .join('\n')}
`;
}

