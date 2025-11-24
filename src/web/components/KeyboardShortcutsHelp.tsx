// Componente para exibir ajuda de atalhos de teclado
import React, { useState, useEffect } from 'react';
import { FiX, FiCommand } from 'react-icons/fi';
import { theme } from '../styles/theme';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts: Shortcut[] = [
  {
    category: 'Navegação',
    keys: ['Esc'],
    description: 'Fechar modais/diálogos',
  },
  {
    category: 'Formulários',
    keys: ['Ctrl', 'S'],
    description: 'Salvar formulário (quando disponível)',
  },
  {
    category: 'Formulários',
    keys: ['Esc'],
    description: 'Cancelar formulário',
  },
];

export default function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  const isMac = navigator.platform.includes('Mac');

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
        }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '600px',
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          boxShadow: theme.shadows.xl,
          zIndex: 9999,
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: theme.spacing.lg,
            borderBottom: `1px solid ${theme.colors.gray[200]}`,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 600,
              color: theme.colors.dark,
            }}
          >
            Atalhos de Teclado
          </h2>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              padding: theme.spacing.xs,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FiX size={20} color={theme.colors.gray[600]} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: theme.spacing.lg }}>
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category} style={{ marginBottom: theme.spacing.xl }}>
              <h3
                style={{
                  margin: 0,
                  marginBottom: theme.spacing.md,
                  fontSize: '16px',
                  fontWeight: 600,
                  color: theme.colors.dark,
                }}
              >
                {category}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
                {items.map((shortcut, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: theme.spacing.sm,
                      backgroundColor: theme.colors.gray[50],
                      borderRadius: theme.borderRadius.md,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14px',
                        color: theme.colors.dark,
                      }}
                    >
                      {shortcut.description}
                    </span>
                    <div style={{ display: 'flex', gap: theme.spacing.xs }}>
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          {keyIndex > 0 && (
                            <span style={{ color: theme.colors.gray[400] }}>+</span>
                          )}
                          <kbd
                            style={{
                              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                              backgroundColor: theme.colors.white,
                              border: `1px solid ${theme.colors.gray[300]}`,
                              borderRadius: theme.borderRadius.sm,
                              fontSize: '12px',
                              fontFamily: 'monospace',
                              color: theme.colors.dark,
                              boxShadow: theme.shadows.sm,
                            }}
                          >
                            {key === 'Ctrl' && isMac ? '⌘' : key === 'Ctrl' ? 'Ctrl' : key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: theme.spacing.md,
            borderTop: `1px solid ${theme.colors.gray[200]}`,
            textAlign: 'center',
            fontSize: '12px',
            color: theme.colors.gray[500],
          }}
        >
          Pressione <kbd style={{ padding: '2px 6px', backgroundColor: theme.colors.gray[100], borderRadius: theme.borderRadius.sm }}>?</kbd> para abrir esta ajuda
        </div>
      </div>
    </>
  );
}

