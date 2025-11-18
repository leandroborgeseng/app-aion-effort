import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiActivity, FiClock, FiCheckCircle, FiAlertTriangle, FiStar, FiTrendingUp } from 'react-icons/fi';
import StatCard from '../components/StatCard';
import UptimeChart from '../components/UptimeChart';
import { theme } from '../styles/theme';
import { usePermissions } from '../hooks/usePermissions';
import type { EquipamentoDTO } from '../../types/effort';

export default function CriticosPage() {
  const { isAdmin, allowedSectors } = usePermissions();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Construir query string para setores se não for admin
  const setoresQuery = !isAdmin && allowedSectors.length > 0
    ? allowedSectors.join(',')
    : undefined;

  const { data: kpiData, isLoading: kpiLoading, error: kpiError } = useQuery({
    queryKey: ['critical-kpi', selectedYear, setoresQuery],
    queryFn: async () => {
      const url = setoresQuery
        ? `/api/ecm/critical/kpi?year=${selectedYear}&setores=${setoresQuery}`
        : `/api/ecm/critical/kpi?year=${selectedYear}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro ao buscar KPIs');
      return res.json();
    },
  });

  const { data: equipamentosCriticos, isLoading: equipLoading, error: equipError } = useQuery<
    (EquipamentoDTO & {
      IsCritical?: boolean;
      ValorGasto?: string;
      QuantidadeOS?: number;
      UptimeMedio?: number;
      UptimeKpis?: any[];
    })[]
  >({
    queryKey: ['critical-equipamentos', selectedYear, setoresQuery],
    queryFn: async () => {
      const url = setoresQuery
        ? `/api/ecm/critical/equipamentos?year=${selectedYear}&setores=${setoresQuery}`
        : `/api/ecm/critical/equipamentos?year=${selectedYear}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro ao buscar equipamentos críticos');
      return res.json();
    },
  });

  const { data: aggregatedUptime, isLoading: uptimeLoading } = useQuery({
    queryKey: ['critical-uptime-aggregated', selectedYear, setoresQuery],
    queryFn: async () => {
      const url = setoresQuery
        ? `/api/ecm/critical/uptime/aggregated?year=${selectedYear}&setores=${setoresQuery}`
        : `/api/ecm/critical/uptime/aggregated?year=${selectedYear}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro ao buscar uptime agregado');
      return res.json();
    },
  });

  const isLoading = kpiLoading || equipLoading || uptimeLoading;
  const error = kpiError || equipError;

  if (isLoading) {
    return (
      <div style={{ padding: theme.spacing.xl, textAlign: 'center' }}>
        <p style={{ color: theme.colors.gray[600] }}>Carregando dados...</p>
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

  const disponibilidade = kpiData?.mediaDisponibilidade || 0;
  const slaAtendimento = kpiData?.mediaSlaAtendimento || 0;
  const slaSolucao = kpiData?.mediaSlaSolucao || 0;

  /**
   * Converte valor monetário brasileiro (ex: "4.500,00") para número
   */
  const parseBrazilianCurrency = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    let cleaned = value.trim().replace(/[^\d,.-]/g, '');
    if (!cleaned.includes(',')) {
      return parseFloat(cleaned) || 0;
    }
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const formatCurrency = (value: string) => {
    if (!value) return '-';
    const numValue = parseBrazilianCurrency(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(numValue);
  };

  const getStatusColor = (value: number, threshold: number = 95) => {
    if (value >= threshold) return theme.colors.success;
    if (value >= threshold - 3) return theme.colors.warning;
    return theme.colors.danger;
  };

  // Calcular uptime médio agregado
  const uptimeMedioAgregado =
    aggregatedUptime && aggregatedUptime.length > 0
      ? aggregatedUptime.reduce((acc: number, item: any) => acc + item.uptimePercent, 0) /
        aggregatedUptime.length
      : null;

  // Preparar dados individuais para o gráfico
  const individualUptimeData: Record<string, any[]> = {};
  equipamentosCriticos?.forEach((eq: any) => {
    if (eq.UptimeKpis && eq.UptimeKpis.length > 0) {
      individualUptimeData[eq.Tag] = eq.UptimeKpis.map((kpi: any) => ({
        year: kpi.year,
        month: kpi.month,
        uptimePercent: kpi.uptimePercent,
      }));
    }
  });

  return (
    <div style={{ padding: theme.spacing.xl, maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: theme.spacing.lg }}>
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
          <FiAlertTriangle size={32} color={theme.colors.warning} />
          Equipamentos Críticos &amp; SLA
        </h1>
        <p style={{ color: theme.colors.gray[600], margin: 0 }}>
          Monitoramento de desempenho e disponibilidade
        </p>
      </div>

      {/* Seletor de Ano */}
      <div style={{ marginBottom: theme.spacing.md }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            fontSize: '14px',
            color: theme.colors.gray[700],
            fontWeight: 500,
          }}
        >
          Ano:
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              borderRadius: theme.borderRadius.sm,
              border: `1px solid ${theme.colors.gray[300]}`,
              fontSize: '14px',
              backgroundColor: theme.colors.white,
            }}
          >
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: theme.spacing.lg,
          marginBottom: theme.spacing.xl,
        }}
      >
        <StatCard
          title="Uptime Médio Agregado"
          value={
            uptimeMedioAgregado !== null
              ? `${uptimeMedioAgregado.toFixed(2)}%`
              : 'N/A'
          }
          icon={FiTrendingUp}
          color={
            uptimeMedioAgregado !== null
              ? getStatusColor(uptimeMedioAgregado, 98)
              : theme.colors.gray[400]
          }
          subtitle="Meta: ≥ 98%"
        />
        <StatCard
          title="Disponibilidade Média"
          value={`${disponibilidade.toFixed(1)}%`}
          icon={FiActivity}
          color={getStatusColor(disponibilidade, 98)}
          subtitle="Meta: ≥ 98%"
        />
        <StatCard
          title="SLA Atendimento"
          value={`${slaAtendimento.toFixed(1)}%`}
          icon={FiClock}
          color={getStatusColor(slaAtendimento)}
          subtitle="No prazo"
        />
        <StatCard
          title="SLA Solução"
          value={`${slaSolucao.toFixed(1)}%`}
          icon={FiCheckCircle}
          color={getStatusColor(slaSolucao)}
          subtitle="No prazo"
        />
      </div>

      {/* Gráfico de Evolução de Uptime */}
      {aggregatedUptime && aggregatedUptime.length > 0 && (
        <div style={{ marginBottom: theme.spacing.xl }}>
          <UptimeChart
            data={aggregatedUptime}
            title={`Evolução de Uptime Agregado - ${selectedYear}`}
            targetPercent={98}
            showIndividualLines={Object.keys(individualUptimeData).length > 0}
            individualData={individualUptimeData}
          />
        </div>
      )}

      {/* Equipamentos Críticos Marcados */}
      {equipamentosCriticos && equipamentosCriticos.length > 0 ? (
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            boxShadow: theme.shadows.md,
            marginBottom: theme.spacing.xl,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: theme.spacing.md, color: theme.colors.dark }}>
            Equipamentos Críticos ({equipamentosCriticos.length})
          </h3>
          <div style={{ display: 'grid', gap: theme.spacing.md }}>
            {equipamentosCriticos.map((eq: any) => (
              <div
                key={eq.Id}
                style={{
                  padding: theme.spacing.md,
                  border: `1px solid ${theme.colors.gray[200]}`,
                  borderRadius: theme.borderRadius.md,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: `${theme.colors.warning}05`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                    <FiStar size={18} color={theme.colors.warning} fill={theme.colors.warning} />
                    <p style={{ margin: 0, fontWeight: 600, color: theme.colors.dark }}>
                      {eq.Tag} - {eq.Equipamento}
                    </p>
                  </div>
                  <p
                    style={{
                      margin: `${theme.spacing.xs} 0 0 0`,
                      fontSize: '14px',
                      color: theme.colors.gray[600],
                    }}
                  >
                    {eq.Fabricante} {eq.Modelo} | {eq.Setor}
                  </p>
                  {eq.UptimeMedio !== null && eq.UptimeMedio !== undefined && (
                    <p
                      style={{
                        margin: `${theme.spacing.xs} 0 0 0`,
                        fontSize: '14px',
                        color: getStatusColor(eq.UptimeMedio, 98),
                        fontWeight: 600,
                      }}
                    >
                      Uptime Médio: {eq.UptimeMedio.toFixed(2)}%
                    </p>
                  )}
                  {eq.ValorGasto && parseBrazilianCurrency(eq.ValorGasto) > 0 && (
                    <p
                      style={{
                        margin: `${theme.spacing.xs} 0 0 0`,
                        fontSize: '13px',
                        color: theme.colors.danger,
                        fontWeight: 500,
                      }}
                    >
                      Valor Gasto: {formatCurrency(eq.ValorGasto)} ({eq.QuantidadeOS || 0} OS)
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: theme.colors.gray[500] }}>
                    Criticidade: {eq.Criticidade || '-'}
                  </p>
                  {eq.ValorDeSubstituicao && (
                    <p
                      style={{
                        margin: `${theme.spacing.xs} 0 0 0`,
                        fontSize: '12px',
                        color: theme.colors.gray[500],
                      }}
                    >
                      Substituição: {formatCurrency(eq.ValorDeSubstituicao)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            boxShadow: theme.shadows.md,
            textAlign: 'center',
            marginBottom: theme.spacing.xl,
          }}
        >
          <FiStar size={48} color={theme.colors.gray[300]} style={{ marginBottom: theme.spacing.md }} />
          <p style={{ margin: 0, color: theme.colors.gray[600], fontSize: '16px' }}>
            Nenhum equipamento marcado como crítico
          </p>
          <p style={{ margin: `${theme.spacing.xs} 0 0 0`, color: theme.colors.gray[500], fontSize: '14px' }}>
            Marque equipamentos como críticos na página de Inventário
          </p>
        </div>
      )}
    </div>
  );
}
