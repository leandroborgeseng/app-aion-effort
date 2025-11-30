import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import InstallPrompt from './components/InstallPrompt';
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
import { MainLayout } from './layouts/MainLayout';

// Componente para proteger rotas que requerem autenticação
const ProtectedRoute = ({ children }: { children: React.ReactElement }): React.ReactElement => {
  const token = localStorage.getItem('auth_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
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
