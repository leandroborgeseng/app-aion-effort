// Hook para busca global na aplicação
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';

export interface SearchResult {
  type: 'equipamento' | 'os' | 'investimento' | 'usuario';
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  icon?: string;
}

export function useGlobalSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading, error } = useQuery<SearchResult[]>({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        return [];
      }

      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) {
        throw new Error('Erro ao buscar');
      }
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000, // Cache por 30 segundos
  });

  return {
    results: data || [],
    isLoading,
    error,
    hasResults: (data || []).length > 0,
  };
}

