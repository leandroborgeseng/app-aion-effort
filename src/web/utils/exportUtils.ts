// Utilitários para exportação de dados em CSV e Excel
import * as XLSX from 'xlsx';
import { formatBrazilianDate, formatBrazilianDateTime } from './dateUtils';

/**
 * Formata um valor para exibição em CSV/Excel
 * Converte datas, números e valores monetários para formato brasileiro
 */
function formatValueForExport(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  // Se for uma data (string ISO ou Date object)
  if (value instanceof Date) {
    return formatBrazilianDate(value.toISOString());
  }

  if (typeof value === 'string' && (value.includes('T') || value.match(/^\d{4}-\d{2}-\d{2}/))) {
    // Tentar parsear como data ISO
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return formatBrazilianDate(value);
      }
    } catch {
      // Não é uma data válida, continuar
    }
  }

  // Se for número, manter como está (será formatado pelo Excel se necessário)
  if (typeof value === 'number') {
    return value.toString();
  }

  // Se for boolean
  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }

  // Para strings, remover quebras de linha e caracteres problemáticos
  return String(value)
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .trim();
}

/**
 * Converte dados para formato CSV
 */
function convertToCSV(data: any[], columns: Array<{ key: string; label: string }>): string {
  // Cabeçalho
  const headers = columns.map((col) => col.label).join(';');
  
  // Linhas de dados
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const value = row[col.key];
        const formatted = formatValueForExport(value);
        // Escapar aspas e envolver em aspas se contiver ponto e vírgula
        if (formatted.includes(';') || formatted.includes('"') || formatted.includes('\n')) {
          return `"${formatted.replace(/"/g, '""')}"`;
        }
        return formatted;
      })
      .join(';');
  });

  // Combinar cabeçalho e linhas
  return [headers, ...rows].join('\n');
}

/**
 * Exporta dados para CSV
 */
export function exportToCSV(
  data: any[],
  filename: string,
  columns: Array<{ key: string; label: string }>
): void {
  if (!data || data.length === 0) {
    alert('Não há dados para exportar');
    return;
  }

  try {
    const csv = convertToCSV(data, columns);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erro ao exportar CSV:', error);
    alert('Erro ao exportar arquivo CSV');
  }
}

/**
 * Exporta dados para Excel (XLSX)
 */
export function exportToExcel(
  data: any[],
  filename: string,
  columns: Array<{ key: string; label: string }>,
  sheetName: string = 'Dados'
): void {
  if (!data || data.length === 0) {
    alert('Não há dados para exportar');
    return;
  }

  try {
    // Preparar dados para Excel
    const excelData = data.map((row) => {
      const excelRow: Record<string, any> = {};
      columns.forEach((col) => {
        const value = row[col.key];
        excelRow[col.label] = formatValueForExport(value);
      });
      return excelRow;
    });

    // Criar workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Ajustar largura das colunas
    const colWidths = columns.map((col) => ({
      wch: Math.max(col.label.length, 15), // Mínimo 15 caracteres
    }));
    ws['!cols'] = colWidths;

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Gerar arquivo e fazer download
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (error) {
    console.error('Erro ao exportar Excel:', error);
    alert('Erro ao exportar arquivo Excel');
  }
}

/**
 * Exporta dados para ambos os formatos (CSV e Excel)
 */
export function exportData(
  data: any[],
  filename: string,
  columns: Array<{ key: string; label: string }>,
  format: 'csv' | 'excel' | 'both' = 'both'
): void {
  if (format === 'csv' || format === 'both') {
    exportToCSV(data, filename, columns);
  }
  
  if (format === 'excel' || format === 'both') {
    // Pequeno delay para permitir que o download do CSV inicie primeiro
    setTimeout(() => {
      exportToExcel(data, filename, columns);
    }, format === 'both' ? 500 : 0);
  }
}

