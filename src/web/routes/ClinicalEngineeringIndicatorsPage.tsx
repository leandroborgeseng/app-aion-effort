import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiActivity, FiTrendingUp, FiClock, FiPackage, FiAlertCircle, FiCheckCircle, FiBarChart2, FiRefreshCw, FiClipboard } from 'react-icons/fi';
import { theme } from '../styles/theme';
import { usePermissions } from '../hooks/usePermissions';
import { useIsMobile } from '../hooks/useMediaQuery';
import { getResponsivePadding } from '../utils/responsive';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface ClinicalEngineeringIndicators {
  disponibilidade: {
    totalEquipamentos: number;
    disponivel: number;
    emManutencao: number;
    percentual: number;
  };
  ordensServico: {
    total: number;
    abertas: number;
    fechadas: number;
  };
  distribuicaoTipo: Record<string, number>;
  distribuicaoSituacao: Record<string, number>;
  distribuicaoSetor: Record<string, number>;
  tempoMedioManutencao: number;
  osFechadasPorTempo: {
    ate24h: number;
    ate1Semana: number;
    ate1Mes: number;
    maisDe1Mes: number;
  };
  topEquipamentos: Array<{ nome: string; count: number }>;
  periodo: string;
  ano: number;
  setoresFiltrados: number[] | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function ClinicalEngineeringIndicatorsPage() {
  const { isAdmin, allowedSectors } = usePermissions();
  const isMobile = useIsMobile();
  const padding = getResponsivePadding(isMobile, false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState<'AnoCorrente' | 'MesCorrente' | 'Todos'>('AnoCorrente');
  const [selectedOficina, setSelectedOficina] = useState<string>('Todas');

  const setoresQuery = !isAdmin && allowedSectors.length > 0
    ? allowedSectors.join(',')
    : undefined;

  // Buscar oficinas habilitadas para o filtro
  const { data: oficinasHabilitadas } = useQuery<Array<{ id: string; key: string; value: string; active: boolean }>>({
    queryKey: ['workshops-enabled'],
    queryFn: async () => {
      const res = await fetch('/api/config/workshops/enabled');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data, isLoading, error, refetch } = useQuery<ClinicalEngineeringIndicators>({
    queryKey: ['clinical-engineering-indicators', selectedYear, selectedPeriod, setoresQuery, selectedOficina],
    queryFn: async () => {
      const params = new URLSearchParams({
        ano: selectedYear.toString(),
        periodo: selectedPeriod,
        forceRefresh: 'true', // Sempre forçar refresh para garantir dados atualizados com filtro de oficinas
      });
      if (setoresQuery) {
        params.append('setores', setoresQuery);
      }
      if (selectedOficina && selectedOficina !== 'Todas') {
        params.append('oficina', selectedOficina);
      }
      const res = await fetch(`/api/ecm/indicators/clinical-engineering?${params.toString()}`);
      if (!res.ok) throw new Error('Erro ao buscar indicadores');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div style={{ padding, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding }}>
        <ErrorMessage message="Erro ao carregar indicadores de engenharia clínica" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Preparar dados para gráficos
  const distribuicaoTipoData = Object.entries(data.distribuicaoTipo).map(([name, value]) => ({
    name: name.length > 20 ? name.substring(0, 20) + '...' : name,
    value,
  }));

  const distribuicaoSituacaoData = Object.entries(data.distribuicaoSituacao).map(([name, value]) => ({
    name,
    value,
  }));

  const distribuicaoSetorData = Object.entries(data.distribuicaoSetor)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, value]) => ({
      name: name.length > 25 ? name.substring(0, 25) + '...' : name,
      value,
    }));

  const topEquipamentosData = data.topEquipamentos.map((item) => ({
    name: item.nome.length > 25 ? item.nome.substring(0, 25) + '...' : item.nome,
    OS: item.count,
  }));

  // Dados para gráfico de OS fechadas por tempo
  const osFechadasPorTempoData = [
    { name: 'Até 24h', value: data.osFechadasPorTempo.ate24h, color: COLORS[0] },
    { name: 'Até 1 semana', value: data.osFechadasPorTempo.ate1Semana, color: COLORS[1] },
    { name: 'Até 1 mês', value: data.osFechadasPorTempo.ate1Mes, color: COLORS[2] },
    { name: 'Mais de 1 mês', value: data.osFechadasPorTempo.maisDe1Mes, color: COLORS[3] },
  ];

  return (
    <div style={{ padding, backgroundColor: theme.colors.gray[50], minHeight: '100vh' }}>
      {/* Cabeçalho */}
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          marginBottom: theme.spacing.lg,
          boxShadow: theme.shadows.md,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.md }}>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: isMobile ? '24px' : '32px',
                fontWeight: 700,
                color: theme.colors.dark,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
              }}
            >
              <FiActivity size={isMobile ? 24 : 32} color={theme.colors.primary} />
              Indicadores de Engenharia Clínica
            </h1>
            <p style={{ margin: `${theme.spacing.xs} 0 0 0`, color: theme.colors.gray[600], fontSize: '14px' }}>
              KPIs e métricas de desempenho da engenharia clínica
            </p>
          </div>
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', color: theme.colors.gray[700], fontWeight: 500 }}>
              Oficina:
            </label>
            <select
              value={selectedOficina}
              onChange={(e) => setSelectedOficina(e.target.value)}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.gray[300]}`,
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: theme.colors.white,
                minWidth: '200px',
              }}
            >
              <option value="Todas">Todas as Oficinas</option>
              {oficinasHabilitadas?.map((oficina) => (
                <option key={oficina.id} value={oficina.key}>
                  {oficina.key}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.gray[300]}`,
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: theme.colors.white,
              }}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.gray[300]}`,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <option value="AnoCorrente">Ano Corrente</option>
              <option value="MesCorrente">Mês Corrente</option>
              <option value="Todos">Todos</option>
            </select>
            <button
              onClick={() => refetch()}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.primary}`,
                backgroundColor: theme.colors.primary,
                color: theme.colors.white,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                fontWeight: 600,
              }}
            >
              <FiRefreshCw size={16} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Indicadores Principais */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
        }}
      >
        {/* Disponibilidade */}
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            boxShadow: theme.shadows.md,
            borderLeft: `4px solid ${theme.colors.success}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
            <FiCheckCircle size={24} color={theme.colors.success} />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: theme.colors.gray[600] }}>
              Disponibilidade
            </h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: theme.colors.dark, marginBottom: theme.spacing.xs }}>
            {data.disponibilidade.percentual.toFixed(1)}%
          </div>
          <div style={{ fontSize: '13px', color: theme.colors.gray[600] }}>
            {data.disponibilidade.disponivel} de {data.disponibilidade.totalEquipamentos} equipamentos disponíveis
          </div>
          {data.disponibilidade.emManutencao > 0 && (
            <div style={{ fontSize: '12px', color: theme.colors.warning, marginTop: theme.spacing.xs }}>
              {data.disponibilidade.emManutencao} em manutenção
            </div>
          )}
        </div>

        {/* Total de OS */}
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            boxShadow: theme.shadows.md,
            borderLeft: `4px solid ${theme.colors.primary}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
            <FiClipboard size={24} color={theme.colors.primary} />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: theme.colors.gray[600] }}>
              Ordens de Serviço
            </h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: theme.colors.dark, marginBottom: theme.spacing.xs }}>
            {data.ordensServico.total.toLocaleString('pt-BR')}
          </div>
          <div style={{ fontSize: '13px', color: theme.colors.gray[600] }}>
            {data.ordensServico.abertas} abertas • {data.ordensServico.fechadas} fechadas
          </div>
        </div>

        {/* Tempo Médio */}
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            boxShadow: theme.shadows.md,
            borderLeft: `4px solid ${theme.colors.info}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
            <FiClock size={24} color={theme.colors.info} />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: theme.colors.gray[600] }}>
              Tempo Médio de Manutenção
            </h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: theme.colors.dark, marginBottom: theme.spacing.xs }}>
            {data.tempoMedioManutencao.toFixed(1)} dias
          </div>
          <div style={{ fontSize: '13px', color: theme.colors.gray[600] }}>
            Tempo médio entre abertura e fechamento
          </div>
        </div>

        {/* Equipamentos em Manutenção */}
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            boxShadow: theme.shadows.md,
            borderLeft: `4px solid ${theme.colors.warning}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
            <FiAlertCircle size={24} color={theme.colors.warning} />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: theme.colors.gray[600] }}>
              Equipamentos em Manutenção
            </h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: theme.colors.dark, marginBottom: theme.spacing.xs }}>
            {data.disponibilidade.emManutencao}
          </div>
          <div style={{ fontSize: '13px', color: theme.colors.gray[600] }}>
            {((data.disponibilidade.emManutencao / data.disponibilidade.totalEquipamentos) * 100).toFixed(1)}% do total
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
        }}
      >
        {/* OS Fechadas por Tempo de Duração */}
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            boxShadow: theme.shadows.md,
          }}
        >
          <h3 style={{ margin: `0 0 ${theme.spacing.lg} 0`, fontSize: '18px', fontWeight: 600, color: theme.colors.dark }}>
            OS Fechadas por Tempo de Duração
          </h3>
          {osFechadasPorTempoData.some(item => item.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={osFechadasPorTempoData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {osFechadasPorTempoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value} OS`, 'Quantidade']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
              Nenhum dado disponível
            </div>
          )}
        </div>

        {/* Distribuição por Tipo */}
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            boxShadow: theme.shadows.md,
          }}
        >
          <h3 style={{ margin: `0 0 ${theme.spacing.lg} 0`, fontSize: '18px', fontWeight: 600, color: theme.colors.dark }}>
            Distribuição de OS por Tipo
          </h3>
          {distribuicaoTipoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distribuicaoTipoData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distribuicaoTipoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
              Nenhum dado disponível
            </div>
          )}
        </div>

        {/* Distribuição por Situação */}
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            boxShadow: theme.shadows.md,
          }}
        >
          <h3 style={{ margin: `0 0 ${theme.spacing.lg} 0`, fontSize: '18px', fontWeight: 600, color: theme.colors.dark }}>
            Distribuição de OS por Situação
          </h3>
          {distribuicaoSituacaoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distribuicaoSituacaoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={theme.colors.primary} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
              Nenhum dado disponível
            </div>
          )}
        </div>

        {/* OS por Setor */}
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            boxShadow: theme.shadows.md,
          }}
        >
          <h3 style={{ margin: `0 0 ${theme.spacing.lg} 0`, fontSize: '18px', fontWeight: 600, color: theme.colors.dark }}>
            Top 10 Setores com Mais OS
          </h3>
          {distribuicaoSetorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distribuicaoSetorData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="value" fill={theme.colors.info} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
              Nenhum dado disponível
            </div>
          )}
        </div>

        {/* Top Equipamentos */}
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            boxShadow: theme.shadows.md,
          }}
        >
          <h3 style={{ margin: `0 0 ${theme.spacing.lg} 0`, fontSize: '18px', fontWeight: 600, color: theme.colors.dark }}>
            Top 5 Equipamentos com Mais OS
          </h3>
          {topEquipamentosData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topEquipamentosData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="OS" fill={theme.colors.warning} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
              Nenhum dado disponível
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
