// src/web/utils/dateUtils.ts
// Utilitários para formatação de datas no formato brasileiro

/**
 * Parse uma string de data que pode estar em formato brasileiro (DD/MM/YYYY) ou ISO (YYYY-MM-DD)
 * Retorna um objeto Date válido
 */
export function parseBrazilianDate(dateString: string | null | undefined): Date | null {
  if (!dateString || dateString.trim() === '') {
    return null;
  }

  // Se já é um objeto Date, retornar como está
  if (dateString instanceof Date) {
    return dateString;
  }

  const trimmed = dateString.trim();

  // Formato ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)
  if (trimmed.match(/^\d{4}-\d{2}-\d{2}/)) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Formato brasileiro (DD/MM/YYYY ou DD/MM/YYYY HH:mm:ss)
  // SEMPRE tratar como DD/MM/YYYY (formato brasileiro)
  if (trimmed.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
    const parts = trimmed.split(/[\s\/T]/);
    if (parts.length >= 3) {
      // SEMPRE interpretar como DD/MM/YYYY (formato brasileiro)
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Mês é 0-indexed no JavaScript
      const year = parseInt(parts[2], 10);
      
      // Validar valores
      if (day < 1 || day > 31 || month < 0 || month > 11) {
        // Se inválido como brasileiro, tentar como americano e inverter
        const dayAm = parseInt(parts[1], 10);
        const monthAm = parseInt(parts[0], 10) - 1;
        const yearAm = parseInt(parts[2], 10);
        if (dayAm >= 1 && dayAm <= 31 && monthAm >= 0 && monthAm <= 11) {
          // Usar formato invertido (americano interpretado como brasileiro)
          const date = new Date(yearAm, monthAm, dayAm);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
      
      // Se tem hora, minuto, segundo
      if (parts.length >= 6 || trimmed.includes('T') || trimmed.includes(':')) {
        const timePart = parts.find(p => p.includes(':')) || trimmed.split(' ')[1] || '';
        const timeParts = timePart.split(':');
        const hour = parseInt(timeParts[0] || '0', 10);
        const minute = parseInt(timeParts[1] || '0', 10);
        const second = parseInt(timeParts[2] || '0', 10);
        const date = new Date(year, month, day, hour, minute, second);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } else {
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
  }

  // Tentar parse padrão do JavaScript como fallback
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date;
  }

  return null;
}

/**
 * Formata uma data para o formato brasileiro DD/MM/YYYY
 */
export function formatBrazilianDate(date: Date | string | null | undefined): string {
  const parsedDate = typeof date === 'string' ? parseBrazilianDate(date) : date;
  
  if (!parsedDate || !(parsedDate instanceof Date) || isNaN(parsedDate.getTime())) {
    return 'Data inválida';
  }

  const day = parsedDate.getDate().toString().padStart(2, '0');
  const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
  const year = parsedDate.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Formata uma data com hora para o formato brasileiro DD/MM/YYYY HH:mm:ss
 */
export function formatBrazilianDateTime(date: Date | string | null | undefined): string {
  const parsedDate = typeof date === 'string' ? parseBrazilianDate(date) : date;
  
  if (!parsedDate || !(parsedDate instanceof Date) || isNaN(parsedDate.getTime())) {
    return 'Data inválida';
  }

  const day = parsedDate.getDate().toString().padStart(2, '0');
  const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
  const year = parsedDate.getFullYear();
  const hours = parsedDate.getHours().toString().padStart(2, '0');
  const minutes = parsedDate.getMinutes().toString().padStart(2, '0');
  const seconds = parsedDate.getSeconds().toString().padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Formata uma data para formato longo brasileiro (ex: "1 de outubro de 2025")
 */
export function formatBrazilianDateLong(date: Date | string | null | undefined): string {
  const parsedDate = typeof date === 'string' ? parseBrazilianDate(date) : date;
  
  if (!parsedDate || !(parsedDate instanceof Date) || isNaN(parsedDate.getTime())) {
    return 'Data inválida';
  }

  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  const day = parsedDate.getDate();
  const month = months[parsedDate.getMonth()];
  const year = parsedDate.getFullYear();

  return `${day} de ${month} de ${year}`;
}

