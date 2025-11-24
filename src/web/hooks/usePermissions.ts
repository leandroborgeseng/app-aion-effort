// src/web/hooks/usePermissions.ts
import { useMemo } from 'react';
import { useUser } from '../contexts/UserContext';

export function usePermissions() {
  const { user, impersonation, getUserSectors, hasAccessToSector, getManagedUserIds, canViewUser } = useUser();

  // Quando há personificação, usar o usuário personificado para verificar role
  const currentUser = impersonation.isImpersonating 
    ? impersonation.impersonatedUser 
    : user;

  const isAdmin = currentUser?.role === 'admin';
  const isGerente = currentUser?.role === 'gerente';
  const isComum = currentUser?.role === 'comum';

  // Setores permitidos para o usuário atual
  // Depender diretamente do estado de personificação para garantir recálculo quando mudar
  const allowedSectors = useMemo(() => {
    return getUserSectors();
  }, [getUserSectors, impersonation.isImpersonating, impersonation.impersonatedUser?.id, user?.id]);

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
  // Agora verifica as permissões configuradas no banco de dados
  const canAccessPage = async (page: string): Promise<boolean> => {
    if (isAdmin) return true;
    
    try {
      // Buscar permissão do banco usando o role do usuário atual (personificado ou não)
      const res = await fetch(`/api/config/role-permissions/check?role=${currentUser?.role}&page=${page}`);
      if (res.ok) {
        const data = await res.json();
        return data.canAccess !== false; // Se não estiver configurado, assume acesso
      }
    } catch (error) {
      console.error('[usePermissions] Erro ao verificar permissão:', error);
    }
    
    // Fallback: comportamento padrão se não conseguir verificar
    // Páginas que todos podem acessar por padrão
    const publicPages = ['os', 'cronograma', 'rondas'];
    if (publicPages.includes(page)) return true;
    
    // Páginas apenas para admin por padrão
    const adminPages = ['usuarios', 'inventario', 'permissoes'];
    if (adminPages.includes(page)) return isAdmin;
    
    return true;
  };

  // Versão síncrona para uso imediato (usa cache ou padrão)
  const canAccessPageSync = (page: string): boolean => {
    if (isAdmin) return true;
    
    // Páginas que todos podem acessar por padrão
    const publicPages = ['os', 'cronograma', 'rondas'];
    if (publicPages.includes(page)) return true;
    
    // Páginas apenas para admin por padrão
    const adminPages = ['usuarios', 'inventario', 'permissoes'];
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
    canAccessPageSync,
    canViewUser,
    getManagedUserIds,
  };
}

