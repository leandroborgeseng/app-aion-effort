// Componente DataTable com virtualização para melhor performance com muitas linhas
import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { theme } from '../styles/theme';
import type { SortDirection, SortConfig } from './DataTable';

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: any, row: T, index?: number) => React.ReactNode;
  width?: string;
  mobileHide?: boolean;
  sortable?: boolean;
  sortValue?: (row: T) => any;
}

interface VirtualizedDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title?: string;
  selectable?: boolean;
  selectedRows?: Set<number>;
  onSelectRow?: (id: number, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  getId?: (row: T) => number;
  sortConfig?: SortConfig;
  onSort?: (column: string, direction: SortDirection) => void;
  onRowClick?: (row: T) => void;
  estimatedRowHeight?: number;
  maxHeight?: string;
}

export default function VirtualizedDataTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  selectable = false,
  selectedRows = new Set(),
  onSelectRow,
  onSelectAll,
  getId,
  sortConfig,
  onSort,
  onRowClick,
  estimatedRowHeight = 50,
  maxHeight = '600px',
}: VirtualizedDataTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const allSelected = data.length > 0 && data.every((row) => {
    const id = getId ? getId(row) : row.Id;
    return selectedRows.has(id);
  });
  const someSelected = data.some((row) => {
    const id = getId ? getId(row) : row.Id;
    return selectedRows.has(id);
  });

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 5, // Renderizar 5 linhas extras acima e abaixo
  });

  // Calcular larguras das colunas
  const columnWidths = useMemo(() => {
    return columns.map((col) => {
      if (col.width) {
        // Converter "200px" para número
        const match = col.width.match(/(\d+)/);
        return match ? parseInt(match[1]) : 150;
      }
      return 150; // Largura padrão
    });
  }, [columns]);

  const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);

  const handleSort = (column: string) => {
    if (!onSort) return;
    
    const currentColumn = String(sortConfig?.column || '');
    const currentDirection = sortConfig?.direction || null;
    
    let newDirection: SortDirection = 'asc';
    if (currentColumn === column) {
      if (currentDirection === 'asc') {
        newDirection = 'desc';
      } else if (currentDirection === 'desc') {
        newDirection = null;
      }
    }
    
    onSort(column, newDirection);
  };

  return (
    <div
      style={{
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.lg,
        boxShadow: theme.shadows.md,
        overflow: 'hidden',
      }}
    >
      {title && (
        <div
          style={{
            padding: theme.spacing.lg,
            borderBottom: `1px solid ${theme.colors.gray[200]}`,
            backgroundColor: theme.colors.gray[50],
          }}
        >
          <h2 style={{ margin: 0, color: theme.colors.dark }}>{title}</h2>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectable ? `40px repeat(${columns.length}, 1fr)` : `repeat(${columns.length}, 1fr)`,
          gap: theme.spacing.md,
          padding: theme.spacing.md,
          borderBottom: `2px solid ${theme.colors.gray[200]}`,
          backgroundColor: theme.colors.gray[50],
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        {selectable && (
          <div>
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected;
              }}
              onChange={(e) => {
                if (onSelectAll) {
                  onSelectAll(e.target.checked);
                }
              }}
              style={{
                cursor: 'pointer',
              }}
            />
          </div>
        )}
        {columns.map((col, colIndex) => {
          const isSorted = sortConfig?.column === String(col.key);
          const sortDirection = isSorted ? sortConfig?.direction : null;
          
          return (
            <div
              key={String(col.key)}
              style={{
                fontWeight: 600,
                fontSize: '13px',
                color: theme.colors.gray[700],
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                cursor: col.sortable ? 'pointer' : 'default',
                userSelect: 'none',
              }}
              onClick={() => col.sortable && handleSort(String(col.key))}
            >
              {col.label}
              {col.sortable && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <FiChevronUp
                    size={12}
                    color={sortDirection === 'asc' ? theme.colors.primary : theme.colors.gray[400]}
                  />
                  <FiChevronDown
                    size={12}
                    color={sortDirection === 'desc' ? theme.colors.primary : theme.colors.gray[400]}
                    style={{ marginTop: '-6px' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Virtualized Body */}
      <div
        ref={parentRef}
        style={{
          height: maxHeight,
          overflow: 'auto',
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = data[virtualRow.index];
            const id = getId ? getId(row) : row.Id;
            const isSelected = selectedRows.has(id);

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                  display: 'grid',
                  gridTemplateColumns: selectable ? `40px repeat(${columns.length}, 1fr)` : `repeat(${columns.length}, 1fr)`,
                  gap: theme.spacing.md,
                  padding: theme.spacing.md,
                  borderBottom: `1px solid ${theme.colors.gray[100]}`,
                  backgroundColor: isSelected ? `${theme.colors.primary}10` : theme.colors.white,
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background-color 0.2s',
                }}
                onClick={() => onRowClick && onRowClick(row)}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = theme.colors.gray[50];
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = theme.colors.white;
                  }
                }}
              >
                {selectable && (
                  <div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (onSelectRow) {
                          onSelectRow(id, e.target.checked);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                )}
                {columns.map((col) => {
                  const value = row[col.key];
                  return (
                    <div
                      key={String(col.key)}
                      style={{
                        fontSize: '14px',
                        color: theme.colors.dark,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col.render ? col.render(value, row, virtualRow.index) : String(value || '-')}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer com contagem */}
      <div
        style={{
          padding: theme.spacing.md,
          borderTop: `1px solid ${theme.colors.gray[200]}`,
          backgroundColor: theme.colors.gray[50],
          fontSize: '12px',
          color: theme.colors.gray[600],
          textAlign: 'center',
        }}
      >
        Mostrando {data.length} {data.length === 1 ? 'item' : 'itens'} (virtualizado para melhor performance)
      </div>
    </div>
  );
}

