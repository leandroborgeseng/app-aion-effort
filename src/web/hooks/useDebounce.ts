// src/web/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores
 * Útil para campos de busca e filtros que não devem executar a cada digitação
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;

