import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FiDollarSign,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiFilter,
  FiX,
  FiCalendar,
  FiUser,
  FiTag,
  FiTrendingUp,
  FiSave,
  FiArrowUp,
  FiArrowDown,
} from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { theme } from '../styles/theme';
import { formatBrazilianDate } from '../utils/dateUtils';
import toast from 'react-hot-toast';

interface Investment {
  id: string;
  titulo: string;
  descricao?: string;
  categoria: string;
  valorEstimado: number;
  prioridade: string;
  status: string;
  setor?: string;
  sectorId?: number | null;
  responsavel?: string;
  dataPrevista?: string;
  observacoes?: string;
  sectorRoundId?: string;
  sectorRound?: {
    id: string;
    sectorName: string;
    weekStart: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Sector {
  id: number;
  name: string;
}

export default function InvestmentsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ status?: string; categoria?: string; setor?: string }>({});
  const [showFilters, setShowFilters] = useState(false);

  const queryClient = useQueryClient();

  // Buscar setores disponíveis da API do Effort PRIMEIRO
  const { data: sectorsData, isLoading: sectorsLoading, error: sectorsError } = useQuery<{ success: boolean; total: number; sectors: Sector[] }>({
    queryKey: ['investment-sectors'],
    queryFn: async () => {
      const res = await fetch('/api/ecm/investments/sectors/list');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Erro ao buscar setores' }));
        throw new Error(errorData.message || 'Erro ao buscar setores');
      }
      const data = await res.json();
      console.log('[InvestmentsPage] Setores recebidos da API:', data);
      
      // A API retorna { success, total, sectors, source: 'effort-api' }
      if (data.sectors && Array.isArray(data.sectors)) {
        return { success: data.success || true, total: data.total || data.sectors.length, sectors: data.sectors };
      }
      if (Array.isArray(data)) {
        return { success: true, total: data.length, sectors: data };
      }
      console.warn('[InvestmentsPage] Formato de dados inesperado:', data);
      return { success: false, total: 0, sectors: [] };
    },
    retry: 2,
    staleTime: 0, // Sempre buscar dados atualizados (sem cache)
    refetchOnWindowFocus: true, // Recarregar ao focar na janela para garantir dados atualizados
    refetchOnMount: true, // Sempre recarregar ao montar o componente
  });

  const sectors = sectorsData?.sectors || [];

  // Buscar investimentos DEPOIS dos setores
  const { data: investments, isLoading, error } = useQuery<Investment[]>({
    queryKey: ['investments', filters, sectors],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.categoria) params.append('categoria', filters.categoria);
      // Converter nome do setor para sectorId se necessário
      if (filters.setor && sectors.length > 0) {
        const sector = sectors.find((s) => s.name === filters.setor);
        if (sector) {
          params.append('sectorId', sector.id.toString());
        }
      }
      const res = await fetch(`/api/ecm/investments?${params.toString()}`);
      if (!res.ok) throw new Error('Erro ao buscar investimentos');
      const data = await res.json();
      console.log('[InvestmentsPage] Investimentos recebidos:', data.length, 'filtro:', filters.setor);
      return data;
    },
    enabled: true, // Sempre habilitado
  });
  
  // Debug: log dos setores processados
  useEffect(() => {
    console.log('[InvestmentsPage] Setores processados:', sectors);
    console.log('[InvestmentsPage] Total de setores:', sectors.length);
    if (sectors.length > 0) {
      console.log('[InvestmentsPage] Primeiros 5 setores:', sectors.slice(0, 5));
    }
  }, [sectors]);

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Investment>) => {
      const res = await fetch('/api/ecm/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao criar investimento');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Investment> }) => {
      const res = await fetch(`/api/ecm/investments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao atualizar investimento');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      setEditingId(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ecm/investments/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao deletar investimento');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return formatBrazilianDate(dateStr);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Proposto: theme.colors.info,
      'Em Análise': theme.colors.warning,
      Aprovado: theme.colors.success,
      'Em Execução': theme.colors.primary,
      Concluído: theme.colors.success,
      Cancelado: theme.colors.danger,
    };
    return colors[status] || theme.colors.gray[400];
  };

  const getPrioridadeColor = (prioridade: string) => {
    const colors: Record<string, string> = {
      Baixa: theme.colors.success,
      Média: theme.colors.warning,
      Alta: theme.colors.danger,
      Crítica: theme.colors.danger,
    };
    return colors[prioridade] || theme.colors.gray[400];
  };

  const categorias = ['Equipamento', 'Infraestrutura', 'Melhoria', 'Substituição', 'Outros'];
  const prioridades = ['Baixa', 'Média', 'Alta', 'Crítica'];
  const statuses = ['Proposto', 'Em Análise', 'Aprovado', 'Em Execução', 'Concluído', 'Cancelado'];

  const totalValue = investments?.reduce((acc, inv) => acc + inv.valorEstimado, 0) || 0;
  const byStatus = investments?.reduce((acc: Record<string, number>, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {}) || {};

  // Agregar investimentos por setor para o gráfico (Top 10)
  const investmentsBySector = useMemo(() => {
    if (!investments || !sectors.length) return [];
    
    const sectorMap = new Map<string, { name: string; count: number; value: number }>();
    
    // Inicializar todos os setores com 0
    sectors.forEach((sector) => {
      sectorMap.set(sector.name, { name: sector.name, count: 0, value: 0 });
    });
    
    // Agregar investimentos por setor
    investments.forEach((inv) => {
      const sectorName = inv.setor || 'Sem Setor';
      const current = sectorMap.get(sectorName) || { name: sectorName, count: 0, value: 0 };
      sectorMap.set(sectorName, {
        name: sectorName,
        count: current.count + 1,
        value: current.value + inv.valorEstimado,
      });
    });
    
    return Array.from(sectorMap.values())
      .filter((item) => item.count > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Limitar aos top 10 setores
  }, [investments, sectors]);

  // Cores para o gráfico (gerar cores dinamicamente)
  const COLORS = [
    theme.colors.primary,
    theme.colors.success,
    theme.colors.warning,
    theme.colors.danger,
    theme.colors.info,
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
    '#F59E0B',
    '#6366F1',
  ];

  // Handler para clique no gráfico
  const handleSectorClick = (sectorName: string) => {
    console.log('[InvestmentsPage] Clique no setor:', sectorName);
    console.log('[InvestmentsPage] Filtro atual:', filters.setor);
    
    if (filters.setor === sectorName) {
      // Se já está filtrado por esse setor, remove o filtro
      console.log('[InvestmentsPage] Removendo filtro de setor');
      setFilters({ ...filters, setor: undefined });
    } else {
      // Filtra por esse setor
      console.log('[InvestmentsPage] Aplicando filtro de setor:', sectorName);
      setFilters({ ...filters, setor: sectorName });
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: theme.spacing.xl, textAlign: 'center' }}>
        <p style={{ color: theme.colors.gray[600] }}>Carregando investimentos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: theme.spacing.xl,
          backgroundColor: `${theme.colors.danger}15`,
          borderRadius: theme.borderRadius.md,
          color: theme.colors.danger,
        }}
      >
        Erro ao carregar dados: {String(error)}
      </div>
    );
  }

  return (
    <div style={{ padding: theme.spacing.xl, maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ marginBottom: theme.spacing.lg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1
              style={{
                margin: 0,
                marginBottom: theme.spacing.md,
                color: theme.colors.dark,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
              }}
            >
              <FiDollarSign size={32} color={theme.colors.primary} />
              Investimentos
            </h1>
            <p style={{ color: theme.colors.gray[600], margin: 0 }}>
              Gestão de investimentos e projetos
            </p>
          </div>
          <div style={{ display: 'flex', gap: theme.spacing.sm }}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: theme.colors.white,
                border: `1px solid ${theme.colors.gray[300]}`,
                borderRadius: theme.borderRadius.md,
                color: theme.colors.dark,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
              }}
            >
              <FiFilter size={18} />
              Filtros
            </button>
            <button
              onClick={() => {
                setEditingId(null);
                setShowForm(true);
              }}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: theme.colors.primary,
                border: 'none',
                borderRadius: theme.borderRadius.md,
                color: theme.colors.white,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                fontWeight: 600,
              }}
            >
              <FiPlus size={18} />
              Novo Investimento
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: theme.spacing.md,
          marginBottom: theme.spacing.xl,
        }}
      >
        <div
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.md,
            borderTop: `4px solid ${theme.colors.primary}`,
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: theme.colors.gray[600] }}>
            Valor Total
          </p>
          <h3 style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '24px', fontWeight: 700 }}>
            {formatCurrency(totalValue)}
          </h3>
        </div>
        <div
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.md,
            borderTop: `4px solid ${theme.colors.success}`,
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: theme.colors.gray[600] }}>
            Total de Itens
          </p>
          <h3 style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '24px', fontWeight: 700 }}>
            {investments?.length || 0}
          </h3>
        </div>
        {Object.entries(byStatus).slice(0, 2).map(([status, count]) => (
          <div
            key={status}
            style={{
              backgroundColor: theme.colors.white,
              padding: theme.spacing.lg,
              borderRadius: theme.borderRadius.md,
              boxShadow: theme.shadows.md,
              borderTop: `4px solid ${getStatusColor(status)}`,
            }}
          >
            <p style={{ margin: 0, fontSize: '14px', color: theme.colors.gray[600] }}>{status}</p>
            <h3 style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '24px', fontWeight: 700 }}>
              {count}
            </h3>
          </div>
        ))}
      </div>

      {/* Gráfico de Investimentos por Setor */}
      {investmentsBySector.length > 0 && (
        <div
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.md,
            marginBottom: theme.spacing.xl,
          }}
        >
          <h2
            style={{
              margin: 0,
              marginBottom: theme.spacing.md,
              fontSize: '20px',
              fontWeight: 600,
              color: theme.colors.dark,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
            }}
          >
            <FiTrendingUp size={24} color={theme.colors.primary} />
            Top 10 Setores em Investimentos
          </h2>
          {filters.setor && (
            <div
              style={{
                marginBottom: theme.spacing.md,
                padding: theme.spacing.sm,
                backgroundColor: `${theme.colors.primary}15`,
                borderRadius: theme.borderRadius.sm,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '14px', color: theme.colors.dark }}>
                Filtrado por: <strong>{filters.setor}</strong>
              </span>
              <button
                onClick={() => setFilters({ ...filters, setor: undefined })}
                style={{
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  backgroundColor: theme.colors.white,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  borderRadius: theme.borderRadius.sm,
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                }}
              >
                <FiX size={14} />
                Remover filtro
              </button>
            </div>
          )}
          <div style={{ width: '100%', height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={investmentsBySector}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={(data: any, index: number) => {
                    console.log('[InvestmentsPage] Clique no Pie:', data, index);
                    // O recharts passa o objeto de dados completo no evento onClick
                    const sectorName = data?.name || data?.payload?.name || investmentsBySector[index]?.name;
                    if (sectorName) {
                      handleSectorClick(sectorName);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {investmentsBySector.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      style={{
                        opacity: filters.setor && filters.setor !== entry.name ? 0.3 : 1,
                        transition: 'opacity 0.2s',
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.colors.white,
                    border: `1px solid ${theme.colors.gray[200]}`,
                    borderRadius: theme.borderRadius.md,
                    boxShadow: theme.shadows.md,
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    formatCurrency(value),
                    `Valor Total (${props.payload.count} investimento${props.payload.count !== 1 ? 's' : ''})`,
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '14px' }}
                  formatter={(value, entry: any) => (
                    <span
                      style={{
                        color: filters.setor && filters.setor !== entry.payload.name ? theme.colors.gray[400] : theme.colors.dark,
                        cursor: 'pointer',
                        fontWeight: filters.setor === entry.payload.name ? 600 : 400,
                      }}
                      onClick={() => handleSectorClick(entry.payload.name)}
                    >
                      {value} ({entry.payload.count})
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Estatísticas resumidas - Top 10 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: theme.spacing.md,
              marginTop: theme.spacing.lg,
              paddingTop: theme.spacing.lg,
              borderTop: `1px solid ${theme.colors.gray[200]}`,
            }}
          >
            {investmentsBySector.map((sector, index) => (
              <div
                key={sector.name}
                style={{
                  textAlign: 'center',
                  padding: theme.spacing.sm,
                  backgroundColor: filters.setor === sector.name ? `${COLORS[index % COLORS.length]}15` : 'transparent',
                  borderRadius: theme.borderRadius.sm,
                  border: filters.setor === sector.name ? `2px solid ${COLORS[index % COLORS.length]}` : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => handleSectorClick(sector.name)}
              >
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: COLORS[index % COLORS.length],
                    marginBottom: theme.spacing.xs,
                  }}
                >
                  {sector.count}
                </div>
                <div style={{ fontSize: '12px', color: theme.colors.gray[600], marginBottom: theme.spacing.xs }}>
                  {sector.name}
                </div>
                <div style={{ fontSize: '11px', color: theme.colors.gray[500] }}>
                  {formatCurrency(sector.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      {showFilters && (
        <div
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.md,
            marginBottom: theme.spacing.md,
            display: 'flex',
            gap: theme.spacing.md,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              borderRadius: theme.borderRadius.sm,
              border: `1px solid ${theme.colors.gray[300]}`,
              fontSize: '14px',
            }}
          >
            <option value="">Todos os Status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filters.categoria || ''}
            onChange={(e) => setFilters({ ...filters, categoria: e.target.value || undefined })}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${theme.colors.gray[300]}`,
              fontSize: '14px',
            }}
          >
            <option value="">Todas as Categorias</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={filters.setor || ''}
            onChange={(e) => setFilters({ ...filters, setor: e.target.value || undefined })}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${theme.colors.gray[300]}`,
              fontSize: '14px',
            }}
          >
            <option value="">Todos os Setores</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setFilters({});
              setShowFilters(false);
            }}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              backgroundColor: theme.colors.gray[200],
              border: 'none',
              borderRadius: theme.borderRadius.sm,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
            }}
          >
            <FiX size={16} />
            Limpar
          </button>
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <InvestmentForm
          investment={editingId ? investments?.find((inv) => inv.id === editingId) : undefined}
          onSave={(data) => {
            if (editingId) {
              updateMutation.mutate({ id: editingId, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingId(null);
          }}
          categorias={categorias}
          prioridades={prioridades}
          statuses={statuses}
          sectors={sectorsData?.sectors || []}
        />
      )}

      {/* Tabela Estilo Excel */}
      {investments && investments.length > 0 ? (
        <EditableTable
          investments={investments}
          sectors={sectorsData?.sectors || []}
          categorias={categorias}
          prioridades={prioridades}
          statuses={statuses}
          filters={filters}
          onUpdate={(id, data) => {
            updateMutation.mutate({ id, data });
          }}
          onDelete={(id) => {
            if (confirm('Tem certeza que deseja excluir este investimento?')) {
              deleteMutation.mutate(id);
            }
          }}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getStatusColor={getStatusColor}
          getPrioridadeColor={getPrioridadeColor}
        />
      ) : (
        <div
              style={{
            padding: theme.spacing.xl,
            textAlign: 'center',
                backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            color: theme.colors.gray[500],
          }}
        >
          Nenhum investimento encontrado.
        </div>
      )}
    </div>
  );
}

// Componente de Tabela Editável Estilo Excel
function EditableTable({
  investments,
  sectors,
  categorias,
  prioridades,
  statuses,
  filters,
  onUpdate,
  onDelete,
  formatCurrency,
  formatDate,
  getStatusColor,
  getPrioridadeColor,
}: {
  investments: Investment[];
  sectors: Sector[];
  categorias: string[];
  prioridades: string[];
  statuses: string[];
  filters?: { status?: string; categoria?: string; setor?: string };
  onUpdate: (id: string, data: Partial<Investment>) => void;
  onDelete: (id: string) => void;
  formatCurrency: (value: number) => string;
  formatDate: (dateStr?: string) => string;
  getStatusColor: (status: string) => string;
  getPrioridadeColor: (prioridade: string) => string;
}) {
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editedData, setEditedData] = useState<Record<string, Partial<Investment>>>({});
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);

  // Filtrar investimentos localmente como fallback
  const filteredInvestments = useMemo(() => {
    let filtered = [...investments];
    
    if (filters?.setor) {
      filtered = filtered.filter((inv) => inv.setor === filters.setor);
      console.log('[EditableTable] Filtrando por setor:', filters.setor, 'Resultado:', filtered.length, 'de', investments.length);
    }
    
    if (filters?.status) {
      filtered = filtered.filter((inv) => inv.status === filters.status);
    }
    
    if (filters?.categoria) {
      filtered = filtered.filter((inv) => inv.categoria === filters.categoria);
    }
    
    return filtered;
  }, [investments, filters]);

  const [localInvestments, setLocalInvestments] = useState<Investment[]>(filteredInvestments);

  // Sincronizar localInvestments quando filteredInvestments mudar
  useEffect(() => {
    console.log('[EditableTable] Atualizando investimentos locais:', filteredInvestments.length);
    setLocalInvestments(filteredInvestments);
  }, [filteredInvestments]);

  // Sincronizar localInvestments quando investments mudar (incluindo filtros)
  useEffect(() => {
    setLocalInvestments(investments);
  }, [investments]);

  // Função de ordenação
  const handleSort = (field: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.field === field && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ field, direction });
  };

  // Aplicar ordenação quando sortConfig ou investments mudar
  useEffect(() => {
    if (sortConfig) {
      const sorted = [...investments].sort((a, b) => {
        let aValue: any = a[sortConfig.field as keyof Investment];
        let bValue: any = b[sortConfig.field as keyof Investment];

        // Tratar valores nulos/undefined
        if (aValue == null) aValue = '';
        if (bValue == null) bValue = '';

        // Converter para string para comparação
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();

        if (sortConfig.direction === 'asc') {
          return aStr.localeCompare(bStr, 'pt-BR');
        } else {
          return bStr.localeCompare(aStr, 'pt-BR');
        }
      });
      setLocalInvestments(sorted);
    } else {
      setLocalInvestments(investments);
    }
  }, [sortConfig, investments]);

  const handleCellClick = (rowId: string, field: string) => {
    setEditingCell({ rowId, field });
  };

  const handleCellChange = (rowId: string, field: string, value: any) => {
    setEditedData((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [field]: value,
      },
    }));
    setLocalInvestments((prev) =>
      prev.map((inv) => (inv.id === rowId ? { ...inv, [field]: value } : inv))
    );
  };

  const handleCellBlur = (rowId: string) => {
    setEditingCell(null);
    if (editedData[rowId]) {
      onUpdate(rowId, editedData[rowId]);
      setEditedData((prev) => {
        const newData = { ...prev };
        delete newData[rowId];
        return newData;
      });
      toast.success('Investimento atualizado!');
    }
  };

  const parseCurrency = (value: string): number => {
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const EditableCell = ({
    rowId,
    field,
    value,
    type = 'text',
    options,
  }: {
    rowId: string;
    field: string;
    value: any;
    type?: 'text' | 'number' | 'select' | 'date';
    options?: string[];
  }) => {
    const isEditing = editingCell?.rowId === rowId && editingCell?.field === field;
    const displayValue = editedData[rowId]?.[field] !== undefined ? editedData[rowId][field] : value;

    if (isEditing) {
      if (type === 'select' && options) {
        return (
          <select
            value={displayValue || ''}
            onChange={(e) => handleCellChange(rowId, field, e.target.value)}
            onBlur={() => handleCellBlur(rowId)}
            autoFocus
            style={{
              width: '100%',
              padding: '4px 8px',
              border: `2px solid ${theme.colors.primary}`,
              fontSize: '13px',
              backgroundColor: theme.colors.white,
            }}
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      }
      if (type === 'date') {
        return (
          <input
            type="date"
            value={displayValue ? new Date(displayValue).toISOString().split('T')[0] : ''}
            onChange={(e) => handleCellChange(rowId, field, e.target.value || undefined)}
            onBlur={() => handleCellBlur(rowId)}
            autoFocus
            style={{
              width: '100%',
              padding: '4px 8px',
              border: `2px solid ${theme.colors.primary}`,
              fontSize: '13px',
            }}
          />
        );
      }
      if (type === 'number') {
        return (
          <input
            type="text"
            value={displayValue ? formatCurrency(displayValue) : ''}
            onChange={(e) => {
              const numValue = parseCurrency(e.target.value);
              handleCellChange(rowId, field, numValue);
            }}
            onBlur={() => handleCellBlur(rowId)}
            autoFocus
            style={{
              width: '100%',
              padding: '4px 8px',
              border: `2px solid ${theme.colors.primary}`,
              fontSize: '13px',
            }}
          />
        );
      }
      if (field === 'setor') {
        return (
          <select
            value={displayValue?.sectorId?.toString() || localInvestments.find((inv) => inv.id === rowId)?.sectorId?.toString() || ''}
            onChange={(e) => {
              const sectorId = e.target.value ? parseInt(e.target.value) : null;
              const sector = sectors.find((s) => s.id === sectorId);
              handleCellChange(rowId, 'sectorId', sectorId);
              handleCellChange(rowId, 'setor', sector?.name || '');
            }}
            onBlur={() => handleCellBlur(rowId)}
            autoFocus
            style={{
              width: '100%',
              padding: '4px 8px',
              border: `2px solid ${theme.colors.primary}`,
              fontSize: '13px',
              backgroundColor: theme.colors.white,
            }}
          >
            <option value="">Selecione um setor</option>
            {sectors.length === 0 ? (
              <option disabled>Carregando setores...</option>
            ) : (
              sectors.map((sector) => (
                <option key={sector.id} value={sector.id.toString()}>
                  {sector.name} {sector.id ? `(ID: ${sector.id})` : ''}
                </option>
              ))
            )}
          </select>
        );
      }
      return (
        <input
          type="text"
          value={displayValue || ''}
          onChange={(e) => handleCellChange(rowId, field, e.target.value)}
          onBlur={() => handleCellBlur(rowId)}
          autoFocus
          style={{
            width: '100%',
            padding: '4px 8px',
            border: `2px solid ${theme.colors.primary}`,
            borderRadius: theme.borderRadius.xs,
            fontSize: '13px',
          }}
        />
      );
    }

    return (
      <div
        onClick={() => handleCellClick(rowId, field)}
        style={{
          padding: '8px',
          cursor: 'pointer',
          minHeight: '32px',
          display: 'flex',
          alignItems: 'center',
          fontSize: '13px',
          color: theme.colors.dark,
        }}
        title="Clique para editar"
      >
        {field === 'valorEstimado' && value
          ? formatCurrency(value)
          : field === 'dataPrevista' && value
          ? formatDate(value)
          : field === 'status' && value
          ? (
                    <span
                      style={{
                  padding: '2px 8px',
                  backgroundColor: `${getStatusColor(value)}20`,
                  color: getStatusColor(value),
                  borderRadius: theme.borderRadius.xs,
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                {value}
                    </span>
            )
          : field === 'prioridade' && value
          ? (
                    <span
                      style={{
                  padding: '2px 8px',
                  backgroundColor: `${getPrioridadeColor(value)}20`,
                  color: getPrioridadeColor(value),
                  borderRadius: theme.borderRadius.xs,
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                {value}
                    </span>
            )
          : value || '-'}
                  </div>
    );
  };

  return (
    <div
                    style={{
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.md,
        boxShadow: theme.shadows.md,
        overflow: 'auto',
                      border: `1px solid ${theme.colors.gray[300]}`,
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: theme.colors.gray[50], borderBottom: `2px solid ${theme.colors.gray[400]}` }}>
            <th
              style={{
                padding: '12px 8px',
                textAlign: 'left',
                fontWeight: 600,
                      color: theme.colors.dark,
                borderRight: `1px solid ${theme.colors.gray[300]}`,
                position: 'sticky',
                left: 0,
                backgroundColor: theme.colors.gray[50],
                zIndex: 10,
                minWidth: '50px',
              }}
            >
              #
            </th>
            <SortableHeader
              field="titulo"
              label="Título"
              sortConfig={sortConfig}
              onSort={handleSort}
              minWidth="200px"
            />
            <SortableHeader
              field="categoria"
              label="Categoria"
              sortConfig={sortConfig}
              onSort={handleSort}
              minWidth="120px"
            />
            <SortableHeader
              field="valorEstimado"
              label="Valor Estimado"
              sortConfig={sortConfig}
              onSort={handleSort}
              minWidth="120px"
            />
            <SortableHeader
              field="prioridade"
              label="Prioridade"
              sortConfig={sortConfig}
              onSort={handleSort}
              minWidth="100px"
            />
            <SortableHeader
              field="status"
              label="Status"
              sortConfig={sortConfig}
              onSort={handleSort}
              minWidth="120px"
            />
            <SortableHeader
              field="setor"
              label="Setor"
              sortConfig={sortConfig}
              onSort={handleSort}
              minWidth="150px"
            />
            <SortableHeader
              field="responsavel"
              label="Responsável"
              sortConfig={sortConfig}
              onSort={handleSort}
              minWidth="120px"
            />
            <SortableHeader
              field="dataPrevista"
              label="Data Prevista"
              sortConfig={sortConfig}
              onSort={handleSort}
              minWidth="120px"
            />
            <SortableHeader
              field="descricao"
              label="Descrição"
              sortConfig={sortConfig}
              onSort={handleSort}
              minWidth="200px"
            />
            <th
              style={{
                padding: '12px 8px',
                textAlign: 'center',
                fontWeight: 600,
                color: theme.colors.dark,
                minWidth: '80px',
              }}
            >
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {localInvestments.map((inv, index) => (
            <tr
              key={inv.id}
              style={{
                borderBottom: `1px solid ${theme.colors.gray[200]}`,
                backgroundColor: editingCell?.rowId === inv.id ? `${theme.colors.primary}05` : theme.colors.white,
              }}
            >
              <td
                style={{
                  padding: '4px 8px',
                  borderRight: `1px solid ${theme.colors.gray[200]}`,
                  position: 'sticky',
                  left: 0,
                  backgroundColor: editingCell?.rowId === inv.id ? `${theme.colors.primary}05` : theme.colors.white,
                  zIndex: 5,
                  textAlign: 'center',
                  fontWeight: 600,
                  color: theme.colors.gray[600],
                }}
              >
                {index + 1}
              </td>
              <td style={{ padding: 0, borderRight: `1px solid ${theme.colors.gray[200]}` }}>
                <EditableCell rowId={inv.id} field="titulo" value={inv.titulo} />
              </td>
              <td style={{ padding: 0, borderRight: `1px solid ${theme.colors.gray[200]}` }}>
                <EditableCell rowId={inv.id} field="categoria" value={inv.categoria} type="select" options={categorias} />
              </td>
              <td style={{ padding: 0, borderRight: `1px solid ${theme.colors.gray[200]}` }}>
                <EditableCell rowId={inv.id} field="valorEstimado" value={inv.valorEstimado} type="number" />
              </td>
              <td style={{ padding: 0, borderRight: `1px solid ${theme.colors.gray[200]}` }}>
                <EditableCell rowId={inv.id} field="prioridade" value={inv.prioridade} type="select" options={prioridades} />
              </td>
              <td style={{ padding: 0, borderRight: `1px solid ${theme.colors.gray[200]}` }}>
                <EditableCell rowId={inv.id} field="status" value={inv.status} type="select" options={statuses} />
              </td>
              <td style={{ padding: 0, borderRight: `1px solid ${theme.colors.gray[200]}` }}>
                <EditableCell rowId={inv.id} field="setor" value={inv.setor} />
              </td>
              <td style={{ padding: 0, borderRight: `1px solid ${theme.colors.gray[200]}` }}>
                <EditableCell rowId={inv.id} field="responsavel" value={inv.responsavel} />
              </td>
              <td style={{ padding: 0, borderRight: `1px solid ${theme.colors.gray[200]}` }}>
                <EditableCell rowId={inv.id} field="dataPrevista" value={inv.dataPrevista} type="date" />
              </td>
              <td style={{ padding: 0, borderRight: `1px solid ${theme.colors.gray[200]}` }}>
                <EditableCell rowId={inv.id} field="descricao" value={inv.descricao} />
              </td>
              <td
                style={{
                  padding: '8px',
                  textAlign: 'center',
                }}
              >
                <button
                  onClick={() => onDelete(inv.id)}
                  style={{
                    padding: '4px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    borderRadius: '0',
                    cursor: 'pointer',
                    color: theme.colors.danger,
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Excluir"
                  >
                  <FiTrash2 size={14} />
                  </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Componente de Cabeçalho Ordenável
function SortableHeader({
  field,
  label,
  sortConfig,
  onSort,
  minWidth,
}: {
  field: string;
  label: string;
  sortConfig: { field: string; direction: 'asc' | 'desc' } | null;
  onSort: (field: string) => void;
  minWidth: string;
}) {
  const isSorted = sortConfig?.field === field;
  const direction = isSorted ? sortConfig.direction : null;

  return (
    <th
      onClick={() => onSort(field)}
      style={{
        padding: '12px 8px',
        textAlign: 'left',
        fontWeight: 600,
        color: theme.colors.dark,
        borderRight: `1px solid ${theme.colors.gray[300]}`,
        minWidth,
        cursor: 'pointer',
        userSelect: 'none',
        backgroundColor: isSorted ? `${theme.colors.primary}10` : theme.colors.gray[50],
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!isSorted) {
          e.currentTarget.style.backgroundColor = theme.colors.gray[100];
        }
      }}
      onMouseLeave={(e) => {
        if (!isSorted) {
          e.currentTarget.style.backgroundColor = theme.colors.gray[50];
        }
      }}
      title={`Clique para ordenar por ${label}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, justifyContent: 'space-between' }}>
        <span>{label}</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0px', minWidth: '14px' }}>
          {direction === 'asc' && <FiArrowUp size={14} color={theme.colors.primary} />}
          {direction === 'desc' && <FiArrowDown size={14} color={theme.colors.primary} />}
          {!direction && (
            <div style={{ display: 'flex', flexDirection: 'column', opacity: 0.3, marginTop: '-2px' }}>
              <FiArrowUp size={10} />
              <FiArrowDown size={10} style={{ marginTop: '-6px' }} />
            </div>
          )}
        </div>
      </div>
    </th>
  );
}

