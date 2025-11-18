// src/web/hooks/usePermissions.ts
import { useMemo } from 'react';
import { useUser } from '../contexts/UserContext';

export function usePermissions() {
  const { user, getUserSectors, hasAccessToSector, getManagedUserIds, canViewUser } = useUser();

  const isAdmin = user?.role === 'admin';
  const isGerente = user?.role === 'gerente';
  const isComum = user?.role === 'comum';

  // Setores permitidos para o usuário atual
  const allowedSectors = useMemo(() => {
    return getUserSectors();
  }, [getUserSectors]);

  // Função para filtrar dados por setor
  const filterBySector = <T extends { Setor?: string; SetorId?: number }>(data: T[]): T[] => {
    if (!data || data.length === 0) return [];
    
    // Admin vê tudo
    if (isAdmin) {
      return data;
    }

    // Se não tem setores específicos (gerente sem usuários gerenciados), retorna vazio
    if (allowedSectors.length === 0) {
      return [];
    }

    // Filtrar por setores permitidos
    return data.filter((item) => {
      // Se tem SetorId, usar ele
      if (item.SetorId !== undefined) {
        return allowedSectors.includes(item.SetorId);
      }
      
      // Se não tem SetorId mas tem Setor, precisamos mapear
      // Por enquanto, retornar tudo se não conseguir filtrar
      return true;
    });
  };

  // Função para verificar se pode acessar um setor específico
  const canAccessSector = (sectorId: number | string): boolean => {
    if (isAdmin) return true;
    
    if (typeof sectorId === 'string') {
      // Se for string, precisaria mapear para ID
      return true; // Por enquanto retorna true, pode ser melhorado depois
    }
    
    return hasAccessToSector(sectorId);
  };

  // Função para verificar se pode ver uma página específica
  const canAccessPage = (page: string): boolean => {
    if (isAdmin) return true;
    
    // Páginas que todos podem acessar
    const publicPages = ['os', 'cronograma', 'rondas'];
    if (publicPages.includes(page)) return true;
    
    // Páginas apenas para admin
    const adminPages = ['usuarios', 'inventario'];
    if (adminPages.includes(page)) return isAdmin;
    
    return true;
  };

  return {
    isAdmin,
    isGerente,
    isComum,
    allowedSectors,
    filterBySector,
    canAccessSector,
    canAccessPage,
    canViewUser,
    getManagedUserIds,
  };
}

