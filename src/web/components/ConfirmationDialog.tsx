// Componente de diálogo de confirmação para ações destrutivas
import React from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';
import { theme } from '../styles/theme';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const typeColors = {
    danger: theme.colors.danger,
    warning: theme.colors.warning,
    info: theme.colors.info,
  };

  const color = typeColors[type];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: theme.spacing.md,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          boxShadow: theme.shadows.xl,
          maxWidth: '500px',
          width: '100%',
          padding: theme.spacing.lg,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.md,
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: `${color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FiAlertTriangle size={24} color={color} />
          </div>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                margin: 0,
                marginBottom: theme.spacing.xs,
                fontSize: '20px',
                fontWeight: 600,
                color: theme.colors.dark,
              }}
            >
              {title}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: theme.colors.gray[600],
                lineHeight: 1.5,
              }}
            >
              {message}
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              padding: theme.spacing.xs,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.borderRadius.sm,
              color: theme.colors.gray[600],
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = theme.colors.gray[100];
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: theme.spacing.sm,
            marginTop: theme.spacing.lg,
          }}
        >
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.colors.white,
              border: `1px solid ${theme.colors.gray[300]}`,
              borderRadius: theme.borderRadius.md,
              color: theme.colors.dark,
              fontSize: '14px',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: color,
              border: 'none',
              borderRadius: theme.borderRadius.md,
              color: theme.colors.white,
              fontSize: '14px',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
            }}
          >
            {isLoading && (
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  border: `2px solid ${theme.colors.white}`,
                  borderTop: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            )}
            {confirmText}
          </button>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

