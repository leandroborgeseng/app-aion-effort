import React, { useState } from 'react';
import { FiFilter, FiSave, FiX, FiTrash2 } from 'react-icons/fi';
import { theme } from '../styles/theme';

export interface FilterState {
  setor: string;
  criticidade: string;
  fabricante: string;
  status: string;
  anoMinimo: string;
  anoMaximo: string;
  anvisaVencida: boolean;
  eolProximo: boolean;
  eosProximo: boolean;
  mostrarInativos: boolean;
  apenasCriticos: boolean;
}

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  setores: string[];
  fabricantes: string[];
  criticidades: string[];
  anos: number[];
  savedFilters: SavedFilter[];
  onSaveFilter: (name: string, filters: FilterState) => void;
  onLoadFilter: (filters: FilterState) => void;
  onDeleteFilter: (id: string) => void;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: string;
}

export default function FilterPanel({
  filters,
  onFiltersChange,
  setores,
  fabricantes,
  criticidades,
  anos,
  savedFilters,
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange({
      setor: 'Todos',
      criticidade: 'Todos',
      fabricante: 'Todos',
      status: 'Todos',
      anoMinimo: '',
      anoMaximo: '',
      anvisaVencida: false,
      eolProximo: false,
      eosProximo: false,
      mostrarInativos: false,
      apenasCriticos: false,
    });
  };

  const handleSaveFilter = () => {
    if (filterName.trim()) {
      onSaveFilter(filterName.trim(), filters);
      setFilterName('');
      setShowSaveDialog(false);
    }
  };

  const activeFiltersCount =
    (filters.setor !== 'Todos' ? 1 : 0) +
    (filters.criticidade !== 'Todos' ? 1 : 0) +
    (filters.fabricante !== 'Todos' ? 1 : 0) +
    (filters.status !== 'Todos' ? 1 : 0) +
    (filters.anoMinimo ? 1 : 0) +
    (filters.anoMaximo ? 1 : 0) +
    (filters.anvisaVencida ? 1 : 0) +
    (filters.eolProximo ? 1 : 0) +
    (filters.eosProximo ? 1 : 0) +
    (filters.mostrarInativos ? 1 : 0) +
    (filters.apenasCriticos ? 1 : 0);

  return (
    <div
      style={{
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.md,
        boxShadow: theme.shadows.sm,
        marginBottom: theme.spacing.md,
        overflow: 'hidden',
      }}
    >
      {/* Header do painel */}
      <div
        style={{
          padding: theme.spacing.md,
          borderBottom: `1px solid ${theme.colors.gray[200]}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          backgroundColor: activeFiltersCount > 0 ? `${theme.colors.primary}05` : 'transparent',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <FiFilter size={18} color={theme.colors.primary} />
          <span style={{ fontWeight: 600, color: theme.colors.dark }}>Filtros</span>
          {activeFiltersCount > 0 && (
            <span
              style={{
                backgroundColor: theme.colors.primary,
                color: theme.colors.white,
                borderRadius: '12px',
                padding: `2px ${theme.spacing.xs}`,
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {activeFiltersCount}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
          {activeFiltersCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetFilters();
              }}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                border: 'none',
                backgroundColor: 'transparent',
                color: theme.colors.gray[600],
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
              }}
            >
              <FiX size={14} />
              Limpar
            </button>
          )}
          <span style={{ fontSize: '18px', color: theme.colors.gray[400] }}>
            {isOpen ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {/* Conteúdo do painel */}
      {isOpen && (
        <div style={{ padding: theme.spacing.md }}>
          {/* Filtros salvos */}
          {savedFilters.length > 0 && (
            <div style={{ marginBottom: theme.spacing.md }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: theme.colors.gray[600],
                  marginBottom: theme.spacing.xs,
                  textTransform: 'uppercase',
                }}
              >
                Filtros Salvos
              </label>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: theme.spacing.xs,
                }}
              >
                {savedFilters.map((saved) => (
                  <div
                    key={saved.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.xs,
                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                      backgroundColor: theme.colors.gray[50],
                      borderRadius: theme.borderRadius.sm,
                      border: `1px solid ${theme.colors.gray[200]}`,
                    }}
                  >
                    <button
                      onClick={() => onLoadFilter(saved.filters)}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: theme.colors.primary,
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        padding: 0,
                      }}
                    >
                      {saved.name}
                    </button>
                    <button
                      onClick={() => onDeleteFilter(saved.id)}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: theme.colors.danger,
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grid de filtros */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: theme.spacing.md,
              marginBottom: theme.spacing.md,
            }}
          >
            {/* Setor */}
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
                Setor
              </label>
              <select
                value={filters.setor}
                onChange={(e) => updateFilter('setor', e.target.value)}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  borderRadius: theme.borderRadius.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  fontSize: '13px',
                  backgroundColor: theme.colors.white,
                }}
              >
                <option value="Todos">Todos</option>
                {setores.map((setor) => (
                  <option key={setor} value={setor}>
                    {setor}
                  </option>
                ))}
              </select>
            </div>

            {/* Criticidade */}
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
                Criticidade
              </label>
              <select
                value={filters.criticidade}
                onChange={(e) => updateFilter('criticidade', e.target.value)}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  borderRadius: theme.borderRadius.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  fontSize: '13px',
                  backgroundColor: theme.colors.white,
                }}
              >
                <option value="Todos">Todos</option>
                {criticidades.map((criticidade) => (
                  <option key={criticidade} value={criticidade}>
                    {criticidade}
                  </option>
                ))}
              </select>
            </div>

            {/* Fabricante */}
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
                Fabricante
              </label>
              <select
                value={filters.fabricante}
                onChange={(e) => updateFilter('fabricante', e.target.value)}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  borderRadius: theme.borderRadius.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  fontSize: '13px',
                  backgroundColor: theme.colors.white,
                }}
              >
                <option value="Todos">Todos</option>
                {fabricantes.map((fabricante) => (
                  <option key={fabricante} value={fabricante}>
                    {fabricante}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
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
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  borderRadius: theme.borderRadius.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  fontSize: '13px',
                  backgroundColor: theme.colors.white,
                }}
              >
                <option value="Todos">Todos</option>
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>

            {/* Ano Mínimo */}
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
                Ano Mínimo
              </label>
              <select
                value={filters.anoMinimo}
                onChange={(e) => updateFilter('anoMinimo', e.target.value)}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  borderRadius: theme.borderRadius.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  fontSize: '13px',
                  backgroundColor: theme.colors.white,
                }}
              >
                <option value="">Todos</option>
                {anos.map((ano) => (
                  <option key={ano} value={String(ano)}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>

            {/* Ano Máximo */}
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
                Ano Máximo
              </label>
              <select
                value={filters.anoMaximo}
                onChange={(e) => updateFilter('anoMaximo', e.target.value)}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  borderRadius: theme.borderRadius.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  fontSize: '13px',
                  backgroundColor: theme.colors.white,
                }}
              >
                <option value="">Todos</option>
                {anos.map((ano) => (
                  <option key={ano} value={String(ano)}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Checkboxes */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: theme.spacing.sm,
              marginBottom: theme.spacing.md,
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              <input
                type="checkbox"
                checked={filters.anvisaVencida}
                onChange={(e) => updateFilter('anvisaVencida', e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                }}
              />
              <span>ANVISA Vencida</span>
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              <input
                type="checkbox"
                checked={filters.eolProximo}
                onChange={(e) => updateFilter('eolProximo', e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                }}
              />
              <span>EoL Próximo (1 ano)</span>
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              <input
                type="checkbox"
                checked={filters.eosProximo}
                onChange={(e) => updateFilter('eosProximo', e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                }}
              />
              <span>EoS Próximo (1 ano)</span>
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              <input
                type="checkbox"
                checked={filters.mostrarInativos}
                onChange={(e) => updateFilter('mostrarInativos', e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                }}
              />
              <span>Mostrar Inativos</span>
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              <input
                type="checkbox"
                checked={filters.apenasCriticos}
                onChange={(e) => updateFilter('apenasCriticos', e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                }}
              />
              <span>Apenas Críticos</span>
            </label>
          </div>

          {/* Botão Salvar Filtro */}
          <div
            style={{
              display: 'flex',
              gap: theme.spacing.sm,
              alignItems: 'center',
              paddingTop: theme.spacing.md,
              borderTop: `1px solid ${theme.colors.gray[200]}`,
            }}
          >
            {!showSaveDialog ? (
              <button
                onClick={() => setShowSaveDialog(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                  borderRadius: theme.borderRadius.sm,
                  border: `1px solid ${theme.colors.primary}`,
                  backgroundColor: theme.colors.white,
                  color: theme.colors.primary,
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                <FiSave size={14} />
                Salvar Filtros
              </button>
            ) : (
              <div
                style={{
                  display: 'flex',
                  gap: theme.spacing.xs,
                  flex: 1,
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  placeholder="Nome do filtro..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveFilter()}
                  style={{
                    flex: 1,
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    borderRadius: theme.borderRadius.sm,
                    border: `1px solid ${theme.colors.gray[300]}`,
                    fontSize: '13px',
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSaveFilter}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                    borderRadius: theme.borderRadius.sm,
                    border: 'none',
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.white,
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  Salvar
                </button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setFilterName('');
                  }}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                    borderRadius: theme.borderRadius.sm,
                    border: `1px solid ${theme.colors.gray[300]}`,
                    backgroundColor: theme.colors.white,
                    color: theme.colors.gray[700],
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

