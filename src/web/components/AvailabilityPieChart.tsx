// src/web/components/AvailabilityPieChart.tsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { theme } from '../styles/theme';

interface AvailabilityData {
  totalEquipamentos: number;
  disponiveis: number;
  emManutencao: number;
  percentualDisponivel: number;
  percentualEmManutencao: number;
  setoresFiltrados?: number[] | null;
  setoresFiltradosNomes?: string[] | null;
}

interface AvailabilityPieChartProps {
  data: AvailabilityData;
  isLoading?: boolean;
}

const COLORS = {
  disponivel: theme.colors.success,
  emManutencao: theme.colors.danger,
};

export default function AvailabilityPieChart({ data, isLoading }: AvailabilityPieChartProps) {
  // Debug: verificar dados recebidos
  console.log('[AvailabilityPieChart] Dados recebidos:', {
    setoresFiltrados: data.setoresFiltrados,
    setoresFiltradosNomes: data.setoresFiltradosNomes,
  });

  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          boxShadow: theme.shadows.md,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
        }}
      >
        <p style={{ color: theme.colors.gray[600] }}>Carregando dados...</p>
      </div>
    );
  }

  const chartData = [
    {
      name: 'Disponíveis',
      value: data.disponiveis,
      percentual: data.percentualDisponivel,
      color: COLORS.disponivel,
    },
    {
      name: 'Em Manutenção',
      value: data.emManutencao,
      percentual: data.percentualEmManutencao,
      color: COLORS.emManutencao,
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.sm,
            border: `1px solid ${theme.colors.gray[200]}`,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.md,
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, color: theme.colors.dark }}>
            {data.name}
          </p>
          <p style={{ margin: `${theme.spacing.xs} 0 0 0`, color: theme.colors.gray[600] }}>
            Quantidade: {data.value}
          </p>
          <p style={{ margin: `${theme.spacing.xs} 0 0 0`, color: theme.colors.gray[600] }}>
            Percentual: {data.payload.percentual.toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill={theme.colors.white}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: '14px', fontWeight: 600 }}
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

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
        }}
      >
        Disponibilidade de Equipamentos
      </h3>
      {data.setoresFiltrados && data.setoresFiltrados.length > 0 && (
        <div style={{ margin: `0 0 ${theme.spacing.md} 0` }}>
          <p style={{ margin: 0, fontSize: '13px', color: theme.colors.gray[600], marginBottom: data.setoresFiltradosNomes && data.setoresFiltradosNomes.length > 0 ? theme.spacing.xs : 0 }}>
            Filtrado por {data.setoresFiltrados.length} setor(es)
          </p>
          {data.setoresFiltradosNomes && data.setoresFiltradosNomes.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs }}>
              {data.setoresFiltradosNomes.map((nome, idx) => (
                <span
                  key={idx}
                  style={{
                    display: 'inline-block',
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    backgroundColor: `${theme.colors.primary}15`,
                    color: theme.colors.primary,
                    borderRadius: theme.borderRadius.sm,
                    fontSize: '12px',
                    fontWeight: 500,
                    border: `1px solid ${theme.colors.primary}30`,
                  }}
                >
                  {nome}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.xs }}>
              {data.setoresFiltrados.map((id, idx) => (
                <span
                  key={idx}
                  style={{
                    display: 'inline-block',
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    backgroundColor: `${theme.colors.primary}15`,
                    color: theme.colors.primary,
                    borderRadius: theme.borderRadius.sm,
                    fontSize: '12px',
                    fontWeight: 500,
                    border: `1px solid ${theme.colors.primary}30`,
                  }}
                >
                  Setor {id}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div style={{ width: '100%', height: '400px', marginTop: theme.spacing.md }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '14px' }}
              formatter={(value, entry: any) => (
                <span style={{ color: theme.colors.dark }}>
                  {value}: {entry.payload.value} ({entry.payload.percentual.toFixed(2)}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Estatísticas resumidas */}
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
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: theme.colors.dark,
              marginBottom: theme.spacing.xs,
            }}
          >
            {data.totalEquipamentos}
          </div>
          <div style={{ fontSize: '13px', color: theme.colors.gray[600] }}>
            Total de Equipamentos
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: COLORS.disponivel,
              marginBottom: theme.spacing.xs,
            }}
          >
            {data.disponiveis}
          </div>
          <div style={{ fontSize: '13px', color: theme.colors.gray[600] }}>
            Disponíveis ({data.percentualDisponivel.toFixed(1)}%)
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: COLORS.emManutencao,
              marginBottom: theme.spacing.xs,
            }}
          >
            {data.emManutencao}
          </div>
          <div style={{ fontSize: '13px', color: theme.colors.gray[600] }}>
            Em Manutenção ({data.percentualEmManutencao.toFixed(1)}%)
          </div>
        </div>
      </div>
    </div>
  );
}

