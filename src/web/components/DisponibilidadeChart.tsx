// src/web/components/DisponibilidadeChart.tsx
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Series {
  name: string;
  data: { label: string; value: number }[];
}

export default function DisponibilidadeChart({ series }: { series: Series[] }) {
  // "series" pré-agregadas por equipamento; cada entry: {label: '2025-05', value: 99.2}
  const flat = series.flatMap((s) =>
    s.data.map((d) => ({ name: s.name, label: d.label, value: d.value }))
  );

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={flat}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis domain={[0, 100]} unit="%" />
        <Tooltip />
        <Line type="monotone" dataKey="value" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

