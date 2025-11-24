// Componente de busca global com atalho Ctrl+K
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiX, FiPackage, FiFileText, FiDollarSign, FiUser, FiCommand } from 'react-icons/fi';
import { theme } from '../styles/theme';
import { useGlobalSearch } from '../hooks/useGlobalSearch';
import type { SearchResult } from '../hooks/useGlobalSearch';

interface GlobalSearchBarProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeIcons = {
  equipamento: FiPackage,
  os: FiFileText,
  investimento: FiDollarSign,
  usuario: FiUser,
};

const typeLabels = {
  equipamento: 'Equipamento',
  os: 'Ordem de Serviço',
  investimento: 'Investimento',
  usuario: 'Usuário',
};

export default function GlobalSearchBar({ isOpen, onClose }: GlobalSearchBarProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { results, isLoading, hasResults } = useGlobalSearch(query);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelectResult(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  const handleSelectResult = (result: SearchResult) => {
    navigate(result.url);
    onClose();
    setQuery('');
  };

  if (!isOpen) return null;

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
      
      {/* Search Modal */}
      <div
        style={{
          position: 'fixed',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '600px',
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          boxShadow: theme.shadows.xl,
          zIndex: 9999,
          overflow: 'hidden',
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            padding: theme.spacing.md,
            borderBottom: `1px solid ${theme.colors.gray[200]}`,
          }}
        >
          <FiSearch size={20} color={theme.colors.gray[500]} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar equipamentos, OS, investimentos..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '16px',
              color: theme.colors.dark,
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              fontSize: '12px',
              color: theme.colors.gray[500],
            }}
          >
            <kbd
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                backgroundColor: theme.colors.gray[100],
                borderRadius: theme.borderRadius.sm,
                border: `1px solid ${theme.colors.gray[300]}`,
                fontFamily: 'monospace',
              }}
            >
              {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+K
            </kbd>
          </div>
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
            <FiX size={20} color={theme.colors.gray[500]} />
          </button>
        </div>

        {/* Results */}
        <div
          style={{
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          {isLoading && (
            <div
              style={{
                padding: theme.spacing.xl,
                textAlign: 'center',
                color: theme.colors.gray[500],
              }}
            >
              Buscando...
            </div>
          )}

          {!isLoading && query.length < 2 && (
            <div
              style={{
                padding: theme.spacing.xl,
                textAlign: 'center',
                color: theme.colors.gray[500],
              }}
            >
              Digite pelo menos 2 caracteres para buscar
            </div>
          )}

          {!isLoading && query.length >= 2 && !hasResults && (
            <div
              style={{
                padding: theme.spacing.xl,
                textAlign: 'center',
                color: theme.colors.gray[500],
              }}
            >
              Nenhum resultado encontrado para "{query}"
            </div>
          )}

          {!isLoading && hasResults && (
            <div>
              {results.map((result, index) => {
                const Icon = typeIcons[result.type];
                const isSelected = index === selectedIndex;

                return (
                  <div
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelectResult(result)}
                    style={{
                      padding: theme.spacing.md,
                      backgroundColor: isSelected ? theme.colors.gray[50] : theme.colors.white,
                      borderBottom: `1px solid ${theme.colors.gray[100]}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: theme.spacing.md,
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: theme.borderRadius.md,
                        backgroundColor: `${theme.colors.primary}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={20} color={theme.colors.primary} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: theme.colors.dark,
                          marginBottom: theme.spacing.xs,
                        }}
                      >
                        {result.title}
                      </div>
                      {result.subtitle && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: theme.colors.gray[600],
                            marginBottom: theme.spacing.xs,
                          }}
                        >
                          {result.subtitle}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: '11px',
                          color: theme.colors.gray[500],
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {typeLabels[result.type]}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

