import React from 'react';
import { FiBarChart2 } from 'react-icons/fi';
import MaintenanceCostIndicator from '../components/MaintenanceCostIndicator';
import { theme } from '../styles/theme';

export default function IndicatorsPage() {
  return (
    <div style={{ padding: theme.spacing.md, maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: theme.spacing.lg }}>
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
          <FiBarChart2 size={28} color={theme.colors.primary} />
          Indicadores de Manutenção
        </h1>
        <p style={{ color: theme.colors.gray[600], margin: 0, fontSize: '14px' }}>
          Indicadores de custo e desempenho
        </p>
      </div>

      <MaintenanceCostIndicator />
    </div>
  );
}

