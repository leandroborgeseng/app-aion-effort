// Componente para gerenciar filtros salvos
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiSave, FiTrash2, FiShare2, FiCopy, FiX, FiFilter } from 'react-icons/fi';
import { theme } from '../styles/theme';
import toast from 'react-hot-toast';
import ConfirmationDialog from './ConfirmationDialog';

interface SavedFilter {
  id: string;
  name: string;
  page: string;
  filters: string; // JSON string
  isPublic: boolean;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SavedFiltersManagerProps {
  page: string; // 'os' | 'inventario' | 'investimentos' | etc.
  currentFilters: Record<string, any>;
  onLoadFilter: (filters: Record<string, any>) => void;
}

export default function SavedFiltersManager({
  page,
  currentFilters,
  onLoadFilter,
}: SavedFiltersManagerProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });

  const queryClient = useQueryClient();

  // Buscar filtros salvos
  const { data: savedFilters = [], isLoading } = useQuery<SavedFilter[]>({
    queryKey: ['saved-filters', page],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/saved-filters?page=${page}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Erro ao buscar filtros salvos');
      return res.json();
    },
  });

  // Salvar filtro
  const saveMutation = useMutation({
    mutationFn: async (data: { name: string; filters: Record<string, any>; isPublic: boolean }) => {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/saved-filters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          page,
          name: data.name,
          filters: data.filters,
          isPublic: data.isPublic,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao salvar filtro');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters', page] });
      toast.success('Filtro salvo com sucesso!');
      setShowSaveDialog(false);
      setFilterName('');
      setIsPublic(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao salvar filtro');
    },
  });

  // Deletar filtro
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/saved-filters/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao deletar filtro');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters', page] });
      toast.success('Filtro deletado com sucesso!');
      setDeleteConfirm({ isOpen: false, id: null });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao deletar filtro');
    },
  });

  const handleSave = () => {
    if (!filterName.trim()) {
      toast.error('Digite um nome para o filtro');
      return;
    }
    saveMutation.mutate({
      name: filterName.trim(),
      filters: currentFilters,
      isPublic,
    });
  };

  const handleLoad = (filter: SavedFilter) => {
    try {
      const filters = JSON.parse(filter.filters);
      onLoadFilter(filters);
      toast.success(`Filtro "${filter.name}" carregado!`);
    } catch (error) {
      toast.error('Erro ao carregar filtro');
    }
  };

  const handleShare = (filter: SavedFilter) => {
    if (!filter.shareToken) {
      toast.error('Este filtro não está compartilhável');
      return;
    }

    const shareUrl = `${window.location.origin}${window.location.pathname}?filter=${filter.shareToken}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success('Link copiado para a área de transferência!');
    }).catch(() => {
      toast.error('Erro ao copiar link');
    });
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm,
          flexWrap: 'wrap',
        }}
      >
        {/* Botão Salvar Filtro */}
        <button
          onClick={() => setShowSaveDialog(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            backgroundColor: theme.colors.white,
            border: `1px solid ${theme.colors.gray[300]}`,
            borderRadius: theme.borderRadius.md,
            color: theme.colors.dark,
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
          }}
          title="Salvar filtros atuais"
        >
          <FiSave size={14} />
          Salvar Filtros
        </button>

        {/* Lista de Filtros Salvos */}
        {savedFilters.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              flexWrap: 'wrap',
            }}
          >
            {savedFilters.map((filter) => (
              <div
                key={filter.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  backgroundColor: theme.colors.gray[50],
                  border: `1px solid ${theme.colors.gray[300]}`,
                  borderRadius: theme.borderRadius.md,
                }}
              >
                <button
                  onClick={() => handleLoad(filter)}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: theme.colors.primary,
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    padding: 0,
                  }}
                  title="Carregar filtro"
                >
                  {filter.name}
                </button>
                {filter.isPublic && filter.shareToken && (
                  <button
                    onClick={() => handleShare(filter)}
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: theme.colors.info,
                      cursor: 'pointer',
                      padding: theme.spacing.xs,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Copiar link de compartilhamento"
                  >
                    <FiShare2 size={14} />
                  </button>
                )}
                <button
                  onClick={() => setDeleteConfirm({ isOpen: true, id: filter.id })}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: theme.colors.danger,
                    cursor: 'pointer',
                    padding: theme.spacing.xs,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Deletar filtro"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog para Salvar Filtro */}
      {showSaveDialog && (
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
            zIndex: 10000,
            padding: theme.spacing.md,
          }}
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            style={{
              backgroundColor: theme.colors.white,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              maxWidth: '500px',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: theme.spacing.md,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 600,
                  color: theme.colors.dark,
                }}
              >
                Salvar Filtros
              </h3>
              <button
                onClick={() => setShowSaveDialog(false)}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  padding: theme.spacing.xs,
                }}
              >
                <FiX size={20} color={theme.colors.gray[600]} />
              </button>
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: theme.colors.dark,
                  marginBottom: theme.spacing.xs,
                }}
              >
                Nome do Filtro
              </label>
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Ex: OS Abertas - Setor X"
                style={{
                  width: '100%',
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: '14px',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSave();
                  }
                }}
              />
            </div>

            <div style={{ marginBottom: theme.spacing.lg }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: theme.colors.dark,
                }}
              >
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                Permitir compartilhamento (gerar link público)
              </label>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: theme.spacing.sm,
              }}
            >
              <button
                onClick={() => setShowSaveDialog(false)}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  backgroundColor: theme.colors.white,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  borderRadius: theme.borderRadius.md,
                  color: theme.colors.dark,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending || !filterName.trim()}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  backgroundColor: theme.colors.primary,
                  border: 'none',
                  borderRadius: theme.borderRadius.md,
                  color: theme.colors.white,
                  cursor: saveMutation.isPending || !filterName.trim() ? 'not-allowed' : 'pointer',
                  opacity: saveMutation.isPending || !filterName.trim() ? 0.6 : 1,
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de Exclusão */}
      <ConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        title="Deletar Filtro Salvo"
        message="Tem certeza que deseja deletar este filtro salvo? Esta ação não pode ser desfeita."
        confirmText="Deletar"
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
    </>
  );
}

