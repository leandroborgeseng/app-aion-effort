import React from 'react';
import { Link } from 'react-router-dom';
import { FiDollarSign, FiCalendar, FiTag, FiTrendingUp } from 'react-icons/fi';
import { theme } from '../styles/theme';
import { formatBrazilianDate } from '../utils/dateUtils';
import { getSectorNameFromId } from '../utils/sectorMapping';

interface Investment {
  id: string;
  titulo: string;
  descricao?: string;
  valorEstimado: number | null;
  setor?: string;
  sectorId?: number | null;
  dataPrevista?: string | null;
  status?: string;
  categoria?: string;
  createdAt: string;
}

interface InvestmentsListProps {
  data: Investment[];
  isLoading: boolean;
  allowedSectors: number[];
  isAdmin: boolean;
}

export default function InvestmentsList({ data, isLoading, allowedSectors, isAdmin }: InvestmentsListProps) {
  // Filtrar investimentos por setores permitidos se não for admin
  // Nota: Os dados já vêm filtrados do backend, mas fazemos uma validação adicional aqui
  const filteredData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    if (isAdmin) return data;
    
    // Se não há setores permitidos, não mostrar nada
    if (!allowedSectors || allowedSectors.length === 0) return [];
    
    return data.filter((inv) => {
      // Se o investimento não tem sectorId, não mostrar para usuários não-admin
      if (!inv.sectorId) return false;
      // Verificar se o sectorId está na lista de setores permitidos
      return allowedSectors.includes(inv.sectorId);
    });
  }, [data, allowedSectors, isAdmin]);

  // Função auxiliar para converter valor para número
  const parseValue = React.useCallback((value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    if (typeof value === 'string') {
      // Remove caracteres não numéricos exceto ponto, vírgula e sinal de menos
      const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }, []);

  // Calcular estatísticas
  const stats = React.useMemo(() => {
    const total = filteredData.length;
    const totalValue = filteredData.reduce((sum, inv) => {
      const valorNumero = parseValue(inv.valorEstimado);
      return sum + valorNumero;
    }, 0);
    return { total, totalValue };
  }, [filteredData, parseValue]);

  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          boxShadow: theme.shadows.md,
        }}
      >
        <h3
          style={{
            margin: `0 0 ${theme.spacing.md} 0`,
            fontSize: '20px',
            fontWeight: 600,
            color: theme.colors.dark,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          <FiDollarSign size={24} color={theme.colors.success} />
          Investimentos
        </h3>
        <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
          Carregando investimentos...
        </div>
      </div>
    );
  }

  if (!filteredData || filteredData.length === 0) {
    return (
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          boxShadow: theme.shadows.md,
        }}
      >
        <h3
          style={{
            margin: `0 0 ${theme.spacing.md} 0`,
            fontSize: '20px',
            fontWeight: 600,
            color: theme.colors.dark,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          <FiDollarSign size={24} color={theme.colors.success} />
          Investimentos
        </h3>
        <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
          Nenhum investimento encontrado.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        boxShadow: theme.shadows.md,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.md,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 600,
              color: theme.colors.dark,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
            }}
          >
            <FiDollarSign size={24} color={theme.colors.success} />
            Investimentos
          </h3>
          <div
            style={{
              marginTop: theme.spacing.xs,
              fontSize: '14px',
              color: theme.colors.gray[600],
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.md,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs / 2 }}>
              <FiTrendingUp size={14} />
              {stats.total} investimento{stats.total !== 1 ? 's' : ''}
            </span>
            {stats.totalValue > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs / 2 }}>
                <FiDollarSign size={14} />
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(stats.totalValue)}
              </span>
            )}
          </div>
        </div>
        <Link
          to="/investimentos"
          style={{
            color: theme.colors.primary,
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Ver todos →
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
        {filteredData.slice(0, 5).map((investment, idx) => {
          const setorNome = investment.setor || (investment.sectorId ? getSectorNameFromId(investment.sectorId) : 'Não informado');
          const dataPrevista = investment.dataPrevista ? new Date(investment.dataPrevista) : null;

          return (
            <div
              key={investment.id || idx}
              style={{
                border: `1px solid ${theme.colors.gray[200]}`,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                transition: 'all 0.2s',
                backgroundColor: idx === 0 ? `${theme.colors.success}05` : 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = theme.colors.success;
                e.currentTarget.style.boxShadow = theme.shadows.sm;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = theme.colors.gray[200];
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: theme.spacing.md,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                      marginBottom: theme.spacing.xs,
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: 600,
                        color: theme.colors.dark,
                      }}
                    >
                      {investment.titulo}
                    </h4>
                    {investment.categoria && (
                      <span
                        style={{
                          fontSize: '12px',
                          padding: `${theme.spacing.xs / 2}px ${theme.spacing.xs}px`,
                          backgroundColor: theme.colors.gray[100],
                          color: theme.colors.gray[700],
                          borderRadius: theme.borderRadius.sm,
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing.xs / 2,
                        }}
                      >
                        <FiTag size={12} />
                        {investment.categoria}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.md,
                      flexWrap: 'wrap',
                      fontSize: '13px',
                      color: theme.colors.gray[600],
                      marginBottom: theme.spacing.xs,
                    }}
                  >
                    {setorNome && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs / 2 }}>
                        <FiTag size={14} />
                        {setorNome}
                      </span>
                    )}
                    {(() => {
                      const valorNumero = parseValue(investment.valorEstimado);
                      return valorNumero > 0 ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs / 2 }}>
                          <FiDollarSign size={14} />
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(valorNumero)}
                        </span>
                      ) : null;
                    })()}
                    {dataPrevista && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs / 2 }}>
                        <FiCalendar size={14} />
                        Previsto: {formatBrazilianDate(dataPrevista.toISOString())}
                      </span>
                    )}
                  </div>
                  {investment.descricao && (
                    <div
                      style={{
                        marginTop: theme.spacing.xs,
                        padding: theme.spacing.sm,
                        backgroundColor: theme.colors.gray[50],
                        borderRadius: theme.borderRadius.sm,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          color: theme.colors.gray[700],
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {investment.descricao}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

