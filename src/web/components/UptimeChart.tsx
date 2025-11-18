import React from 'react';
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

interface UptimeDataPoint {
  year: number;
  month: number;
  uptimePercent: number;
  mesNome?: string;
}

interface UptimeChartProps {
  data: UptimeDataPoint[];
  title?: string;
  targetPercent?: number;
  showIndividualLines?: boolean;
  individualData?: Record<string, UptimeDataPoint[]>;
}

export default function UptimeChart({
  data,
  title = 'Evolução de Uptime',
  targetPercent = 98,
  showIndividualLines = false,
  individualData,
}: UptimeChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    mesNome: new Date(item.year, item.month - 1).toLocaleDateString('pt-BR', {
      month: 'short',
    }),
    uptime: Number(item.uptimePercent.toFixed(2)),
  }));

  const getUptimeColor = (value: number) => {
    if (value >= targetPercent) return theme.colors.success;
    if (value >= targetPercent - 2) return theme.colors.warning;
    return theme.colors.danger;
  };

  return (
    <div
      style={{
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        boxShadow: theme.shadows.md,
      }}
    >
      {title && (
        <h3
          style={{
            margin: `0 0 ${theme.spacing.md} 0`,
            fontSize: '18px',
            fontWeight: 600,
            color: theme.colors.dark,
          }}
        >
          {title}
        </h3>
      )}
      <div style={{ width: '100%', height: '400px', marginTop: theme.spacing.md }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.gray[200]} />
            <XAxis
              dataKey="mesNome"
              stroke={theme.colors.gray[600]}
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke={theme.colors.gray[600]}
              style={{ fontSize: '12px' }}
              domain={[0, 100]}
              label={{
                value: 'Uptime (%)',
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
              formatter={(value: number) => [`${value.toFixed(2)}%`, 'Uptime']}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
              formatter={(value) => {
                if (value === 'uptime') return 'Uptime Agregado';
                if (value === 'target') return `Meta (${targetPercent}%)`;
                return value;
              }}
            />
            <ReferenceLine
              y={targetPercent}
              stroke={theme.colors.warning}
              strokeDasharray="5 5"
              label={{ value: `Meta ${targetPercent}%`, position: 'topRight', fontSize: '12px' }}
            />
            <Line
              type="monotone"
              dataKey="uptime"
              stroke={theme.colors.primary}
              strokeWidth={3}
              dot={{ fill: theme.colors.primary, r: 5 }}
              activeDot={{ r: 7 }}
              name="uptime"
            />
            {showIndividualLines &&
              individualData &&
              Object.entries(individualData).map(([tag, points], idx) => {
                const colors = [
                  theme.colors.secondary,
                  theme.colors.accent,
                  theme.colors.info,
                  theme.colors.danger,
                ];
                const color = colors[idx % colors.length];
                return (
                  <Line
                    key={tag}
                    type="monotone"
                    dataKey={(item: any) => {
                      const point = points.find(
                        (p) => p.year === item.year && p.month === item.month
                      );
                      return point ? point.uptimePercent : null;
                    }}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ fill: color, r: 3 }}
                    name={tag}
                    connectNulls={false}
                  />
                );
              })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

