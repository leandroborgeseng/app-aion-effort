import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { FiPackage, FiClipboard, FiCalendar, FiRefreshCw, FiDollarSign, FiFileText, FiShield, FiX } from 'react-icons/fi';
import UserMenu from './components/UserMenu';
import MobileMenu from './components/MobileMenu';
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
import LoginPage from './routes/LoginPage';
import { theme } from './styles/theme';
import { UserProvider, useUser } from './contexts/UserContext';
import { usePermissions } from './hooks/usePermissions';
import { useIsMobile } from './hooks/useMediaQuery';

// Componente para proteger rotas que requerem autenticação
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Layout Unificado - todas as páginas com filtros baseados em permissões
const MainLayout = () => {
  const location = useLocation();
  const { user, impersonation, stopImpersonation } = useUser();
  const { canAccessPage } = usePermissions();
  // Hook para detectar se é mobile
  const isMobile = useIsMobile();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiShield, public: true },
    { path: '/inventario', label: 'Inventário', icon: FiPackage, public: true },
    { path: '/os', label: 'Ordens de Serviço', icon: FiClipboard, public: true },
    { path: '/cronograma', label: 'Cronograma', icon: FiCalendar, public: true },
    { path: '/rondas', label: 'Rondas', icon: FiRefreshCw, public: true },
    { path: '/investimentos', label: 'Investimentos', icon: FiDollarSign, public: true },
    { path: '/contratos', label: 'Contratos', icon: FiFileText, public: true },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (item.public) return true;
    return canAccessPage(item.path.replace('/', ''));
  });

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        minHeight: '100vh',
        backgroundColor: theme.colors.gray[50],
      }}
    >
      <nav
        style={{
          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
          borderBottom: `1px solid ${theme.colors.gray[200]}`,
          backgroundColor: theme.colors.white,
          boxShadow: theme.shadows.sm,
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.md,
            flexWrap: 'wrap',
          }}
        >
          {/* Menu Mobile */}
          <MobileMenu />

          <Link
            to="/dashboard"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              paddingRight: isMobile ? theme.spacing.md : theme.spacing.lg,
              borderRight: isMobile ? 'none' : `1px solid ${theme.colors.gray[200]}`,
            }}
          >
            <img
              src="/images/logo-aion.png"
              alt="Aion Engenharia"
              style={{
                height: isMobile ? '35px' : 'clamp(30px, 8vw, 45px)',
                width: 'auto',
                objectFit: 'contain',
                maxWidth: '200px',
              }}
            />
          </Link>
          <div style={{ flex: 1 }} />
          
          {/* Menu Desktop */}
          {!isMobile && visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
                            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  textDecoration: 'none',
                  color: isActive ? theme.colors.primary : theme.colors.gray[700],
                  fontWeight: isActive ? 600 : 500,
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  borderRadius: theme.borderRadius.sm,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  transition: 'background-color 0.2s',
                  fontSize: '14px',
                  backgroundColor: isActive ? theme.colors.gray[100] : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = theme.colors.gray[100];
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Icon size={16} />
                <span className="nav-text">{item.label}</span>
              </Link>
            );
          })}

          {/* Menu do usuário */}
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
            zIndex: 999,
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
      
      <main>
        <Outlet />
      </main>
    </div>
  );
};

// Componente para redirecionar baseado no role
const RoleRedirect = () => {
  const { user, isLoading } = useUser();
  
  if (isLoading) {
    return (
      <div style={{ padding: theme.spacing.xl, textAlign: 'center' }}>
        <p style={{ color: theme.colors.gray[600] }}>Carregando...</p>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
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
        { path: 'usuarios', element: <UsersPage /> },
        { path: 'criticos', element: <CriticosPage /> },
        { path: 'configuracoes', element: <ConfigPage /> },
      ],
    },
    {
      path: '*',
      element: <Navigate to="/dashboard" replace />,
    },
  ]);

  return <RouterProvider router={router} />;
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
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <UserProvider>
        <AppRouter />
      </UserProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
