// src/web/routes/ConfigPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiSettings, FiSave, FiX, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { theme } from '../styles/theme';
import { usePermissions } from '../hooks/usePermissions';
import { Navigate } from 'react-router-dom';

interface MaintenanceType {
  id: string | null;
  key: string;
  value: string | null; // 'corretiva' | 'preventiva' | null
  active: boolean;
  category: string;
}

interface Workshop {
  id: string | null;
  key: string;
  value: string | null; // 'enabled' | null
  active: boolean;
  category: string;
}

export default function ConfigPage() {
  const { isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Se não for admin, redirecionar
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Buscar todos os tipos encontrados nas OS
  const { data: maintenanceTypes, isLoading } = useQuery<MaintenanceType[]>({
    queryKey: ['config', 'maintenance-types', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/config/maintenance-types/all');
      if (!res.ok) throw new Error('Erro ao buscar tipos de manutenção');
      return res.json();
    },
  });

  // Buscar todas as oficinas encontradas nas OS
  const { data: workshops, isLoading: isLoadingWorkshops } = useQuery<Workshop[]>({
    queryKey: ['config', 'workshops', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/config/workshops/all');
      if (!res.ok) throw new Error('Erro ao buscar oficinas');
      return res.json();
    },
  });

  // Mutation para salvar classificação
  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await fetch('/api/config/maintenance-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Erro ao salvar configuração');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      setEditingKey(null);
      setEditValue('');
    },
  });

  // Mutation para salvar configuração de oficina
  const saveWorkshopMutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const res = await fetch('/api/config/workshops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Erro ao salvar configuração');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });

  const handleEdit = (type: MaintenanceType) => {
    setEditingKey(type.key);
    setEditValue(type.value || '');
  };

  const handleSave = (key: string) => {
    if (!editValue || !['corretiva', 'preventiva', 'aguardando_compras'].includes(editValue.toLowerCase())) {
      alert('Selecione uma classificação válida (Corretiva, Preventiva ou Aguardando Compras)');
      return;
    }
    saveMutation.mutate({ key, value: editValue });
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const getValueLabel = (value: string | null): string => {
    if (!value) return 'Não classificado';
    if (value.toLowerCase() === 'corretiva') return 'Corretiva';
    if (value.toLowerCase() === 'preventiva') return 'Preventiva';
    if (value.toLowerCase() === 'aguardando_compras') return 'Aguardando Compras';
    return value;
  };

  const getValueColor = (value: string | null): string => {
    if (!value) return theme.colors.gray[500];
    if (value.toLowerCase() === 'corretiva') return theme.colors.danger;
    if (value.toLowerCase() === 'preventiva') return theme.colors.info;
    if (value.toLowerCase() === 'aguardando_compras') return theme.colors.warning;
    return theme.colors.gray[500];
  };

  return (
    <div style={{ padding: theme.spacing.xl, maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: theme.spacing.xl }}>
        <h1
          style={{
            margin: 0,
            marginBottom: theme.spacing.sm,
            color: theme.colors.dark,
            fontSize: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          <FiSettings size={32} color={theme.colors.primary} />
          Configurações do Sistema
        </h1>
        <p style={{ color: theme.colors.gray[600], margin: 0, fontSize: '16px' }}>
          Configure as classificações de tipos de manutenção para o dashboard
        </p>
      </div>

      {/* Card de Classificação de Tipos de Manutenção */}
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          boxShadow: theme.shadows.md,
          marginBottom: theme.spacing.xl,
        }}
      >
        <h2
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
          <FiSettings size={20} />
          Classificação de Tipos de Manutenção
        </h2>
        <p style={{ color: theme.colors.gray[600], margin: `0 0 ${theme.spacing.lg} 0`, fontSize: '14px' }}>
          Classifique cada tipo de manutenção encontrado nas OS como <strong>Corretiva</strong>, <strong>Preventiva</strong> ou <strong>Aguardando Compras</strong>.
          Apenas OS classificadas como <strong>Corretiva</strong> ou <strong>Aguardando Compras</strong> e que estejam abertas serão consideradas no dashboard de equipamentos em manutenção.
        </p>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
            Carregando tipos de manutenção...
          </div>
        ) : !maintenanceTypes || maintenanceTypes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
            Nenhum tipo de manutenção encontrado nas OS.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
            {maintenanceTypes.map((type) => (
              <div
                key={type.key}
                style={{
                  border: `1px solid ${theme.colors.gray[200]}`,
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.md,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: theme.spacing.md,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.primary;
                  e.currentTarget.style.backgroundColor = theme.colors.gray[50];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.gray[200];
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: theme.colors.dark,
                      marginBottom: theme.spacing.xs / 2,
                    }}
                  >
                    {type.key}
                  </div>
                  {editingKey === type.key ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
                      <select
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        style={{
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          border: `1px solid ${theme.colors.gray[300]}`,
                          fontSize: '14px',
                          minWidth: '180px',
                        }}
                      >
                        <option value="">Selecione...</option>
                        <option value="corretiva">Corretiva</option>
                        <option value="preventiva">Preventiva</option>
                        <option value="aguardando_compras">Aguardando Compras</option>
                      </select>
                      <button
                        onClick={() => handleSave(type.key)}
                        disabled={saveMutation.isPending}
                        style={{
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          borderRadius: theme.borderRadius.sm,
                          border: 'none',
                          backgroundColor: theme.colors.success,
                          color: theme.colors.white,
                          cursor: saveMutation.isPending ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing.xs / 2,
                          fontSize: '13px',
                          fontWeight: 500,
                          opacity: saveMutation.isPending ? 0.6 : 1,
                        }}
                      >
                        <FiSave size={14} />
                        Salvar
                      </button>
                      <button
                        onClick={handleCancel}
                        style={{
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          borderRadius: theme.borderRadius.sm,
                          border: `1px solid ${theme.colors.gray[300]}`,
                          backgroundColor: 'transparent',
                          color: theme.colors.gray[700],
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing.xs / 2,
                          fontSize: '13px',
                        }}
                      >
                        <FiX size={14} />
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
                      <span
                        style={{
                          fontSize: '13px',
                          color: theme.colors.gray[600],
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing.xs / 2,
                        }}
                      >
                        Classificação:
                        <span
                          style={{
                            color: getValueColor(type.value),
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.xs / 2,
                          }}
                        >
                          {type.value ? (
                            <>
                              <FiCheckCircle size={14} />
                              {getValueLabel(type.value)}
                            </>
                          ) : (
                            <>
                              <FiAlertCircle size={14} />
                              {getValueLabel(type.value)}
                            </>
                          )}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
                {editingKey !== type.key && (
                  <button
                    onClick={() => handleEdit(type)}
                    style={{
                      padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                      borderRadius: theme.borderRadius.sm,
                      border: `1px solid ${theme.colors.primary}`,
                      backgroundColor: 'transparent',
                      color: theme.colors.primary,
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.primary;
                      e.currentTarget.style.color = theme.colors.white;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = theme.colors.primary;
                    }}
                  >
                    {type.value ? 'Editar' : 'Classificar'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {saveMutation.isError && (
          <div
            style={{
              marginTop: theme.spacing.md,
              padding: theme.spacing.sm,
              backgroundColor: `${theme.colors.danger}15`,
              color: theme.colors.danger,
              borderRadius: theme.borderRadius.sm,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
            }}
          >
            <FiAlertCircle size={16} />
            {saveMutation.error instanceof Error ? saveMutation.error.message : 'Erro ao salvar configuração'}
          </div>
        )}
      </div>

      {/* Card de Configuração de Oficinas */}
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          boxShadow: theme.shadows.md,
          marginBottom: theme.spacing.xl,
        }}
      >
        <h2
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
          <FiSettings size={20} />
          Configuração de Oficinas
        </h2>
        <p style={{ color: theme.colors.gray[600], margin: `0 0 ${theme.spacing.lg} 0`, fontSize: '14px' }}>
          Selecione quais oficinas devem ser exibidas no sistema. Apenas oficinas habilitadas serão consideradas nas visualizações e relatórios.
        </p>

        {isLoadingWorkshops ? (
          <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
            Carregando oficinas...
          </div>
        ) : !workshops || workshops.length === 0 ? (
          <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
            Nenhuma oficina encontrada nas OS.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
            {workshops.map((workshop) => (
              <div
                key={workshop.key}
                style={{
                  border: `1px solid ${theme.colors.gray[200]}`,
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.md,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: theme.spacing.md,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.primary;
                  e.currentTarget.style.backgroundColor = theme.colors.gray[50];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.gray[200];
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: theme.colors.dark,
                      marginBottom: theme.spacing.xs / 2,
                    }}
                  >
                    {workshop.key}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
                    <span
                      style={{
                        fontSize: '13px',
                        color: theme.colors.gray[600],
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing.xs / 2,
                      }}
                    >
                      Status:
                      <span
                        style={{
                          color: workshop.value === 'enabled' ? theme.colors.success : theme.colors.gray[500],
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing.xs / 2,
                        }}
                      >
                        {workshop.value === 'enabled' ? (
                          <>
                            <FiCheckCircle size={14} />
                            Habilitada
                          </>
                        ) : (
                          <>
                            <FiAlertCircle size={14} />
                            Desabilitada
                          </>
                        )}
                      </span>
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newEnabled = workshop.value !== 'enabled';
                    saveWorkshopMutation.mutate({ key: workshop.key, enabled: newEnabled });
                  }}
                  disabled={saveWorkshopMutation.isPending}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                    borderRadius: theme.borderRadius.sm,
                    border: `1px solid ${workshop.value === 'enabled' ? theme.colors.danger : theme.colors.success}`,
                    backgroundColor: workshop.value === 'enabled' ? theme.colors.danger : theme.colors.success,
                    color: theme.colors.white,
                    cursor: saveWorkshopMutation.isPending ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    opacity: saveWorkshopMutation.isPending ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!saveWorkshopMutation.isPending) {
                      e.currentTarget.style.opacity = '0.9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!saveWorkshopMutation.isPending) {
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                >
                  {workshop.value === 'enabled' ? 'Desabilitar' : 'Habilitar'}
                </button>
              </div>
            ))}
          </div>
        )}

        {saveWorkshopMutation.isError && (
          <div
            style={{
              marginTop: theme.spacing.md,
              padding: theme.spacing.sm,
              backgroundColor: `${theme.colors.danger}15`,
              color: theme.colors.danger,
              borderRadius: theme.borderRadius.sm,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
            }}
          >
            <FiAlertCircle size={16} />
            {saveWorkshopMutation.error instanceof Error ? saveWorkshopMutation.error.message : 'Erro ao salvar configuração'}
          </div>
        )}
      </div>

      {/* Informações */}
      <div
        style={{
          backgroundColor: `${theme.colors.info}10`,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          border: `1px solid ${theme.colors.info}30`,
        }}
      >
        <h3 style={{ margin: `0 0 ${theme.spacing.xs} 0`, fontSize: '14px', fontWeight: 600, color: theme.colors.dark }}>
          Como funciona?
        </h3>
        <ul style={{ margin: 0, paddingLeft: theme.spacing.lg, color: theme.colors.gray[700], fontSize: '13px', lineHeight: '1.6' }}>
          <li>
            <strong>Corretiva:</strong> Manutenções não planejadas que corrigem falhas ou problemas. Aparecem no dashboard de equipamentos em manutenção.
          </li>
          <li>
            <strong>Preventiva:</strong> Manutenções planejadas para prevenir problemas. Não são consideradas no dashboard de equipamentos em manutenção.
          </li>
          <li>
            <strong>Aguardando Compras:</strong> Manutenções que estão aguardando compra de peças ou materiais. Aparecem no dashboard de equipamentos em manutenção.
          </li>
          <li>
            Os tipos são extraídos automaticamente das OS existentes. Classifique cada tipo uma vez e a configuração será aplicada em todo o sistema.
          </li>
          <li>
            <strong>Oficinas:</strong> As oficinas são extraídas automaticamente das OS. Habilite apenas as oficinas que devem aparecer no sistema. Oficinas desabilitadas serão filtradas em todas as visualizações.
          </li>
        </ul>
      </div>
    </div>
  );
}

