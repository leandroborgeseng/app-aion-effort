// Componente para mensagens de erro mais amigáveis com ações de recuperação
import React from 'react';
import { FiAlertCircle, FiRefreshCw, FiX } from 'react-icons/fi';
import { theme } from '../styles/theme';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryText?: string;
  dismissible?: boolean;
}

export default function ErrorMessage({
  title = 'Erro',
  message,
  onRetry,
  onDismiss,
  retryText = 'Tentar novamente',
  dismissible = true,
}: ErrorMessageProps) {
  return (
    <div
      style={{
        backgroundColor: `${theme.colors.danger}15`,
        border: `1px solid ${theme.colors.danger}40`,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        display: 'flex',
        alignItems: 'flex-start',
        gap: theme.spacing.md,
      }}
    >
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: theme.colors.danger,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '2px',
        }}
      >
        <FiAlertCircle size={14} color={theme.colors.white} />
      </div>
      <div style={{ flex: 1 }}>
        <h4
          style={{
            margin: 0,
            marginBottom: theme.spacing.xs,
            fontSize: '16px',
            fontWeight: 600,
            color: theme.colors.danger,
          }}
        >
          {title}
        </h4>
        <p
          style={{
            margin: 0,
            marginBottom: onRetry ? theme.spacing.sm : 0,
            fontSize: '14px',
            color: theme.colors.dark,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              marginTop: theme.spacing.sm,
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              backgroundColor: theme.colors.danger,
              color: theme.colors.white,
              border: 'none',
              borderRadius: theme.borderRadius.sm,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
            }}
          >
            <FiRefreshCw size={14} />
            {retryText}
          </button>
        )}
      </div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            padding: theme.spacing.xs,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.borderRadius.sm,
            color: theme.colors.gray[600],
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.gray[100];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <FiX size={18} />
        </button>
      )}
    </div>
  );
}

