import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiFileText, FiCalendar, FiCheckCircle, FiXCircle, FiChevronLeft, FiChevronRight, FiClock } from 'react-icons/fi';
import DataTable from '../components/DataTable';
import { theme } from '../styles/theme';
import { usePermissions } from '../hooks/usePermissions';
import { formatBrazilianDate } from '../utils/dateUtils';
import type { ListagemAnaliticaOsResumidaDTO } from '../../types/effort';

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  column: string;
  direction: SortDirection;
}

export default function OSPage() {
  const { isAdmin, allowedSectors, filterBySector } = usePermissions();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: '', direction: null });
  const [apenasAbertas, setApenasAbertas] = useState(false);
  const [apenasComCusto, setApenasComCusto] = useState(false);

  const { data: responseData, isLoading, error, dataUpdatedAt } = useQuery<{
    data: ListagemAnaliticaOsResumidaDTO[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    statistics: {
      total: number;
      abertas: number;
      fechadas: number;
      custoTotal: number;
      anoVigente: number;
    };
  }>({
    queryKey: ['os', currentPage, pageSize, apenasAbertas, apenasComCusto, allowedSectors],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        forceRefresh: 'true',
      });
      if (apenasAbertas) params.append('apenasAbertas', 'true');
      if (apenasComCusto) params.append('apenasComCusto', 'true');
      
      // Adicionar filtro de setores se não for admin
      if (!isAdmin && allowedSectors.length > 0) {
        params.append('setores', allowedSectors.join(','));
      }
      
      const res = await fetch(`/api/ecm/os?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
  });

  // Filtrar dados por setor se necessário (fallback caso a API não filtre)
  const rawData = responseData?.data || [];
  const data = useMemo(() => {
    if (isAdmin) return rawData;
    return filterBySector(rawData);
  }, [rawData, isAdmin, filterBySector]);
  const pagination = responseData?.pagination;
  const statistics = responseData?.statistics;

  // Função de ordenação
  const sortData = (dataToSort: any[], column: string, direction: SortDirection): any[] => {
    if (!direction) return dataToSort;

    const sorted = [...dataToSort].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      // Tratamento especial para diferentes tipos de dados
      if (column === 'Abertura' || column === 'Fechamento' || column === 'DataDaSolucao') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue || '').toLowerCase();
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    return sortData(data, sortConfig.column, sortConfig.direction);
  }, [data, sortConfig]);

  // Calcular estatísticas baseadas nos dados filtrados
  const filteredStatistics = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        total: 0,
        abertas: 0,
        fechadas: 0,
      };
    }

    const total = data.length;
    const abertas = data.filter((os) => os.SituacaoDaOS === 'Aberta').length;
    const fechadas = data.filter((os) => os.SituacaoDaOS === 'Fechada').length;

    return {
      total,
      abertas,
      fechadas,
    };
  }, [data]);

  const handleSort = (column: string, direction: SortDirection) => {
    setSortConfig({ column, direction });
    setCurrentPage(1);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr || dateStr.trim() === '') return '-';
    return formatBrazilianDate(dateStr);
  };

  const getStatusColor = (situacao: string) => {
    if (situacao === 'Aberta') return theme.colors.danger;
    if (situacao === 'Fechada') return theme.colors.success;
    return theme.colors.gray[600];
  };

  const getPrioridadeColor = (prioridade: string) => {
    if (prioridade === 'Crítica' || prioridade === 'Alta') return theme.colors.danger;
    if (prioridade === 'Média') return theme.colors.warning;
    return theme.colors.gray[600];
  };

  const columns = [
    {
      key: 'OS' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'OS',
      width: '100px',
      sortable: true,
      render: (value: string) => (
        <span style={{ fontWeight: 600, fontSize: '13px', color: theme.colors.primary }}>
          {value}
        </span>
      ),
    },
    {
      key: 'Abertura' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'Abertura',
      width: '110px',
      sortable: true,
      render: (value: string) => formatDate(value),
    },
    {
      key: 'Equipamento' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'Equipamento',
      width: '200px',
      sortable: true,
    },
    {
      key: 'Setor' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'Setor',
      width: '150px',
      sortable: true,
    },
    {
      key: 'TipoDeManutencao' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'Tipo',
      width: '120px',
      sortable: true,
    },
    {
      key: 'Prioridade' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'Prioridade',
      width: '110px',
      sortable: true,
      render: (value: string) => (
        <span
          style={{
            color: getPrioridadeColor(value),
            fontWeight: 600,
            fontSize: '13px',
          }}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'SituacaoDaOS' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'Situação',
      width: '110px',
      sortable: true,
      render: (value: string) => (
        <span
          style={{
            color: getStatusColor(value),
            fontWeight: 600,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {value === 'Aberta' ? <FiXCircle size={14} /> : <FiCheckCircle size={14} />}
          {value}
        </span>
      ),
    },
    {
      key: 'Fechamento' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'Fechamento',
      width: '110px',
      sortable: true,
      render: (value: string | null) => formatDate(value),
    },
    {
      key: 'Oficina' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'Oficina',
      width: '150px',
      sortable: true,
    },
    {
      key: 'Responsavel' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'Responsável',
      width: '150px',
      sortable: true,
    },
  ];

  if (isLoading) {
    return (
      <div
        style={{
          padding: theme.spacing.xl,
          textAlign: 'center',
          color: theme.colors.gray[600],
        }}
      >
        Carregando ordens de serviço...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: theme.spacing.xl,
          textAlign: 'center',
          color: theme.colors.danger,
        }}
      >
        Erro ao carregar dados: {error instanceof Error ? error.message : 'Erro desconhecido'}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: theme.spacing.md,
        maxWidth: '1600px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: theme.spacing.md }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                margin: 0,
                marginBottom: theme.spacing.xs,
                color: theme.colors.dark,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                fontSize: 'clamp(20px, 5vw, 28px)',
              }}
            >
              <FiFileText size={28} color={theme.colors.primary} />
              Ordens de Serviço
            </h1>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.md,
                flexWrap: 'wrap',
              }}
            >
              <p
                style={{
                  color: theme.colors.gray[600],
                  margin: 0,
                  fontSize: '14px',
                }}
              >
                Ordens de serviço do ano vigente ({statistics?.anoVigente || new Date().getFullYear()})
              </p>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: theme.colors.gray[700],
                }}
              >
                <input
                  type="checkbox"
                  checked={apenasAbertas}
                  onChange={(e) => {
                    setApenasAbertas(e.target.checked);
                    setCurrentPage(1);
                  }}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                  }}
                />
                <span>Mostrar apenas abertas</span>
              </label>
            </div>
          </div>
          {dataUpdatedAt && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                backgroundColor: theme.colors.gray[50],
                borderRadius: theme.borderRadius.sm,
                fontSize: '12px',
                color: theme.colors.gray[700],
                whiteSpace: 'nowrap',
              }}
            >
              <FiClock size={14} color={theme.colors.gray[600]} />
              <span>
                Última sincronização:{' '}
                <strong>
                  {formatBrazilianDate(dataUpdatedAt)}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.md,
        }}
      >
        <div
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.sm,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            borderLeft: `3px solid ${theme.colors.primary}`,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: theme.colors.gray[600],
            }}
          >
            Total
          </p>
          <h3
            style={{
              margin: `${theme.spacing.xs} 0 0 0`,
              fontSize: '20px',
              fontWeight: 700,
            }}
          >
            {filteredStatistics.total}
          </h3>
        </div>
        <div
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.sm,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            borderLeft: `3px solid ${theme.colors.danger}`,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: theme.colors.gray[600],
            }}
          >
            Abertas
          </p>
          <h3
            style={{
              margin: `${theme.spacing.xs} 0 0 0`,
              fontSize: '20px',
              fontWeight: 700,
              color: theme.colors.danger,
            }}
          >
            {filteredStatistics.abertas}
          </h3>
        </div>
        <div
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.sm,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            borderLeft: `3px solid ${theme.colors.success}`,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: theme.colors.gray[600],
            }}
          >
            Fechadas
          </p>
          <h3
            style={{
              margin: `${theme.spacing.xs} 0 0 0`,
              fontSize: '20px',
              fontWeight: 700,
              color: theme.colors.success,
            }}
          >
            {filteredStatistics.fechadas}
          </h3>
        </div>
        {/* Card Custo Total */}
        <div
          onClick={() => {
            setApenasComCusto(!apenasComCusto);
            setCurrentPage(1);
          }}
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.sm,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            borderLeft: `3px solid ${theme.colors.primary}`,
            cursor: 'pointer',
            transition: 'all 0.2s',
            opacity: apenasComCusto ? 1 : 0.9,
            border: apenasComCusto ? `2px solid ${theme.colors.primary}` : 'none',
          }}
          onMouseEnter={(e) => {
            if (!apenasComCusto) {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!apenasComCusto) {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: theme.colors.gray[600],
            }}
          >
            Custo Total
          </p>
          <h3
            style={{
              margin: `${theme.spacing.xs} 0 0 0`,
              fontSize: '18px',
              fontWeight: 700,
              color: theme.colors.primary,
            }}
          >
            {statistics?.custoTotal
              ? statistics.custoTotal.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })
              : 'R$ 0,00'}
          </h3>
        </div>
      </div>

      {/* Controles de Paginação */}
      {pagination && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.md,
            padding: theme.spacing.sm,
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            flexWrap: 'wrap',
            gap: theme.spacing.sm,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <span style={{ fontSize: '13px', color: theme.colors.gray[600] }}>
              Mostrando {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total} OS
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                borderRadius: theme.borderRadius.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                fontSize: '13px',
              }}
            >
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
              <option value={200}>200 por página</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrev}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                borderRadius: theme.borderRadius.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                backgroundColor: pagination.hasPrev ? theme.colors.white : theme.colors.gray[100],
                color: pagination.hasPrev ? theme.colors.dark : theme.colors.gray[400],
                cursor: pagination.hasPrev ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                fontSize: '13px',
              }}
            >
              <FiChevronLeft size={16} />
              Anterior
            </button>
            <span style={{ fontSize: '13px', color: theme.colors.gray[600] }}>
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={!pagination.hasNext}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                borderRadius: theme.borderRadius.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                backgroundColor: pagination.hasNext ? theme.colors.white : theme.colors.gray[100],
                color: pagination.hasNext ? theme.colors.dark : theme.colors.gray[400],
                cursor: pagination.hasNext ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                fontSize: '13px',
              }}
            >
              Próxima
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <DataTable
        data={filteredData}
        columns={columns}
        sortConfig={sortConfig}
        onSort={handleSort}
      />
    </div>
  );
}

