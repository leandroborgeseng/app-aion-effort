// src/web/components/RecentRoundsList.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FiRefreshCw, FiCalendar, FiUser, FiFileText } from 'react-icons/fi';
import { theme } from '../styles/theme';
import { formatBrazilianDate, formatBrazilianDateTime } from '../utils/dateUtils';

interface Round {
  id: string;
  sectorName: string;
  weekStart: string;
  responsibleName?: string | null;
  notes?: string | null;
  createdAt?: string;
}

interface RecentRoundsListProps {
  data: Round[];
  isLoading: boolean;
  allowedSectors?: number[];
}

export default function RecentRoundsList({ data, isLoading, allowedSectors }: RecentRoundsListProps) {
  // Debug: verificar dados recebidos
  React.useEffect(() => {
    console.log('[RecentRoundsList] Dados recebidos:', data);
    console.log('[RecentRoundsList] Quantidade de rondas:', data?.length || 0);
    console.log('[RecentRoundsList] isLoading:', isLoading);
    console.log('[RecentRoundsList] allowedSectors:', allowedSectors);
  }, [data, isLoading, allowedSectors]);
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
          <FiRefreshCw size={24} color={theme.colors.secondary} />
          Últimas Rondas Executadas
        </h3>
        <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
          Carregando...
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
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
          <FiRefreshCw size={24} color={theme.colors.secondary} />
          Últimas Rondas Executadas
        </h3>
        <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
          Nenhuma ronda encontrada.
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
          <FiRefreshCw size={24} color={theme.colors.secondary} />
          Últimas Rondas Executadas
        </h3>
        <Link
          to="/rondas"
          style={{
            color: theme.colors.primary,
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
          }}
        >
          Ver todas →
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
        {data.slice(0, 5).map((round, idx) => {
          const weekStartDate = round.weekStart ? new Date(round.weekStart) : null;
          const createdAtDate = round.createdAt ? new Date(round.createdAt) : null;

          return (
            <div
              key={round.id || idx}
              style={{
                border: `1px solid ${theme.colors.gray[200]}`,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                transition: 'all 0.2s',
                backgroundColor: idx === 0 ? `${theme.colors.secondary}05` : 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = theme.colors.secondary;
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
                      {round.sectorName}
                    </h4>
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
                    {weekStartDate && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs / 2 }}>
                        <FiCalendar size={14} />
                        Semana de {formatBrazilianDate(weekStartDate.toISOString())}
                      </span>
                    )}
                    {createdAtDate && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs / 2 }}>
                        <FiFileText size={14} />
                        Executada em {formatBrazilianDateTime(createdAtDate.toISOString())}
                      </span>
                    )}
                    {round.responsibleName && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs / 2 }}>
                        <FiUser size={14} />
                        {round.responsibleName}
                      </span>
                    )}
                  </div>
                  {round.notes && (
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
                        {round.notes}
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

