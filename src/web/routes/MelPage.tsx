// src/web/routes/MelPage.tsx
// Página para gerenciamento de MEL (Minimum Equipment List)

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiEdit,
  FiPlus,
  FiTrash2,
  FiRefreshCw,
  FiSave,
  FiX,
  FiList,
  FiBarChart2,
  FiCheckSquare,
  FiSquare,
  FiToggleLeft,
  FiToggleRight,
  FiChevronDown,
  FiChevronUp,
  FiFilter,
} from 'react-icons/fi';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { EquipamentoDTO } from '../../types/effort';
import { theme } from '../styles/theme';
import { usePermissions } from '../hooks/usePermissions';
import { useIsMobile } from '../hooks/useMediaQuery';
import { getResponsivePadding } from '../utils/responsive';
import { apiClient } from '../lib/apiClient';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import SkeletonScreen from '../components/SkeletonScreen';
import ConfirmationDialog from '../components/ConfirmationDialog';
import toast from 'react-hot-toast';

interface Sector {
  id: number;
  name: string;
}

interface EquipmentGroup {
  key: string;
  name: string;
  patterns: string[];
}

interface EquipmentGroupWithData {
  equipmentGroupKey: string;
  equipmentGroupName: string;
  quantidade: number;
  indisponiveis: number;
  disponiveis: number;
  minimumQuantity: number | null;
  emAlerta: boolean;
  equipamentos: Array<{
    id: number;
    tag: string;
    equipamento: string;
    modelo: string;
    fabricante: string;
    status: string;
  }>;
}

interface MelItem {
  equipmentGroupKey: string;
  equipmentGroupName: string;
  minimumQuantity: number;
  totalNoSetor: number;
  indisponiveis: number;
  disponiveis: number;
  emAlerta: boolean;
}

interface MelSectorData {
  success: boolean;
  sectorId: number;
  sectorName: string;
  items: MelItem[];
  totalItems: number;
  itemsEmAlerta: number;
}

interface MelSectorEquipmentsData {
  success: boolean;
  sectorId: number;
  sectorName: string;
  grupos: EquipmentGroupWithData[];
}

interface MelAlert {
  id: string;
  sectorId: number;
  sectorName: string;
  equipmentGroupKey: string;
  equipmentGroupName: string;
  currentAvailable: number;
  minimumQuantity: number;
  totalInSector: number;
  unavailableCount: number;
  status: string;
  resolvedAt?: string;
  createdAt: string;
}

interface MelSummary {
  success: boolean;
  totalSetoresComMel: number;
  totalSetoresComProblema: number;
  totalAlertasAtivos: number;
  problemasResumo: Array<{
    sectorId: number;
    sectorName: string;
    equipmentGroupName: string;
    disponivel: number;
    minimo: number;
    falta: number;
  }>;
  regrasPorSetor?: Array<{
    sectorId: number;
    sectorName: string;
    regras: Array<{
      id: string;
      equipmentGroupKey: string;
      equipmentGroupName: string;
      minimumQuantity: number;
      active: boolean;
      justificativa?: string | null;
      disponivel?: number;
      total?: number;
      indisponiveis?: number;
      emAlerta: boolean;
    }>;
    totalRegras: number;
    regrasEmAlerta: number;
  }>;
}

export default function MelPage() {
  const { isAdmin, allowedSectors } = usePermissions();
  const isMobile = useIsMobile();
  const padding = getResponsivePadding(isMobile, false);
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    sectorId: number | null;
    equipmentTypeId: string | null; // Mantido para compatibilidade com o componente de confirmação
  }>({
    isOpen: false,
    sectorId: null,
    equipmentTypeId: null,
  });

  // Buscar setores disponíveis
  const { data: sectorsData } = useQuery<{ success: boolean; sectors: Sector[] }>({
    queryKey: ['mel-sectors'],
    queryFn: async () => {
      return apiClient.get<{ success: boolean; sectors: Sector[] }>('/api/ecm/investments/sectors/list');
    },
  });

  const sectors = sectorsData?.sectors || [];
  const filteredSectors = isAdmin
    ? sectors
    : sectors.filter((s) => allowedSectors.includes(s.id));

  // Buscar resumo
  const { data: summaryData, isLoading: summaryLoading } = useQuery<MelSummary>({
    queryKey: ['mel-summary'],
    queryFn: async () => {
      return apiClient.get<MelSummary>('/api/ecm/mel/summary');
    },
  });


  // Mutation para recalcular alertas
  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ecm/mel/recalculate', {
        method: 'POST',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Erro ao recalcular alertas');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Alertas recalculados com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['mel-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['mel-summary'] });
      if (selectedSectorId) {
        queryClient.invalidateQueries({ queryKey: ['mel-sector', selectedSectorId] });
      }
    },
  });


  return (
    <div style={{ padding, minHeight: '100vh', backgroundColor: theme.colors.gray[50] }}>
      {/* Cabeçalho */}
      <div
        style={{
          marginBottom: theme.spacing.lg,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: theme.spacing.md,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              marginBottom: theme.spacing.xs,
              fontSize: isMobile ? '24px' : '28px',
              fontWeight: 700,
              color: theme.colors.dark,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
            }}
          >
            <FiBarChart2 size={28} color={theme.colors.primary} />
            MEL - Minimum Equipment List
          </h1>
          <p style={{ margin: 0, color: theme.colors.gray[600], fontSize: '14px' }}>
            Gestão de quantidade mínima de equipamentos por setor
          </p>
        </div>

        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.colors.success,
              color: theme.colors.white,
              border: 'none',
              borderRadius: theme.borderRadius.md,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            <FiPlus size={16} />
            Criar Regra
          </button>
          <button
            onClick={() => recalculateMutation.mutate()}
            disabled={recalculateMutation.isPending}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.colors.primary,
              color: theme.colors.white,
              border: 'none',
              borderRadius: theme.borderRadius.md,
              cursor: recalculateMutation.isPending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              fontSize: '14px',
              fontWeight: 600,
              opacity: recalculateMutation.isPending ? 0.6 : 1,
            }}
          >
            <FiRefreshCw size={16} />
            {recalculateMutation.isPending ? 'Recalculando...' : 'Recalcular Alertas'}
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <SummaryView 
        data={summaryData} 
        isLoading={summaryLoading}
        onCreateRule={() => setShowCreateModal(true)}
      />

      {/* Modal de criar regra */}
      {showCreateModal && (
        <CreateRuleModal
          sectors={filteredSectors}
          onClose={() => setShowCreateModal(false)}
          queryClient={queryClient}
        />
      )}
    </div>
  );
}

