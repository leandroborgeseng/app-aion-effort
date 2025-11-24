import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { FiPackage, FiClipboard, FiCalendar, FiRefreshCw, FiDollarSign, FiFileText, FiShield, FiX, FiBarChart2, FiShoppingCart, FiHelpCircle } from 'react-icons/fi';
import UserMenu from './components/UserMenu';
import MobileMenu from './components/MobileMenu';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import HelpModal from './components/HelpModal';
import InstallPrompt from './components/InstallPrompt';
import LastSyncIndicator from './components/LastSyncIndicator';
import { ErrorBoundary } from './components/ErrorBoundary';
import InvPage from './routes/InvPage';
import OSPage from './routes/OSPage';
import CronogramaPage from './routes/CronogramaPage';
import RondasPage from './routes/RondasPage';
import InvestmentsPage from './routes/InvestmentsPage';
import ContractsPage from './routes/ContractsPage';
import UsersPage from './routes/UsersPage';
import CriticosPage from './routes/CriticosPage';
import Dashboard from './routes/Dashboard';
import ConfigPage from './routes/ConfigPage';
import RolePermissionsPage from './routes/RolePermissionsPage';
import LoginPage from './routes/LoginPage';
import MelPage from './routes/MelPage';
import PurchaseRequestsPage from './routes/PurchaseRequestsPage';
import { theme } from './styles/theme';
import { UserProvider, useUser } from './contexts/UserContext';
import { SyncProvider } from './contexts/SyncContext';
import { usePermissions } from './hooks/usePermissions';
import { useIsMobile } from './hooks/useMediaQuery';