function InvestmentForm({
  investment,
  onSave,
  onCancel,
  categorias,
  prioridades,
  statuses,
  sectors,
}: {
  investment?: Investment;
  onSave: (data: Partial<Investment>) => void;
  onCancel: () => void;
  categorias: string[];
  prioridades: string[];
  statuses: string[];
  sectors: Sector[];
}) {
  // Debug: verificar se os setores estão chegando
  useEffect(() => {
    console.log('[InvestmentForm] Setores recebidos:', sectors);
    console.log('[InvestmentForm] Total de setores:', sectors.length);
  }, [sectors]);

  // Formatar valor para exibição em R$
  const formatCurrency = (value: number | null | undefined): string => {
    if (!value || value === 0) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Converter string formatada para número
  const parseCurrency = (value: string): number => {
    // Remove tudo exceto números, vírgula e ponto
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  // Formatar valor durante digitação
  const formatCurrencyInput = (value: string): string => {
    // Remove tudo exceto números
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return 'R$ 0,00';
    
    // Converte para número e formata
    const numericValue = parseFloat(numbers) / 100;
    return formatCurrency(numericValue);
  };

  const [valorFormatado, setValorFormatado] = useState<string>(
    investment?.valorEstimado ? formatCurrency(investment.valorEstimado) : 'R$ 0,00'
  );

  const [formData, setFormData] = useState<Partial<Investment>>({
    titulo: investment?.titulo || '',
    descricao: investment?.descricao || '',
    categoria: investment?.categoria || categorias[0],
    valorEstimado: investment?.valorEstimado || 0,
    prioridade: investment?.prioridade || prioridades[0],
    status: investment?.status || statuses[0],
    setor: investment?.setor || '',
    sectorId: investment?.sectorId || null,
    responsavel: investment?.responsavel || '',
    dataPrevista: investment?.dataPrevista || '',
    observacoes: investment?.observacoes || '',
  });

  // Atualizar formData quando investment mudar (ao editar)
  useEffect(() => {
    if (investment) {
      setFormData({
        titulo: investment.titulo || '',
        descricao: investment.descricao || '',
        categoria: investment.categoria || categorias[0],
        valorEstimado: investment.valorEstimado || 0,
        prioridade: investment.prioridade || prioridades[0],
        status: investment.status || statuses[0],
        setor: investment.setor || '',
        sectorId: investment.sectorId || null,
        responsavel: investment.responsavel || '',
        dataPrevista: investment.dataPrevista || '',
        observacoes: investment.observacoes || '',
      });
      setValorFormatado(investment.valorEstimado ? formatCurrency(investment.valorEstimado) : 'R$ 0,00');
    }
  }, [investment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo || !formData.categoria || !formData.valorEstimado || !formData.prioridade) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }
    onSave(formData);
  };

  return (
    <div
      style={{
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        boxShadow: theme.shadows.md,
        marginBottom: theme.spacing.lg,
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: theme.spacing.md }}>
        {investment ? 'Editar Investimento' : 'Novo Investimento'}
      </h3>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: theme.spacing.md }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: theme.spacing.md }}>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
              Título *
            </label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              required
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                fontSize: '14px',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
              Categoria *
            </label>
            <select
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              required
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                fontSize: '14px',
              }}
            >
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
              Valor Estimado *
            </label>
            <input
              type="text"
              value={valorFormatado}
              onChange={(e) => {
                const inputValue = e.target.value;
                const formatted = formatCurrencyInput(inputValue);
                setValorFormatado(formatted);
                const numericValue = parseCurrency(formatted);
                setFormData({ ...formData, valorEstimado: numericValue });
              }}
              onBlur={(e) => {
                const numericValue = parseCurrency(e.target.value);
                const formatted = formatCurrency(numericValue);
                setValorFormatado(formatted);
                setFormData({ ...formData, valorEstimado: numericValue });
              }}
              placeholder="R$ 0,00"
              required
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                fontSize: '14px',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
              Prioridade *
            </label>
            <select
              value={formData.prioridade}
              onChange={(e) => setFormData({ ...formData, prioridade: e.target.value })}
              required
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                fontSize: '14px',
              }}
            >
              {prioridades.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                fontSize: '14px',
              }}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
              Setor
            </label>
            {sectorsLoading ? (
              <div style={{ 
                padding: theme.spacing.sm, 
                border: `1px solid ${theme.colors.gray[300]}`, 
                borderRadius: theme.borderRadius.sm,
                backgroundColor: theme.colors.gray[50],
                color: theme.colors.gray[600],
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
              }}>
                <div style={{ 
                  width: '16px', 
                  height: '16px', 
                  border: `2px solid ${theme.colors.gray[300]}`,
                  borderTopColor: theme.colors.primary,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                Carregando setores da API...
              </div>
            ) : sectorsError ? (
              <div style={{ 
                padding: theme.spacing.sm, 
                border: `1px solid ${theme.colors.danger}`, 
                borderRadius: theme.borderRadius.sm,
                backgroundColor: `${theme.colors.danger}10`,
                color: theme.colors.danger,
                fontSize: '14px',
              }}>
                Erro ao carregar setores. Tente recarregar a página.
              </div>
            ) : sectors.length === 0 ? (
              <div style={{ 
                padding: theme.spacing.sm, 
                border: `1px solid ${theme.colors.gray[300]}`, 
                borderRadius: theme.borderRadius.sm,
                backgroundColor: theme.colors.gray[50],
                color: theme.colors.gray[600],
                fontSize: '14px',
              }}>
                Nenhum setor disponível
              </div>
            ) : (
              <select
                value={formData.sectorId?.toString() || ''}
                onChange={(e) => {
                  const selectedSectorId = e.target.value ? parseInt(e.target.value) : null;
                  const selectedSector = sectors.find((s) => s.id === selectedSectorId);
                  setFormData({
                    ...formData,
                    sectorId: selectedSectorId,
                    setor: selectedSector?.name || '',
                  });
                }}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  borderRadius: theme.borderRadius.sm,
                  fontSize: '14px',
                  backgroundColor: theme.colors.white,
                }}
              >
                <option value="">Selecione um setor</option>
                {sectors.map((sector) => (
                  <option key={sector.id} value={sector.id.toString()}>
                    {sector.name} {sector.id ? `(ID: ${sector.id})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
              Responsável
            </label>
            <input
              type="text"
              value={formData.responsavel}
              onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                fontSize: '14px',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
              Data Prevista
            </label>
            <input
              type="date"
              value={formData.dataPrevista ? new Date(formData.dataPrevista).toISOString().split('T')[0] : ''}
              onChange={(e) => setFormData({ ...formData, dataPrevista: e.target.value || undefined })}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                fontSize: '14px',
              }}
            />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
            Descrição
          </label>
          <textarea
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            rows={3}
            style={{
              width: '100%',
              padding: theme.spacing.sm,
              border: `1px solid ${theme.colors.gray[300]}`,
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
            Observações
          </label>
          <textarea
            value={formData.observacoes}
            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
            rows={2}
            style={{
              width: '100%',
              padding: theme.spacing.sm,
              border: `1px solid ${theme.colors.gray[300]}`,
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.colors.gray[200],
              border: 'none',
              borderRadius: theme.borderRadius.md,
              cursor: 'pointer',
              color: theme.colors.dark,
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.colors.primary,
              border: 'none',
              borderRadius: theme.borderRadius.md,
              cursor: 'pointer',
              color: theme.colors.white,
              fontWeight: 600,
            }}
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
