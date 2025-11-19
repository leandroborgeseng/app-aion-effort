import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiBell, FiCheck, FiX, FiEye, FiAlertCircle } from 'react-icons/fi';
import { theme } from '../styles/theme';
import { formatBrazilianDate } from '../utils/dateUtils';

interface Alert {
  id: string;
  effortId: number;
  tag: string;
  equipamento: string;
  osCodigo: string;
  osCodigoSerial: number;
  tipo: 'os_aberta' | 'os_atrasada' | 'manutencao_preventiva';
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  mensagem: string;
  dataAbertura: string;
  situacao: 'pendente' | 'visualizada' | 'resolvida';
  visualizadaEm?: string;
  resolvidaEm?: string;
  createdAt: string;
}

export default function AlertsPage() {
  const [filterSituacao, setFilterSituacao] = useState<'todos' | 'pendente' | 'visualizada' | 'resolvida'>('todos');
  const [filterPrioridade, setFilterPrioridade] = useState<'todos' | 'baixa' | 'media' | 'alta' | 'critica'>('todos');
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery<Alert[]>({
    queryKey: ['alerts', filterSituacao, filterPrioridade],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterSituacao !== 'todos') params.append('situacao', filterSituacao);
      if (filterPrioridade !== 'todos') params.append('prioridade', filterPrioridade);
      const res = await fetch(`/api/ecm/alerts?${params.toString()}`);
      if (!res.ok) throw new Error('Erro ao buscar alertas');
      return res.json();
    },
  });

  const { data: alertsCount } = useQuery({
    queryKey: ['alerts-count'],
    queryFn: async () => {
      const res = await fetch('/api/ecm/alerts/count');
      if (!res.ok) throw new Error('Erro ao buscar contagem');
      return res.json();
    },
  });

  const markViewedMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const res = await fetch(`/api/ecm/alerts/${alertId}/view`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user' }),
      });
      if (!res.ok) throw new Error('Erro ao marcar como visualizado');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-count'] });
    },
  });

  const markResolvedMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const res = await fetch(`/api/ecm/alerts/${alertId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user' }),
      });
      if (!res.ok) throw new Error('Erro ao marcar como resolvido');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-count'] });
    },
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return formatBrazilianDate(dateStr);
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'critica':
        return theme.colors.danger;
      case 'alta':
        return theme.colors.warning;
      case 'media':
        return theme.colors.info;
      case 'baixa':
        return theme.colors.gray[500];
      default:
        return theme.colors.gray[400];
    }
  };

  const getSituacaoColor = (situacao: string) => {
    switch (situacao) {
      case 'pendente':
        return theme.colors.warning;
      case 'visualizada':
        return theme.colors.info;
      case 'resolvida':
        return theme.colors.success;
      default:
        return theme.colors.gray[400];
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: theme.spacing.md, textAlign: 'center' }}>
        <p style={{ color: theme.colors.gray[600] }}>Carregando alertas...</p>
      </div>
    );
  }

  const pendentes = alerts?.filter((a) => a.situacao === 'pendente').length || 0;

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
          <FiBell size={28} color={theme.colors.warning} />
          Alertas
        </h1>
        <p style={{ color: theme.colors.gray[600], margin: 0, fontSize: '14px' }}>
          Alertas de equipamentos monitorados
        </p>
      </div>

      {/* Card de resumo */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: theme.spacing.md,
          marginBottom: theme.spacing.lg,
        }}
      >
        <div
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            borderLeft: `4px solid ${theme.colors.warning}`,
          }}
        >
          <p style={{ margin: 0, fontSize: '12px', color: theme.colors.gray[600] }}>
            Pendentes
          </p>
          <h3
            style={{
              margin: `${theme.spacing.xs} 0 0 0`,
              fontSize: '28px',
              fontWeight: 700,
              color: theme.colors.warning,
            }}
          >
            {pendentes}
          </h3>
        </div>
        <div
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
          }}
        >
          <p style={{ margin: 0, fontSize: '12px', color: theme.colors.gray[600] }}>
            Total
          </p>
          <h3 style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '28px', fontWeight: 700 }}>
            {alerts?.length || 0}
          </h3>
        </div>
      </div>

      {/* Filtros */}
      <div
        style={{
          backgroundColor: theme.colors.white,
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          boxShadow: theme.shadows.sm,
          marginBottom: theme.spacing.md,
          display: 'flex',
          gap: theme.spacing.md,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: theme.colors.gray[600],
              marginBottom: theme.spacing.xs,
            }}
          >
            Situação
          </label>
          <select
            value={filterSituacao}
            onChange={(e) =>
              setFilterSituacao(e.target.value as 'todos' | 'pendente' | 'visualizada' | 'resolvida')
            }
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${theme.colors.gray[300]}`,
              fontSize: '13px',
              backgroundColor: theme.colors.white,
            }}
          >
            <option value="todos">Todos</option>
            <option value="pendente">Pendentes</option>
            <option value="visualizada">Visualizados</option>
            <option value="resolvida">Resolvidos</option>
          </select>
        </div>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: theme.colors.gray[600],
              marginBottom: theme.spacing.xs,
            }}
          >
            Prioridade
          </label>
          <select
            value={filterPrioridade}
            onChange={(e) =>
              setFilterPrioridade(
                e.target.value as 'todos' | 'baixa' | 'media' | 'alta' | 'critica'
              )
            }
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              borderRadius: theme.borderRadius.sm,
              border: `1px solid ${theme.colors.gray[300]}`,
              fontSize: '13px',
              backgroundColor: theme.colors.white,
            }}
          >
            <option value="todos">Todas</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
        </div>
      </div>

      {/* Lista de alertas */}
      {alerts && alerts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                backgroundColor: theme.colors.white,
                padding: theme.spacing.md,
                borderRadius: theme.borderRadius.md,
                boxShadow: theme.shadows.sm,
                borderLeft: `4px solid ${getPrioridadeColor(alert.prioridade)}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                    <FiAlertCircle
                      size={20}
                      color={getPrioridadeColor(alert.prioridade)}
                      fill={getPrioridadeColor(alert.prioridade)}
                    />
                    <p style={{ margin: 0, fontWeight: 600, color: theme.colors.dark }}>
                      {alert.mensagem}
                    </p>
                    <span
                      style={{
                        padding: `2px ${theme.spacing.xs}`,
                        borderRadius: theme.borderRadius.sm,
                        backgroundColor: `${getPrioridadeColor(alert.prioridade)}20`,
                        color: getPrioridadeColor(alert.prioridade),
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}
                    >
                      {alert.prioridade}
                    </span>
                    <span
                      style={{
                        padding: `2px ${theme.spacing.xs}`,
                        borderRadius: theme.borderRadius.sm,
                        backgroundColor: `${getSituacaoColor(alert.situacao)}20`,
                        color: getSituacaoColor(alert.situacao),
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}
                    >
                      {alert.situacao}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: `${theme.spacing.xs} 0 0 0`,
                      fontSize: '13px',
                      color: theme.colors.gray[600],
                    }}
                  >
                    Equipamento: <strong>{alert.tag}</strong> - {alert.equipamento} | OS:{' '}
                    <strong>{alert.osCodigo}</strong>
                  </p>
                  <p
                    style={{
                      margin: `${theme.spacing.xs} 0 0 0`,
                      fontSize: '12px',
                      color: theme.colors.gray[500],
                    }}
                  >
                    Abertura: {formatDate(alert.dataAbertura)} | Criado: {formatDate(alert.createdAt)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: theme.spacing.xs }}>
                  {alert.situacao === 'pendente' && (
                    <button
                      onClick={() => markViewedMutation.mutate(alert.id)}
                      style={{
                        padding: theme.spacing.xs,
                        borderRadius: theme.borderRadius.sm,
                        border: `1px solid ${theme.colors.info}`,
                        backgroundColor: theme.colors.white,
                        color: theme.colors.info,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Marcar como visualizado"
                    >
                      <FiEye size={16} />
                    </button>
                  )}
                  {alert.situacao !== 'resolvida' && (
                    <button
                      onClick={() => markResolvedMutation.mutate(alert.id)}
                      style={{
                        padding: theme.spacing.xs,
                        borderRadius: theme.borderRadius.sm,
                        border: `1px solid ${theme.colors.success}`,
                        backgroundColor: theme.colors.white,
                        color: theme.colors.success,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Marcar como resolvido"
                    >
                      <FiCheck size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.xl,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            textAlign: 'center',
          }}
        >
          <FiBell size={48} color={theme.colors.gray[300]} style={{ marginBottom: theme.spacing.md }} />
          <p style={{ margin: 0, color: theme.colors.gray[600], fontSize: '16px' }}>
            Nenhum alerta encontrado
          </p>
        </div>
      )}
    </div>
  );
}

