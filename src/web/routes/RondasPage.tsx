import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiCalendar,
  FiDollarSign,
  FiX,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiFileText,
  FiShoppingCart,
} from 'react-icons/fi';
import { theme } from '../styles/theme';
import { formatBrazilianDateLong } from '../utils/dateUtils';
import { getSectorIdFromItem, getSectorIdFromName } from '../../utils/sectorMapping';

export default function RondasPage() {
  const [showInvestmentForm, setShowInvestmentForm] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['rounds'],
    queryFn: async () => {
      const res = await fetch('/api/ecm/rounds');
      if (!res.ok) throw new Error('Erro ao buscar rondas');
      return res.json();
    },
  });

  const { data: availableOS } = useQuery({
    queryKey: ['rounds-os-available'],
    queryFn: async () => {
      const res = await fetch('/api/ecm/rounds/os/available');
      if (!res.ok) throw new Error('Erro ao buscar OS disponíveis');
      return res.json();
    },
  });

  const { data: availableInvestments } = useQuery({
    queryKey: ['rounds-investments-available'],
    queryFn: async () => {
      const res = await fetch('/api/ecm/investments');
      if (!res.ok) throw new Error('Erro ao buscar investimentos disponíveis');
      return res.json();
    },
  });

  const createRoundMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/ecm/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Erro ao criar ronda' }));
        throw new Error(errorData.message || 'Erro ao criar ronda');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
      setShowCreateForm(false);
      alert('Ronda criada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar ronda:', error);
      alert(`Erro ao criar ronda: ${error.message || 'Erro desconhecido'}`);
    },
  });

  const updateRoundMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/ecm/rounds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao atualizar ronda');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
      setEditingId(null);
      setShowCreateForm(false);
    },
  });

  const deleteRoundMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ecm/rounds/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao deletar ronda');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
    },
  });

  const createInvestmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/ecm/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao criar investimento');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      setShowInvestmentForm(null);
      navigate('/investimentos');
    },
  });

  if (isLoading) {
    return (
      <div style={{ padding: theme.spacing.xl, textAlign: 'center' }}>
        <p style={{ color: theme.colors.gray[600] }}>Carregando rondas...</p>
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return formatBrazilianDateLong(dateStr);
  };

  const totalOSAbertas = data?.reduce((acc: number, r: any) => acc + (r.openOs || r.openOsCount || 0), 0) || 0;
  const totalOSFechadas = data?.reduce((acc: number, r: any) => acc + (r.closedOs || r.closedOsCount || 0), 0) || 0;

  const editingRound = editingId ? data?.find((r: any) => r.id === editingId) : null;

  return (
    <div style={{ padding: theme.spacing.xl, maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: theme.spacing.lg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
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
              <FiRefreshCw size={32} color={theme.colors.primary} />
              Rondas Semanais
            </h1>
            <p style={{ color: theme.colors.gray[600], margin: 0 }}>
              Acompanhamento de manutenção e comunicação com departamentos
            </p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setShowCreateForm(true);
            }}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.colors.primary,
              border: 'none',
              borderRadius: theme.borderRadius.md,
              color: theme.colors.white,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              fontWeight: 600,
            }}
          >
            <FiPlus size={18} />
            Nova Ronda
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: theme.spacing.md,
          marginBottom: theme.spacing.xl,
        }}
      >
        <div
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.md,
            borderTop: `4px solid ${theme.colors.info}`,
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: theme.colors.gray[600] }}>Total de Setores</p>
          <h3 style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '28px', fontWeight: 700 }}>
            {data?.length || 0}
          </h3>
        </div>
        <div
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.md,
            borderTop: `4px solid ${theme.colors.warning}`,
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: theme.colors.gray[600] }}>OS Abertas</p>
          <h3 style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '28px', fontWeight: 700 }}>
            {totalOSAbertas}
          </h3>
        </div>
        <div
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.md,
            borderTop: `4px solid ${theme.colors.success}`,
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: theme.colors.gray[600] }}>OS Fechadas</p>
          <h3 style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '28px', fontWeight: 700 }}>
            {totalOSFechadas}
          </h3>
        </div>
      </div>

      {/* Formulário de Criar/Editar Ronda */}
      {showCreateForm && (
        <CreateRoundForm
          round={editingRound}
          availableOS={availableOS || []}
          onSave={(formData) => {
            if (editingId) {
              updateRoundMutation.mutate({ id: editingId, data: formData });
            } else {
              createRoundMutation.mutate(formData);
            }
          }}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingId(null);
          }}
        />
      )}

      {data && data.length > 0 ? (
        <div style={{ display: 'grid', gap: theme.spacing.md }}>
          {data.map((round: any, idx: number) => {
            const osIds = round.osIds ? JSON.parse(round.osIds) : [];
            const purchaseRequestIds = round.purchaseRequestIds ? JSON.parse(round.purchaseRequestIds) : [];

            return (
              <div
                key={round.id || idx}
                style={{
                  backgroundColor: theme.colors.white,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.lg,
                  boxShadow: theme.shadows.md,
                  borderLeft: `4px solid ${theme.colors.primary}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: theme.spacing.md,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, color: theme.colors.dark, fontSize: '20px' }}>{round.sectorName}</h3>
                    <p
                      style={{
                        margin: `${theme.spacing.xs} 0 0 0`,
                        fontSize: '14px',
                        color: theme.colors.gray[600],
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing.xs,
                      }}
                    >
                      <FiCalendar size={14} />
                      {formatDate(round.weekStart)}
                    </p>
                    {round.responsibleName && (
                      <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '14px', color: theme.colors.gray[600] }}>
                        Responsável: {round.responsibleName}
                      </p>
                    )}
                    {round.notes && (
                      <div
                        style={{
                          marginTop: theme.spacing.sm,
                          padding: theme.spacing.sm,
                          backgroundColor: theme.colors.gray[50],
                          borderRadius: theme.borderRadius.sm,
                        }}
                      >
                        <p style={{ margin: 0, fontSize: '14px', color: theme.colors.gray[700] }}>{round.notes}</p>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: theme.spacing.xs }}>
                    <button
                      onClick={() => {
                        setEditingId(round.id || `round-${idx}`);
                        setShowCreateForm(true);
                      }}
                      style={{
                        padding: theme.spacing.xs,
                        backgroundColor: 'transparent',
                        border: `1px solid ${theme.colors.gray[300]}`,
                        borderRadius: theme.borderRadius.sm,
                        cursor: 'pointer',
                        color: theme.colors.dark,
                      }}
                    >
                      <FiEdit size={16} />
                    </button>
                    <button
                      onClick={() => setShowInvestmentForm(round.id || `round-${idx}`)}
                      style={{
                        padding: theme.spacing.xs,
                        backgroundColor: 'transparent',
                        border: `1px solid ${theme.colors.primary}`,
                        borderRadius: theme.borderRadius.sm,
                        cursor: 'pointer',
                        color: theme.colors.primary,
                      }}
                    >
                      <FiDollarSign size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir esta ronda?')) {
                          deleteRoundMutation.mutate(round.id || `round-${idx}`);
                        }
                      }}
                      style={{
                        padding: theme.spacing.xs,
                        backgroundColor: 'transparent',
                        border: `1px solid ${theme.colors.danger}`,
                        borderRadius: theme.borderRadius.sm,
                        cursor: 'pointer',
                        color: theme.colors.danger,
                      }}
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: theme.spacing.md,
                    marginBottom: theme.spacing.md,
                  }}
                >
                  <div
                    style={{
                      padding: theme.spacing.md,
                      backgroundColor: `${theme.colors.warning}10`,
                      borderRadius: theme.borderRadius.md,
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                    }}
                  >
                    <FiXCircle size={20} color={theme.colors.warning} />
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', color: theme.colors.gray[600] }}>OS Abertas</p>
                      <p style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
                        {round.openOs || round.openOsCount || 0}
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      padding: theme.spacing.md,
                      backgroundColor: `${theme.colors.success}10`,
                      borderRadius: theme.borderRadius.md,
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                    }}
                  >
                    <FiCheckCircle size={20} color={theme.colors.success} />
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', color: theme.colors.gray[600] }}>OS Fechadas</p>
                      <p style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
                        {round.closedOs || round.closedOsCount || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Informações de OS e Purchase Requests vinculadas */}
                {(osIds.length > 0 || purchaseRequestIds.length > 0) && (
                  <div style={{ marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTop: `1px solid ${theme.colors.gray[200]}` }}>
                    {osIds.length > 0 && (
                      <div style={{ marginBottom: theme.spacing.xs }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.xs }}>
                          <FiFileText size={14} color={theme.colors.gray[600]} />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: theme.colors.gray[700] }}>
                            OS Vinculadas: {osIds.length}
                          </span>
                        </div>
                      </div>
                    )}
                    {purchaseRequestIds.length > 0 && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                          <FiShoppingCart size={14} color={theme.colors.gray[600]} />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: theme.colors.gray[700] }}>
                            Solicitações de Compra: {purchaseRequestIds.length}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            padding: theme.spacing.xl,
            textAlign: 'center',
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            color: theme.colors.gray[500],
          }}
        >
          Nenhuma ronda encontrada para o período.
        </div>
      )}

      {/* Modal de Criar Investimento */}
      {showInvestmentForm && (
        <CreateInvestmentFromRoundModal
          roundId={showInvestmentForm}
          roundName={data?.find((r: any, idx: number) => (r.id || `round-${idx}`) === showInvestmentForm)?.sectorName || ''}
          onSave={(investmentData) => {
            createInvestmentMutation.mutate({
              ...investmentData,
              sectorRoundId: showInvestmentForm,
              setor: data?.find((r: any, idx: number) => (r.id || `round-${idx}`) === showInvestmentForm)?.sectorName || '',
            });
          }}
          onCancel={() => setShowInvestmentForm(null)}
        />
      )}
    </div>
  );
}

function CreateRoundForm({
  round,
  availableOS: allAvailableOS,
  onSave,
  onCancel,
}: {
  round?: any;
  availableOS: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  // Buscar setores disponíveis
  const { data: sectorsData, isLoading: sectorsLoading } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ['rounds-sectors'],
    queryFn: async () => {
      const res = await fetch('/api/users/sectors/list');
      if (!res.ok) throw new Error('Erro ao buscar setores');
      const data = await res.json();
      // O endpoint retorna um array direto
      return Array.isArray(data) ? data : [];
    },
  });

  // Buscar investimentos disponíveis
  const { data: allAvailableInvestments } = useQuery({
    queryKey: ['rounds-investments-available'],
    queryFn: async () => {
      const res = await fetch('/api/ecm/investments');
      if (!res.ok) throw new Error('Erro ao buscar investimentos disponíveis');
      return res.json();
    },
  });

  const [formData, setFormData] = useState({
    selectedSector: round ? `${round.sectorId}|${round.sectorName}` : '',
    sectorId: round?.sectorId || '',
    sectorName: round?.sectorName || '',
    weekStart: round?.weekStart ? new Date(round.weekStart).toISOString().split('T')[0] : '',
    responsibleId: round?.responsibleId || '',
    responsibleName: round?.responsibleName || '',
    notes: round?.notes || '',
    osIds: round?.osIds ? JSON.parse(round.osIds) : [],
    purchaseRequestIds: round?.purchaseRequestIds ? JSON.parse(round.purchaseRequestIds) : [],
  });

  const [selectedOS, setSelectedOS] = useState<number[]>(formData.osIds);
  const [selectedPurchaseRequests, setSelectedPurchaseRequests] = useState<string[]>(formData.purchaseRequestIds);
  const [selectedInvestments, setSelectedInvestments] = useState<string[]>([]);
  const [relatedSectors, setRelatedSectors] = useState<Array<{ id: number; sectorId: number; sectorName: string }>>([]);
  const [isLoadingResponsible, setIsLoadingResponsible] = useState(false);

  // Inicializar selectedSector quando round mudar
  useEffect(() => {
    if (round) {
      setFormData((prev) => ({
        ...prev,
        selectedSector: `${round.sectorId}|${round.sectorName}`,
        sectorId: round.sectorId || '',
        sectorName: round.sectorName || '',
      }));
    }
  }, [round]);

  // Buscar investimentos já vinculados à ronda (se estiver editando)
  useEffect(() => {
    if (round?.id && allAvailableInvestments) {
      const linkedInvestments = allAvailableInvestments
        .filter((inv: any) => inv.sectorRoundId === round.id)
        .map((inv: any) => inv.id);
      setSelectedInvestments(linkedInvestments);
    }
  }, [round?.id, allAvailableInvestments]);

  // Buscar responsável e setores relacionados quando o setor for selecionado
  useEffect(() => {
    const fetchResponsible = async () => {
      if (!formData.sectorId) {
        setRelatedSectors([]);
        return;
      }

      setIsLoadingResponsible(true);
      try {
        const res = await fetch(`/api/users/sectors/${formData.sectorId}/responsible`);
        if (res.ok) {
          const responsible = await res.json();
          setFormData((prev) => ({
            ...prev,
            responsibleId: responsible.id,
            responsibleName: responsible.name,
          }));
          setRelatedSectors(responsible.sectors || []);
        } else {
          // Se não encontrar responsável, limpar campos
          setFormData((prev) => ({
            ...prev,
            responsibleId: '',
            responsibleName: '',
          }));
          setRelatedSectors([]);
        }
      } catch (error) {
        console.error('Erro ao buscar responsável:', error);
        setFormData((prev) => ({
          ...prev,
          responsibleId: '',
          responsibleName: '',
        }));
        setRelatedSectors([]);
      } finally {
        setIsLoadingResponsible(false);
      }
    };

    fetchResponsible();
  }, [formData.sectorId]);

  // Handler para quando o setor é selecionado
  const handleSectorChange = (value: string) => {
    if (value) {
      const [sectorId, sectorName] = value.split('|');
      setFormData({
        ...formData,
        selectedSector: value,
        sectorId: sectorId,
        sectorName: sectorName,
        // Limpar responsável temporariamente até buscar
        responsibleId: '',
        responsibleName: '',
      });
      setSelectedOS([]); // Limpar OS selecionadas ao mudar setor
    } else {
      setFormData({
        ...formData,
        selectedSector: '',
        sectorId: '',
        sectorName: '',
        responsibleId: '',
        responsibleName: '',
      });
      setRelatedSectors([]);
      setSelectedOS([]);
      setSelectedInvestments([]);
    }
  };

  // Limpar investimentos selecionados ao mudar setor
  useEffect(() => {
    if (!formData.sectorId) {
      setSelectedInvestments([]);
    }
  }, [formData.sectorId]);

  // Filtrar OS por setor selecionado e setores relacionados
  // Nota: O backend já retorna apenas OS corretivas abertas, então só precisamos filtrar por setor
  const availableOS = useMemo(() => {
    if (!formData.sectorId || !allAvailableOS) return [];
    
    const sectorIds = [Number(formData.sectorId), ...relatedSectors.map(s => s.sectorId)];
    
    return allAvailableOS.filter((os: any) => {
      // Filtrar por setor
      const osSectorId = getSectorIdFromItem(os);
      return osSectorId && sectorIds.includes(osSectorId);
    });
  }, [formData.sectorId, allAvailableOS, relatedSectors]);

  // Filtrar investimentos por setor selecionado e setores relacionados
  const availableInvestments = useMemo(() => {
    if (!formData.sectorId || !allAvailableInvestments) return [];
    
    const sectorIds = [Number(formData.sectorId), ...relatedSectors.map(s => s.sectorId)];
    
    return allAvailableInvestments.filter((inv: any) => {
      if (inv.sectorId && sectorIds.includes(inv.sectorId)) return true;
      // Se não tem sectorId, tentar pelo nome do setor
      if (inv.setor) {
        const invSectorId = getSectorIdFromName(inv.setor);
        return invSectorId && sectorIds.includes(invSectorId);
      }
      return false;
    });
  }, [formData.sectorId, allAvailableInvestments, relatedSectors]);

  // Agrupar OS por setor
  const osBySector = availableOS.reduce((acc: Record<string, any[]>, os: any) => {
    const setor = os.Setor || 'Outros';
    if (!acc[setor]) acc[setor] = [];
    acc[setor].push(os);
    return acc;
  }, {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sectorId || !formData.sectorName || !formData.weekStart || !formData.responsibleName) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }
    const dataToSave = {
      ...formData,
      osIds: selectedOS,
      purchaseRequestIds: selectedPurchaseRequests,
      investmentIds: selectedInvestments,
    };
    
    console.log('[RondasPage] Dados a serem salvos:', dataToSave);
    onSave(dataToSave);
  };

  const toggleOS = (osId: number) => {
    setSelectedOS((prev) => (prev.includes(osId) ? prev.filter((id) => id !== osId) : [...prev, osId]));
  };

  const toggleInvestment = (investmentId: string) => {
    setSelectedInvestments((prev) => (prev.includes(investmentId) ? prev.filter((id) => id !== investmentId) : [...prev, investmentId]));
  };

  return (
    <div
      style={{
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        boxShadow: theme.shadows.md,
        marginBottom: theme.spacing.lg,
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: theme.spacing.md }}>
        {round ? 'Editar Ronda' : 'Nova Ronda'}
      </h3>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: theme.spacing.md }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: theme.spacing.md }}>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
              Setor *
            </label>
            <select
              value={formData.selectedSector}
              onChange={(e) => handleSectorChange(e.target.value)}
              required
              disabled={sectorsLoading}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                borderRadius: theme.borderRadius.sm,
                fontSize: '14px',
                backgroundColor: sectorsLoading ? theme.colors.gray[100] : theme.colors.white,
                cursor: sectorsLoading ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="">Selecione um setor</option>
              {sectorsData?.map((sector) => (
                <option key={sector.id} value={`${sector.id}|${sector.name}`}>
                  {sector.name} (ID: {sector.id})
                </option>
              ))}
            </select>
            {sectorsLoading && (
              <p style={{ marginTop: theme.spacing.xs, fontSize: '12px', color: theme.colors.gray[600] }}>
                Carregando setores...
              </p>
            )}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
              Data de Início da Semana *
            </label>
            <input
              type="date"
              value={formData.weekStart}
              onChange={(e) => setFormData({ ...formData, weekStart: e.target.value })}
              required
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                borderRadius: theme.borderRadius.sm,
                fontSize: '14px',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
              Responsável *
            </label>
            <input
              type="text"
              value={formData.responsibleName}
              onChange={(e) => setFormData({ ...formData, responsibleName: e.target.value })}
              required
              disabled={isLoadingResponsible}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                borderRadius: theme.borderRadius.sm,
                fontSize: '14px',
                backgroundColor: isLoadingResponsible ? theme.colors.gray[100] : theme.colors.white,
                cursor: isLoadingResponsible ? 'not-allowed' : 'text',
              }}
            />
            {isLoadingResponsible && (
              <p style={{ marginTop: theme.spacing.xs, fontSize: '12px', color: theme.colors.gray[600] }}>
                Buscando responsável...
              </p>
            )}
            {relatedSectors.length > 1 && formData.responsibleName && (
              <p style={{ marginTop: theme.spacing.xs, fontSize: '12px', color: theme.colors.info }}>
                Este responsável também gerencia: {relatedSectors.filter(s => s.sectorId !== Number(formData.sectorId)).map(s => s.sectorName).join(', ')}
              </p>
            )}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
            Resumo da Ronda
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            style={{
              width: '100%',
              padding: theme.spacing.sm,
              border: `1px solid ${theme.colors.gray[300]}`,
              borderRadius: theme.borderRadius.sm,
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
            placeholder="Descreva o resumo da ronda, observações importantes, problemas identificados, etc."
          />
        </div>

        {/* Seleção de OS */}
        <div>
          <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
            Ordens de Serviço Vinculadas ({selectedOS.length} selecionadas)
          </label>
          <div
            style={{
              maxHeight: '300px',
              overflow: 'auto',
              border: `1px solid ${theme.colors.gray[300]}`,
              borderRadius: theme.borderRadius.sm,
              padding: theme.spacing.sm,
            }}
          >
            {Object.entries(osBySector).map(([setor, osList]) => (
              <div key={setor} style={{ marginBottom: theme.spacing.md }}>
                <h4 style={{ margin: `0 0 ${theme.spacing.xs} 0`, fontSize: '13px', fontWeight: 600, color: theme.colors.gray[700] }}>
                  {setor}
                </h4>
                {osList.map((os: any) => (
                  <label
                    key={os.CodigoSerialOS}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.xs,
                      padding: theme.spacing.xs,
                      cursor: 'pointer',
                      borderRadius: theme.borderRadius.xs,
                      backgroundColor: selectedOS.includes(os.CodigoSerialOS) ? `${theme.colors.primary}10` : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedOS.includes(os.CodigoSerialOS)}
                      onChange={() => toggleOS(os.CodigoSerialOS)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '13px', flex: 1 }}>
                      {os.OS} - {os.Equipamento} ({os.SituacaoDaOS})
                    </span>
                  </label>
                ))}
              </div>
            ))}
            {availableOS.length === 0 && formData.sectorId && (
              <p style={{ margin: 0, fontSize: '13px', color: theme.colors.gray[500], textAlign: 'center', padding: theme.spacing.md }}>
                Nenhuma OS disponível para este setor
              </p>
            )}
            {!formData.sectorId && (
              <p style={{ margin: 0, fontSize: '13px', color: theme.colors.gray[500], textAlign: 'center', padding: theme.spacing.md }}>
                Selecione um setor para ver as OS disponíveis
              </p>
            )}
          </div>
        </div>

        {/* Investimentos do Setor */}
        {formData.sectorId && (
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
              Investimentos do Setor ({selectedInvestments.length} selecionados de {availableInvestments?.length || 0} encontrados)
            </label>
            <div
              style={{
                maxHeight: '300px',
                overflow: 'auto',
                border: `1px solid ${theme.colors.gray[300]}`,
                borderRadius: theme.borderRadius.sm,
                padding: theme.spacing.sm,
                backgroundColor: theme.colors.gray[50],
              }}
            >
              {availableInvestments && availableInvestments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                  {availableInvestments.map((inv: any) => (
                    <label
                      key={inv.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: theme.spacing.sm,
                        padding: theme.spacing.sm,
                        backgroundColor: theme.colors.white,
                        borderRadius: theme.borderRadius.xs,
                        border: `1px solid ${theme.colors.gray[200]}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: selectedInvestments.includes(inv.id) ? `${theme.colors.primary}10` : theme.colors.white,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.primary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.gray[200];
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedInvestments.includes(inv.id)}
                        onChange={() => toggleInvestment(inv.id)}
                        style={{ cursor: 'pointer', marginTop: '2px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: theme.colors.dark }}>
                          {inv.titulo}
                        </div>
                        {inv.valorEstimado && (
                          <div style={{ fontSize: '12px', color: theme.colors.gray[600], marginTop: theme.spacing.xs / 2 }}>
                            Valor: R$ {inv.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                        {inv.descricao && (
                          <div style={{ fontSize: '12px', color: theme.colors.gray[500], marginTop: theme.spacing.xs / 2, fontStyle: 'italic' }}>
                            {inv.descricao}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '13px', color: theme.colors.gray[500], textAlign: 'center', padding: theme.spacing.md }}>
                  Nenhum investimento encontrado para este setor
                </p>
              )}
            </div>
          </div>
        )}

        {/* Seleção de Purchase Requests */}
        <div>
          <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
            Solicitações de Compra Vinculadas
          </label>
          <div
            style={{
              padding: theme.spacing.sm,
              border: `1px solid ${theme.colors.gray[300]}`,
              borderRadius: theme.borderRadius.sm,
              backgroundColor: theme.colors.gray[50],
            }}
          >
            <p style={{ margin: 0, fontSize: '13px', color: theme.colors.gray[600] }}>
              Funcionalidade de solicitações de compra será implementada em breve.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.colors.gray[200],
              border: 'none',
              borderRadius: theme.borderRadius.md,
              cursor: 'pointer',
              color: theme.colors.dark,
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.colors.primary,
              border: 'none',
              borderRadius: theme.borderRadius.md,
              cursor: 'pointer',
              color: theme.colors.white,
              fontWeight: 600,
            }}
          >
            {round ? 'Atualizar' : 'Criar'} Ronda
          </button>
        </div>
      </form>
    </div>
  );
}

function CreateInvestmentFromRoundModal({
  roundId,
  roundName,
  onSave,
  onCancel,
}: {
  roundId: string;
  roundName: string;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    categoria: 'Equipamento',
    valorEstimado: 0,
    prioridade: 'Média',
    status: 'Proposto',
    responsavel: '',
    dataPrevista: '',
    observacoes: '',
  });

  const categorias = ['Equipamento', 'Infraestrutura', 'Melhoria', 'Substituição', 'Outros'];
  const prioridades = ['Baixa', 'Média', 'Alta', 'Crítica'];
  const statuses = ['Proposto', 'Em Análise', 'Aprovado', 'Em Execução', 'Concluído', 'Cancelado'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo || !formData.valorEstimado) {
      alert('Preencha título e valor estimado');
      return;
    }
    onSave(formData);
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
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: theme.shadows.lg,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
          <h2 style={{ margin: 0, color: theme.colors.dark }}>Criar Investimento</h2>
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
        <p style={{ margin: `0 0 ${theme.spacing.md} 0`, color: theme.colors.gray[600], fontSize: '14px' }}>
          Criando investimento a partir da ronda: <strong>{roundName}</strong>
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: theme.spacing.md }}>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
              Título *
            </label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              required
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                borderRadius: theme.borderRadius.sm,
                fontSize: '14px',
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md }}>
            <div>
              <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
                Categoria *
              </label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  borderRadius: theme.borderRadius.sm,
                  fontSize: '14px',
                }}
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
                Valor Estimado *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.valorEstimado}
                onChange={(e) => setFormData({ ...formData, valorEstimado: parseFloat(e.target.value) || 0 })}
                required
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  borderRadius: theme.borderRadius.sm,
                  fontSize: '14px',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md }}>
            <div>
              <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
                Prioridade *
              </label>
              <select
                value={formData.prioridade}
                onChange={(e) => setFormData({ ...formData, prioridade: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  borderRadius: theme.borderRadius.sm,
                  fontSize: '14px',
                }}
              >
                {prioridades.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  borderRadius: theme.borderRadius.sm,
                  fontSize: '14px',
                }}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
              Descrição
            </label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                borderRadius: theme.borderRadius.sm,
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: theme.colors.gray[200],
                border: 'none',
                borderRadius: theme.borderRadius.md,
                cursor: 'pointer',
                color: theme.colors.dark,
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: theme.colors.primary,
                border: 'none',
                borderRadius: theme.borderRadius.md,
                cursor: 'pointer',
                color: theme.colors.white,
                fontWeight: 600,
              }}
            >
              Criar Investimento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
