// src/web/routes/PurchaseRequestsPage.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FiShoppingCart,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiFilter,
  FiX,
  FiCalendar,
  FiFileText,
  FiPackage,
  FiClipboard,
  FiSave,
  FiCheckCircle,
  FiAlertCircle,
} from 'react-icons/fi';
import { theme } from '../styles/theme';
import { formatBrazilianDate } from '../utils/dateUtils';
import { usePermissions } from '../hooks/usePermissions';
import { useIsMobile } from '../hooks/useMediaQuery';
import { getResponsivePadding } from '../utils/responsive';
import { apiClient } from '../lib/apiClient';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import SkeletonScreen from '../components/SkeletonScreen';
import ConfirmationDialog from '../components/ConfirmationDialog';
import toast from 'react-hot-toast';

interface PurchaseRequest {
  id: string;
  numeroSolicitacao?: string | null;
  sectorId: number;
  sectorName?: string | null;
  description: string;
  status: string;
  dataSolicitacao: string;
  dataEntrega?: string | null;
  observacoes?: string | null;
  diasEspera?: number | null; // Dias desde a solicitação até hoje
  serviceOrders?: Array<{
    id: string;
    codigoSerialOS: number;
    osCodigo?: string | null;
  }>;
  investments?: Array<{
    id: string;
    titulo: string;
    categoria: string;
    valorEstimado: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Sector {
  id: number;
  name: string;
}

export default function PurchaseRequestsPage() {
  const { isAdmin, allowedSectors } = usePermissions();
  const isMobile = useIsMobile();
  const padding = getResponsivePadding(isMobile, false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ status?: string; sectorId?: number }>({});
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });
  const [osModal, setOsModal] = useState<{ isOpen: boolean; codigoSerialOS: number | null }>({
    isOpen: false,
    codigoSerialOS: null,
  });
  const [investmentModal, setInvestmentModal] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });

  const queryClient = useQueryClient();

  // Buscar solicitações de compra
  const { data: purchaseRequests, isLoading, error, refetch } = useQuery({
    queryKey: ['purchase-requests', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.sectorId) params.append('sectorId', String(filters.sectorId));
      
      const response = await apiClient.get(`/api/ecm/purchase-requests?${params.toString()}`);
      return response;
    },
  });

  // Buscar setores
  const { data: sectors } = useQuery({
    queryKey: ['sectors'],
    queryFn: async () => {
      const response = await apiClient.get('/api/ecm/investments/sectors/list');
      return response.sectors || [];
    },
  });

  // Buscar OS
  const { data: osList } = useQuery({
    queryKey: ['os-list'],
    queryFn: async () => {
      const response = await apiClient.get('/api/ecm/os');
      return Array.isArray(response) ? response : [];
    },
  });

  // Buscar investimentos
  const { data: investmentsList } = useQuery({
    queryKey: ['investments-list'],
    queryFn: async () => {
      const response = await apiClient.get('/api/ecm/investments');
      return Array.isArray(response) ? response : [];
    },
  });

  // Mutation para criar/atualizar
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingId) {
        return await apiClient.patch(`/api/ecm/purchase-requests/${editingId}`, data);
      } else {
        return await apiClient.post('/api/ecm/purchase-requests', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      setShowForm(false);
      setEditingId(null);
      toast.success(editingId ? 'Solicitação atualizada com sucesso!' : 'Solicitação criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao salvar solicitação');
    },
  });

  // Mutation para deletar
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/api/ecm/purchase-requests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      setDeleteConfirm({ isOpen: false, id: null });
      toast.success('Solicitação excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao excluir solicitação');
    },
  });

  const handleDelete = () => {
    if (deleteConfirm.id) {
      deleteMutation.mutate(deleteConfirm.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendente':
        return theme.colors.warning;
      case 'Aprovada':
        return theme.colors.success;
      case 'Em Compra':
        return theme.colors.info;
      case 'Entregue':
        return theme.colors.success;
      case 'Cancelada':
        return theme.colors.danger;
      default:
        return theme.colors.gray[600];
    }
  };

  const filteredRequests = useMemo(() => {
    if (!purchaseRequests) return [];
    return purchaseRequests.filter((pr: PurchaseRequest) => {
      if (filters.status && pr.status !== filters.status) return false;
      if (filters.sectorId && pr.sectorId !== filters.sectorId) return false;
      return true;
    });
  }, [purchaseRequests, filters]);

  return (
    <div style={{ padding, minHeight: '100vh', backgroundColor: theme.colors.gray[50] }}>
      {/* Dialog de confirmação de exclusão */}
      <ConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        title="Excluir Solicitação de Compra"
        message="Tem certeza que deseja excluir esta solicitação de compra? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteConfirm.id) {
            deleteMutation.mutate(deleteConfirm.id);
          }
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
      />

      {/* Modal de detalhes da OS */}
      <OSDetailModal
        isOpen={osModal.isOpen}
        codigoSerialOS={osModal.codigoSerialOS}
        onClose={() => setOsModal({ isOpen: false, codigoSerialOS: null })}
      />

      {/* Modal de detalhes do Investimento */}
      <InvestmentDetailModal
        isOpen={investmentModal.isOpen}
        investmentId={investmentModal.id}
        onClose={() => setInvestmentModal({ isOpen: false, id: null })}
      />

      {/* Header */}
      <div style={{ marginBottom: theme.spacing.lg }}>
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
              <FiShoppingCart size={isMobile ? 28 : 32} color={theme.colors.primary} />
              Solicitações de Compra
            </h1>
            <p style={{ color: theme.colors.gray[600], margin: `${theme.spacing.xs} 0 0 0` }}>
              Gerencie solicitações de compra vinculadas a ordens de serviço e investimentos
            </p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setShowForm(true);
            }}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.colors.primary,
              border: 'none',
              borderRadius: theme.borderRadius.md,
              color: theme.colors.white,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
            }}
          >
            <FiPlus size={18} />
            Nova Solicitação
          </button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
            boxShadow: theme.shadows.sm,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: theme.spacing.md }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: theme.colors.dark, marginBottom: theme.spacing.xs }}>
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  borderRadius: theme.borderRadius.sm,
                  fontSize: '14px',
                  backgroundColor: theme.colors.white,
                  color: theme.colors.dark,
                }}
              >
                <option value="" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Todos</option>
                <option value="Pendente" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Pendente</option>
                <option value="Aprovada" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Aprovada</option>
                <option value="Em Compra" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Em Compra</option>
                <option value="Entregue" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Entregue</option>
                <option value="Cancelada" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Cancelada</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: theme.colors.dark, marginBottom: theme.spacing.xs }}>
                Setor
              </label>
              <select
                value={filters.sectorId || ''}
                onChange={(e) => setFilters({ ...filters, sectorId: e.target.value ? Number(e.target.value) : undefined })}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  borderRadius: theme.borderRadius.sm,
                  fontSize: '14px',
                  backgroundColor: theme.colors.white,
                  color: theme.colors.dark,
                }}
              >
                <option value="" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Todos</option>
                {sectors?.map((sector: Sector) => (
                  <option key={sector.id} value={sector.id} style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>
                    {sector.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Botão para mostrar/ocultar filtros */}
      <div style={{ marginBottom: theme.spacing.md, display: 'flex', gap: theme.spacing.sm }}>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            backgroundColor: theme.colors.white,
            border: `1px solid ${theme.colors.gray[300]}`,
            borderRadius: theme.borderRadius.md,
            color: theme.colors.dark,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
          }}
        >
          <FiFilter size={16} />
          {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
        </button>
      </div>

      {/* Loading */}
      {isLoading && <SkeletonScreen />}

      {/* Error */}
      {error && <ErrorMessage message="Erro ao carregar solicitações de compra" />}

      {/* Lista de solicitações */}
      {purchaseRequests && purchaseRequests.length > 0 ? (
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            boxShadow: theme.shadows.md,
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${theme.colors.gray[200]}` }}>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Nº Solicitação</th>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Setor</th>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Descrição</th>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Data Solicitação</th>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Dias Esperando</th>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Data Entrega</th>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>OS Vinculadas</th>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Investimentos</th>
                  <th style={{ padding: theme.spacing.sm, textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((pr) => (
                  <tr
                    key={pr.id}
                    style={{
                      borderBottom: `1px solid ${theme.colors.gray[100]}`,
                    }}
                  >
                    <td style={{ padding: theme.spacing.sm, fontSize: '14px' }}>
                      {pr.numeroSolicitacao || '-'}
                    </td>
                    <td style={{ padding: theme.spacing.sm, fontSize: '14px' }}>
                      {pr.sectorName || `Setor ${pr.sectorId}`}
                    </td>
                    <td style={{ padding: theme.spacing.sm, fontSize: '14px' }}>
                      {pr.description}
                    </td>
                    <td style={{ padding: theme.spacing.sm, fontSize: '14px' }}>
                      <span
                        style={{
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          backgroundColor: `${getStatusColor(pr.status)}20`,
                          color: getStatusColor(pr.status),
                          borderRadius: theme.borderRadius.sm,
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {pr.status}
                      </span>
                    </td>
                    <td style={{ padding: theme.spacing.sm, fontSize: '14px' }}>
                      {formatBrazilianDate(pr.dataSolicitacao)}
                    </td>
                    <td style={{ padding: theme.spacing.sm, fontSize: '14px' }}>
                      {pr.diasEspera !== null && pr.diasEspera !== undefined ? (
                        <span
                          style={{
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            backgroundColor: pr.diasEspera > 30 
                              ? `${theme.colors.danger}20` 
                              : pr.diasEspera > 15 
                              ? `${theme.colors.warning}20` 
                              : `${theme.colors.success}20`,
                            color: pr.diasEspera > 30 
                              ? theme.colors.danger 
                              : pr.diasEspera > 15 
                              ? theme.colors.warning 
                              : theme.colors.success,
                            borderRadius: theme.borderRadius.sm,
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          {pr.diasEspera} dia{pr.diasEspera !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ padding: theme.spacing.sm, fontSize: '14px' }}>
                      {pr.dataEntrega ? formatBrazilianDate(pr.dataEntrega) : '-'}
                    </td>
                    <td style={{ padding: theme.spacing.sm, fontSize: '14px' }}>
                      {pr.serviceOrders && pr.serviceOrders.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                          {pr.serviceOrders.map((os) => (
                            <span
                              key={os.id}
                              onClick={() => setOsModal({ isOpen: true, codigoSerialOS: os.codigoSerialOS })}
                              style={{
                                fontSize: '12px',
                                color: theme.colors.primary,
                                cursor: 'pointer',
                                textDecoration: 'underline',
                              }}
                              title="Clique para ver detalhes"
                            >
                              {os.osCodigo || os.codigoSerialOS}
                            </span>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ padding: theme.spacing.sm, fontSize: '14px' }}>
                      {pr.investments && pr.investments.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                          {pr.investments.map((inv) => (
                            <span
                              key={inv.id}
                              onClick={() => setInvestmentModal({ isOpen: true, id: inv.id })}
                              style={{
                                fontSize: '12px',
                                color: theme.colors.primary,
                                cursor: 'pointer',
                                textDecoration: 'underline',
                              }}
                              title="Clique para ver detalhes"
                            >
                              {inv.titulo}
                            </span>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ padding: theme.spacing.sm, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: theme.spacing.xs, justifyContent: 'center' }}>
                        <button
                          onClick={() => {
                            setEditingId(pr.id);
                            setShowForm(true);
                          }}
                          style={{
                            padding: theme.spacing.xs,
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: theme.colors.primary,
                          }}
                          title="Editar"
                        >
                          <FiEdit size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, id: pr.id })}
                          style={{
                            padding: theme.spacing.xs,
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: theme.colors.danger,
                          }}
                          title="Excluir"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            textAlign: 'center',
            boxShadow: theme.shadows.md,
          }}
        >
          <FiShoppingCart size={48} color={theme.colors.gray[400]} style={{ marginBottom: theme.spacing.md }} />
          <p style={{ margin: 0, color: theme.colors.gray[600], fontSize: '16px' }}>
            Nenhuma solicitação de compra encontrada.
          </p>
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <PurchaseRequestForm
          purchaseRequest={purchaseRequests?.find((pr: PurchaseRequest) => pr.id === editingId)}
          sectors={sectors || []}
          osList={osList || []}
          investmentsList={investmentsList || []}
          onSave={(data) => saveMutation.mutate(data)}
          onCancel={() => {
            setShowForm(false);
            setEditingId(null);
          }}
          isLoading={saveMutation.isPending}
        />
      )}
    </div>
  );
}

// Componente de formulário
function PurchaseRequestForm({
  purchaseRequest,
  sectors,
  osList,
  investmentsList,
  onSave,
  onCancel,
  isLoading,
}: {
  purchaseRequest?: PurchaseRequest;
  sectors: Sector[];
  osList: any[];
  investmentsList: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    numeroSolicitacao: purchaseRequest?.numeroSolicitacao || '',
    sectorId: purchaseRequest?.sectorId || (sectors[0]?.id || ''),
    sectorName: purchaseRequest?.sectorName || '',
    description: purchaseRequest?.description || '',
    status: purchaseRequest?.status || 'Pendente',
    dataSolicitacao: purchaseRequest?.dataSolicitacao 
      ? purchaseRequest.dataSolicitacao.split('T')[0] 
      : new Date().toISOString().split('T')[0],
    dataEntrega: purchaseRequest?.dataEntrega 
      ? purchaseRequest.dataEntrega.split('T')[0] 
      : '',
    observacoes: purchaseRequest?.observacoes || '',
    serviceOrderIds: purchaseRequest?.serviceOrders?.map(os => os.codigoSerialOS) || [],
    investmentIds: purchaseRequest?.investments?.map(inv => inv.id) || [],
  });

  // Resetar formulário quando purchaseRequest mudar (ou quando for undefined para nova solicitação)
  useEffect(() => {
    if (purchaseRequest) {
      setFormData({
        numeroSolicitacao: purchaseRequest.numeroSolicitacao || '',
        sectorId: purchaseRequest.sectorId || (sectors[0]?.id || ''),
        sectorName: purchaseRequest.sectorName || '',
        description: purchaseRequest.description || '',
        status: purchaseRequest.status || 'Pendente',
        dataSolicitacao: purchaseRequest.dataSolicitacao 
          ? purchaseRequest.dataSolicitacao.split('T')[0] 
          : new Date().toISOString().split('T')[0],
        dataEntrega: purchaseRequest.dataEntrega 
          ? purchaseRequest.dataEntrega.split('T')[0] 
          : '',
        observacoes: purchaseRequest.observacoes || '',
        serviceOrderIds: purchaseRequest.serviceOrders?.map(os => os.codigoSerialOS) || [],
        investmentIds: purchaseRequest.investments?.map(inv => inv.id) || [],
      });
    } else {
      // Nova solicitação - resetar formulário
      setFormData({
        numeroSolicitacao: '',
        sectorId: sectors[0]?.id || '',
        sectorName: sectors[0]?.name || '',
        description: '',
        status: 'Pendente',
        dataSolicitacao: new Date().toISOString().split('T')[0],
        dataEntrega: '',
        observacoes: '',
        serviceOrderIds: [],
        investmentIds: [],
      });
    }
  }, [purchaseRequest, sectors]);

  const selectedSector = sectors.find(s => s.id === formData.sectorId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Preparar serviceOrderIds - usar CodigoSerialOS (número) ou id (string) conforme disponível
    const serviceOrderIds = (formData.serviceOrderIds || []).map(id => {
      // Se for número, usar como CodigoSerialOS
      const numId = Number(id);
      if (!isNaN(numId) && numId > 0) {
        return numId;
      }
      // Se for string (cuid), usar como id
      return id;
    });

    // Preparar investmentIds - garantir que são strings válidas
    const investmentIds = (formData.investmentIds || []).filter(id => 
      id && (typeof id === 'string' || (typeof id === 'number' && !isNaN(id)))
    ).map(id => String(id));

    const dataToSave = {
      ...formData,
      sectorId: Number(formData.sectorId), // Garantir que é número
      sectorName: selectedSector?.name,
      dataSolicitacao: formData.dataSolicitacao,
      dataEntrega: formData.dataEntrega || undefined,
      numeroSolicitacao: formData.numeroSolicitacao || undefined,
      observacoes: formData.observacoes || undefined,
      serviceOrderIds,
      investmentIds,
    };
    
    console.log('[PurchaseRequestForm] Dados preparados para salvar:', dataToSave);
    
    onSave(dataToSave);
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
        padding: theme.spacing.md,
      }}
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: theme.shadows.xl,
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: theme.spacing.md,
        }}
      >
        <h2 style={{ gridColumn: '1 / -1', margin: `0 0 ${theme.spacing.md} 0`, color: theme.colors.dark }}>
          {purchaseRequest ? 'Editar Solicitação' : 'Nova Solicitação'}
        </h2>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: theme.colors.dark, marginBottom: theme.spacing.xs }}>
            Nº Solicitação (Sistema Externo)
          </label>
          <input
            type="text"
            value={formData.numeroSolicitacao}
            onChange={(e) => setFormData({ ...formData, numeroSolicitacao: e.target.value })}
            style={{
              width: '100%',
              padding: theme.spacing.sm,
              border: `1px solid ${theme.colors.gray[300]}`,
              borderRadius: theme.borderRadius.sm,
              fontSize: '14px',
              backgroundColor: theme.colors.white,
              color: theme.colors.dark,
            }}
            placeholder="Número da solicitação no sistema externo"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: theme.colors.dark, marginBottom: theme.spacing.xs }}>
            Setor *
          </label>
          <select
            value={formData.sectorId}
            onChange={(e) => {
              const sectorId = Number(e.target.value);
              const sector = sectors.find(s => s.id === sectorId);
              setFormData({
                ...formData,
                sectorId,
                sectorName: sector?.name || '',
              });
            }}
            required
            style={{
              width: '100%',
              padding: theme.spacing.sm,
              border: `1px solid ${theme.colors.gray[300]}`,
              borderRadius: theme.borderRadius.sm,
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

        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: theme.colors.dark, marginBottom: theme.spacing.xs }}>
            Status *
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            required
            style={{
              width: '100%',
              padding: theme.spacing.sm,
              border: `1px solid ${theme.colors.gray[300]}`,
              borderRadius: theme.borderRadius.sm,
              fontSize: '14px',
              backgroundColor: theme.colors.white,
              color: theme.colors.dark,
            }}
          >
            <option value="Pendente" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Pendente</option>
            <option value="Aprovada" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Aprovada</option>
            <option value="Em Compra" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Em Compra</option>
            <option value="Entregue" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Entregue</option>
            <option value="Cancelada" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Cancelada</option>
          </select>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: theme.colors.dark, marginBottom: theme.spacing.xs }}>
            Descrição *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
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
            placeholder="Descreva a solicitação de compra"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: theme.colors.dark, marginBottom: theme.spacing.xs }}>
            <FiCalendar size={16} style={{ display: 'inline', marginRight: theme.spacing.xs }} />
            Data de Solicitação *
          </label>
          <input
            type="date"
            value={formData.dataSolicitacao}
            onChange={(e) => setFormData({ ...formData, dataSolicitacao: e.target.value })}
            required
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
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: theme.colors.dark, marginBottom: theme.spacing.xs }}>
            <FiCalendar size={16} style={{ display: 'inline', marginRight: theme.spacing.xs }} />
            Data de Entrega
          </label>
          <input
            type="date"
            value={formData.dataEntrega}
            onChange={(e) => setFormData({ ...formData, dataEntrega: e.target.value })}
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

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: theme.colors.dark, marginBottom: theme.spacing.xs }}>
            Observações
          </label>
          <textarea
            value={formData.observacoes}
            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
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
            placeholder="Observações adicionais"
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: theme.colors.dark, marginBottom: theme.spacing.xs }}>
            <FiClipboard size={16} style={{ display: 'inline', marginRight: theme.spacing.xs }} />
            Ordens de Serviço Vinculadas ({formData.serviceOrderIds.length} selecionada{formData.serviceOrderIds.length !== 1 ? 's' : ''})
          </label>
          <div style={{ 
            maxHeight: '200px', 
            overflowY: 'auto', 
            border: `1px solid ${theme.colors.gray[200]}`, 
            borderRadius: theme.borderRadius.md, 
            padding: theme.spacing.sm,
            backgroundColor: theme.colors.white,
          }}>
            {osList.length === 0 ? (
              <p style={{ color: theme.colors.gray[600], fontSize: '14px', margin: 0 }}>Carregando OS...</p>
            ) : (
              osList.slice(0, 100).map((os: any) => (
                <label
                  key={os.id || os.CodigoSerialOS}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    padding: theme.spacing.xs,
                    cursor: 'pointer',
                    backgroundColor: theme.colors.white,
                    color: theme.colors.dark,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.serviceOrderIds.includes(os.CodigoSerialOS)}
                    onChange={(e) => {
                      // Sempre usar CodigoSerialOS (número) - o backend vai criar a OS se necessário
                      const osId = os.CodigoSerialOS;
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          serviceOrderIds: [...formData.serviceOrderIds, osId],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          serviceOrderIds: formData.serviceOrderIds.filter(id => id !== osId),
                        });
                      }
                    }}
                    style={{
                      backgroundColor: theme.colors.white,
                      color: theme.colors.dark,
                    }}
                  />
                  <span style={{ fontSize: '13px', color: theme.colors.dark }}>
                    {os.OS || os.osCodigo || os.CodigoSerialOS} - {os.Equipamento || 'Sem equipamento'}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: theme.colors.dark, marginBottom: theme.spacing.xs }}>
            <FiPackage size={16} style={{ display: 'inline', marginRight: theme.spacing.xs }} />
            Investimentos Vinculados ({formData.investmentIds.length} selecionado{formData.investmentIds.length !== 1 ? 's' : ''})
          </label>
          <div style={{ 
            maxHeight: '200px', 
            overflowY: 'auto', 
            border: `1px solid ${theme.colors.gray[200]}`, 
            borderRadius: theme.borderRadius.md, 
            padding: theme.spacing.sm,
            backgroundColor: theme.colors.white,
          }}>
            {investmentsList.length === 0 ? (
              <p style={{ color: theme.colors.gray[600], fontSize: '14px', margin: 0 }}>Carregando investimentos...</p>
            ) : (
              investmentsList.map((inv: any) => (
                <label
                  key={inv.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    padding: theme.spacing.xs,
                    cursor: 'pointer',
                    backgroundColor: theme.colors.white,
                    color: theme.colors.dark,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.investmentIds.includes(inv.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          investmentIds: [...formData.investmentIds, inv.id],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          investmentIds: formData.investmentIds.filter(id => id !== inv.id),
                        });
                      }
                    }}
                    style={{
                      backgroundColor: theme.colors.white,
                      color: theme.colors.dark,
                    }}
                  />
                  <span style={{ fontSize: '13px', color: theme.colors.dark }}>
                    {inv.titulo} - {inv.categoria || 'Sem categoria'}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end', marginTop: theme.spacing.md }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.colors.gray[200],
              border: 'none',
              borderRadius: theme.borderRadius.md,
              color: theme.colors.dark,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.colors.primary,
              border: 'none',
              borderRadius: theme.borderRadius.md,
              color: theme.colors.white,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              opacity: isLoading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
            }}
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                Salvando...
              </>
            ) : (
              <>
                <FiSave size={16} />
                {purchaseRequest ? 'Atualizar' : 'Criar'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// Componente Modal de Detalhes da OS
function OSDetailModal({
  isOpen,
  codigoSerialOS,
  onClose,
}: {
  isOpen: boolean;
  codigoSerialOS: number | null;
  onClose: () => void;
}) {
  const { data: osDetail, isLoading, error } = useQuery({
    queryKey: ['os-detail', codigoSerialOS],
    queryFn: async () => {
      if (!codigoSerialOS) return null;
      const response = await apiClient.get(`/api/ecm/os/${codigoSerialOS}`);
      return response;
    },
    enabled: isOpen && codigoSerialOS !== null,
  });

  if (!isOpen) return null;

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
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: theme.shadows.xl,
          position: 'relative',
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
          <h2 style={{ margin: 0, color: theme.colors.dark, display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <FiClipboard size={24} />
            Detalhes da OS
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: theme.colors.gray[600],
              fontSize: '24px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <FiX size={24} />
          </button>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: theme.spacing.xl }}>
            <LoadingSpinner />
          </div>
        ) : error ? (
          <ErrorMessage message="Erro ao carregar detalhes da OS" />
        ) : osDetail ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            <div>
              <label style={{ fontSize: '12px', color: theme.colors.gray[600], fontWeight: 600 }}>
                Código Serial OS
              </label>
              <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '16px', color: theme.colors.dark }}>
                {osDetail.codigoSerialOS}
              </p>
            </div>

            {osDetail.osCodigo && (
              <div>
                <label style={{ fontSize: '12px', color: theme.colors.gray[600], fontWeight: 600 }}>
                  Código da OS
                </label>
                <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '16px', color: theme.colors.dark }}>
                  {osDetail.osCodigo}
                </p>
              </div>
            )}

            {osDetail.comentarios && (
              <div>
                <label style={{ fontSize: '12px', color: theme.colors.gray[600], fontWeight: 600 }}>
                  Comentários
                </label>
                <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '14px', color: theme.colors.dark, whiteSpace: 'pre-wrap' }}>
                  {osDetail.comentarios}
                </p>
              </div>
            )}

            {osDetail.purchaseRequest && (
              <div>
                <label style={{ fontSize: '12px', color: theme.colors.gray[600], fontWeight: 600 }}>
                  Solicitação de Compra Vinculada
                </label>
                <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '14px', color: theme.colors.dark }}>
                  {osDetail.purchaseRequest.description || 'Sem descrição'}
                </p>
                <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '12px', color: theme.colors.gray[600] }}>
                  Status: {osDetail.purchaseRequest.status}
                </p>
              </div>
            )}

            {osDetail.createdAt && (
              <div>
                <label style={{ fontSize: '12px', color: theme.colors.gray[600], fontWeight: 600 }}>
                  Data de Criação
                </label>
                <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '14px', color: theme.colors.dark }}>
                  {formatBrazilianDate(osDetail.createdAt)}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: theme.colors.gray[600] }}>
            OS não encontrada
          </p>
        )}
      </div>
    </div>
  );
}

// Componente Modal de Detalhes do Investimento
function InvestmentDetailModal({
  isOpen,
  investmentId,
  onClose,
}: {
  isOpen: boolean;
  investmentId: string | null;
  onClose: () => void;
}) {
  const { data: investment, isLoading, error } = useQuery({
    queryKey: ['investment-detail', investmentId],
    queryFn: async () => {
      if (!investmentId) return null;
      const response = await apiClient.get(`/api/ecm/investments/${investmentId}`);
      return response;
    },
    enabled: isOpen && investmentId !== null,
  });

  if (!isOpen) return null;

  const formatCurrency = (value: number | null) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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
        padding: theme.spacing.md,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: theme.shadows.xl,
          position: 'relative',
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
          <h2 style={{ margin: 0, color: theme.colors.dark, display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <FiPackage size={24} />
            Detalhes do Investimento
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: theme.colors.gray[600],
              fontSize: '24px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <FiX size={24} />
          </button>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: theme.spacing.xl }}>
            <LoadingSpinner />
          </div>
        ) : error ? (
          <ErrorMessage message="Erro ao carregar detalhes do investimento" />
        ) : investment ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            <div>
              <label style={{ fontSize: '12px', color: theme.colors.gray[600], fontWeight: 600 }}>
                Título
              </label>
              <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '18px', color: theme.colors.dark, fontWeight: 600 }}>
                {investment.titulo}
              </p>
            </div>

            {investment.descricao && (
              <div>
                <label style={{ fontSize: '12px', color: theme.colors.gray[600], fontWeight: 600 }}>
                  Descrição
                </label>
                <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '14px', color: theme.colors.dark, whiteSpace: 'pre-wrap' }}>
                  {investment.descricao}
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: theme.spacing.md }}>
              {investment.categoria && (
                <div>
                  <label style={{ fontSize: '12px', color: theme.colors.gray[600], fontWeight: 600 }}>
                    Categoria
                  </label>
                  <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '14px', color: theme.colors.dark }}>
                    {investment.categoria}
                  </p>
                </div>
              )}

              {investment.valorEstimado !== null && investment.valorEstimado !== undefined && (
                <div>
                  <label style={{ fontSize: '12px', color: theme.colors.gray[600], fontWeight: 600 }}>
                    Valor Estimado
                  </label>
                  <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '16px', color: theme.colors.primary, fontWeight: 600 }}>
                    {formatCurrency(investment.valorEstimado)}
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: theme.spacing.md }}>
              {investment.prioridade && (
                <div>
                  <label style={{ fontSize: '12px', color: theme.colors.gray[600], fontWeight: 600 }}>
                    Prioridade
                  </label>
                  <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '14px', color: theme.colors.dark }}>
                    {investment.prioridade}
                  </p>
                </div>
              )}

              {investment.status && (
                <div>
                  <label style={{ fontSize: '12px', color: theme.colors.gray[600], fontWeight: 600 }}>
                    Status
                  </label>
                  <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '14px', color: theme.colors.dark }}>
                    {investment.status}
                  </p>
                </div>
              )}
            </div>

            {investment.setor && (
              <div>
                <label style={{ fontSize: '12px', color: theme.colors.gray[600], fontWeight: 600 }}>
                  Setor
                </label>
                <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '14px', color: theme.colors.dark }}>
                  {investment.setor}
                </p>
              </div>
            )}

            {investment.dataPrevista && (
              <div>
                <label style={{ fontSize: '12px', color: theme.colors.gray[600], fontWeight: 600 }}>
                  Data Prevista
                </label>
                <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '14px', color: theme.colors.dark }}>
                  {formatBrazilianDate(investment.dataPrevista)}
                </p>
              </div>
            )}

            {investment.dataSolicitacao && (
              <div>
                <label style={{ fontSize: '12px', color: theme.colors.gray[600], fontWeight: 600 }}>
                  Data de Solicitação
                </label>
                <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '14px', color: theme.colors.dark }}>
                  {formatBrazilianDate(investment.dataSolicitacao)}
                </p>
              </div>
            )}

            {investment.dataChegada && (
              <div>
                <label style={{ fontSize: '12px', color: theme.colors.gray[600], fontWeight: 600 }}>
                  Data de Chegada
                </label>
                <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '14px', color: theme.colors.dark }}>
                  {formatBrazilianDate(investment.dataChegada)}
                </p>
              </div>
            )}

            {investment.observacoes && (
              <div>
                <label style={{ fontSize: '12px', color: theme.colors.gray[600], fontWeight: 600 }}>
                  Observações
                </label>
                <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '14px', color: theme.colors.dark, whiteSpace: 'pre-wrap' }}>
                  {investment.observacoes}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: theme.colors.gray[600] }}>
            Investimento não encontrado
          </p>
        )}
      </div>
    </div>
  );
}
