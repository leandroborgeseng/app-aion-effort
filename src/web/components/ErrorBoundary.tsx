// src/web/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { theme } from '../styles/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
    
    // Aqui você pode enviar o erro para um serviço de logging
    // Ex: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.xl,
            backgroundColor: theme.colors.gray[50],
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              backgroundColor: theme.colors.white,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.xl,
              boxShadow: theme.shadows.lg,
              textAlign: 'center',
            }}
          >
            <FiAlertCircle
              size={64}
              color={theme.colors.danger}
              style={{ marginBottom: theme.spacing.md }}
            />
            <h1
              style={{
                margin: `0 0 ${theme.spacing.md} 0`,
                fontSize: '24px',
                fontWeight: 600,
                color: theme.colors.dark,
              }}
            >
              Ops! Algo deu errado
            </h1>
            <p
              style={{
                margin: `0 0 ${theme.spacing.lg} 0`,
                fontSize: '16px',
                color: theme.colors.gray[600],
              }}
            >
              Ocorreu um erro inesperado. Por favor, tente recarregar a página.
            </p>
            {this.state.error && process.env.NODE_ENV === 'development' && (
              <details
                style={{
                  marginBottom: theme.spacing.lg,
                  padding: theme.spacing.md,
                  backgroundColor: theme.colors.gray[50],
                  borderRadius: theme.borderRadius.md,
                  textAlign: 'left',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: theme.colors.danger,
                }}
              >
                <summary style={{ cursor: 'pointer', marginBottom: theme.spacing.xs }}>
                  Detalhes do erro (desenvolvimento)
                </summary>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReset}
              style={{
                padding: `${theme.spacing.md}px ${theme.spacing.lg}px`,
                backgroundColor: theme.colors.primary,
                color: theme.colors.white,
                border: 'none',
                borderRadius: theme.borderRadius.md,
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <FiRefreshCw size={20} />
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

