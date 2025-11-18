import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type UserRole = 'admin' | 'comum' | 'gerente';

interface UserSector {
  id: string;
  sectorId: number;
  sectorName?: string;
}

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface UserManager {
  id: string;
  user: ManagedUser;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  canImpersonate: boolean;
  sectors: UserSector[];
  managedUsers?: UserManager[];
}

interface ImpersonationState {
  isImpersonating: boolean;
  originalUser: User | null;
  impersonatedUser: User | null;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  impersonation: ImpersonationState;
  setImpersonation: (state: ImpersonationState) => void;
  startImpersonation: (targetUser: User) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  getUserSectors: () => number[];
  hasAccessToSector: (sectorId: number) => boolean;
  getManagedUserIds: () => string[];
  canViewUser: (targetUserId: string) => boolean;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [impersonation, setImpersonationState] = useState<ImpersonationState>({
    isImpersonating: false,
    originalUser: null,
    impersonatedUser: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Carregar usuário atual ao iniciar
  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Buscar informações do usuário da API
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        // Token inválido ou expirado
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      if (data.success && data.user) {
        setUserState(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  };

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
    }
  };

  const startImpersonation = async (targetUser: User) => {
    if (!user?.canImpersonate && user?.role !== 'admin' && user?.role !== 'gerente') {
      throw new Error('Você não tem permissão para personificar usuários');
    }

    if (!user?.id) {
      throw new Error('Usuário atual não identificado');
    }

    try {
      console.log('[UserContext] Iniciando personificação:', {
        supervisorId: user.id,
        supervisorRole: user.role,
        targetUserId: targetUser.id,
      });

      // Buscar dados completos do usuário incluindo setores
      const res = await fetch(`/api/users/${targetUser.id}`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[UserContext] Erro ao buscar dados do usuário:', errorText);
        throw new Error('Erro ao buscar dados do usuário');
      }
      const fullUserData = await res.json();

      // Iniciar personificação na API
      const token = localStorage.getItem('auth_token');
      const impersonateRes = await fetch('/api/users/impersonate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: targetUser.id,
          supervisorId: user.id, // Enviar ID do supervisor para logging
        }),
      });

      if (!impersonateRes.ok) {
        const errorData = await impersonateRes.json().catch(() => ({}));
        console.error('[UserContext] Erro na API de personificação:', errorData);
        throw new Error(errorData.message || 'Erro ao iniciar personificação');
      }

      // Garantir que o usuário tenha setores (mesmo que vazio)
      const userWithSectors: User = {
        ...fullUserData,
        sectors: fullUserData.sectors || [],
      };

      const state: ImpersonationState = {
        isImpersonating: true,
        originalUser: user,
        impersonatedUser: userWithSectors,
      };
      setImpersonationState(state);
      setUserState(userWithSectors);
      localStorage.setItem('impersonation', JSON.stringify(state));
    } catch (error) {
      console.error('Erro ao iniciar personificação:', error);
      throw error;
    }
  };

  const stopImpersonation = async () => {
    if (!impersonation.isImpersonating || !impersonation.originalUser) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/users/impersonate/stop', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          supervisorId: impersonation.originalUser?.id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao parar personificação');
      }

      setUserState(impersonation.originalUser);
      setImpersonationState({
        isImpersonating: false,
        originalUser: null,
        impersonatedUser: null,
      });
      localStorage.removeItem('impersonation');
    } catch (error) {
      console.error('Erro ao parar personificação:', error);
      throw error;
    }
  };

  const getUserSectors = (): number[] => {
    const currentUser = impersonation.isImpersonating 
      ? impersonation.impersonatedUser 
      : user;
    
    if (!currentUser) return [];
    
    // Admin vê todos os setores (retorna array vazio = acesso total)
    if (currentUser.role === 'admin') {
      return [];
    }
    
    // Gerente vê setores dos usuários que ele gerencia
    if (currentUser.role === 'gerente') {
      // Se não tem usuários gerenciados, retorna vazio (acesso total temporário)
      // Em produção, poderia retornar setores agregados dos usuários gerenciados
      if (!currentUser.managedUsers || currentUser.managedUsers.length === 0) {
        return [];
      }
      // TODO: Agregar setores dos usuários gerenciados
      return [];
    }
    
    // Usuário comum vê apenas seus setores designados
    return currentUser.sectors.map(s => s.sectorId);
  };

  const hasAccessToSector = (sectorId: number): boolean => {
    const sectors = getUserSectors();
    // Array vazio significa acesso a todos os setores
    return sectors.length === 0 || sectors.includes(sectorId);
  };

  const getManagedUserIds = (): string[] => {
    const currentUser = impersonation.isImpersonating 
      ? impersonation.impersonatedUser 
      : user;
    
    if (!currentUser || currentUser.role !== 'gerente') {
      return [];
    }
    
    return currentUser.managedUsers?.map(mu => mu.user.id) || [];
  };

  const canViewUser = (targetUserId: string): boolean => {
    const currentUser = impersonation.isImpersonating 
      ? impersonation.impersonatedUser 
      : user;
    
    if (!currentUser) return false;
    
    // Admin pode ver todos
    if (currentUser.role === 'admin') {
      return true;
    }
    
    // Gerente pode ver usuários que ele gerencia
    if (currentUser.role === 'gerente') {
      return getManagedUserIds().includes(targetUserId);
    }
    
    // Usuário comum só pode ver a si mesmo
    return currentUser.id === targetUserId;
  };

  const setImpersonation = (state: ImpersonationState) => {
    setImpersonationState(state);
    if (state.isImpersonating) {
      localStorage.setItem('impersonation', JSON.stringify(state));
    } else {
      localStorage.removeItem('impersonation');
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        impersonation,
        setImpersonation,
        startImpersonation,
        stopImpersonation,
        getUserSectors,
        hasAccessToSector,
        getManagedUserIds,
        canViewUser,
        isLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
