import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiTrendingUp, FiTrendingDown, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { theme } from '../styles/theme';

interface MaintenanceCostIndicator {
  valorContratos: number;
  valorOS: number;
  custoTotalManutencao: number;
  valorTotalSubstituicao: number;
  percentualAnual: number;
  metaPercentual: number;
  status: 'dentro' | 'acima' | 'critico';
  diferencaMeta: number;
  ano: number;
}

export default function MaintenanceCostIndicator() {
  const { data, isLoading, error } = useQuery<MaintenanceCostIndicator>({
    queryKey: ['maintenance-cost-indicator'],
    queryFn: async () => {
      const res = await fetch('/api/ecm/indicators/maintenance-cost');
      if (!res.ok) throw new Error('Erro ao buscar indicador');
      return res.json();
    },
  });

  const { data: evolutionData, isLoading: evolutionLoading } = useQuery<
    MaintenanceCostIndicator[]
  >({
    queryKey: ['maintenance-cost-evolution', data?.ano],
    queryFn: async () => {
      const ano = data?.ano || new Date().getFullYear();
      const res = await fetch(`/api/ecm/indicators/maintenance-cost/evolution?ano=${ano}`);
      if (!res.ok) throw new Error('Erro ao buscar evolução');
      return res.json();
    },
    enabled: !!data,
  });

  if (isLoading) {
    return (
      <div style={{ padding: theme.spacing.md, textAlign: 'center' }}>
        <p style={{ color: theme.colors.gray[600] }}>Carregando indicador...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          padding: theme.spacing.md,
          backgroundColor: `${theme.colors.danger}15`,
          borderRadius: theme.borderRadius.md,
          color: theme.colors.danger,
        }}
      >
        Erro ao carregar indicador: {String(error)}
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = () => {
    switch (data.status) {
      case 'dentro':
        return theme.colors.success;
      case 'acima':
        return theme.colors.warning;
      case 'critico':
        return theme.colors.danger;
      default:
        return theme.colors.gray[500];
    }
  };

  const getStatusIcon = () => {
    switch (data.status) {
      case 'dentro':
        return <FiCheckCircle size={24} />;
      case 'acima':
        return <FiAlertCircle size={24} />;
      case 'critico':
        return <FiAlertCircle size={24} />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (data.status) {
      case 'dentro':
        return 'Dentro da Meta';
      case 'acima':
        return 'Acima da Meta';
      case 'critico':
        return 'Crítico';
      default:
        return '';
    }
  };

  const percentualColor =
    data.percentualAnual < data.metaPercentual
      ? theme.colors.success
      : data.percentualAnual < data.metaPercentual * 1.5
        ? theme.colors.warning
        : theme.colors.danger;

  return (
    <div
      style={{
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        boxShadow: theme.shadows.md,
        borderTop: `4px solid ${getStatusColor()}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: theme.spacing.lg,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              marginBottom: theme.spacing.xs,
              color: theme.colors.dark,
              fontSize: '20px',
            }}
          >
            Indicador de Custo de Manutenção
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: theme.colors.gray[600] }}>
            Ano {data.ano} - Meta: &lt; {data.metaPercentual}% ao ano
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            color: getStatusColor(),
            fontWeight: 600,
          }}
        >
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </div>
      </div>

      {/* Percentual Principal */}
      <div
        style={{
          textAlign: 'center',
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.gray[50],
          borderRadius: theme.borderRadius.md,
          marginBottom: theme.spacing.lg,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: theme.colors.gray[600],
            marginBottom: theme.spacing.xs,
          }}
        >
          Percentual Anual
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: theme.spacing.xs,
          }}
        >
          <span
            style={{
              fontSize: '48px',
              fontWeight: 700,
              color: percentualColor,
            }}
          >
            {data.percentualAnual.toFixed(2)}%
          </span>
          <span
            style={{
              fontSize: '20px',
              color: theme.colors.gray[500],
            }}
          >
            / {data.metaPercentual}%
          </span>
        </div>
        {data.diferencaMeta > 0 && (
          <p
            style={{
              margin: `${theme.spacing.xs} 0 0 0`,
              fontSize: '14px',
              color: theme.colors.danger,
              fontWeight: 600,
            }}
          >
            {data.diferencaMeta > 0 ? '+' : ''}
            {data.diferencaMeta.toFixed(2)}% acima da meta
          </p>
        )}
        {data.diferencaMeta <= 0 && (
          <p
            style={{
              margin: `${theme.spacing.xs} 0 0 0`,
              fontSize: '14px',
              color: theme.colors.success,
              fontWeight: 600,
            }}
          >
            {Math.abs(data.diferencaMeta).toFixed(2)}% abaixo da meta
          </p>
        )}
      </div>

      {/* Detalhamento */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: theme.spacing.md,
        }}
      >
        <div
          style={{
            padding: theme.spacing.md,
            backgroundColor: theme.colors.gray[50],
            borderRadius: theme.borderRadius.md,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: theme.colors.gray[600],
              marginBottom: theme.spacing.xs,
            }}
          >
            Valor Contratos
          </p>
          <p
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              color: theme.colors.primary,
            }}
          >
            {formatCurrency(data.valorContratos)}
          </p>
        </div>

        <div
          style={{
            padding: theme.spacing.md,
            backgroundColor: theme.colors.gray[50],
            borderRadius: theme.borderRadius.md,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: theme.colors.gray[600],
              marginBottom: theme.spacing.xs,
            }}
          >
            Valor OS
          </p>
          <p
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              color: theme.colors.danger,
            }}
          >
            {formatCurrency(data.valorOS)}
          </p>
        </div>

        <div
          style={{
            padding: theme.spacing.md,
            backgroundColor: theme.colors.gray[50],
            borderRadius: theme.borderRadius.md,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: theme.colors.gray[600],
              marginBottom: theme.spacing.xs,
            }}
          >
            Custo Total
          </p>
          <p
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              color: theme.colors.dark,
            }}
          >
            {formatCurrency(data.custoTotalManutencao)}
          </p>
        </div>

        <div
          style={{
            padding: theme.spacing.md,
            backgroundColor: theme.colors.gray[50],
            borderRadius: theme.borderRadius.md,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: theme.colors.gray[600],
              marginBottom: theme.spacing.xs,
            }}
          >
            Valor Total Substituição
          </p>
          <p
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              color: theme.colors.gray[700],
            }}
          >
            {formatCurrency(data.valorTotalSubstituicao)}
          </p>
        </div>
      </div>

      {/* Barra de progresso visual */}
      <div style={{ marginTop: theme.spacing.lg }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.xs,
            fontSize: '12px',
            color: theme.colors.gray[600],
          }}
        >
          <span>0%</span>
          <span style={{ fontWeight: 600 }}>Meta: {data.metaPercentual}%</span>
          <span>8%</span>
        </div>
        <div
          style={{
            height: '24px',
            backgroundColor: theme.colors.gray[200],
            borderRadius: theme.borderRadius.md,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Meta */}
          <div
            style={{
              position: 'absolute',
              left: `${(data.metaPercentual / 8) * 100}%`,
              width: '2px',
              height: '100%',
              backgroundColor: theme.colors.gray[400],
              zIndex: 2,
            }}
          />
          {/* Valor atual */}
          <div
            style={{
              height: '100%',
              width: `${Math.min((data.percentualAnual / 8) * 100, 100)}%`,
              backgroundColor: percentualColor,
              transition: 'width 0.3s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: theme.spacing.xs,
              color: theme.colors.white,
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {data.percentualAnual.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Gráfico de evolução mês a mês */}
      {evolutionData && evolutionData.length > 0 && (
        <div style={{ marginTop: theme.spacing.xl }}>
          <h3
            style={{
              margin: `0 0 ${theme.spacing.md} 0`,
              fontSize: '18px',
              fontWeight: 600,
              color: theme.colors.dark,
            }}
          >
            Evolução Mês a Mês - {data.ano}
          </h3>
          <div style={{ width: '100%', height: '400px', marginTop: theme.spacing.md }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={evolutionData.map((item) => ({
                  mes: item.mes || 0,
                  mesNome: new Date(data.ano, (item.mes || 1) - 1).toLocaleDateString('pt-BR', {
                    month: 'short',
                  }),
                  percentual: Number(item.percentualAnual.toFixed(2)),
                  meta: item.metaPercentual,
                  valorContratos: item.valorContratos,
                  valorOS: item.valorOS,
                  custoTotal: item.custoTotalManutencao,
                }))}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.gray[200]} />
                <XAxis
                  dataKey="mesNome"
                  stroke={theme.colors.gray[600]}
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke={theme.colors.gray[600]}
                  style={{ fontSize: '12px' }}
                  label={{
                    value: 'Percentual (%)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fontSize: '12px' },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.colors.white,
                    border: `1px solid ${theme.colors.gray[200]}`,
                    borderRadius: theme.borderRadius.md,
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'percentual') {
                      return [`${value.toFixed(2)}%`, 'Percentual'];
                    }
                    if (name === 'meta') {
                      return [`${value}%`, 'Meta'];
                    }
                    return [
                      new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        maximumFractionDigits: 0,
                      }).format(value),
                      name === 'custoTotal'
                        ? 'Custo Total'
                        : name === 'valorContratos'
                          ? 'Valor Contratos'
                          : 'Valor OS',
                    ];
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="line"
                  formatter={(value) => {
                    if (value === 'percentual') return 'Percentual Anual';
                    if (value === 'meta') return 'Meta (4%)';
                    return value;
                  }}
                />
                <ReferenceLine
                  y={data.metaPercentual}
                  stroke={theme.colors.warning}
                  strokeDasharray="5 5"
                  label={{ value: 'Meta 4%', position: 'topRight', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="percentual"
                  stroke={percentualColor}
                  strokeWidth={3}
                  dot={{ fill: percentualColor, r: 5 }}
                  activeDot={{ r: 7 }}
                  name="percentual"
                />
                <Line
                  type="monotone"
                  dataKey="meta"
                  stroke={theme.colors.gray[400]}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="meta"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {evolutionLoading && (
            <div style={{ textAlign: 'center', padding: theme.spacing.md }}>
              <p style={{ color: theme.colors.gray[600], fontSize: '14px' }}>
                Carregando evolução...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