// Componente para proteger rotas que requerem autenticação
const ProtectedRoute = ({ children }: { children: React.ReactElement }): React.ReactElement => {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Layout Unificado - todas as páginas com filtros baseados em permissões
const MainLayout = () => {
  const location = useLocation();
  const { user, impersonation, stopImpersonation, isLoading } = useUser();
  const { canAccessPageSync } = usePermissions();
  // Hook para detectar se é mobile
  const isMobile = useIsMobile();
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isSideMenuCollapsed, setIsSideMenuCollapsed] = useState(false);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      if (isInput) return; // Não interceptar se estiver digitando
      
      // ? - Ajuda de atalhos
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        setIsShortcutsHelpOpen(true);
      }
      
      // F1 - Ajuda/Documentação
      if (e.key === 'F1') {
        e.preventDefault();
        setIsHelpModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiShield, pageKey: 'dashboard' },
    { path: '/inventario', label: 'Inventário', icon: FiPackage, pageKey: 'inventario' },
    { path: '/os', label: 'Ordens de Serviço', icon: FiClipboard, pageKey: 'os' },
    { path: '/cronograma', label: 'Cronograma', icon: FiCalendar, pageKey: 'cronograma' },
    { path: '/rondas', label: 'Rondas', icon: FiRefreshCw, pageKey: 'rondas' },
    { path: '/investimentos', label: 'Investimentos', icon: FiDollarSign, pageKey: 'investimentos' },
    { path: '/contratos', label: 'Contratos', icon: FiFileText, pageKey: 'contratos' },
    { path: '/mel', label: 'MEL', icon: FiBarChart2, pageKey: 'mel' },
    { path: '/solicitacoes-compra', label: 'Solicitações de Compra', icon: FiShoppingCart, pageKey: 'solicitacoes-compra' },
  ];

  // Buscar permissões do usuário atual
  const { data: rolePermissions } = useQuery<{
    success: boolean;
    permissions: Record<string, Array<{ page: string; canAccess: boolean }>>;
  }>({
    queryKey: ['role-permissions', user?.role],
    queryFn: async () => {
      const res = await fetch('/api/config/role-permissions');
      if (!res.ok) return { success: false, permissions: {} };
      return res.json();
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  const visibleNavItems = navItems.filter((item) => {
    // Admin sempre vê tudo
    if (user?.role === 'admin') return true;
    
    // Se não tem permissões carregadas ainda, mostrar tudo (evitar flicker)
    if (!rolePermissions?.permissions) return true;
    
    const userRole = user?.role || 'comum';
    const rolePerms = rolePermissions.permissions[userRole] || [];
    const perm = rolePerms.find((p) => p.page === item.pageKey);
    
    // Se não existe permissão configurada, assume acesso (comportamento padrão)
    return perm ? perm.canAccess : true;
  });

  const sidebarWidth = isMobile ? 0 : (isSideMenuCollapsed ? 80 : 260);

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        minHeight: '100vh',
        backgroundColor: theme.colors.gray[50],
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      {/* Menu Lateral - Desktop */}
      {!isMobile && (
        <MobileMenu 
          navItems={visibleNavItems} 
          isCollapsed={isSideMenuCollapsed}
          onToggleCollapse={() => setIsSideMenuCollapsed(!isSideMenuCollapsed)}
        />
      )}

      {/* Conteúdo Principal */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          marginLeft: isMobile ? 0 : `${sidebarWidth}px`,
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          minWidth: 0, // Permite que o conteúdo encolha
        }}
      >
        {/* Header Superior */}
        <nav
          style={{
            padding: isMobile ? `${theme.spacing.xs} ${theme.spacing.sm}` : `${theme.spacing.sm} ${theme.spacing.md}`,
            borderBottom: `1px solid ${theme.colors.gray[200]}`,
            backgroundColor: theme.colors.white,
            boxShadow: theme.shadows.sm,
            position: 'sticky',
            top: 0,
            zIndex: 99,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing.md,
          }}
        >
          {/* Lado Esquerdo: Menu Mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            {/* Menu Mobile */}
            {isMobile && <MobileMenu navItems={visibleNavItems} />}
          </div>

          {/* Lado Direito: Ajuda + Menu do usuário */}
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <button
              onClick={() => setIsHelpModalOpen(true)}
              style={{
                padding: theme.spacing.sm,
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: theme.borderRadius.md,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.colors.gray[600],
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.gray[100];
                e.currentTarget.style.color = theme.colors.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = theme.colors.gray[600];
              }}
              title="Ajuda (F1)"
              aria-label="Abrir documentação"
            >
              <FiHelpCircle size={22} />
            </button>
            {user && <UserMenu />}
          </div>
        </nav>
      
        {/* Banner de Personificação */}
        {impersonation.isImpersonating && (
          <div
            style={{
              backgroundColor: theme.colors.warning,
              color: theme.colors.white,
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing.md,
              boxShadow: theme.shadows.md,
              zIndex: 98,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, flex: 1, minWidth: '200px' }}>
              <FiShield size={20} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '14px' }}>
                <strong>Você está personificando:</strong> {impersonation.impersonatedUser?.name}
                {user && (
                  <span style={{ display: 'block', marginTop: theme.spacing.xs / 2, opacity: 0.9, fontSize: '12px' }}>
                    Usuário original: {user.name}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  await stopImpersonation();
                } catch (error: any) {
                  alert('Erro ao parar personificação: ' + (error?.message || 'Erro desconhecido'));
                }
              }}
              style={{
                backgroundColor: theme.colors.white,
                color: theme.colors.warning,
                border: 'none',
                padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                borderRadius: theme.borderRadius.md,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                fontWeight: 600,
                fontSize: '14px',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.gray[100];
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.white;
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <FiX size={16} />
              Parar Personificação
            </button>
          </div>
        )}
        
        <main style={{ minHeight: 'calc(100vh - 200px)', paddingBottom: '60px', flex: 1 }}>
          <Outlet />
        </main>

        {/* Rodapé */}
        <footer
          style={{
            position: 'fixed',
            bottom: 0,
            left: isMobile ? 0 : `${sidebarWidth}px`,
            right: 0,
            backgroundColor: theme.colors.white,
            borderTop: `1px solid ${theme.colors.gray[200]}`,
            padding: `${theme.spacing.xs} ${theme.spacing.md}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            zIndex: 50,
            boxShadow: '0 -2px 4px rgba(0,0,0,0.05)',
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <LastSyncIndicator />
        </footer>
      </div>

      {/* Ajuda de Atalhos */}
      <KeyboardShortcutsHelp 
        isOpen={isShortcutsHelpOpen} 
        onClose={() => setIsShortcutsHelpOpen(false)} 
      />
      
      {/* Modal de Documentação */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
};

// Componente para redirecionar baseado no role
const RoleRedirect = (): React.ReactElement => {
  const { user, isLoading } = useUser();
  
  // Se está carregando, mostrar loading
  if (isLoading) {
    return (
      <div style={{ padding: theme.spacing.xl, textAlign: 'center' }}>
        <p style={{ color: theme.colors.gray[600] }}>Carregando...</p>
      </div>
    );
  }
  
  // Se não há usuário após carregar, verificar token
  if (!user) {
    const token = localStorage.getItem('auth_token');
    // Se não há token, redirecionar para login
    if (!token) {
      return <Navigate to="/login" replace />;
    }
    // Se há token mas não há usuário, pode estar carregando ainda
    // Aguardar um pouco mais
    return (
      <div style={{ padding: theme.spacing.xl, textAlign: 'center' }}>
        <p style={{ color: theme.colors.gray[600] }}>Carregando usuário...</p>
      </div>
    );
  }
  
  // Se há usuário, redirecionar para dashboard
  return <Navigate to="/dashboard" replace />;
};

const AppRouter = () => {
  const router = createBrowserRouter([
    {
      path: '/login',
      element: <LoginPage />,
    },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <RoleRedirect />
        </ProtectedRoute>
      ),
    },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      ),
      children: [
        { path: 'dashboard', element: <Dashboard /> },
        { path: 'inventario', element: <InvPage /> },
        { path: 'os', element: <OSPage /> },
        { path: 'cronograma', element: <CronogramaPage /> },
        { path: 'rondas', element: <RondasPage /> },
        { path: 'investimentos', element: <InvestmentsPage /> },
        { path: 'contratos', element: <ContractsPage /> },
        { path: 'mel', element: <MelPage /> },
        { path: 'solicitacoes-compra', element: <PurchaseRequestsPage /> },
        { path: 'usuarios', element: <UsersPage /> },
        { path: 'criticos', element: <CriticosPage /> },
        { path: 'configuracoes', element: <ConfigPage /> },
        { path: 'permissoes', element: <RolePermissionsPage /> },
      ],
    },
    {
      path: '*',
      element: <Navigate to="/dashboard" replace />,
    },
  ]);

  return (
    <>
      <RouterProvider router={router} />
      <InstallPrompt />
    </>
  );
};

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Não tentar novamente em erros 401/403
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
    mutations: {
      retry: false,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Erro: Elemento root não encontrado!</div>';
  throw new Error('Root element not found');
}

console.log('Inicializando React app...');

try {
  createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={qc}>
          <UserProvider>
            <SyncProvider>
              <AppRouter />
            </SyncProvider>
          </UserProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log('React app inicializado com sucesso!');
} catch (error) {
  console.error('Erro ao inicializar React app:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; color: red; font-family: sans-serif;">
      <h1>Erro ao carregar aplicação</h1>
      <p>${error instanceof Error ? error.message : 'Erro desconhecido'}</p>
      <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${error instanceof Error ? error.stack : String(error)}</pre>
    </div>
  `;
}
