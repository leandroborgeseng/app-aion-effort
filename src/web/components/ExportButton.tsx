// Componente reutilizável para botão de exportação
import React, { useState } from 'react';
import { FiDownload, FiFileText, FiFile } from 'react-icons/fi';
import { theme } from '../styles/theme';
import { exportToCSV, exportToExcel } from '../utils/exportUtils';
import toast from 'react-hot-toast';

interface ExportButtonProps<T> {
  data: T[];
  filename: string;
  columns: Array<{ key: string; label: string }>;
  disabled?: boolean;
  variant?: 'csv' | 'excel' | 'both';
  label?: string;
}

export default function ExportButton<T extends Record<string, any>>({
  data,
  filename,
  columns,
  disabled = false,
  variant = 'both',
  label = 'Exportar',
}: ExportButtonProps<T>) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'excel') => {
    if (!data || data.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    if (disabled || isExporting) {
      return;
    }

    setIsExporting(true);
    
    try {
      if (format === 'csv') {
        exportToCSV(data, filename, columns);
        toast.success(`Arquivo CSV "${filename}.csv" exportado com sucesso!`);
      } else {
        exportToExcel(data, filename, columns);
        toast.success(`Arquivo Excel "${filename}.xlsx" exportado com sucesso!`);
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar arquivo');
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  };

  if (variant === 'csv') {
    return (
      <button
        onClick={() => handleExport('csv')}
        disabled={disabled || isExporting || !data || data.length === 0}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: theme.spacing.xs,
          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
          backgroundColor: theme.colors.primary,
          color: theme.colors.white,
          border: 'none',
          fontSize: '14px',
          fontWeight: 600,
          cursor: disabled || isExporting || !data || data.length === 0 ? 'not-allowed' : 'pointer',
          opacity: disabled || isExporting || !data || data.length === 0 ? 0.6 : 1,
          transition: 'opacity 0.2s',
        }}
        title="Exportar para CSV"
      >
        <FiFileText size={16} />
        {isExporting ? 'Exportando...' : label}
      </button>
    );
  }

  if (variant === 'excel') {
    return (
      <button
        onClick={() => handleExport('excel')}
        disabled={disabled || isExporting || !data || data.length === 0}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: theme.spacing.xs,
          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
          backgroundColor: theme.colors.success,
          color: theme.colors.white,
          border: 'none',
          fontSize: '14px',
          fontWeight: 600,
          cursor: disabled || isExporting || !data || data.length === 0 ? 'not-allowed' : 'pointer',
          opacity: disabled || isExporting || !data || data.length === 0 ? 0.6 : 1,
          transition: 'opacity 0.2s',
        }}
        title="Exportar para Excel"
      >
        <FiFile size={16} />
        {isExporting ? 'Exportando...' : label}
      </button>
    );
  }

  // Variant 'both' - mostrar dropdown
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => handleExport('excel')}
        disabled={disabled || isExporting || !data || data.length === 0}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: theme.spacing.xs,
          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
          backgroundColor: theme.colors.primary,
          color: theme.colors.white,
          border: 'none',
          fontSize: '14px',
          fontWeight: 600,
          cursor: disabled || isExporting || !data || data.length === 0 ? 'not-allowed' : 'pointer',
          opacity: disabled || isExporting || !data || data.length === 0 ? 0.6 : 1,
          transition: 'opacity 0.2s',
        }}
        title="Exportar dados"
      >
        <FiDownload size={16} />
        {isExporting ? 'Exportando...' : label}
      </button>
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: theme.spacing.xs,
          backgroundColor: theme.colors.white,
          border: `1px solid ${theme.colors.gray[300]}`,
          borderRadius: theme.borderRadius.md,
          boxShadow: theme.shadows.lg,
          zIndex: 1000,
          minWidth: '150px',
          display: 'none', // Será mostrado com hover ou click
        }}
        className="export-dropdown"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleExport('csv');
          }}
          disabled={disabled || isExporting || !data || data.length === 0}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            backgroundColor: 'transparent',
            border: 'none',
            textAlign: 'left',
            cursor: disabled || isExporting || !data || data.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            color: theme.colors.dark,
          }}
        >
          <FiFileText size={16} />
          Exportar CSV
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleExport('excel');
          }}
          disabled={disabled || isExporting || !data || data.length === 0}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            backgroundColor: 'transparent',
            border: 'none',
            borderTop: `1px solid ${theme.colors.gray[200]}`,
            textAlign: 'left',
            cursor: disabled || isExporting || !data || data.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            color: theme.colors.dark,
          }}
        >
          <FiFile size={16} />
          Exportar Excel
        </button>
      </div>
      <style>{`
        .export-dropdown {
          display: none;
        }
        button:hover + .export-dropdown,
        .export-dropdown:hover {
          display: block;
        }
      `}</style>
    </div>
  );
}