// Componente de visualização de resumo
function SummaryView({ data, isLoading, onCreateRule }: { data?: MelSummary; isLoading: boolean; onCreateRule?: () => void }) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [editingRule, setEditingRule] = useState<{
    id: string;
    sectorId: number;
    sectorName: string;
    equipmentGroupKey: string;
    equipmentGroupName: string;
    minimumQuantity: number;
    justificativa: string;
    active: boolean;
    selectedEquipmentIds?: Set<number>;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; ruleId: string; ruleName: string } | null>(null);

  // Mutation para editar regra
  const editRuleMutation = useMutation({
    mutationFn: async ({
      ruleId,
      equipmentGroupName,
      minimumQuantity,
      justificativa,
      active,
      equipmentIds,
    }: {
      ruleId: string;
      equipmentGroupName?: string;
      minimumQuantity?: number;
      justificativa?: string;
      active?: boolean;
      equipmentIds?: number[];
    }) => {
      return apiClient.patch(`/api/ecm/mel/rule/${ruleId}`, {
        equipmentGroupName,
        minimumQuantity,
        justificativa,
        active,
        equipmentIds,
      });
    },
    onSuccess: () => {
      toast.success('Regra atualizada com sucesso!');
      setEditingRule(null);
      queryClient.invalidateQueries({ queryKey: ['mel-summary'] });
      queryClient.invalidateQueries({ queryKey: ['mel-alerts'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar regra');
    },
  });

  // Mutation para excluir regra
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      return apiClient.delete(`/api/ecm/mel/rule/${ruleId}`);
    },
    onSuccess: () => {
      toast.success('Regra removida com sucesso!');
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: ['mel-summary'] });
      queryClient.invalidateQueries({ queryKey: ['mel-alerts'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover regra');
    },
  });

  // Mutation para ativar/desativar regra
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ ruleId, active }: { ruleId: string; active: boolean }) => {
      return apiClient.patch(`/api/ecm/mel/rule/${ruleId}`, { active });
    },
    onSuccess: (_, variables) => {
      toast.success(`Regra ${variables.active ? 'ativada' : 'desativada'} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['mel-summary'] });
      queryClient.invalidateQueries({ queryKey: ['mel-alerts'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao alterar status da regra');
    },
  });

  // Hooks de estado - DEVEM estar antes dos returns condicionais
  const [showRegras, setShowRegras] = useState(true);
  const [showProblemas, setShowProblemas] = useState(true);
  const [showGrafcos, setShowGrafcos] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativos' | 'inativos' | 'em-alerta'>('todos');

  // Returns condicionais devem vir DEPOIS de todos os hooks
  if (isLoading) {
    return <SkeletonScreen />;
  }

  if (!data) {
    return <ErrorMessage message="Erro ao carregar resumo de MEL" />;
  }

  // Preparar dados para gráficos
  const chartDataPorSetor = data.regrasPorSetor?.map(setor => ({
    name: setor.sectorName.length > 15 ? setor.sectorName.substring(0, 15) + '...' : setor.sectorName,
    regras: setor.totalRegras,
    emAlerta: setor.regrasEmAlerta,
    ok: setor.totalRegras - setor.regrasEmAlerta,
  })) || [];

  const chartDataStatus = [
    { name: 'OK', value: data.regrasPorSetor?.reduce((acc, s) => acc + (s.totalRegras - s.regrasEmAlerta), 0) || 0 },
    { name: 'Em Alerta', value: data.totalAlertasAtivos || 0 },
  ].filter(item => item.value > 0);

  const COLORS = ['#10B981', '#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6'];

  return (
    <div>
      {/* Cards de estatísticas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: theme.spacing.md,
          marginBottom: theme.spacing.lg,
        }}
      >
        <StatCard
          title="Setores com MEL"
          value={data.totalSetoresComMel}
          icon={FiList}
          color={theme.colors.info}
        />
        <StatCard
          title="Setores com Problema"
          value={data.totalSetoresComProblema}
          icon={FiAlertTriangle}
          color={theme.colors.danger}
        />
        <StatCard
          title="Alertas Ativos"
          value={data.totalAlertasAtivos}
          icon={FiAlertTriangle}
          color={theme.colors.warning}
        />
      </div>

      {/* Gráficos - Seção colapsável */}
      {chartDataPorSetor.length > 0 && (
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            boxShadow: theme.shadows.md,
            marginBottom: theme.spacing.lg,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: showGrafcos ? theme.spacing.md : 0,
              cursor: 'pointer',
            }}
            onClick={() => setShowGrafcos(!showGrafcos)}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: theme.colors.dark,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
              }}
            >
              <FiBarChart2 size={20} color={theme.colors.primary} />
              Gráficos e Visualizações
            </h3>
            {showGrafcos ? <FiChevronUp size={24} /> : <FiChevronDown size={24} />}
          </div>
          {showGrafcos && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: theme.spacing.lg,
              }}
            >
              {/* Gráfico de regras por setor */}
              <div
                style={{
                  backgroundColor: theme.colors.gray[50],
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.md,
                }}
              >
                <h4
                  style={{
                    margin: `0 0 ${theme.spacing.sm} 0`,
                    fontSize: '16px',
                    fontWeight: 600,
                    color: theme.colors.dark,
                  }}
                >
                  Regras por Setor
                </h4>
            {chartDataPorSetor.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartDataPorSetor}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ok" stackId="a" fill="#10B981" name="OK" />
                  <Bar dataKey="emAlerta" stackId="a" fill="#EF4444" name="Em Alerta" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
                Nenhum dado disponível
              </div>
            )}
          </div>

          {/* Gráfico de status geral */}
          {chartDataStatus.length > 0 && (
            <div
              style={{
                backgroundColor: theme.colors.white,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                boxShadow: theme.shadows.md,
              }}
            >
              <h3
                style={{
                  margin: `0 0 ${theme.spacing.md} 0`,
                  fontSize: '18px',
                  fontWeight: 600,
                  color: theme.colors.dark,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                }}
              >
                <FiBarChart2 size={20} color={theme.colors.primary} />
                Status Geral
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartDataStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartDataStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lista de regras por setor */}
      {data.regrasPorSetor && data.regrasPorSetor.length > 0 ? (
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            boxShadow: theme.shadows.md,
            marginBottom: theme.spacing.lg,
          }}
        >
          <h2
            style={{
              margin: `0 0 ${theme.spacing.lg} 0`,
              fontSize: '20px',
              fontWeight: 600,
              color: theme.colors.dark,
            }}
          >
            Regras MEL por Setor
          </h2>
          {showRegras && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}>
              {data.regrasPorSetor
                .filter((setor) => {
                  if (filterStatus === 'em-alerta') return setor.regrasEmAlerta > 0;
                  if (filterStatus === 'ativos') return setor.regras.some(r => r.active);
                  if (filterStatus === 'inativos') return setor.regras.some(r => !r.active);
                  return true;
                })
                .map((setor) => (
              <div
                key={setor.sectorId}
                style={{
                  border: `1px solid ${theme.colors.gray[200]}`,
                  borderRadius: theme.borderRadius.md,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    backgroundColor: theme.colors.gray[50],
                    padding: theme.spacing.md,
                    borderBottom: `1px solid ${theme.colors.gray[200]}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: theme.colors.dark }}>
                    {setor.sectorName}
                  </h3>
                  <div style={{ display: 'flex', gap: theme.spacing.md, fontSize: '13px', color: theme.colors.gray[600] }}>
                    <span>
                      {setor.totalRegras} regra{setor.totalRegras !== 1 ? 's' : ''}
                    </span>
                    {setor.regrasEmAlerta > 0 && (
                      <span style={{ color: theme.colors.danger, fontWeight: 600 }}>
                        {setor.regrasEmAlerta} em alerta
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${theme.colors.gray[200]}` }}>
                        <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>
                          Tipo de Equipamento
                        </th>
                        <th style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>
                          Total
                        </th>
                        <th style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>
                          Indisponíveis
                        </th>
                        <th style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>
                          Disponível
                        </th>
                        <th style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>
                          Mínimo
                        </th>
                        <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>
                          Justificativa
                        </th>
                        <th style={{ padding: theme.spacing.sm, textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
                          Status
                        </th>
                        <th style={{ padding: theme.spacing.sm, textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {setor.regras.map((regra, idx) => (
                        <tr
                          key={regra.id || idx}
                          style={{
                            borderBottom: `1px solid ${theme.colors.gray[100]}`,
                            backgroundColor: !regra.active
                              ? theme.colors.gray[50]
                              : regra.emAlerta
                              ? `${theme.colors.danger}05`
                              : 'transparent',
                            opacity: !regra.active ? 0.6 : 1,
                          }}
                        >
                          <td style={{ padding: theme.spacing.sm, fontSize: '13px' }}>
                            {regra.equipmentGroupName}
                            {!regra.active && (
                              <span style={{ marginLeft: theme.spacing.xs, fontSize: '11px', color: theme.colors.gray[500] }}>
                                (Inativa)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '13px' }}>
                            {regra.total ?? '-'}
                          </td>
                          <td style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '13px' }}>
                            {regra.indisponiveis ?? '-'}
                          </td>
                          <td
                            style={{
                              padding: theme.spacing.sm,
                              textAlign: 'right',
                              fontSize: '13px',
                              fontWeight: regra.emAlerta ? 600 : 400,
                              color: regra.emAlerta ? theme.colors.danger : theme.colors.dark,
                            }}
                          >
                            {regra.disponivel ?? '-'}
                          </td>
                          <td style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '13px' }}>
                            {regra.minimumQuantity}
                          </td>
                          <td style={{ padding: theme.spacing.sm, fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={regra.justificativa || undefined}>
                            {regra.justificativa || '-'}
                          </td>
                          <td style={{ padding: theme.spacing.sm, textAlign: 'center' }}>
                            {!regra.active ? (
                              <span style={{ fontSize: '11px', color: theme.colors.gray[500] }}>Inativa</span>
                            ) : regra.emAlerta ? (
                              <FiAlertTriangle size={16} color={theme.colors.danger} title="Em alerta" />
                            ) : (
                              <FiCheckCircle size={16} color={theme.colors.success} title="OK" />
                            )}
                          </td>
                          <td style={{ padding: theme.spacing.sm, textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: theme.spacing.xs, justifyContent: 'center', alignItems: 'center' }}>
                                  <button
                                    onClick={() =>
                                      setEditingRule({
                                        id: regra.id,
                                        sectorId: setor.sectorId,
                                        sectorName: setor.sectorName,
                                        equipmentGroupKey: regra.equipmentGroupKey,
                                        equipmentGroupName: regra.equipmentGroupName,
                                        minimumQuantity: regra.minimumQuantity,
                                        justificativa: regra.justificativa || '',
                                        active: regra.active,
                                        selectedEquipmentIds: new Set(), // Será preenchido ao carregar equipamentos
                                      })
                                    }
                                style={{
                                  padding: theme.spacing.xs,
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: theme.colors.primary,
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                                title="Editar regra"
                              >
                                <FiEdit size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  toggleActiveMutation.mutate({
                                    ruleId: regra.id,
                                    active: !regra.active,
                                  })
                                }
                                style={{
                                  padding: theme.spacing.xs,
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: regra.active ? theme.colors.warning : theme.colors.success,
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                                title={regra.active ? 'Desativar regra' : 'Ativar regra'}
                                disabled={toggleActiveMutation.isPending}
                              >
                                {regra.active ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteConfirm({
                                    isOpen: true,
                                    ruleId: regra.id,
                                    ruleName: regra.equipmentGroupName,
                                  })
                                }
                                style={{
                                  padding: theme.spacing.xs,
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: theme.colors.danger,
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                                title="Excluir regra"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
                ))}
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            textAlign: 'center',
            boxShadow: theme.shadows.md,
            marginBottom: theme.spacing.lg,
          }}
        >
          <FiList size={48} color={theme.colors.gray[400]} style={{ marginBottom: theme.spacing.md }} />
          <p style={{ margin: 0, color: theme.colors.gray[600], fontSize: '16px' }}>
            Nenhuma regra MEL configurada ainda.
          </p>
        </div>
      )}

      {/* Modal de edição de regra com seleção de equipamentos */}
      {editingRule && (
        <EditRuleModal
          editingRule={editingRule}
          onClose={() => setEditingRule(null)}
          editRuleMutation={editRuleMutation}
          queryClient={queryClient}
        />
      )}

      {/* Diálogo de confirmação de exclusão */}
      {deleteConfirm && (
        <ConfirmationDialog
          isOpen={deleteConfirm.isOpen}
          title="Excluir Regra MEL"
          message={`Deseja realmente excluir a regra "${deleteConfirm.ruleName}"? Esta ação não pode ser desfeita.`}
          onConfirm={() => {
            if (deleteConfirm) {
              deleteRuleMutation.mutate(deleteConfirm.ruleId);
            }
          }}
          onCancel={() => setDeleteConfirm(null)}
          confirmText="Excluir"
          cancelText="Cancelar"
        />
      )}

      {/* Lista de problemas - Seção colapsável */}
      {data.problemasResumo.length > 0 && (
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            boxShadow: theme.shadows.md,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: showProblemas ? theme.spacing.md : 0,
              cursor: 'pointer',
            }}
            onClick={() => setShowProblemas(!showProblemas)}
          >
            <h2
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
              <FiAlertTriangle size={20} color={theme.colors.danger} />
              Problemas Ativos ({data.problemasResumo.length})
            </h2>
            {showProblemas ? <FiChevronUp size={24} /> : <FiChevronDown size={24} />}
          </div>
          {showProblemas && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${theme.colors.gray[200]}` }}>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>
                    Setor
                  </th>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>
                    Tipo de Equipamento
                  </th>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '14px', fontWeight: 600 }}>
                    Disponível
                  </th>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '14px', fontWeight: 600 }}>
                    Mínimo
                  </th>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '14px', fontWeight: 600 }}>
                    Falta
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.problemasResumo.map((problema, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: `1px solid ${theme.colors.gray[100]}`,
                    }}
                  >
                    <td style={{ padding: theme.spacing.sm, fontSize: '14px' }}>{problema.sectorName}</td>
                    <td style={{ padding: theme.spacing.sm, fontSize: '14px' }}>
                      {(problema as any).equipmentGroupName || (problema as any).equipmentTypeName}
                    </td>
                    <td style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '14px' }}>
                      {problema.disponivel}
                    </td>
                    <td style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '14px' }}>
                      {problema.minimo}
                    </td>
                    <td
                      style={{
                        padding: theme.spacing.sm,
                        textAlign: 'right',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: theme.colors.danger,
                      }}
                    >
                      {problema.falta}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Componente de visualização por setor
