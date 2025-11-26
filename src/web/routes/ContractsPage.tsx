import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiFileText, FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiDownload, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';
import DataTable from '../components/DataTable';
import { theme } from '../styles/theme';
import { usePermissions } from '../hooks/usePermissions';
import { formatBrazilianDate } from '../utils/dateUtils';
import { apiClient } from '../lib/apiClient';
import LoadingSpinner from '../components/LoadingSpinner';
import type { EquipamentoDTO } from '../../types/effort';

interface Contract {
  id: string;
  nome: string;
  fornecedor: string;
  equipamentoIds: string;
  tipoContrato: string;
  valorAnual: string;
  dataInicio: string;
  dataFim: string;
  renovacaoAutomatica: boolean;
  ativo: boolean;
  descricao?: string;
  arquivoUrl?: string;
  arquivoNome?: string;
  observacoes?: string;
}

export default function ContractsPage() {
  const { isAdmin, allowedSectors } = usePermissions();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Contract>>({});
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<number[]>([]);
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState('');
  const [showEquipmentSelector, setShowEquipmentSelector] = useState(false);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const queryClient = useQueryClient();

  // Construir query string para setores se não for admin
  const setoresQuery = !isAdmin && allowedSectors.length > 0
    ? allowedSectors.join(',')
    : undefined;

  const { data: contracts, isLoading, refetch } = useQuery<Contract[]>({
    queryKey: ['contracts', setoresQuery],
    queryFn: async () => {
      const url = setoresQuery
        ? `/api/ecm/contracts?setores=${setoresQuery}`
        : '/api/ecm/contracts';
      return apiClient.get<Contract[]>(url);
    },
  });

  // Buscar equipamentos para seleção
  const { data: equipmentData, isLoading: equipmentLoading } = useQuery<{
    data: EquipamentoDTO[];
  }>({
    queryKey: ['equipment-for-contracts', setoresQuery],
    queryFn: async () => {
      const url = setoresQuery
        ? `/api/ecm/lifecycle/inventario?page=1&pageSize=10000&setores=${setoresQuery}`
        : '/api/ecm/lifecycle/inventario?page=1&pageSize=10000';
      return apiClient.get<{ data: EquipamentoDTO[] }>(url);
    },
  });

  const equipments = equipmentData?.data || [];

  // Filtrar equipamentos por busca
  const filteredEquipments = useMemo(() => {
    if (!equipmentSearchTerm.trim()) return equipments.slice(0, 100);
    
    const searchLower = equipmentSearchTerm.toLowerCase();
    return equipments
      .filter((eq) => {
        const searchFields = [
          eq.Tag,
          eq.Equipamento,
          eq.Modelo,
          eq.Fabricante,
          eq.Setor,
          eq.Patrimonio,
          eq.NSerie,
        ];
        return searchFields.some((field) => 
          field && field.toString().toLowerCase().includes(searchLower)
        );
      })
      .slice(0, 100);
  }, [equipments, equipmentSearchTerm]);

  // Carregar equipamentos selecionados quando editar
  React.useEffect(() => {
    if (editingId && formData.equipamentoIds) {
      try {
        const ids = formData.equipamentoIds === 'TODOS' 
          ? [] 
          : formData.equipamentoIds.split(',').map(id => parseInt(id.trim())).filter(Boolean);
        setSelectedEquipmentIds(ids);
      } catch {
        setSelectedEquipmentIds([]);
      }
    } else if (!editingId) {
      setSelectedEquipmentIds([]);
    }
  }, [editingId, formData.equipamentoIds]);

  const createMutation = useMutation({
    mutationFn: async (data: { contract: Partial<Contract>; equipmentIds: number[]; arquivo?: File }) => {
      console.log('[ContractsPage] createMutation iniciado:', data);
      
      const formDataToSend = new FormData();
      
      // Adicionar campos obrigatórios - SEMPRE adicionar
      formDataToSend.append('nome', String(data.contract.nome || ''));
      formDataToSend.append('fornecedor', String(data.contract.fornecedor || ''));
      formDataToSend.append('tipoContrato', String(data.contract.tipoContrato || ''));
      formDataToSend.append('valorAnual', String(data.contract.valorAnual || '0'));
      formDataToSend.append('dataInicio', String(data.contract.dataInicio || ''));
      formDataToSend.append('dataFim', String(data.contract.dataFim || ''));
      
      // Campos opcionais
      if (data.contract.descricao) formDataToSend.append('descricao', data.contract.descricao);
      if (data.contract.observacoes) formDataToSend.append('observacoes', data.contract.observacoes);
      
      formDataToSend.append('renovacaoAutomatica', String(data.contract.renovacaoAutomatica || false));
      formDataToSend.append('ativo', String(data.contract.ativo !== undefined ? data.contract.ativo : true));
      
      // Equipamentos
      if (data.equipmentIds.length > 0) {
        formDataToSend.append('equipamentoIds', data.equipmentIds.join(','));
      } else {
        formDataToSend.append('equipamentoIds', 'TODOS');
      }
      
      // Arquivo
      if (data.arquivo) {
        formDataToSend.append('arquivo', data.arquivo);
      }
      
      console.log('[ContractsPage] Enviando FormData para /api/ecm/contracts');
      
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/ecm/contracts', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formDataToSend,
      });
      
      console.log('[ContractsPage] Resposta recebida:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('[ContractsPage] Erro:', errorData);
        throw new Error(errorData.message || `Erro ${res.status}: ${res.statusText}`);
      }
      
      const result = await res.json();
      console.log('[ContractsPage] Sucesso:', result);
      return result;
    },
    onSuccess: async () => {
      toast.success('Contrato criado com sucesso!');
      // Invalidar cache e refetch imediatamente
      await queryClient.invalidateQueries({ queryKey: ['contracts'] });
      // Forçar refresh sem usar cache
      const currentSetoresQuery = !isAdmin && allowedSectors.length > 0
        ? allowedSectors.join(',')
        : undefined;
      const url = currentSetoresQuery
        ? `/api/ecm/contracts?setores=${currentSetoresQuery}&forceRefresh=true`
        : '/api/ecm/contracts?forceRefresh=true';
      const newData = await apiClient.get<Contract[]>(url);
      queryClient.setQueryData(['contracts', currentSetoresQuery], newData);
      queryClient.invalidateQueries({ queryKey: ['maintenance-cost-indicator'] });
      setShowForm(false);
      setEditingId(null);
      setFormData({});
      setSelectedEquipmentIds([]);
      setEquipmentSearchTerm('');
      setShowEquipmentSelector(false);
    },
    onError: (error: Error) => {
      console.error('Erro ao criar contrato:', error);
      toast.error(error.message || 'Erro ao criar contrato');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; contract: Partial<Contract>; equipmentIds: number[]; arquivo?: File }) => {
      console.log('[ContractsPage] updateMutation iniciado:', data);
      
      const formDataToSend = new FormData();
      
      // Adicionar campos - SEMPRE enviar campos que existem no formData
      if (data.contract.nome !== undefined) formDataToSend.append('nome', String(data.contract.nome || ''));
      if (data.contract.fornecedor !== undefined) formDataToSend.append('fornecedor', String(data.contract.fornecedor || ''));
      if (data.contract.tipoContrato !== undefined) formDataToSend.append('tipoContrato', String(data.contract.tipoContrato || ''));
      if (data.contract.valorAnual !== undefined) formDataToSend.append('valorAnual', String(data.contract.valorAnual || '0'));
      if (data.contract.dataInicio !== undefined) formDataToSend.append('dataInicio', String(data.contract.dataInicio || ''));
      if (data.contract.dataFim !== undefined) formDataToSend.append('dataFim', String(data.contract.dataFim || ''));
      if (data.contract.descricao !== undefined) formDataToSend.append('descricao', String(data.contract.descricao || ''));
      if (data.contract.observacoes !== undefined) formDataToSend.append('observacoes', String(data.contract.observacoes || ''));
      if (data.contract.renovacaoAutomatica !== undefined) formDataToSend.append('renovacaoAutomatica', String(data.contract.renovacaoAutomatica));
      if (data.contract.ativo !== undefined) formDataToSend.append('ativo', String(data.contract.ativo));
      
      // Equipamentos
      if (data.equipmentIds.length > 0) {
        formDataToSend.append('equipamentoIds', data.equipmentIds.join(','));
      } else if (data.contract.equipamentoIds !== undefined) {
        formDataToSend.append('equipamentoIds', data.contract.equipamentoIds || 'TODOS');
      }
      
      // Arquivo
      if (data.arquivo) {
        formDataToSend.append('arquivo', data.arquivo);
      }
      
      console.log('[ContractsPage] Enviando FormData para PATCH /api/ecm/contracts/' + data.id);
      for (const [key, value] of formDataToSend.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: [File] ${value.name}`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }
      
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/ecm/contracts/${data.id}`, {
        method: 'PATCH',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formDataToSend,
      });
      
      console.log('[ContractsPage] Resposta PATCH:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('[ContractsPage] Erro na resposta PATCH:', errorData);
        throw new Error(errorData.message || `Erro ${res.status}: ${res.statusText}`);
      }
      
      const result = await res.json();
      console.log('[ContractsPage] Sucesso PATCH:', result);
      return result;
    },
    onSuccess: async () => {
      toast.success('Contrato atualizado com sucesso!');
      // Invalidar cache e refetch imediatamente com forceRefresh
      await queryClient.invalidateQueries({ queryKey: ['contracts'] });
      // Forçar refresh sem usar cache
      const currentSetoresQuery = !isAdmin && allowedSectors.length > 0
        ? allowedSectors.join(',')
        : undefined;
      const url = currentSetoresQuery
        ? `/api/ecm/contracts?setores=${currentSetoresQuery}&forceRefresh=true`
        : '/api/ecm/contracts?forceRefresh=true';
      const newData = await apiClient.get<Contract[]>(url);
      queryClient.setQueryData(['contracts', currentSetoresQuery], newData);
      queryClient.invalidateQueries({ queryKey: ['maintenance-cost-indicator'] });
      setEditingId(null);
      setShowForm(false);
      setFormData({});
      setSelectedEquipmentIds([]);
      setEquipmentSearchTerm('');
      setShowEquipmentSelector(false);
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar contrato:', error);
      toast.error(error.message || 'Erro ao atualizar contrato');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/api/ecm/contracts/${id}`);
    },
    onSuccess: async () => {
      toast.success('Contrato deletado com sucesso!');
      await queryClient.invalidateQueries({ queryKey: ['contracts'] });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['maintenance-cost-indicator'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao deletar contrato');
    },
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return formatBrazilianDate(dateStr);
  };

  const formatCurrency = (value: string) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  const handleSave = useCallback(() => {
    console.log('=== HANDLE SAVE CHAMADO ===');
    console.log('formData:', JSON.stringify(formData, null, 2));
    console.log('selectedEquipmentIds:', selectedEquipmentIds);
    console.log('editingId:', editingId);
    
    // Validação
    if (!formData.nome?.trim()) {
      console.log('❌ Validação falhou: nome vazio');
      toast.error('Nome do contrato é obrigatório');
      return;
    }
    if (!formData.fornecedor?.trim()) {
      console.log('❌ Validação falhou: fornecedor vazio');
      toast.error('Fornecedor é obrigatório');
      return;
    }
    if (!formData.tipoContrato) {
      console.log('❌ Validação falhou: tipoContrato vazio');
      toast.error('Tipo de contrato é obrigatório');
      return;
    }
    const valorAnualNum = parseFloat(String(formData.valorAnual || '0'));
    if (!formData.valorAnual || isNaN(valorAnualNum) || valorAnualNum <= 0) {
      console.log('❌ Validação falhou: valorAnual inválido', formData.valorAnual);
      toast.error('Valor anual deve ser maior que zero');
      return;
    }
    if (!formData.dataInicio) {
      console.log('❌ Validação falhou: dataInicio vazia');
      toast.error('Data de início é obrigatória');
      return;
    }
    if (!formData.dataFim) {
      console.log('❌ Validação falhou: dataFim vazia');
      toast.error('Data de fim é obrigatória');
      return;
    }

    console.log('✅ Validação passou, preparando dados...');

    const fileInput = document.getElementById('contract-file') as HTMLInputElement;
    const arquivo = fileInput?.files?.[0];
    console.log('📎 Arquivo:', arquivo?.name || 'nenhum');

    const contractData = {
      ...formData,
      renovacaoAutomatica: formData.renovacaoAutomatica || false,
      ativo: formData.ativo !== undefined ? formData.ativo : true,
    };

    console.log('📦 contractData preparado:', JSON.stringify(contractData, null, 2));

    if (editingId) {
      console.log('🔄 Chamando updateMutation...');
      updateMutation.mutate({ 
        id: editingId, 
        contract: contractData,
        equipmentIds: selectedEquipmentIds,
        arquivo,
      });
    } else {
      console.log('➕ Chamando createMutation...');
      createMutation.mutate({
        contract: contractData,
        equipmentIds: selectedEquipmentIds,
        arquivo,
      });
    }
    console.log('✅ Mutation chamada');
  }, [formData, selectedEquipmentIds, editingId, updateMutation, createMutation]);

  const toggleEquipmentSelection = (equipmentId: number) => {
    setSelectedEquipmentIds((prev) => {
      if (prev.includes(equipmentId)) {
        return prev.filter((id) => id !== equipmentId);
      } else {
        return [...prev, equipmentId];
      }
    });
  };

  const columns = [
    {
      key: 'nome' as keyof Contract,
      label: 'Nome do Contrato',
      width: '250px',
    },
    {
      key: 'fornecedor' as keyof Contract,
      label: 'Fornecedor',
      width: '150px',
    },
    {
      key: 'tipoContrato' as keyof Contract,
      label: 'Tipo',
      width: '120px',
    },
    {
      key: 'valorAnual' as keyof Contract,
      label: 'Valor Anual',
      width: '140px',
      render: (value: string) => (
        <span style={{ fontWeight: 600 }}>{formatCurrency(value)}</span>
      ),
    },
    {
      key: 'dataInicio' as keyof Contract,
      label: 'Início',
      width: '100px',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'dataFim' as keyof Contract,
      label: 'Fim',
      width: '100px',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'ativo' as keyof Contract,
      label: 'Status',
      width: '100px',
      render: (value: boolean) => (
        <span
          style={{
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            borderRadius: theme.borderRadius.sm,
            backgroundColor: value ? `${theme.colors.success}20` : `${theme.colors.gray[300]}20`,
            color: value ? theme.colors.success : theme.colors.gray[600],
            fontWeight: 600,
            fontSize: '12px',
          }}
        >
          {value ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      key: 'actions' as any,
      label: 'Ações',
      width: '150px',
      render: (_: any, contract: Contract) => (
        <div style={{ display: 'flex', gap: theme.spacing.xs }}>
          <button
            type="button"
            onClick={() => setViewingContract(contract)}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              borderRadius: theme.borderRadius.sm,
              border: `1px solid ${theme.colors.primary}`,
              backgroundColor: theme.colors.white,
              color: theme.colors.primary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              fontSize: '12px',
            }}
            title="Visualizar contrato"
          >
            <FiEye size={14} />
            Ver
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingId(contract.id);
              setFormData({
                nome: contract.nome,
                fornecedor: contract.fornecedor,
                tipoContrato: contract.tipoContrato,
                valorAnual: contract.valorAnual,
                dataInicio: contract.dataInicio,
                dataFim: contract.dataFim,
                renovacaoAutomatica: contract.renovacaoAutomatica,
                ativo: contract.ativo,
                descricao: contract.descricao,
                observacoes: contract.observacoes,
                arquivoUrl: contract.arquivoUrl,
                arquivoNome: contract.arquivoNome,
                equipamentoIds: contract.equipamentoIds,
              });
              if (contract.equipamentoIds && contract.equipamentoIds !== 'TODOS') {
                try {
                  const ids = contract.equipamentoIds.split(',').map(id => parseInt(id.trim())).filter(Boolean);
                  setSelectedEquipmentIds(ids);
                } catch {
                  setSelectedEquipmentIds([]);
                }
              } else {
                setSelectedEquipmentIds([]);
              }
              setShowForm(true);
            }}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              borderRadius: theme.borderRadius.sm,
              border: `1px solid ${theme.colors.gray[300]}`,
              backgroundColor: theme.colors.white,
              color: theme.colors.gray[700],
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              fontSize: '12px',
            }}
            title="Editar contrato"
          >
            <FiEdit2 size={14} />
            Editar
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ padding: theme.spacing.md, textAlign: 'center' }}>
        <LoadingSpinner text="Carregando contratos..." />
      </div>
    );
  }

  const totalAnual = contracts?.reduce((acc, c) => {
    return acc + (c.ativo ? parseFloat(c.valorAnual || '0') : 0);
  }, 0) || 0;

  return (
    <div style={{ padding: theme.spacing.md, maxWidth: '1600px', margin: '0 auto' }}>
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
          <FiFileText size={28} color={theme.colors.primary} />
          Contratos de Manutenção
        </h1>
        <p style={{ color: theme.colors.gray[600], margin: 0, fontSize: '14px' }}>
          Cadastro e gestão de contratos de manutenção
        </p>
      </div>

      {/* Card de resumo */}
      <div
        style={{
          backgroundColor: theme.colors.white,
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          boxShadow: theme.shadows.sm,
          marginBottom: theme.spacing.md,
        }}
      >
        <p style={{ margin: 0, fontSize: '14px', color: theme.colors.gray[600] }}>
          Valor Total Anual dos Contratos Ativos
        </p>
        <h3 style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '28px', fontWeight: 700 }}>
          {formatCurrency(String(totalAnual))}
        </h3>
      </div>

      {/* Botão adicionar */}
      {!showForm && (
        <div style={{ marginBottom: theme.spacing.md }}>
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setFormData({});
              setSelectedEquipmentIds([]);
              setEquipmentSearchTerm('');
              setShowEquipmentSelector(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              borderRadius: theme.borderRadius.md,
              border: 'none',
              backgroundColor: theme.colors.primary,
              color: theme.colors.white,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            <FiPlus size={18} />
            Novo Contrato
          </button>
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <form
          onSubmit={(e) => {
            console.log('=== FORM SUBMIT EVENT ===');
            e.preventDefault();
            e.stopPropagation();
            console.log('Chamando handleSave...');
            try {
              handleSave();
            } catch (error) {
              console.error('Erro ao chamar handleSave:', error);
              toast.error('Erro ao salvar contrato: ' + (error as Error).message);
            }
          }}
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.md,
            marginBottom: theme.spacing.md,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: theme.spacing.md }}>
            {editingId ? 'Editar Contrato' : 'Novo Contrato'}
          </h3>
          
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: theme.spacing.md,
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: theme.spacing.xs, fontWeight: 500, color: theme.colors.dark }}>
                Nome do Contrato *
              </label>
              <input
                type="text"
                value={formData.nome || ''}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  backgroundColor: theme.colors.white,
                  color: theme.colors.dark,
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: theme.spacing.xs, fontWeight: 500, color: theme.colors.dark }}>
                Fornecedor *
              </label>
              <input
                type="text"
                value={formData.fornecedor || ''}
                onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  backgroundColor: theme.colors.white,
                  color: theme.colors.dark,
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: theme.spacing.xs, fontWeight: 500, color: theme.colors.dark }}>
                Tipo de Contrato *
              </label>
              <select
                value={formData.tipoContrato || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log('🔵 TipoContrato selecionado:', value);
                  setFormData((prev) => {
                    const newData = { ...prev, tipoContrato: value };
                    console.log('🔵 Novo formData após tipoContrato:', newData);
                    return newData;
                  });
                }}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  backgroundColor: theme.colors.white,
                  color: theme.colors.dark,
                }}
              >
                <option value="" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Selecione...</option>
                <option value="Preventiva" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Preventiva</option>
                <option value="Corretiva" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Corretiva</option>
                <option value="Misto" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Misto</option>
                <option value="Full Service" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Full Service</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: theme.spacing.xs, fontWeight: 500, color: theme.colors.dark }}>
                Valor Anual (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.valorAnual || ''}
                onChange={(e) => setFormData({ ...formData, valorAnual: e.target.value })}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  backgroundColor: theme.colors.white,
                  color: theme.colors.dark,
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: theme.spacing.xs, fontWeight: 500, color: theme.colors.dark }}>
                Data Início *
              </label>
              <input
                type="date"
                value={formData.dataInicio ? formData.dataInicio.split('T')[0] : ''}
                onChange={(e) => {
                  const value = `${e.target.value}T00:00:00`;
                  console.log('🔵 DataInicio selecionada:', value);
                  setFormData((prev) => ({ ...prev, dataInicio: value }));
                }}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  backgroundColor: theme.colors.white,
                  color: theme.colors.dark,
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: theme.spacing.xs, fontWeight: 500, color: theme.colors.dark }}>
                Data Fim *
              </label>
              <input
                type="date"
                value={formData.dataFim ? formData.dataFim.split('T')[0] : ''}
                onChange={(e) => {
                  const value = `${e.target.value}T23:59:59`;
                  console.log('🔵 DataFim selecionada:', value);
                  setFormData((prev) => ({ ...prev, dataFim: value }));
                }}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  backgroundColor: theme.colors.white,
                  color: theme.colors.dark,
                }}
              />
            </div>
          </div>

          {/* Campo de Descrição */}
          <div style={{ marginTop: theme.spacing.md }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: theme.spacing.xs, fontWeight: 500, color: theme.colors.dark }}>
              Descrição do Contrato
            </label>
            <textarea
              value={formData.descricao || ''}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descreva os detalhes do contrato, coberturas, condições, etc."
              rows={4}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                borderRadius: theme.borderRadius.sm,
                fontFamily: 'inherit',
                fontSize: '14px',
                resize: 'vertical',
                backgroundColor: theme.colors.white,
                color: theme.colors.dark,
              }}
            />
          </div>

          {/* Seleção de Equipamentos */}
          <div style={{ marginTop: theme.spacing.md }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.xs }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: theme.colors.dark }}>
                Equipamentos Vinculados
              </label>
              <button
                type="button"
                onClick={() => setShowEquipmentSelector(!showEquipmentSelector)}
                style={{
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  borderRadius: theme.borderRadius.sm,
                  backgroundColor: theme.colors.white,
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {showEquipmentSelector ? 'Ocultar' : 'Selecionar Equipamentos'}
              </button>
            </div>
            
            {selectedEquipmentIds.length > 0 && (
              <div style={{ marginBottom: theme.spacing.sm }}>
                <p style={{ fontSize: '12px', color: theme.colors.gray[600], margin: 0 }}>
                  {selectedEquipmentIds.length} equipamento(s) selecionado(s)
                </p>
              </div>
            )}

            {showEquipmentSelector && (
              <div
                style={{
                  border: `1px solid ${theme.colors.gray[300]}`,
                  borderRadius: theme.borderRadius.sm,
                  padding: theme.spacing.md,
                  maxHeight: '400px',
                  overflow: 'auto',
                  backgroundColor: theme.colors.gray[50],
                }}
              >
                {equipmentLoading ? (
                  <LoadingSpinner text="Carregando equipamentos..." />
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Buscar equipamento por tag, nome, modelo, fabricante..."
                      value={equipmentSearchTerm}
                      onChange={(e) => setEquipmentSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: theme.spacing.sm,
                        border: `1px solid ${theme.colors.gray[300]}`,
                        marginBottom: theme.spacing.md,
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                      {filteredEquipments.length === 0 ? (
                        <p style={{ color: theme.colors.gray[500], fontSize: '14px', textAlign: 'center', padding: theme.spacing.md }}>
                          Nenhum equipamento encontrado
                        </p>
                      ) : (
                        filteredEquipments.map((eq) => {
                          const isSelected = selectedEquipmentIds.includes(eq.Id);
                          return (
                            <label
                              key={eq.Id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: theme.spacing.sm,
                                padding: theme.spacing.sm,
                                backgroundColor: isSelected ? theme.colors.primary + '10' : theme.colors.white,
                                border: `1px solid ${isSelected ? theme.colors.primary : theme.colors.gray[300]}`,
                                borderRadius: theme.borderRadius.sm,
                                cursor: 'pointer',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleEquipmentSelection(eq.Id)}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, fontSize: '14px' }}>
                                  {eq.Equipamento || 'Sem nome'}
                                </div>
                                <div style={{ fontSize: '12px', color: theme.colors.gray[600] }}>
                                  {eq.Tag && `Tag: ${eq.Tag}`} {eq.Modelo && `| ${eq.Modelo}`} {eq.Setor && `| ${eq.Setor}`}
                                </div>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Upload de Arquivo */}
          <div style={{ marginTop: theme.spacing.md }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: theme.spacing.xs, fontWeight: 500, color: theme.colors.dark }}>
              Arquivo do Contrato
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
              <input
                id="contract-file"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                style={{
                  flex: 1,
                  padding: theme.spacing.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  borderRadius: theme.borderRadius.sm,
                  backgroundColor: theme.colors.white,
                  color: theme.colors.dark,
                }}
              />
              {formData.arquivoUrl && (
                <a
                  href={formData.arquivoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.white,
                    borderRadius: theme.borderRadius.sm,
                    textDecoration: 'none',
                    fontSize: '12px',
                  }}
                >
                  <FiDownload size={14} />
                  {formData.arquivoNome || 'Baixar'}
                </a>
              )}
            </div>
            <p style={{ fontSize: '11px', color: theme.colors.gray[500], margin: `${theme.spacing.xs} 0 0 0` }}>
              Formatos aceitos: PDF, DOC, DOCX, JPG, PNG (máx. 10MB)
            </p>
          </div>

          {/* Observações */}
          <div style={{ marginTop: theme.spacing.md }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: theme.spacing.xs, fontWeight: 500, color: theme.colors.dark }}>
              Observações
            </label>
            <textarea
              value={formData.observacoes || ''}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações adicionais sobre o contrato"
              rows={3}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                borderRadius: theme.borderRadius.sm,
                fontFamily: 'inherit',
                fontSize: '14px',
                resize: 'vertical',
                backgroundColor: theme.colors.white,
                color: theme.colors.dark,
              }}
            />
          </div>

          {/* Checkboxes */}
          <div style={{ marginTop: theme.spacing.md, display: 'flex', gap: theme.spacing.lg }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.renovacaoAutomatica || false}
                onChange={(e) => setFormData({ ...formData, renovacaoAutomatica: e.target.checked })}
              />
              <span style={{ fontSize: '14px' }}>Renovação Automática</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.ativo !== undefined ? formData.ativo : true}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              />
              <span style={{ fontSize: '14px' }}>Contrato Ativo</span>
            </label>
          </div>

          {/* Botões */}
          <div style={{ marginTop: theme.spacing.md, display: 'flex', gap: theme.spacing.sm }}>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              onClick={(e) => {
                console.log('=== BOTÃO SALVAR CLICADO (onClick) ===');
                console.log('isPending:', createMutation.isPending || updateMutation.isPending);
                // Garantir que handleSave seja chamado mesmo se o form não disparar onSubmit
                e.preventDefault();
                e.stopPropagation();
                console.log('Chamando handleSave diretamente do onClick...');
                handleSave();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.borderRadius.sm,
                border: 'none',
                backgroundColor: (createMutation.isPending || updateMutation.isPending) ? theme.colors.gray[400] : theme.colors.primary,
                color: theme.colors.white,
                cursor: (createMutation.isPending || updateMutation.isPending) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                opacity: (createMutation.isPending || updateMutation.isPending) ? 0.6 : 1,
              }}
            >
              {(createMutation.isPending || updateMutation.isPending) && <LoadingSpinner size="small" />}
              <FiSave size={16} />
              Salvar
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({});
                setSelectedEquipmentIds([]);
                setEquipmentSearchTerm('');
                setShowEquipmentSelector(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.borderRadius.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                backgroundColor: theme.colors.white,
                color: theme.colors.gray[700],
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              <FiX size={16} />
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Modal de Visualização */}
      {viewingContract && (
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
          onClick={() => setViewingContract(null)}
        >
          <div
            style={{
              backgroundColor: theme.colors.white,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.lg,
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: theme.shadows.lg,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
              <h2 style={{ margin: 0, color: theme.colors.dark }}>Detalhes do Contrato</h2>
              <button
                type="button"
                onClick={() => setViewingContract(null)}
                style={{
                  padding: theme.spacing.xs,
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: theme.colors.gray[600],
                }}
              >
                <FiX size={24} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.gray[600], display: 'block', marginBottom: theme.spacing.xs }}>
                  Nome do Contrato
                </label>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>{viewingContract.nome}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: theme.spacing.md }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.gray[600], display: 'block', marginBottom: theme.spacing.xs }}>
                    Fornecedor
                  </label>
                  <p style={{ margin: 0 }}>{viewingContract.fornecedor}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.gray[600], display: 'block', marginBottom: theme.spacing.xs }}>
                    Tipo de Contrato
                  </label>
                  <p style={{ margin: 0 }}>{viewingContract.tipoContrato}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.gray[600], display: 'block', marginBottom: theme.spacing.xs }}>
                    Valor Anual
                  </label>
                  <p style={{ margin: 0, fontWeight: 600 }}>{formatCurrency(viewingContract.valorAnual)}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: theme.spacing.md }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.gray[600], display: 'block', marginBottom: theme.spacing.xs }}>
                    Data de Início
                  </label>
                  <p style={{ margin: 0 }}>{formatDate(viewingContract.dataInicio)}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.gray[600], display: 'block', marginBottom: theme.spacing.xs }}>
                    Data de Fim
                  </label>
                  <p style={{ margin: 0 }}>{formatDate(viewingContract.dataFim)}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.gray[600], display: 'block', marginBottom: theme.spacing.xs }}>
                    Status
                  </label>
                  <p style={{ margin: 0 }}>
                    <span
                      style={{
                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                        borderRadius: theme.borderRadius.sm,
                        backgroundColor: viewingContract.ativo ? `${theme.colors.success}20` : `${theme.colors.gray[300]}20`,
                        color: viewingContract.ativo ? theme.colors.success : theme.colors.gray[600],
                        fontWeight: 600,
                        fontSize: '12px',
                      }}
                    >
                      {viewingContract.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.gray[600], display: 'block', marginBottom: theme.spacing.xs }}>
                  Equipamentos Vinculados
                </label>
                <p style={{ margin: 0 }}>
                  {viewingContract.equipamentoIds === 'TODOS' 
                    ? 'Todos os equipamentos' 
                    : `${viewingContract.equipamentoIds.split(',').length} equipamento(s) específico(s)`}
                </p>
              </div>

              {viewingContract.descricao && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.gray[600], display: 'block', marginBottom: theme.spacing.xs }}>
                    Descrição
                  </label>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{viewingContract.descricao}</p>
                </div>
              )}

              {viewingContract.observacoes && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.gray[600], display: 'block', marginBottom: theme.spacing.xs }}>
                    Observações
                  </label>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{viewingContract.observacoes}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.gray[600] }}>
                  Renovação Automática:
                </label>
                <span style={{ fontSize: '14px' }}>
                  {viewingContract.renovacaoAutomatica ? 'Sim' : 'Não'}
                </span>
              </div>

              {viewingContract.arquivoUrl && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.gray[600], display: 'block', marginBottom: theme.spacing.xs }}>
                    Arquivo do Contrato
                  </label>
                  <a
                    href={viewingContract.arquivoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: theme.spacing.xs,
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      backgroundColor: theme.colors.primary,
                      color: theme.colors.white,
                      borderRadius: theme.borderRadius.sm,
                      textDecoration: 'none',
                      fontSize: '14px',
                    }}
                  >
                    <FiDownload size={16} />
                    {viewingContract.arquivoNome || 'Baixar Arquivo'}
                  </a>
                </div>
              )}

              <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                <button
                  type="button"
                  onClick={() => {
                    setViewingContract(null);
                    setEditingId(viewingContract.id);
                    setFormData({
                      nome: viewingContract.nome,
                      fornecedor: viewingContract.fornecedor,
                      tipoContrato: viewingContract.tipoContrato,
                      valorAnual: viewingContract.valorAnual,
                      dataInicio: viewingContract.dataInicio,
                      dataFim: viewingContract.dataFim,
                      renovacaoAutomatica: viewingContract.renovacaoAutomatica,
                      ativo: viewingContract.ativo,
                      descricao: viewingContract.descricao,
                      observacoes: viewingContract.observacoes,
                      arquivoUrl: viewingContract.arquivoUrl,
                      arquivoNome: viewingContract.arquivoNome,
                      equipamentoIds: viewingContract.equipamentoIds,
                    });
                    if (viewingContract.equipamentoIds && viewingContract.equipamentoIds !== 'TODOS') {
                      try {
                        const ids = viewingContract.equipamentoIds.split(',').map(id => parseInt(id.trim())).filter(Boolean);
                        setSelectedEquipmentIds(ids);
                      } catch {
                        setSelectedEquipmentIds([]);
                      }
                    } else {
                      setSelectedEquipmentIds([]);
                    }
                    setShowForm(true);
                  }}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    borderRadius: theme.borderRadius.sm,
                    border: `1px solid ${theme.colors.primary}`,
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.white,
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                  }}
                >
                  <FiEdit2 size={16} />
                  Editar Contrato
                </button>
                <button
                  type="button"
                  onClick={() => setViewingContract(null)}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    borderRadius: theme.borderRadius.sm,
                    border: `1px solid ${theme.colors.gray[300]}`,
                    backgroundColor: theme.colors.white,
                    color: theme.colors.gray[700],
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela */}
      {contracts && contracts.length > 0 ? (
        <DataTable
          data={contracts}
          columns={columns}
          selectable={false}
        />
      ) : (
        <div
          style={{
            padding: theme.spacing.xl,
            textAlign: 'center',
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.md,
            color: theme.colors.gray[500],
          }}
        >
          Nenhum contrato cadastrado
        </div>
      )}
    </div>
  );
}

