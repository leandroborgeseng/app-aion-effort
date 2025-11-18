import React from 'react';
import { FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { theme } from '../styles/theme';

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: any, row: T, index?: number) => React.ReactNode;
  width?: string;
  mobileHide?: boolean; // Ocultar em mobile
  sortable?: boolean; // Se a coluna pode ser ordenada
  sortValue?: (row: T) => any; // Função para extrair valor para ordenação
}

export type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  column: string;
  direction: SortDirection;
}

interface DataTableProps<T> {
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
}

/**
 * Converte valor monetário brasileiro (ex: "4.500,00") para número
 */
function parseBrazilianCurrency(value: string): number {
  if (!value || value.trim() === '') return 0;
  let cleaned = value.trim().replace(/[^\d,.-]/g, '');
  if (!cleaned.includes(',')) {
    return parseFloat(cleaned) || 0;
  }
  cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export default function DataTable<T extends Record<string, any>>({
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
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && data.every((row) => {
    const id = getId ? getId(row) : row.Id;
    return selectedRows.has(id);
  });
  const someSelected = data.some((row) => {
    const id = getId ? getId(row) : row.Id;
    return selectedRows.has(id);
  });

  // Colunas visíveis em mobile (ocultar algumas colunas menos importantes)
  const mobileColumns = columns.filter((col) => !col.mobileHide);

  return (
    <>
      {/* Versão Desktop/Tablet */}
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          boxShadow: theme.shadows.md,
          overflow: 'hidden',
          display: 'none',
          '@media (min-width: 768px)': {
            display: 'block',
          },
        }}
        className="desktop-table"
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
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: theme.colors.gray[100] }}>
                {selectable && (
                  <th
                    style={{
                      padding: theme.spacing.md,
                      textAlign: 'center',
                      width: '50px',
                      borderBottom: `2px solid ${theme.colors.gray[300]}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={(e) => onSelectAll?.(e.target.checked)}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                      }}
                    />
                  </th>
                )}
                {columns.map((col) => {
                  const isSortable = col.sortable !== false && onSort;
                  const isSorted = sortConfig?.column === String(col.key);
                  const sortDirection = isSorted ? sortConfig?.direction : null;
                  
                  return (
                    <th
                      key={String(col.key)}
                      onClick={() => {
                        if (isSortable) {
                          let newDirection: SortDirection = 'asc';
                          if (isSorted && sortDirection === 'asc') {
                            newDirection = 'desc';
                          } else if (isSorted && sortDirection === 'desc') {
                            newDirection = null;
                          }
                          onSort(String(col.key), newDirection);
                        }
                      }}
                      style={{
                        padding: theme.spacing.md,
                        textAlign: 'left',
                        fontWeight: 600,
                        color: theme.colors.gray[700],
                        borderBottom: `2px solid ${theme.colors.gray[300]}`,
                        width: col.width,
                        fontSize: '13px',
                        cursor: isSortable ? 'pointer' : 'default',
                        userSelect: 'none',
                        position: 'relative',
                        backgroundColor: isSorted ? theme.colors.gray[50] : 'transparent',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (isSortable) {
                          e.currentTarget.style.backgroundColor = theme.colors.gray[100];
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isSortable && !isSorted) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        } else if (isSorted) {
                          e.currentTarget.style.backgroundColor = theme.colors.gray[50];
                        }
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing.xs,
                        }}
                      >
                        <span>{col.label}</span>
                        {isSortable && (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              opacity: isSorted ? 1 : 0.3,
                            }}
                          >
                            <FiChevronUp
                              size={12}
                              color={
                                isSorted && sortDirection === 'asc'
                                  ? theme.colors.primary
                                  : theme.colors.gray[400]
                              }
                              style={{
                                marginBottom: '-4px',
                              }}
                            />
                            <FiChevronDown
                              size={12}
                              color={
                                isSorted && sortDirection === 'desc'
                                  ? theme.colors.primary
                                  : theme.colors.gray[400]
                              }
                            />
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => {
                const rowId = getId ? getId(row) : row.Id;
                const isSelected = selectedRows.has(rowId);
                return (
                  <tr
                    key={idx}
                    onClick={() => onRowClick?.(row)}
                    style={{
                      borderBottom: `1px solid ${theme.colors.gray[200]}`,
                      backgroundColor: isSelected ? `${theme.colors.primary}08` : 'transparent',
                      transition: 'background-color 0.2s',
                      cursor: onRowClick ? 'pointer' : 'default',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && onRowClick) {
                        e.currentTarget.style.backgroundColor = theme.colors.gray[50];
                      } else if (isSelected) {
                        e.currentTarget.style.backgroundColor = `${theme.colors.primary}15`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      } else {
                        e.currentTarget.style.backgroundColor = `${theme.colors.primary}08`;
                      }
                    }}
                  >
                    {selectable && (
                      <td
                        style={{
                          padding: theme.spacing.md,
                          textAlign: 'center',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => onSelectRow?.(rowId, e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                          }}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={String(col.key)}
                        style={{
                          padding: theme.spacing.md,
                          color: theme.colors.gray[700],
                          fontSize: '13px',
                        }}
                      >
                        {col.render
                          ? col.render(row[col.key], row, idx)
                          : String(row[col.key] || '-')}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data.length === 0 && (
          <div
            style={{
              padding: theme.spacing.xl,
              textAlign: 'center',
              color: theme.colors.gray[500],
            }}
          >
            Nenhum registro encontrado
          </div>
        )}
      </div>

      {/* Versão Mobile - Cards */}
      <div
        style={{
          display: 'block',
          '@media (min-width: 768px)': {
            display: 'none',
          },
        }}
        className="mobile-cards"
      >
        {data.length === 0 ? (
          <div
            style={{
              padding: theme.spacing.xl,
              textAlign: 'center',
              color: theme.colors.gray[500],
              backgroundColor: theme.colors.white,
              borderRadius: theme.borderRadius.md,
            }}
          >
            Nenhum registro encontrado
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
            {data.map((row, idx) => {
              const rowId = getId ? getId(row) : row.Id;
              const isSelected = selectedRows.has(rowId);
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: theme.colors.white,
                    borderRadius: theme.borderRadius.md,
                    padding: theme.spacing.md,
                    boxShadow: theme.shadows.sm,
                    border: isSelected
                      ? `2px solid ${theme.colors.primary}`
                      : `1px solid ${theme.colors.gray[200]}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: theme.spacing.sm,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing.xs,
                          marginBottom: theme.spacing.xs,
                        }}
                      >
                        {selectable && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => onSelectRow?.(rowId, e.target.checked)}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                            }}
                          />
                        )}
                        <span
                          style={{
                            fontWeight: 600,
                            color: theme.colors.primary,
                            fontSize: '14px',
                          }}
                        >
                          {row.Tag || '-'}
                        </span>
                      </div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: '16px',
                          fontWeight: 600,
                          color: theme.colors.dark,
                        }}
                      >
                        {row.Equipamento || '-'}
                      </h3>
                      <p
                        style={{
                          margin: `${theme.spacing.xs} 0 0 0`,
                          fontSize: '13px',
                          color: theme.colors.gray[600],
                        }}
                      >
                        {row.Fabricante} {row.Modelo}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: theme.spacing.sm,
                      marginTop: theme.spacing.sm,
                      paddingTop: theme.spacing.sm,
                      borderTop: `1px solid ${theme.colors.gray[200]}`,
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '11px',
                          color: theme.colors.gray[500],
                          textTransform: 'uppercase',
                        }}
                      >
                        Setor
                      </p>
                      <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '13px' }}>
                        {row.Setor || '-'}
                      </p>
                    </div>
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '11px',
                          color: theme.colors.gray[500],
                          textTransform: 'uppercase',
                        }}
                      >
                        Criticidade
                      </p>
                      <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '13px' }}>
                        {row.Criticidade || '-'}
                      </p>
                    </div>
                    {row.RegistroAnvisa && (
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '11px',
                            color: theme.colors.gray[500],
                            textTransform: 'uppercase',
                          }}
                        >
                          ANVISA
                        </p>
                        <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '13px' }}>
                          {row.RegistroAnvisa}
                        </p>
                      </div>
                    )}
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '11px',
                          color: theme.colors.gray[500],
                          textTransform: 'uppercase',
                        }}
                      >
                        Valor Gasto
                      </p>
                      <p
                        style={{
                          margin: `${theme.spacing.xs} 0 0 0`,
                          fontSize: '13px',
                          fontWeight: 600,
                          color: theme.colors.danger,
                        }}
                      >
                        {row.ValorGasto
                          ? new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              maximumFractionDigits: 0,
                            }).format(parseBrazilianCurrency(row.ValorGasto))
                          : 'R$ 0'}
                      </p>
                      {row.QuantidadeOS > 0 && (
                        <p
                          style={{
                            margin: `${theme.spacing.xs} 0 0 0`,
                            fontSize: '11px',
                            color: theme.colors.gray[500],
                          }}
                        >
                          {row.QuantidadeOS} OS
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .mobile-cards {
            display: none !important;
          }
          .desktop-table {
            display: block !important;
          }
        }
        @media (max-width: 767px) {
          .mobile-cards {
            display: block !important;
          }
          .desktop-table {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