function SectorView({
  sectors,
  selectedSectorId,
  onSelectSector,
  summaryData,
  summaryLoading,
  equipmentsData,
  equipmentsLoading,
  equipmentsError,
  showConfigForm,
  onShowConfigForm,
  onSaveMel,
  onDeleteMel,
  onRefetch,
  onRefetchEquipments,
  isAdmin,
  queryClient,
}: {
  sectors: Sector[];
  selectedSectorId: number | null;
  onSelectSector: (id: number) => void;
  summaryData?: MelSummary;
  summaryLoading: boolean;
  equipmentsData?: MelSectorEquipmentsData;
  equipmentsLoading: boolean;
  equipmentsError: Error | null;
  showConfigForm: boolean;
  onShowConfigForm: (show: boolean) => void;
  onSaveMel: (data: {
    sectorId: number;
    items: Array<{ equipmentGroupKey: string; equipmentGroupName: string; minimumQuantity: number }>;
  }) => void;
  onDeleteMel: (sectorId: number, equipmentGroupKey: string) => void;
  onRefetch: () => void;
  onRefetchEquipments: () => void;
  isAdmin: boolean;
  queryClient: any;
}) {
  // Estados para edição de regras (similar ao SummaryView)
  const [editingRule, setEditingRule] = useState<{
    id: string;
    sectorId: number;
    sectorName: string;
    equipmentGroupKey: string;
    equipmentGroupName: string;
    minimumQuantity: number;
    justificativa: string;
    active: boolean;
    selectedEquipmentIds?: Set<number>; // IDs dos equipamentos selecionados
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; ruleId: string; ruleName: string } | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState<{ isOpen: boolean; sectorId: number; sectorName: string } | null>(null);

  // Filtrar dados do resumo apenas para o setor selecionado
  const sectorData = selectedSectorId && summaryData?.regrasPorSetor
    ? summaryData.regrasPorSetor.find((setor) => {
        // Comparar como números para garantir correspondência
        const setId = typeof setor.sectorId === 'string' ? parseInt(setor.sectorId) : setor.sectorId;
        const selectedId = typeof selectedSectorId === 'string' ? parseInt(selectedSectorId) : selectedSectorId;
        return setId === selectedId;
      })
    : null;
  
  // Debug: log para verificar correspondência
  if (selectedSectorId && summaryData) {
    console.log('[SectorView] Setor selecionado:', selectedSectorId);
    console.log('[SectorView] Setores disponíveis no resumo:', summaryData.regrasPorSetor.map(s => ({ id: s.sectorId, name: s.sectorName })));
    console.log('[SectorView] Dados encontrados para setor:', sectorData);
  }

  // Mutations para editar, excluir e ativar/desativar regras (similar ao SummaryView)
  const editRuleMutation = useMutation({
    mutationFn: async ({
      ruleId,
      equipmentGroupName,
      minimumQuantity,
      justificativa,
      active,
      equipmentIds,
    }: {
      ruleId: string;
      equipmentGroupName?: string;
      minimumQuantity?: number;
      justificativa?: string;
      active?: boolean;
      equipmentIds?: number[];
    }) => {
      return apiClient.patch(`/api/ecm/mel/rule/${ruleId}`, {
        equipmentGroupName,
        minimumQuantity,
        justificativa,
        active,
        equipmentIds,
      });
    },
    onSuccess: () => {
      toast.success('Regra atualizada com sucesso!');
      setEditingRule(null);
      queryClient.invalidateQueries({ queryKey: ['mel-summary'] });
      queryClient.invalidateQueries({ queryKey: ['mel-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['mel-sector'] });
    },
    onError: (error: any) => {
      console.error('[SectorView] Erro ao atualizar regra:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao atualizar regra');
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const response = await apiClient.delete(`/api/ecm/mel/rule/${ruleId}`);
      return response;
    },
    onSuccess: () => {
      toast.success('Regra removida com sucesso!');
      setDeleteConfirm(null); // Fechar diálogo após sucesso
      queryClient.invalidateQueries({ queryKey: ['mel-summary'] });
      queryClient.invalidateQueries({ queryKey: ['mel-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['mel-sector'] });
    },
    onError: (error: any) => {
      console.error('[SectorView] Erro ao excluir regra:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao remover regra');
    },
  });

  // Mutation para excluir todas as regras de um setor
  const deleteAllSectorRulesMutation = useMutation({
    mutationFn: async (sectorId: number) => {
      const response = await apiClient.delete(`/api/ecm/mel/sector/${sectorId}`);
      return response;
    },
    onSuccess: () => {
      // Fechar diálogo PRIMEIRO, antes de invalidar queries
      setDeleteAllConfirm(null);
      toast.success('Todas as regras do setor foram removidas com sucesso!');
      // Invalidar queries depois
      queryClient.invalidateQueries({ queryKey: ['mel-summary'] });
      queryClient.invalidateQueries({ queryKey: ['mel-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['mel-sector'] });
    },
    onError: (error: any) => {
      console.error('[SectorView] Erro ao excluir todas as regras:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao remover regras do setor');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ ruleId, active }: { ruleId: string; active: boolean }) => {
      return apiClient.patch(`/api/ecm/mel/rule/${ruleId}`, { active });
    },
    onSuccess: (_, variables) => {
      toast.success(`Regra ${variables.active ? 'ativada' : 'desativada'} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['mel-summary'] });
      queryClient.invalidateQueries({ queryKey: ['mel-alerts'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao alterar status da regra');
    },
  });
  const [formItems, setFormItems] = useState<
    Array<{ equipmentGroupKey: string; equipmentGroupName: string; minimumQuantity: number }>
  >([]);

  // Inicializar formulário quando abrir
  useEffect(() => {
    if (!showConfigForm) {
      // Quando fechar o formulário, limpar itens
      setFormItems([]);
      return;
    }

    if (sectorData && sectorData.regras.length > 0) {
      // Preencher formulário com dados existentes do resumo
      setFormItems(
        sectorData.regras.map((regra) => ({
          equipmentGroupKey: regra.equipmentGroupKey,
          equipmentGroupName: regra.equipmentGroupName,
          minimumQuantity: regra.minimumQuantity,
        }))
      );
    } else if (equipmentsData && equipmentsData.grupos.length > 0) {
      // Formulário vazio - preencher com grupos disponíveis que ainda não têm MEL configurado
      const gruposSemMel = equipmentsData.grupos.filter((g) => g.minimumQuantity === null);
      if (gruposSemMel.length > 0) {
        setFormItems(
          gruposSemMel.slice(0, 5).map((g) => ({
            equipmentGroupKey: g.equipmentGroupKey,
            equipmentGroupName: g.equipmentGroupName,
            minimumQuantity: 1,
          }))
        );
      }
    }
  }, [showConfigForm, sectorData, equipmentsData]);

  const handleAddItem = () => {
    if (!equipmentsData || equipmentsData.grupos.length === 0) {
      toast.error('Nenhum grupo de equipamentos disponível. Aguarde o carregamento.');
      return;
    }
    // Adicionar primeiro grupo disponível que ainda não está no formulário
    const gruposNoFormulario = new Set(formItems.map((item) => item.equipmentGroupKey));
    const grupoDisponivel = equipmentsData.grupos.find((g) => !gruposNoFormulario.has(g.equipmentGroupKey));
    
    if (grupoDisponivel) {
      setFormItems([
        ...formItems,
        {
          equipmentGroupKey: grupoDisponivel.equipmentGroupKey,
          equipmentGroupName: grupoDisponivel.equipmentGroupName,
          minimumQuantity: 1,
        },
      ]);
    } else {
      toast('Todos os grupos de equipamentos já estão no formulário.');
    }
  };

  const handleRemoveItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!selectedSectorId) {
      toast.error('Selecione um setor');
      return;
    }
    onSaveMel({ sectorId: selectedSectorId, items: formItems });
  };

  return (
    <div>
      {/* Seletor de setor */}
      <div style={{ marginBottom: theme.spacing.lg }}>
        <label
          style={{
            display: 'block',
            marginBottom: theme.spacing.xs,
            fontSize: '14px',
            fontWeight: 600,
            color: theme.colors.dark,
          }}
        >
          Selecionar Setor
        </label>
        <select
          value={selectedSectorId || ''}
          onChange={(e) => onSelectSector(parseInt(e.target.value))}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: theme.spacing.sm,
            border: `1px solid ${theme.colors.gray[300]}`,
            borderRadius: theme.borderRadius.md,
            fontSize: '14px',
            backgroundColor: theme.colors.white,
          }}
        >
          <option value="" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Selecione um setor...</option>
          {sectors.map((sector) => (
            <option key={sector.id} value={sector.id} style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>
              {sector.name}
            </option>
          ))}
        </select>
      </div>

      {selectedSectorId && (
        <>
          {!showConfigForm ? (
            <>
              {/* Botão para configurar MEL */}
              {isAdmin && (
                <div style={{ marginBottom: theme.spacing.md }}>
                  <button
                    onClick={() => onShowConfigForm(true)}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      backgroundColor: theme.colors.primary,
                      color: theme.colors.white,
                      border: 'none',
                      borderRadius: theme.borderRadius.md,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.xs,
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    <FiPlus size={16} />
                    Configurar MEL
                  </button>
                </div>
              )}

              {/* Visualização de regras MEL do setor (igual ao resumo) */}
              {summaryLoading ? (
                <SkeletonScreen />
              ) : sectorData && sectorData.regras.length > 0 ? (
                <div
                  style={{
                    backgroundColor: theme.colors.white,
                    borderRadius: theme.borderRadius.lg,
                    padding: theme.spacing.lg,
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
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '20px',
                        fontWeight: 600,
                        color: theme.colors.dark,
                      }}
                    >
                      {sectorData.sectorName} ({sectorData.totalRegras} regra{sectorData.totalRegras !== 1 ? 's' : ''}, {sectorData.regrasEmAlerta} em alerta)
                    </h2>
                    <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center' }}>
                      {sectorData.regrasEmAlerta > 0 && (
                        <FiAlertTriangle size={20} color={theme.colors.danger} title="Setor com regras em alerta" />
                      )}
                      {isAdmin && sectorData.regras.length > 0 && (
                        <button
                          onClick={() =>
                            setDeleteAllConfirm({
                              isOpen: true,
                              sectorId: sectorData.sectorId,
                              sectorName: sectorData.sectorName,
                            })
                          }
                          style={{
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            backgroundColor: theme.colors.danger,
                            color: theme.colors.white,
                            border: 'none',
                            borderRadius: theme.borderRadius.sm,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.xs,
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                          title="Excluir todas as regras deste setor"
                        >
                          <FiTrash2 size={14} />
                          Excluir Todas as Regras
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Indicadores resumidos por regra (similar ao modal) */}
                  {sectorData.regras.length > 0 && (
                    <div
                      style={{
                        backgroundColor: theme.colors.gray[50],
                        padding: theme.spacing.md,
                        borderRadius: theme.borderRadius.md,
                        marginBottom: theme.spacing.md,
                        border: `1px solid ${theme.colors.gray[200]}`,
                      }}
                    >
                      <div style={{ display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        {sectorData.regras.map((regra) => {
                          const emAlerta = regra.active && (regra.disponivel ?? 0) < regra.minimumQuantity;
                          return (
                            <div
                              key={regra.id}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: theme.spacing.xs,
                                padding: theme.spacing.md,
                                backgroundColor: theme.colors.white,
                                borderRadius: theme.borderRadius.sm,
                                border: `1px solid ${emAlerta ? theme.colors.danger : theme.colors.gray[200]}`,
                                minWidth: '180px',
                                flex: '1 1 200px',
                                maxWidth: '280px',
                              }}
                            >
                              <div style={{ fontSize: '13px', fontWeight: 600, color: theme.colors.gray[700], marginBottom: theme.spacing.xs, display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                                {regra.equipmentGroupName}
                                {emAlerta && <FiAlertTriangle size={14} color={theme.colors.danger} title="Em alerta" />}
                                {!regra.active && (
                                  <span style={{ fontSize: '11px', color: theme.colors.gray[500], fontWeight: 400 }}>(Inativa)</span>
                                )}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingTop: theme.spacing.xs, borderTop: `1px solid ${theme.colors.gray[100]}` }}>
                                <span style={{ color: theme.colors.gray[600], fontWeight: 500 }}>Total:</span>
                                <span style={{ fontWeight: 600, color: theme.colors.dark }}>{regra.total ?? 0}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                <span style={{ color: theme.colors.warning, fontWeight: 500 }}>Indisponíveis:</span>
                                <span style={{ fontWeight: 600, color: theme.colors.warning }}>{regra.indisponiveis ?? 0}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                                <span style={{ color: emAlerta ? theme.colors.danger : theme.colors.success, fontWeight: 500 }}>Disponíveis:</span>
                                <span style={{ fontWeight: 600, color: emAlerta ? theme.colors.danger : theme.colors.success, display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                                  {regra.disponivel ?? 0}
                                  {emAlerta && <FiAlertTriangle size={12} color={theme.colors.danger} title="Abaixo do mínimo" />}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderTop: `1px solid ${theme.colors.gray[100]}`, paddingTop: theme.spacing.xs, marginTop: theme.spacing.xs }}>
                                <span style={{ color: theme.colors.gray[700], fontWeight: 500 }}>Mínimo:</span>
                                <span style={{ fontWeight: 600, color: theme.colors.gray[700] }}>{regra.minimumQuantity}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${theme.colors.gray[200]}` }}>
                          <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>
                            Tipo de Equipamento
                          </th>
                          <th style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>
                            Total
                          </th>
                          <th style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>
                            Indisponíveis
                          </th>
                          <th style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>
                            Disponível
                          </th>
                          <th style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>
                            Mínimo
                          </th>
                          <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>
                            Justificativa
                          </th>
                          <th style={{ padding: theme.spacing.sm, textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
                            Status
                          </th>
                          {isAdmin && (
                            <th style={{ padding: theme.spacing.sm, textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
                              Ações
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {sectorData.regras.map((regra, idx) => (
                          <tr
                            key={regra.id || idx}
                            style={{
                              borderBottom: `1px solid ${theme.colors.gray[100]}`,
                              backgroundColor: !regra.active
                                ? theme.colors.gray[50]
                                : regra.emAlerta
                                ? `${theme.colors.danger}05`
                                : 'transparent',
                              opacity: !regra.active ? 0.6 : 1,
                            }}
                          >
                            <td style={{ padding: theme.spacing.sm, fontSize: '13px' }}>
                              {regra.equipmentGroupName}
                              {!regra.active && (
                                <span style={{ marginLeft: theme.spacing.xs, fontSize: '11px', color: theme.colors.gray[500] }}>
                                  (Inativa)
                                </span>
                              )}
                            </td>
                            <td style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '13px' }}>
                              {regra.total ?? '-'}
                            </td>
                            <td style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '13px' }}>
                              {regra.indisponiveis ?? '-'}
                            </td>
                            <td
                              style={{
                                padding: theme.spacing.sm,
                                textAlign: 'right',
                                fontSize: '13px',
                                fontWeight: regra.emAlerta ? 600 : 400,
                                color: regra.emAlerta ? theme.colors.danger : theme.colors.dark,
                              }}
                            >
                              {regra.disponivel ?? '-'}
                            </td>
                            <td style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '13px' }}>
                              {regra.minimumQuantity}
                            </td>
                            <td style={{ padding: theme.spacing.sm, fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={regra.justificativa || undefined}>
                              {regra.justificativa || '-'}
                            </td>
                            <td style={{ padding: theme.spacing.sm, textAlign: 'center' }}>
                              {!regra.active ? (
                                <span style={{ fontSize: '11px', color: theme.colors.gray[500] }}>Inativa</span>
                              ) : regra.emAlerta ? (
                                <FiAlertTriangle size={16} color={theme.colors.danger} title="Em alerta" />
                              ) : (
                                <FiCheckCircle size={16} color={theme.colors.success} title="OK" />
                              )}
                            </td>
                            {isAdmin && (
                              <td style={{ padding: theme.spacing.sm, textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: theme.spacing.xs, justifyContent: 'center', alignItems: 'center' }}>
                                  <button
                                    onClick={() =>
                                      setEditingRule({
                                        id: regra.id,
                                        sectorId: sectorData.sectorId,
                                        sectorName: sectorData.sectorName,
                                        equipmentGroupKey: regra.equipmentGroupKey,
                                        equipmentGroupName: regra.equipmentGroupName,
                                        minimumQuantity: regra.minimumQuantity,
                                        justificativa: regra.justificativa || '',
                                        active: regra.active,
                                        selectedEquipmentIds: new Set(), // Será preenchido ao carregar equipamentos
                                      })
                                    }
                                    style={{
                                      padding: theme.spacing.xs,
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: theme.colors.primary,
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                    title="Editar regra"
                                  >
                                    <FiEdit size={16} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      toggleActiveMutation.mutate({
                                        ruleId: regra.id,
                                        active: !regra.active,
                                      })
                                    }
                                    style={{
                                      padding: theme.spacing.xs,
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: regra.active ? theme.colors.warning : theme.colors.success,
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                    title={regra.active ? 'Desativar regra' : 'Ativar regra'}
                                    disabled={toggleActiveMutation.isPending}
                                  >
                                    {regra.active ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                                  </button>
                                  <button
                                    onClick={() =>
                                      setDeleteConfirm({
                                        isOpen: true,
                                        ruleId: regra.id,
                                        ruleName: regra.equipmentGroupName,
                                      })
                                    }
                                    style={{
                                      padding: theme.spacing.xs,
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: theme.colors.danger,
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                    title="Excluir regra"
                                  >
                                    <FiTrash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : sectorData && sectorData.regras.length === 0 ? (
                <div
                  style={{
                    backgroundColor: theme.colors.white,
                    borderRadius: theme.borderRadius.lg,
                    padding: theme.spacing.xl,
                    textAlign: 'center',
                    boxShadow: theme.shadows.md,
                  }}
                >
                  <FiList size={48} color={theme.colors.gray[400]} style={{ marginBottom: theme.spacing.md }} />
                  <p style={{ margin: 0, color: theme.colors.gray[600], fontSize: '16px' }}>
                    Nenhuma regra MEL configurada para este setor.
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => onShowConfigForm(true)}
                      style={{
                        marginTop: theme.spacing.md,
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        backgroundColor: theme.colors.primary,
                        color: theme.colors.white,
                        border: 'none',
                        borderRadius: theme.borderRadius.md,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: theme.spacing.xs,
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                    >
                      <FiPlus size={16} />
                      Configurar MEL
                    </button>
                  )}
                </div>
              ) : !summaryLoading ? (
                <ErrorMessage message="Erro ao carregar dados de MEL ou nenhuma regra encontrada para este setor" />
              ) : null}
            </>
          ) : (
            <ConfigForm
              sectorId={selectedSectorId!}
              sectorName={sectorData?.sectorName || sectors.find(s => s.id === selectedSectorId)?.name || `Setor ${selectedSectorId}`}
              formItems={formItems}
              onFormItemsChange={setFormItems}
              onSave={(data) => {
                onSaveMel(data);
              }}
              onCancel={() => onShowConfigForm(false)}
              onSaveMel={onSaveMel}
            />
          )}
        </>
      )}

      {/* Modal de edição de regra com seleção de equipamentos */}
      {editingRule && (
        <EditRuleModal
          editingRule={editingRule}
          onClose={() => setEditingRule(null)}
          editRuleMutation={editRuleMutation}
          queryClient={queryClient}
        />
      )}

      {/* Diálogo de confirmação de exclusão de regra */}
      {deleteConfirm && (
        <ConfirmationDialog
          isOpen={deleteConfirm.isOpen}
          title="Excluir Regra MEL"
          message={`Deseja realmente excluir a regra "${deleteConfirm.ruleName}"? Esta ação não pode ser desfeita.`}
          onConfirm={() => {
            if (deleteConfirm) {
              deleteRuleMutation.mutate(deleteConfirm.ruleId);
            }
          }}
          onCancel={() => setDeleteConfirm(null)}
          confirmText="Excluir"
          cancelText="Cancelar"
          isLoading={deleteRuleMutation.isPending}
        />
      )}

      {/* Diálogo de confirmação de exclusão de todas as regras do setor */}
      {deleteAllConfirm && (
        <ConfirmationDialog
          isOpen={deleteAllConfirm.isOpen}
          title="Excluir Todas as Regras do Setor"
          message={`Deseja realmente excluir TODAS as ${sectorData?.regras.length || 0} regra(s) MEL do setor "${deleteAllConfirm.sectorName}"? Esta ação não pode ser desfeita.`}
          onConfirm={() => {
            if (deleteAllConfirm) {
              deleteAllSectorRulesMutation.mutate(deleteAllConfirm.sectorId);
            }
          }}
          onCancel={() => setDeleteAllConfirm(null)}
          confirmText="Excluir Todas"
          cancelText="Cancelar"
          isLoading={deleteAllSectorRulesMutation.isPending}
        />
      )}
    </div>
  );
}

// Componente de modal de edição de regra MEL com seleção de equipamentos
function EditRuleModal({
  editingRule,
  onClose,
  editRuleMutation,
  queryClient,
}: {
  editingRule: {
    id: string;
    sectorId: number;
    sectorName: string;
    equipmentGroupKey: string;
    equipmentGroupName: string;
    minimumQuantity: number;
    justificativa: string;
    active: boolean;
    selectedEquipmentIds?: Set<number>;
  };
  onClose: () => void;
  editRuleMutation: any;
  queryClient: any;
}) {
  // Estado local para os campos editáveis
  const [equipmentGroupName, setEquipmentGroupName] = useState(editingRule.equipmentGroupName);
  const [minimumQuantity, setMinimumQuantity] = useState(editingRule.minimumQuantity);
  const [justificativa, setJustificativa] = useState(editingRule.justificativa);
  const [active, setActive] = useState(editingRule.active);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<number>>(
    editingRule.selectedEquipmentIds || new Set()
  );

  // Estado para armazenar OS e calcular disponibilidade
  const [osList, setOsList] = useState<any[]>([]);
  const [osLoading, setOsLoading] = useState(false);

  // Buscar OS analíticas completas (com Tag) para calcular disponibilidade - recarregar sempre que a seleção mudar
  useEffect(() => {
    if (selectedEquipmentIds.size > 0) {
      setOsLoading(true);
      apiClient
        .get('/api/ecm/os/analitica', {
          params: {
            tipoManutencao: 'Todos',
            periodo: 'AnoCorrente',
          },
        })
        .then((response: any) => {
          // O endpoint /api/ecm/os/analitica retorna { items: [...], totalItems, hasTags }
          let osArray: any[] = [];
          
          if (Array.isArray(response)) {
            osArray = response;
          } else if (response?.items && Array.isArray(response.items)) {
            osArray = response.items;
          } else if (response?.data && Array.isArray(response.data)) {
            osArray = response.data;
          } else if (response?.Itens && Array.isArray(response.Itens)) {
            osArray = response.Itens;
          }
          
          console.log(`[EditRuleModal] OS analíticas carregadas: ${osArray.length} OS encontradas (hasTags: ${response?.hasTags || 'desconhecido'})`);
          if (osArray.length > 0) {
            // Log de exemplo de OS
            const exemploOS = osArray[0];
            console.log('[EditRuleModal] Exemplo de OS analítica:', {
              OS: exemploOS.OS,
              CodigoSerialOS: exemploOS.CodigoSerialOS,
              Equipamento: exemploOS.Equipamento,
              Tag: exemploOS.Tag || '(sem Tag)',
              EquipamentoId: exemploOS.EquipamentoId || '(sem EquipamentoId)',
              SituacaoDaOS: exemploOS.SituacaoDaOS,
              Status: exemploOS.Status,
              temTag: !!exemploOS.Tag,
              todasAsChaves: Object.keys(exemploOS).filter(k => k.toLowerCase().includes('tag') || k.toLowerCase().includes('equip') || k.toLowerCase().includes('patrimonio')),
            });
            
            // Log de OS abertas/em andamento
            const osAbertas = osArray.filter((os: any) => {
              const status = (os.SituacaoDaOS || os.Status || '').toLowerCase();
              return ['aberta', 'em_andamento'].some(s => status.includes(s));
            });
            console.log(`[EditRuleModal] ${osAbertas.length} OS abertas/em andamento encontradas de ${osArray.length} total`);
            if (osAbertas.length > 0 && osAbertas.length <= 5) {
              console.log('[EditRuleModal] OS abertas/em andamento:', osAbertas.map((os: any) => ({
                OS: os.OS,
                Equipamento: os.Equipamento,
                Tag: os.Tag || '(sem Tag)',
                EquipamentoId: os.EquipamentoId || '(sem EquipamentoId)',
                SituacaoDaOS: os.SituacaoDaOS,
              })));
            }
          } else {
            console.warn('[EditRuleModal] Nenhuma OS encontrada!');
          }
          
          setOsList(osArray);
        })
        .catch((error: any) => {
          console.warn('[EditRuleModal] Erro ao buscar OS:', error);
          setOsList([]);
        })
        .finally(() => {
          setOsLoading(false);
        });
    } else {
      setOsList([]); // Limpar lista se não há equipamentos selecionados
    }
  }, [selectedEquipmentIds.size]); // Buscar quando o número de equipamentos selecionados mudar

  // Buscar equipamentos do setor
  const { data: inventoryResponse, isLoading: inventoryLoading, error: inventoryError } = useQuery({
    queryKey: ['inventory', editingRule.sectorId],
    queryFn: async () => {
      // Buscar TODOS os equipamentos do setor (sem paginação limitante)
      const url = `/api/ecm/lifecycle/inventario?page=1&pageSize=50000&setores=${editingRule.sectorId}`;
      const response = await apiClient.get<any>(url);
      
      console.log('[EditRuleModal] Resposta do inventário:', {
        isArray: Array.isArray(response),
        hasData: !!response?.data,
        dataIsArray: Array.isArray(response?.data),
        keys: response && typeof response === 'object' ? Object.keys(response) : 'N/A',
      });
      
      // O endpoint retorna { data: [...], pagination: {...}, statistics: {...} }
      if (response && Array.isArray(response)) {
        console.log('[EditRuleModal] Resposta é array direto:', response.length);
        return { data: response, statistics: {}, pagination: {} };
      }
      if (response && response.data && Array.isArray(response.data)) {
        console.log('[EditRuleModal] Equipamentos encontrados em response.data:', response.data.length);
        return response;
      }
      if (response && typeof response === 'object' && !Array.isArray(response)) {
        const arrayFields = Object.keys(response).filter(key => Array.isArray(response[key]));
        if (arrayFields.length > 0) {
          const firstArray = response[arrayFields[0]];
          console.log('[EditRuleModal] Equipamentos encontrados em', arrayFields[0], ':', firstArray.length);
          return { data: firstArray, statistics: response.statistics || {}, pagination: response.pagination || {} };
        }
      }
      
      console.warn('[EditRuleModal] Nenhum equipamento encontrado na resposta');
      return { data: [], statistics: {}, pagination: {} };
    },
    enabled: !!editingRule.sectorId,
  });

  // Extrair array de equipamentos da resposta
  const equipments = (() => {
    if (!inventoryResponse) return [];
    if (Array.isArray(inventoryResponse)) return inventoryResponse;
    if (inventoryResponse.data && Array.isArray(inventoryResponse.data)) return inventoryResponse.data;
    const arrayField = Object.values(inventoryResponse).find(val => Array.isArray(val));
    return arrayField || [];
  })();

  // Calcular disponibilidade dos equipamentos selecionados (DEPOIS de equipments ser definido)
  const calcularDisponibilidade = () => {
    if (selectedEquipmentIds.size === 0 || !equipments || equipments.length === 0) {
      return { total: 0, indisponiveis: 0, disponiveis: 0 };
    }

    const STATUS_INDISPONIVEL = ['sucateado', 'baixado', 'emprestado'];
    const OS_STATUS_BLOQUEANTES = ['aberta', 'em_andamento'];

    // Filtrar apenas os equipamentos selecionados
    const equipamentosSelecionados = equipments.filter((eq: any) => selectedEquipmentIds.has(eq.Id));
    
    console.log(`[EditRuleModal] Calculando disponibilidade: ${equipamentosSelecionados.length} equipamentos selecionados, ${osList.length} OS disponíveis para verificação`);

    // Verificar quais estão indisponíveis
    const indisponiveis = equipamentosSelecionados.filter((eq: any) => {
      // Verificar status
      const status = (eq.Status || eq.Situacao || '').toLowerCase();
      if (STATUS_INDISPONIVEL.some((s) => status.includes(s))) {
        return true;
      }

      // Preparar dados do equipamento para comparação
      const eqId = eq.Id || eq.id;
      const eqTag = (eq.Tag || eq.tag || '').trim().toUpperCase();
      const eqNome = (eq.Equipamento || eq.Nome || eq.EquipamentoDescricaoCompleta || '').trim();
      const eqModelo = (eq.Modelo || eq.ModeloDescricao || '').trim();
      const eqFabricante = (eq.Fabricante || eq.FabricanteDescricao || '').trim();
      
      console.log(`[EditRuleModal] Verificando equipamento: Id=${eqId}, Tag="${eqTag}", Nome="${eqNome}", Modelo="${eqModelo}", Fabricante="${eqFabricante}"`);
      
      // Verificar OS bloqueante usando a mesma lógica do backend
      // IMPORTANTE: Usar apenas Tag ou EquipamentoId (não vincular por nome/modelo/fabricante)
      if (!eqTag && !eqId) {
        // Se não tem Tag nem ID, não pode verificar OS
        return false;
      }

      const temOSBloqueante = osList.some((os) => {
        // Verificar se a OS está aberta ou em andamento (deve ser bloqueante)
        const osStatus = (os.SituacaoDaOS || os.Status || '').toLowerCase();
        if (!OS_STATUS_BLOQUEANTES.some((s) => osStatus.includes(s.toLowerCase()))) {
          return false; // OS não está bloqueante
        }

        // 1. PRIORIDADE MÁXIMA: Comparar por Tag diretamente da OS analítica
        // A Tag é a única chave estável e só existe na API analítica completa
        const osTag = (os.Tag || (os as any).tag || '').trim().toUpperCase();
        if (osTag && eqTag && osTag === eqTag) {
          console.log(`[EditRuleModal] ✓ OS ${os.OS} (${os.SituacaoDaOS}) bloqueando equipamento ${eqId} por Tag: "${eqTag}" === "${osTag}"`);
          return true;
        }

        // 2. SEGUNDA PRIORIDADE: Comparar por EquipamentoId (se existir na OS analítica)
        const osEquipamentoId = os.EquipamentoId || (os as any).equipamentoId;
        if (osEquipamentoId !== undefined && osEquipamentoId !== null && eqId) {
          if (osEquipamentoId === eqId || osEquipamentoId === String(eqId) || Number(osEquipamentoId) === eqId) {
            console.log(`[EditRuleModal] ✓ OS ${os.OS} (${os.SituacaoDaOS}) bloqueando equipamento ${eqId} por EquipamentoId: ${osEquipamentoId}`);
            return true;
          }
          // Se tem ID mas não corresponde, não é para este equipamento
          return false;
        }

        // 3. Se a OS não tem Tag nem EquipamentoId, NÃO podemos vincular com segurança
        // Não devemos tentar vincular por nome/modelo/fabricante pois é inconfiável
        if (!osTag && !osEquipamentoId) {
          // Log apenas para debug da Tag específica
          if (eqTag === 'HSJ-02406') {
            console.log(`[EditRuleModal] DEBUG Tag HSJ-02406 - OS ${os.OS} não tem Tag nem EquipamentoId:`, {
              osEquipamento: os.Equipamento,
              situacaoOS: os.SituacaoDaOS,
              aviso: 'Não é possível vincular OS a equipamento sem Tag ou EquipamentoId - use API analítica completa',
            });
          }
          return false; // Não vincular sem Tag ou EquipamentoId
        }
        
        // Se chegou aqui, não encontrou correspondência por ID nem por Tag
        // NÃO bloquear - a OS é para outro equipamento específico
        return false;
      });

      if (temOSBloqueante) {
        console.log(`[EditRuleModal] ✓ Equipamento ${eqId} (${eqNome || eqTag}) marcado como INDISPONÍVEL`);
      } else {
        console.log(`[EditRuleModal] Equipamento ${eqId} (${eqNome || eqTag}) está DISPONÍVEL (sem OS bloqueante)`);
      }
      return temOSBloqueante;
    }).length;

    const total = equipamentosSelecionados.length;
    const disponiveis = total - indisponiveis;
    
    console.log(`[EditRuleModal] Resumo da disponibilidade: Total=${total}, Indisponíveis=${indisponiveis}, Disponíveis=${disponiveis}`);

    return { total, indisponiveis, disponiveis };
  };

  const disponibilidade = calcularDisponibilidade();
  const emAlerta = active && disponibilidade.disponiveis < minimumQuantity;

  // Buscar quais equipamentos pertencem ao grupo atual
  useEffect(() => {
    if (equipments.length > 0 && editingRule.equipmentGroupKey) {
      // Primeiro, buscar a regra do backend para obter o groupPattern se existir
      apiClient.get(`/api/ecm/mel/rule/${editingRule.id}`)
        .then((response: any) => {
          // Se tem groupPattern salvo (para grupos customizados)
          if (response?.groupPattern) {
            try {
              const pattern = JSON.parse(response.groupPattern);
              if (pattern.type === 'custom' && pattern.equipmentIds && Array.isArray(pattern.equipmentIds)) {
                // Marcar os equipamentos que estão no groupPattern
                const equipmentIds = new Set(pattern.equipmentIds.map((id: number) => Number(id)));
                setSelectedEquipmentIds(equipmentIds);
                console.log(`[EditRuleModal] Equipamentos encontrados do groupPattern: ${equipmentIds.size} equipamentos`);
                return; // Já encontrou, não precisa continuar
              }
            } catch (e) {
              console.warn('[EditRuleModal] Erro ao parsear groupPattern:', e);
            }
          }
          
          // Se não tem groupPattern ou não é custom, tentar usar o serviço de agrupamento para grupos padrão
          const { agruparEquipamentos } = require('../../services/melEquipmentGrouping');
          const gruposMap = agruparEquipamentos(equipments);
          const grupoData = gruposMap.get(editingRule.equipmentGroupKey);
          
          if (grupoData) {
            // Se encontrou o grupo padrão, marcar os equipamentos que pertencem a ele
            const equipmentIds = new Set(grupoData.equipamentos.map((eq: any) => eq.Id));
            setSelectedEquipmentIds(equipmentIds);
            console.log(`[EditRuleModal] Grupo padrão "${editingRule.equipmentGroupKey}" encontrado: ${equipmentIds.size} equipamentos`);
          } else {
            console.log(`[EditRuleModal] Grupo "${editingRule.equipmentGroupKey}" não encontrado nos grupos padrão. Nenhum equipamento pré-selecionado.`);
          }
        })
        .catch((error: any) => {
          console.warn('[EditRuleModal] Erro ao buscar regra do backend, tentando agrupamento padrão:', error);
          
          // Fallback: tentar usar o serviço de agrupamento
          const { agruparEquipamentos } = require('../../services/melEquipmentGrouping');
          const gruposMap = agruparEquipamentos(equipments);
          const grupoData = gruposMap.get(editingRule.equipmentGroupKey);
          
          if (grupoData) {
            const equipmentIds = new Set(grupoData.equipamentos.map((eq: any) => eq.Id));
            setSelectedEquipmentIds(equipmentIds);
          }
        });
    }
  }, [equipments.length > 0 && editingRule.equipmentGroupKey ? 'loaded' : 'pending', editingRule.id]);

  const toggleEquipmentSelection = (equipmentId: number) => {
    const newSelected = new Set(selectedEquipmentIds);
    if (newSelected.has(equipmentId)) {
      newSelected.delete(equipmentId);
    } else {
      newSelected.add(equipmentId);
    }
    setSelectedEquipmentIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedEquipmentIds.size === equipments.length) {
      setSelectedEquipmentIds(new Set());
    } else {
      setSelectedEquipmentIds(new Set(equipments.map((eq: any) => eq.Id)));
    }
  };

  const handleSave = () => {
    if (selectedEquipmentIds.size === 0) {
      toast.error('Selecione pelo menos um equipamento para o grupo MEL');
      return;
    }

    // Atualizar a regra com os equipamentos selecionados
    editRuleMutation.mutate({
      ruleId: editingRule.id,
      equipmentGroupName: equipmentGroupName.trim(),
      minimumQuantity: minimumQuantity,
      justificativa: justificativa.trim() || undefined,
      active: active,
      equipmentIds: Array.from(selectedEquipmentIds), // Enviar lista de IDs selecionados
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          maxWidth: '900px',
          width: '95%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: theme.shadows.lg,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.lg,
          }}
        >
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: theme.colors.dark }}>
            Editar Regra MEL - {editingRule.sectorName}
          </h3>
          <button
            onClick={onClose}
            style={{
              padding: theme.spacing.xs,
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: theme.colors.gray[600],
            }}
          >
            <FiX size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          {/* Campos básicos */}
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 600, color: theme.colors.dark }}>
              Nome do Grupo
            </label>
            <input
              type="text"
              value={equipmentGroupName}
              onChange={(e) => setEquipmentGroupName(e.target.value)}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                borderRadius: theme.borderRadius.sm,
                fontSize: '14px',
                backgroundColor: theme.colors.white,
                color: theme.colors.dark,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 600, color: theme.colors.dark }}>
              Quantidade Mínima *
            </label>
            <input
              type="number"
              min="0"
              value={minimumQuantity}
              onChange={(e) => setMinimumQuantity(parseInt(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                borderRadius: theme.borderRadius.sm,
                fontSize: '14px',
                backgroundColor: theme.colors.white,
                color: theme.colors.dark,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 600, color: theme.colors.dark }}>
              Justificativa / Motivo da Regra
            </label>
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Explique o motivo desta regra MEL existir..."
              rows={3}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                borderRadius: theme.borderRadius.sm,
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                backgroundColor: theme.colors.white,
                color: theme.colors.dark,
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Regra ativa
            </label>
          </div>

          {/* Seção de seleção de equipamentos */}
          <div style={{ marginTop: theme.spacing.md, borderTop: `1px solid ${theme.colors.gray[200]}`, paddingTop: theme.spacing.md }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: theme.colors.dark }}>
                Equipamentos do Grupo
              </label>
              
              {/* Indicadores de disponibilidade */}
              {selectedEquipmentIds.size > 0 && (
                <div style={{ display: 'flex', gap: theme.spacing.md, fontSize: '13px', color: theme.colors.gray[700], alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                    <span style={{ fontWeight: 600 }}>Total:</span>
                    <span>{disponibilidade.total}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, color: theme.colors.warning }}>
                    <span style={{ fontWeight: 600 }}>Indisponíveis:</span>
                    <span>{disponibilidade.indisponiveis}</span>
                  </div>
                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: theme.spacing.xs, 
                      color: emAlerta ? theme.colors.danger : theme.colors.success,
                      fontWeight: emAlerta ? 600 : 400,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>Disponíveis:</span>
                    <span>{disponibilidade.disponiveis}</span>
                    {emAlerta && (
                      <FiAlertTriangle size={14} color={theme.colors.danger} title="Abaixo do mínimo" />
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                    <span style={{ fontWeight: 600 }}>Mínimo:</span>
                    <span>{minimumQuantity}</span>
                  </div>
                </div>
              )}
            </div>
            
            {inventoryLoading && (
              <div style={{ padding: theme.spacing.md, textAlign: 'center', color: theme.colors.gray[600] }}>
                <LoadingSpinner size="small" />
                <span style={{ marginLeft: theme.spacing.sm }}>Carregando equipamentos...</span>
              </div>
            )}

            {inventoryError && (
              <div style={{ padding: theme.spacing.md, backgroundColor: `${theme.colors.danger}10`, color: theme.colors.danger, borderRadius: theme.borderRadius.sm }}>
                Erro ao carregar equipamentos: {inventoryError instanceof Error ? inventoryError.message : 'Erro desconhecido'}
              </div>
            )}

            {!inventoryLoading && !inventoryError && equipments.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                  <div style={{ fontSize: '13px', color: theme.colors.gray[600] }}>
                    {equipments.length} equipamento(s) encontrado(s) | {selectedEquipmentIds.size} selecionado(s)
                    {osLoading && <span style={{ marginLeft: theme.spacing.xs, color: theme.colors.info }}>(Calculando disponibilidade...)</span>}
                  </div>
                  <button
                    onClick={toggleSelectAll}
                    style={{
                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                      backgroundColor: 'transparent',
                      border: `1px solid ${theme.colors.gray[300]}`,
                      borderRadius: theme.borderRadius.sm,
                      color: theme.colors.gray[700],
                      cursor: 'pointer',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.xs,
                    }}
                  >
                    {selectedEquipmentIds.size === equipments.length ? (
                      <>
                        <FiCheckSquare size={16} />
                        Desmarcar Todos
                      </>
                    ) : (
                      <>
                        <FiSquare size={16} />
                        Selecionar Todos
                      </>
                    )}
                  </button>
                </div>

                <div style={{ maxHeight: '300px', overflowY: 'auto', border: `1px solid ${theme.colors.gray[200]}`, borderRadius: theme.borderRadius.md }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: theme.colors.gray[50], zIndex: 1 }}>
                      <tr style={{ borderBottom: `2px solid ${theme.colors.gray[200]}` }}>
                        <th style={{ padding: theme.spacing.sm, textAlign: 'left', width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={selectedEquipmentIds.size === equipments.length && equipments.length > 0}
                            onChange={toggleSelectAll}
                            style={{ cursor: 'pointer' }}
                          />
                        </th>
                        <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Tag</th>
                        <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Equipamento</th>
                        <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Modelo</th>
                        <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Fabricante</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipments.slice(0, 100).map((eq: any) => (
                        <tr
                          key={eq.Id}
                          style={{
                            borderBottom: `1px solid ${theme.colors.gray[100]}`,
                            backgroundColor: selectedEquipmentIds.has(eq.Id) ? `${theme.colors.primary}05` : 'transparent',
                          }}
                        >
                          <td style={{ padding: theme.spacing.sm }}>
                            <input
                              type="checkbox"
                              checked={selectedEquipmentIds.has(eq.Id)}
                              onChange={() => toggleEquipmentSelection(eq.Id)}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: theme.spacing.sm, fontSize: '12px' }}>{eq.Tag || '-'}</td>
                          <td style={{ padding: theme.spacing.sm, fontSize: '12px' }}>{eq.Equipamento || '-'}</td>
                          <td style={{ padding: theme.spacing.sm, fontSize: '12px' }}>{eq.Modelo || '-'}</td>
                          <td style={{ padding: theme.spacing.sm, fontSize: '12px' }}>{eq.Fabricante || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {equipments.length > 100 && (
                  <small style={{ fontSize: '11px', color: theme.colors.gray[600], marginTop: theme.spacing.xs, display: 'block' }}>
                    Mostrando apenas os primeiros 100 equipamentos. Use a busca para filtrar.
                  </small>
                )}
              </>
            )}

            {!inventoryLoading && !inventoryError && equipments.length === 0 && (
              <div style={{ padding: theme.spacing.md, backgroundColor: `${theme.colors.warning}10`, color: theme.colors.warning, borderRadius: theme.borderRadius.sm }}>
                Nenhum equipamento encontrado neste setor.
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.lg, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={editRuleMutation.isPending}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: 'transparent',
              border: `1px solid ${theme.colors.gray[300]}`,
              borderRadius: theme.borderRadius.md,
              color: theme.colors.gray[700],
              cursor: editRuleMutation.isPending ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              opacity: editRuleMutation.isPending ? 0.6 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={editRuleMutation.isPending || minimumQuantity < 0 || selectedEquipmentIds.size === 0}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.colors.primary,
              border: 'none',
              borderRadius: theme.borderRadius.md,
              color: theme.colors.white,
              cursor: editRuleMutation.isPending || minimumQuantity < 0 || selectedEquipmentIds.size === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              opacity: editRuleMutation.isPending || minimumQuantity < 0 || selectedEquipmentIds.size === 0 ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
            }}
          >
            {editRuleMutation.isPending ? 'Salvando...' : (
              <>
                <FiSave size={16} />
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente de formulário de configuração
function ConfigForm({
  sectorId,
  sectorName,
  formItems,
  onFormItemsChange,
  onSave,
  onCancel,
  onSaveMel,
}: {
  sectorId: number;
  sectorName: string;
  formItems: Array<{ equipmentGroupKey: string; equipmentGroupName: string; minimumQuantity: number; justificativa?: string }>;
  onFormItemsChange: (
    items: Array<{ equipmentGroupKey: string; equipmentGroupName: string; minimumQuantity: number; justificativa?: string }>
  ) => void;
  onSave: (data: { sectorId: number; items: Array<{ equipmentGroupKey: string; equipmentGroupName: string; minimumQuantity: number; justificativa?: string }> }) => void;
  onSaveMel?: (data: { sectorId: number; items: Array<{ equipmentGroupKey: string; equipmentGroupName: string; minimumQuantity: number; justificativa?: string }> }) => void;
  onCancel: () => void;
  onSaveMel?: (data: { sectorId: number; items: Array<{ equipmentGroupKey: string; equipmentGroupName: string; minimumQuantity: number }> }) => void;
}) {
  const [selectedEquipments, setSelectedEquipments] = useState<Set<number>>(new Set());
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [minimumQuantity, setMinimumQuantity] = useState<number>(1);
  const [justificativa, setJustificativa] = useState('');

  // Função para abrir modal de criação de grupo
  const handleOpenCreateGroup = () => {
    if (selectedEquipments.size === 0) {
      toast.error('Selecione pelo menos um equipamento para criar um grupo MEL');
      return;
    }
    setShowCreateGroupModal(true);
  };

  // Função para salvar grupo MEL personalizado
  const handleSaveCustomGroup = () => {
    if (!groupName.trim()) {
      toast.error('Digite um nome para o grupo');
      return;
    }
    if (minimumQuantity < 0) {
      toast.error('A quantidade mínima deve ser maior ou igual a zero');
      return;
    }

    // Gerar uma chave única para o grupo baseada no nome e nos equipamentos selecionados
    const groupKey = `custom_${groupName.toLowerCase().replace(/\s+/g, '_')}_${sectorId}_${Date.now()}`;
    
    // Criar o item do grupo MEL
    const newGroupItem = {
      equipmentGroupKey: groupKey,
      equipmentGroupName: groupName.trim(),
      minimumQuantity: minimumQuantity,
      justificativa: justificativa.trim() || undefined,
    };

    // Salvar nome antes de limpar para usar no toast
    const savedGroupName = groupName.trim();

    // Adicionar aos formItems
    const updatedItems = [...formItems, newGroupItem];
    onFormItemsChange(updatedItems);

    // Salvar no backend
    if (onSaveMel) {
      onSaveMel({ sectorId, items: [newGroupItem] });
    } else {
      onSave({ sectorId, items: [newGroupItem] });
    }

    // Limpar e fechar modal
    setGroupName('');
    setMinimumQuantity(1);
    setJustificativa('');
    setSelectedEquipments(new Set());
    setShowCreateGroupModal(false);
    
    toast.success(`Grupo MEL "${savedGroupName}" criado com sucesso!`);
  };
  
  // Buscar equipamentos do setor usando a mesma query do inventário
  const { data: inventoryResponse, isLoading: inventoryLoading, error: inventoryError } = useQuery({
    queryKey: ['inventory', sectorId],
    queryFn: async () => {
      const url = `/api/ecm/lifecycle/inventario?page=1&pageSize=50000&setores=${sectorId}`;
      const response = await apiClient.get<any>(url);
      
      console.log('[ConfigForm] Resposta bruta da API:', {
        isArray: Array.isArray(response),
        type: typeof response,
        keys: response ? Object.keys(response).slice(0, 10) : [],
        hasData: response && 'data' in response,
        dataIsArray: response?.data && Array.isArray(response.data),
        dataLength: response?.data?.length || (Array.isArray(response) ? response.length : 0),
      });
      
      // Se a resposta for um array diretamente, envolver em objeto
      if (response && Array.isArray(response)) {
        console.log('[ConfigForm] Resposta é array, convertendo para objeto');
        return { data: response, statistics: {}, pagination: {} };
      }
      
      // Se a resposta vier como objeto com data, usar diretamente
      if (response && response.data && Array.isArray(response.data)) {
        console.log('[ConfigForm] Resposta é objeto com data array');
        return response;
      }
      
      // Se a resposta vier como objeto mas data não for array, tentar extrair
      if (response && typeof response === 'object' && !Array.isArray(response)) {
        // Verificar se algum campo contém um array
        const arrayFields = Object.keys(response).filter(key => Array.isArray(response[key]));
        if (arrayFields.length > 0) {
          console.log('[ConfigForm] Encontrado array no campo:', arrayFields[0]);
          return { data: response[arrayFields[0]], statistics: response.statistics || {}, pagination: response.pagination || {} };
        }
      }
      
      console.warn('[ConfigForm] Resposta inesperada da API:', response);
      return { data: [], statistics: {}, pagination: {} };
    },
    enabled: !!sectorId,
  });

  // Extrair array de equipamentos da resposta
  // A resposta pode vir como objeto { data: [...] } ou diretamente como array
  const equipments = (() => {
    if (!inventoryResponse) return [];
    
    // Se for um array diretamente, usar o array
    if (Array.isArray(inventoryResponse)) {
      return inventoryResponse;
    }
    
    // Se for um objeto com data como array, usar data
    if (inventoryResponse.data && Array.isArray(inventoryResponse.data)) {
      return inventoryResponse.data;
    }
    
    // Tentar encontrar qualquer campo que seja array
    const arrayField = Object.values(inventoryResponse).find(val => Array.isArray(val));
    if (arrayField) {
      return arrayField;
    }
    
    return [];
  })();
  
  // Debug: logar estrutura da resposta
  useEffect(() => {
    if (inventoryResponse) {
      console.log('[ConfigForm] Resposta da API recebida:', {
        hasData: !!inventoryResponse.data,
        dataIsArray: Array.isArray(inventoryResponse.data),
        dataLength: inventoryResponse.data?.length || 0,
        keys: Object.keys(inventoryResponse),
        firstItem: inventoryResponse.data?.[0] ? Object.keys(inventoryResponse.data[0]) : null,
      });
      console.log('[ConfigForm] Equipamentos extraídos:', equipments.length);
    }
    if (inventoryError) {
      console.error('[ConfigForm] Erro ao buscar equipamentos:', inventoryError);
    }
  }, [inventoryResponse, inventoryError, equipments.length]);

  const toggleEquipmentSelection = (equipmentId: number) => {
    const newSelected = new Set(selectedEquipments);
    if (newSelected.has(equipmentId)) {
      newSelected.delete(equipmentId);
    } else {
      newSelected.add(equipmentId);
    }
    setSelectedEquipments(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedEquipments.size === equipments.length) {
      setSelectedEquipments(new Set());
    } else {
      setSelectedEquipments(new Set(equipments.map(eq => eq.Id)));
    }
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.md,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: theme.colors.dark }}>
            Configurar MEL - {sectorName}
          </h2>
          <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '14px', color: theme.colors.gray[600] }}>
            Selecione os equipamentos para configurar a quantidade mínima
          </p>
        </div>
        <button
          onClick={onCancel}
          style={{
            padding: theme.spacing.xs,
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: theme.colors.gray[600],
          }}
        >
          <FiX size={20} />
        </button>
      </div>

      {inventoryLoading && (
        <div
          style={{
            padding: theme.spacing.md,
            backgroundColor: `${theme.colors.info}10`,
            border: `1px solid ${theme.colors.info}`,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.md,
            color: theme.colors.info,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          <LoadingSpinner size="small" />
          Carregando equipamentos do setor...
        </div>
      )}

      {inventoryError && (
        <div
          style={{
            padding: theme.spacing.md,
            backgroundColor: `${theme.colors.danger}10`,
            border: `1px solid ${theme.colors.danger}`,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.md,
            color: theme.colors.danger,
            fontSize: '14px',
          }}
        >
          <strong>Erro ao carregar equipamentos:</strong>{' '}
          {inventoryError instanceof Error ? inventoryError.message : 'Erro desconhecido'}
          <br />
          <small style={{ fontSize: '12px', marginTop: theme.spacing.xs, display: 'block' }}>
            Verifique se o servidor está rodando e se você está autenticado.
          </small>
        </div>
      )}

      {!inventoryLoading && !inventoryError && equipments.length === 0 && (
        <div
          style={{
            padding: theme.spacing.md,
            backgroundColor: `${theme.colors.warning}10`,
            border: `1px solid ${theme.colors.warning}`,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.md,
            color: theme.colors.warning,
            fontSize: '14px',
          }}
        >
          Nenhum equipamento encontrado neste setor. Selecione outro setor ou verifique se há equipamentos cadastrados.
          <br />
          <small style={{ fontSize: '12px', marginTop: theme.spacing.xs, display: 'block' }}>
            {inventoryResponse ? (
              <>
                Tipo de resposta: {Array.isArray(inventoryResponse) ? 'Array' : typeof inventoryResponse}
                <br />
                {Array.isArray(inventoryResponse) 
                  ? `Array com ${inventoryResponse.length} itens`
                  : `Objeto com chaves: ${Object.keys(inventoryResponse).slice(0, 5).join(', ')}`}
              </>
            ) : (
              'Sem resposta da API'
            )}
          </small>
        </div>
      )}

      {!inventoryLoading && !inventoryError && equipments.length > 0 && (
        <div style={{ marginTop: theme.spacing.md }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.sm,
            }}
          >
            <div style={{ fontSize: '14px', color: theme.colors.gray[600] }}>
              {equipments.length} equipamento(s) encontrado(s) | {selectedEquipments.size} selecionado(s)
            </div>
            <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center' }}>
              {selectedEquipments.size > 0 && (
                <button
                  onClick={handleOpenCreateGroup}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    backgroundColor: theme.colors.primary,
                    border: 'none',
                    borderRadius: theme.borderRadius.sm,
                    color: theme.colors.white,
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                  }}
                >
                  <FiPlus size={14} />
                  Criar Grupo MEL ({selectedEquipments.size})
                </button>
              )}
              <button
                onClick={toggleSelectAll}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                backgroundColor: 'transparent',
                border: `1px solid ${theme.colors.gray[300]}`,
                borderRadius: theme.borderRadius.sm,
                color: theme.colors.gray[700],
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
              }}
            >
              {selectedEquipments.size === equipments.length ? (
                <>
                  <FiCheckSquare size={16} />
                  Desmarcar Todos
                </>
              ) : (
                <>
                  <FiSquare size={16} />
                  Selecionar Todos
                </>
                )}
              </button>
            </div>
          </div>

          <div
            style={{
              maxHeight: '600px',
              overflowY: 'auto',
              border: `1px solid ${theme.colors.gray[200]}`,
              borderRadius: theme.borderRadius.md,
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: theme.colors.gray[50], zIndex: 1 }}>
                <tr style={{ borderBottom: `2px solid ${theme.colors.gray[200]}` }}>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'left', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedEquipments.size === equipments.length && equipments.length > 0}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>
                    Tag
                  </th>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>
                    Equipamento
                  </th>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>
                    Modelo
                  </th>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>
                    Fabricante
                  </th>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {equipments.map((equipment) => {
                  const isSelected = selectedEquipments.has(equipment.Id);
                  return (
                    <tr
                      key={equipment.Id}
                      style={{
                        borderBottom: `1px solid ${theme.colors.gray[100]}`,
                        backgroundColor: isSelected ? `${theme.colors.primary}05` : 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleEquipmentSelection(equipment.Id)}
                    >
                      <td style={{ padding: theme.spacing.sm }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleEquipmentSelection(equipment.Id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: theme.spacing.sm, fontSize: '13px' }}>{equipment.Tag || '-'}</td>
                      <td style={{ padding: theme.spacing.sm, fontSize: '13px' }}>
                        {equipment.Equipamento || '-'}
                      </td>
                      <td style={{ padding: theme.spacing.sm, fontSize: '13px' }}>{equipment.Modelo || '-'}</td>
                      <td style={{ padding: theme.spacing.sm, fontSize: '13px' }}>
                        {equipment.Fabricante || '-'}
                      </td>
                      <td style={{ padding: theme.spacing.sm, fontSize: '13px' }}>
                        {equipment.Status || equipment.Situacao || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.lg, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            backgroundColor: 'transparent',
            border: `1px solid ${theme.colors.gray[300]}`,
            borderRadius: theme.borderRadius.md,
            color: theme.colors.gray[700],
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Cancelar
        </button>
        {formItems.length > 0 && (
          <button
            onClick={onSave}
            disabled={formItems.some((item) => !item.equipmentGroupKey)}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.colors.primary,
              border: 'none',
              borderRadius: theme.borderRadius.md,
              color: theme.colors.white,
              cursor: formItems.some((item) => !item.equipmentGroupKey) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              opacity: formItems.some((item) => !item.equipmentGroupKey) ? 0.6 : 1,
            }}
          >
            <FiSave size={16} />
            Salvar
          </button>
        )}
      </div>

      {/* Modal para criar grupo MEL personalizado */}
      {showCreateGroupModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowCreateGroupModal(false)}
        >
          <div
            style={{
              backgroundColor: theme.colors.white,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.xl,
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: theme.shadows.lg,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: theme.spacing.lg,
              }}
            >
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: theme.colors.dark }}>
                Criar Grupo MEL
              </h3>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                style={{
                  padding: theme.spacing.xs,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.colors.gray[600],
                }}
              >
                <FiX size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 600, color: theme.colors.dark }}>
                  Nome do Grupo *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ex: MEL Monitores CC"
                  style={{
                    width: '100%',
                    padding: theme.spacing.sm,
                    border: `1px solid ${theme.colors.gray[300]}`,
                    borderRadius: theme.borderRadius.sm,
                    fontSize: '14px',
                    backgroundColor: theme.colors.white,
                    color: theme.colors.dark,
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 600, color: theme.colors.dark }}>
                  Quantidade Mínima *
                </label>
                <input
                  type="number"
                  min="0"
                  value={minimumQuantity}
                  onChange={(e) => setMinimumQuantity(parseInt(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: theme.spacing.sm,
                    border: `1px solid ${theme.colors.gray[300]}`,
                    borderRadius: theme.borderRadius.sm,
                    fontSize: '14px',
                    backgroundColor: theme.colors.white,
                    color: theme.colors.dark,
                  }}
                />
                <small style={{ fontSize: '12px', color: theme.colors.gray[600], marginTop: theme.spacing.xs, display: 'block' }}>
                  Quantidade mínima de equipamentos que devem estar disponíveis no setor
                </small>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 600, color: theme.colors.dark }}>
                  Justificativa / Motivo da Regra
                </label>
                <textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Explique por que esta regra MEL foi criada ou é necessária..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: theme.spacing.sm,
                    border: `1px solid ${theme.colors.gray[300]}`,
                    borderRadius: theme.borderRadius.sm,
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    backgroundColor: theme.colors.white,
                    color: theme.colors.dark,
                  }}
                />
                <small style={{ fontSize: '12px', color: theme.colors.gray[600], marginTop: theme.spacing.xs, display: 'block' }}>
                  Opcional: Explique o motivo desta regra MEL existir
                </small>
              </div>

              <div
                style={{
                  padding: theme.spacing.md,
                  backgroundColor: theme.colors.gray[50],
                  borderRadius: theme.borderRadius.md,
                  fontSize: '13px',
                  color: theme.colors.gray[700],
                }}
              >
                <strong>{selectedEquipments.size}</strong> equipamento(s) selecionado(s) serão incluídos neste grupo MEL.
              </div>
            </div>

            <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.lg, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  backgroundColor: 'transparent',
                  border: `1px solid ${theme.colors.gray[300]}`,
                  borderRadius: theme.borderRadius.md,
                  color: theme.colors.gray[700],
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCustomGroup}
                disabled={!groupName.trim() || minimumQuantity < 0}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  backgroundColor: theme.colors.primary,
                  border: 'none',
                  borderRadius: theme.borderRadius.md,
                  color: theme.colors.white,
                  cursor: !groupName.trim() || minimumQuantity < 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: !groupName.trim() || minimumQuantity < 0 ? 0.6 : 1,
                }}
              >
                <FiSave size={16} style={{ marginRight: theme.spacing.xs, verticalAlign: 'middle' }} />
                Criar Grupo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente de visualização de alertas
function AlertsView({
  alerts,
  isLoading,
  total,
  onConfigureSector,
}: {
  alerts: MelAlert[];
  isLoading: boolean;
  total: number;
  onConfigureSector?: (sectorId: number) => void;
}) {
  if (isLoading) {
    return <SkeletonScreen />;
  }

  return (
    <div
      style={{
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        boxShadow: theme.shadows.md,
      }}
    >
      <h2
        style={{
          margin: `0 0 ${theme.spacing.md} 0`,
          fontSize: '20px',
          fontWeight: 600,
          color: theme.colors.dark,
        }}
      >
        Alertas de MEL ({total})
      </h2>

      {alerts.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${theme.colors.gray[200]}` }}>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>
                  Setor
                </th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>
                  Tipo de Equipamento
                </th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '14px', fontWeight: 600 }}>
                  Disponível
                </th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '14px', fontWeight: 600 }}>
                  Mínimo
                </th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '14px', fontWeight: 600 }}>
                  Falta
                </th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>
                  Data do Alerta
                </th>
                {onConfigureSector && (
                  <th style={{ padding: theme.spacing.sm, textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {alerts.map((alerta) => (
                <tr
                  key={alerta.id}
                  style={{
                    borderBottom: `1px solid ${theme.colors.gray[100]}`,
                    backgroundColor: `${theme.colors.danger}05`,
                  }}
                >
                  <td style={{ padding: theme.spacing.sm, fontSize: '14px' }}>{alerta.sectorName}</td>
                  <td style={{ padding: theme.spacing.sm, fontSize: '14px' }}>
                    {alerta.equipmentGroupName || (alerta as any).equipmentTypeName}
                  </td>
                  <td
                    style={{
                      padding: theme.spacing.sm,
                      textAlign: 'right',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: theme.colors.danger,
                    }}
                  >
                    {alerta.currentAvailable}
                  </td>
                  <td style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '14px' }}>
                    {alerta.minimumQuantity}
                  </td>
                  <td
                    style={{
                      padding: theme.spacing.sm,
                      textAlign: 'right',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: theme.colors.danger,
                    }}
                  >
                    {alerta.minimumQuantity - alerta.currentAvailable}
                  </td>
                  <td style={{ padding: theme.spacing.sm, fontSize: '14px', color: theme.colors.gray[600] }}>
                    {new Date(alerta.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  {onConfigureSector && (
                    <td style={{ padding: theme.spacing.sm, textAlign: 'center' }}>
                      <button
                        onClick={() => onConfigureSector(alerta.sectorId)}
                        style={{
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          backgroundColor: theme.colors.primary,
                          color: theme.colors.white,
                          border: 'none',
                          borderRadius: theme.borderRadius.sm,
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: theme.spacing.xs,
                        }}
                        title="Configurar MEL deste setor"
                      >
                        <FiEdit size={14} />
                        Configurar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
          <FiCheckCircle size={48} color={theme.colors.success} style={{ marginBottom: theme.spacing.md }} />
          <p style={{ margin: 0, fontSize: '16px' }}>Nenhum alerta ativo no momento.</p>
        </div>
      )}
    </div>
  );
}

// Componente de modal para criar nova regra MEL
function CreateRuleModal({
  sectors,
  onClose,
  queryClient,
}: {
  sectors: Sector[];
  onClose: () => void;
  queryClient: any;
}) {
  const isMobile = useIsMobile();
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(null);
  const [equipmentGroupName, setEquipmentGroupName] = useState('');
  const [minimumQuantity, setMinimumQuantity] = useState(1);
  const [justificativa, setJustificativa] = useState('');
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<number>>(new Set());
  const [osList, setOsList] = useState<any[]>([]);
  const [osLoading, setOsLoading] = useState(false);

  // Buscar equipamentos do setor selecionado
  const { data: inventoryResponse, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory', selectedSectorId],
    queryFn: async () => {
      if (!selectedSectorId) throw new Error('Setor não selecionado');
      const url = `/api/ecm/lifecycle/inventario?page=1&pageSize=50000&setores=${selectedSectorId}`;
      const response = await apiClient.get<any>(url);
      
      if (response && Array.isArray(response)) {
        return { data: response, statistics: {}, pagination: {} };
      }
      if (response && response.data && Array.isArray(response.data)) {
        return response;
      }
      if (response && typeof response === 'object' && !Array.isArray(response)) {
        const arrayFields = Object.keys(response).filter(key => Array.isArray(response[key]));
        if (arrayFields.length > 0) {
          return { data: response[arrayFields[0]], statistics: response.statistics || {}, pagination: response.pagination || {} };
        }
      }
      return { data: [], statistics: {}, pagination: {} };
    },
    enabled: !!selectedSectorId,
  });

  const equipments = (() => {
    if (!inventoryResponse) return [];
    if (Array.isArray(inventoryResponse)) return inventoryResponse;
    if (inventoryResponse.data && Array.isArray(inventoryResponse.data)) return inventoryResponse.data;
    const arrayField = Object.values(inventoryResponse).find(val => Array.isArray(val));
    return arrayField || [];
  })();

  // Buscar OS quando equipamentos são selecionados
  useEffect(() => {
    if (selectedEquipmentIds.size > 0) {
      setOsLoading(true);
      apiClient
        .get('/api/ecm/os/analitica', {
          params: {
            tipoManutencao: 'Todos',
            periodo: 'AnoCorrente',
          },
        })
        .then((response: any) => {
          let osArray: any[] = [];
          
          if (Array.isArray(response)) {
            osArray = response;
          } else if (response?.items && Array.isArray(response.items)) {
            osArray = response.items;
          } else if (response?.data && Array.isArray(response.data)) {
            osArray = response.data;
          } else if (response?.Itens && Array.isArray(response.Itens)) {
            osArray = response.Itens;
          }
          
          setOsList(osArray);
        })
        .catch((error: any) => {
          console.warn('[CreateRuleModal] Erro ao buscar OS:', error);
          setOsList([]);
        })
        .finally(() => {
          setOsLoading(false);
        });
    } else {
      setOsList([]);
    }
  }, [selectedEquipmentIds.size]);

  // Calcular disponibilidade
  const calcularDisponibilidade = () => {
    if (selectedEquipmentIds.size === 0 || !equipments || equipments.length === 0) {
      return { total: 0, indisponiveis: 0, disponiveis: 0 };
    }

    const STATUS_INDISPONIVEL = ['sucateado', 'baixado', 'emprestado'];
    const OS_STATUS_BLOQUEANTES = ['aberta', 'em_andamento'];

    const equipamentosSelecionados = equipments.filter((eq: any) => selectedEquipmentIds.has(eq.Id));
    
    const indisponiveis = equipamentosSelecionados.filter((eq: any) => {
      const status = (eq.Status || eq.Situacao || '').toLowerCase();
      if (STATUS_INDISPONIVEL.some((s) => status.includes(s))) {
        return true;
      }

      const eqId = eq.Id || eq.id;
      const eqTag = (eq.Tag || eq.tag || '').trim().toUpperCase();
      
      if (!eqTag && !eqId) {
        return false;
      }

      const temOSBloqueante = osList.some((os) => {
        const osStatus = (os.SituacaoDaOS || os.Status || '').toLowerCase();
        if (!OS_STATUS_BLOQUEANTES.some((s) => osStatus.includes(s.toLowerCase()))) {
          return false;
        }

        const osTag = (os.Tag || (os as any).tag || '').trim().toUpperCase();
        if (osTag && eqTag && osTag === eqTag) {
          return true;
        }

        const osEquipamentoId = os.EquipamentoId || (os as any).equipamentoId;
        if (osEquipamentoId !== undefined && osEquipamentoId !== null && eqId) {
          if (osEquipamentoId === eqId || osEquipamentoId === String(eqId) || Number(osEquipamentoId) === eqId) {
            return true;
          }
          return false;
        }
        
        return false;
      });

      return temOSBloqueante;
    }).length;

    const total = equipamentosSelecionados.length;
    const disponiveis = total - indisponiveis;

    return { total, indisponiveis, disponiveis };
  };

  const disponibilidade = calcularDisponibilidade();
  const emAlerta = disponibilidade.disponiveis < minimumQuantity;

  const toggleEquipmentSelection = (equipmentId: number) => {
    const newSelected = new Set(selectedEquipmentIds);
    if (newSelected.has(equipmentId)) {
      newSelected.delete(equipmentId);
    } else {
      newSelected.add(equipmentId);
    }
    setSelectedEquipmentIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedEquipmentIds.size === equipments.length) {
      setSelectedEquipmentIds(new Set());
    } else {
      setSelectedEquipmentIds(new Set(equipments.map((eq: any) => eq.Id)));
    }
  };

  // Mutation para criar regra
  const createRuleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSectorId) throw new Error('Selecione um setor');
      if (selectedEquipmentIds.size === 0) throw new Error('Selecione pelo menos um equipamento');
      if (!equipmentGroupName.trim()) throw new Error('Digite um nome para o grupo');

      const sectorName = sectors.find(s => s.id === selectedSectorId)?.name || `Setor ${selectedSectorId}`;
      const equipmentGroupKey = `custom_${equipmentGroupName.replace(/\s+/g, '_').toUpperCase()}_${selectedSectorId}_${Date.now()}`;

      return apiClient.post(`/api/ecm/mel/sector/${selectedSectorId}`, {
        items: [{
          equipmentGroupKey,
          equipmentGroupName: equipmentGroupName.trim(),
          minimumQuantity,
          justificativa: justificativa.trim() || null,
          equipmentIds: Array.from(selectedEquipmentIds),
        }],
      });
    },
    onSuccess: () => {
      toast.success('Regra criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['mel-summary'] });
      queryClient.invalidateQueries({ queryKey: ['mel-alerts'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao criar regra');
    },
  });

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: theme.spacing.md,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: theme.shadows.xl,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: theme.colors.dark }}>Criar Nova Regra MEL</h2>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: theme.colors.gray[600],
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <FiX size={24} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}>
          {/* Seleção de setor */}
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontWeight: 600, color: theme.colors.dark }}>
              Setor *
            </label>
            <select
              value={selectedSectorId || ''}
              onChange={(e) => {
                setSelectedSectorId(Number(e.target.value) || null);
                setSelectedEquipmentIds(new Set()); // Limpar seleção ao trocar setor
              }}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                borderRadius: theme.borderRadius.md,
                fontSize: '14px',
                backgroundColor: theme.colors.white,
                color: theme.colors.dark,
              }}
            >
              <option value="" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Selecione um setor</option>
              {sectors.map((sector) => (
                <option key={sector.id} value={sector.id} style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>
                  {sector.name}
                </option>
              ))}
            </select>
          </div>

          {/* Nome do grupo */}
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontWeight: 600, color: theme.colors.dark }}>
              Nome do Grupo de Equipamentos *
            </label>
            <input
              type="text"
              value={equipmentGroupName}
              onChange={(e) => setEquipmentGroupName(e.target.value)}
              placeholder="Ex: Monitores UTI Adulto"
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                borderRadius: theme.borderRadius.md,
                fontSize: '14px',
              }}
            />
          </div>

          {/* Quantidade mínima */}
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontWeight: 600, color: theme.colors.dark }}>
              Quantidade Mínima *
            </label>
            <input
              type="number"
              min="1"
              value={minimumQuantity}
              onChange={(e) => setMinimumQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                borderRadius: theme.borderRadius.md,
                fontSize: '14px',
              }}
            />
          </div>

          {/* Justificativa */}
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontWeight: 600, color: theme.colors.dark }}>
              Justificativa
            </label>
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Ex: RDC 930 - Norma técnica obrigatória"
              rows={3}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                borderRadius: theme.borderRadius.md,
                fontSize: '14px',
                resize: 'vertical',
                backgroundColor: theme.colors.white,
                color: theme.colors.dark,
              }}
            />
          </div>

          {/* Indicadores de disponibilidade */}
          {selectedEquipmentIds.size > 0 && (
            <div
              style={{
                backgroundColor: theme.colors.gray[50],
                padding: theme.spacing.md,
                borderRadius: theme.borderRadius.md,
                display: 'flex',
                gap: theme.spacing.md,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <span style={{ fontSize: '12px', color: theme.colors.gray[600] }}>Total: </span>
                <span style={{ fontSize: '16px', fontWeight: 600, color: theme.colors.dark }}>{disponibilidade.total}</span>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: theme.colors.gray[600] }}>Indisponíveis: </span>
                <span style={{ fontSize: '16px', fontWeight: 600, color: theme.colors.danger }}>{disponibilidade.indisponiveis}</span>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: theme.colors.gray[600] }}>Disponíveis: </span>
                <span style={{ fontSize: '16px', fontWeight: 600, color: theme.colors.success }}>{disponibilidade.disponiveis}</span>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: theme.colors.gray[600] }}>Mínimo: </span>
                <span style={{ fontSize: '16px', fontWeight: 600, color: emAlerta ? theme.colors.danger : theme.colors.dark }}>{minimumQuantity}</span>
              </div>
              {emAlerta && (
                  <div style={{ marginLeft: 'auto' }}>
                    <span style={{ fontSize: '12px', color: theme.colors.danger, fontWeight: 600 }}>
                      ⚠️ Em alerta (Disponível {'<'} Mínimo)
                    </span>
                  </div>
              )}
            </div>
          )}

          {/* Lista de equipamentos */}
          {selectedSectorId && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
                <label style={{ fontWeight: 600, color: theme.colors.dark }}>
                  Selecionar Equipamentos * ({selectedEquipmentIds.size} selecionados)
                </label>
                {equipments.length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    style={{
                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                      backgroundColor: theme.colors.primary,
                      color: theme.colors.white,
                      border: 'none',
                      borderRadius: theme.borderRadius.sm,
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {selectedEquipmentIds.size === equipments.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                )}
              </div>

              {inventoryLoading ? (
                <LoadingSpinner />
              ) : equipments.length === 0 ? (
                <p style={{ color: theme.colors.gray[600] }}>Nenhum equipamento encontrado neste setor.</p>
              ) : (
                <div style={{ maxHeight: '300px', overflow: 'auto', border: `1px solid ${theme.colors.gray[200]}`, borderRadius: theme.borderRadius.md }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: theme.colors.gray[100] }}>
                      <tr>
                        <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '12px', fontWeight: 600, width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={selectedEquipmentIds.size === equipments.length && equipments.length > 0}
                            onChange={toggleSelectAll}
                            style={{ cursor: 'pointer' }}
                          />
                        </th>
                        <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Tag</th>
                        <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Equipamento</th>
                        <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Marca/Fabricante</th>
                        <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Modelo</th>
                        <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipments.map((eq: any) => {
                        const isSelected = selectedEquipmentIds.has(eq.Id);
                        const status = (eq.Status || eq.Situacao || '').toLowerCase();
                        const STATUS_INDISPONIVEL = ['sucateado', 'baixado', 'emprestado'];
                        const isUnavailable = STATUS_INDISPONIVEL.some((s) => status.includes(s));
                        
                        return (
                          <tr
                            key={eq.Id}
                            style={{
                              backgroundColor: isSelected ? `${theme.colors.primary}10` : 'transparent',
                              cursor: 'pointer',
                            }}
                            onClick={() => toggleEquipmentSelection(eq.Id)}
                          >
                            <td style={{ padding: theme.spacing.sm }} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleEquipmentSelection(eq.Id)}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ padding: theme.spacing.sm, fontSize: '13px' }}>{eq.Tag || '-'}</td>
                            <td style={{ padding: theme.spacing.sm, fontSize: '13px' }}>{eq.Equipamento || '-'}</td>
                            <td style={{ padding: theme.spacing.sm, fontSize: '13px' }}>{eq.Fabricante || eq.Marca || '-'}</td>
                            <td style={{ padding: theme.spacing.sm, fontSize: '13px' }}>{eq.Modelo || '-'}</td>
                            <td style={{ padding: theme.spacing.sm, fontSize: '13px', color: isUnavailable ? theme.colors.danger : theme.colors.gray[600] }}>
                              {status || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botões de ação */}
        <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end', marginTop: theme.spacing.xl }}>
          <button
            onClick={onClose}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.colors.gray[200],
              color: theme.colors.dark,
              border: 'none',
              borderRadius: theme.borderRadius.md,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => createRuleMutation.mutate()}
            disabled={createRuleMutation.isPending || !selectedSectorId || selectedEquipmentIds.size === 0 || !equipmentGroupName.trim()}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: createRuleMutation.isPending || !selectedSectorId || selectedEquipmentIds.size === 0 || !equipmentGroupName.trim() ? theme.colors.gray[300] : theme.colors.success,
              color: theme.colors.white,
              border: 'none',
              borderRadius: theme.borderRadius.md,
              cursor: createRuleMutation.isPending || !selectedSectorId || selectedEquipmentIds.size === 0 || !equipmentGroupName.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
            }}
          >
            {createRuleMutation.isPending ? (
              <>
                <LoadingSpinner />
                Criando...
              </>
            ) : (
              <>
                <FiSave size={16} />
                Criar Regra
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente de card de estatística
function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: any;
  color: string;
}) {
  return (
    <div
      style={{
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        boxShadow: theme.shadows.md,
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.md,
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={24} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '12px', color: theme.colors.gray[600], marginBottom: theme.spacing.xs }}>
          {title}
        </div>
        <div style={{ fontSize: '28px', fontWeight: 700, color: theme.colors.dark }}>{value}</div>
      </div>
    </div>
  );
}

