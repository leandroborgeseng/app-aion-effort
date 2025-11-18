// src/web/components/MobileMenu.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiX, FiMenu, FiPackage, FiClipboard, FiCalendar, FiRefreshCw, FiDollarSign, FiFileText, FiShield } from 'react-icons/fi';
import { theme } from '../styles/theme';
import { useIsMobile } from '../hooks/useMediaQuery';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: FiShield },
  { path: '/inventario', label: 'Inventário', icon: FiPackage },
  { path: '/os', label: 'Ordens de Serviço', icon: FiClipboard },
  { path: '/cronograma', label: 'Cronograma', icon: FiCalendar },
  { path: '/rondas', label: 'Rondas', icon: FiRefreshCw },
  { path: '/investimentos', label: 'Investimentos', icon: FiDollarSign },
  { path: '/contratos', label: 'Contratos', icon: FiFileText },
];

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden'; // Prevenir scroll quando menu aberto
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isMobile) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: theme.spacing.sm,
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.borderRadius.md,
        }}
        aria-label="Abrir menu"
      >
        <FiMenu size={24} color={theme.colors.dark} />
      </button>

      {isOpen && (
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
              zIndex: 999,
            }}
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '280px',
              maxWidth: '85vw',
              backgroundColor: theme.colors.white,
              boxShadow: theme.shadows.xl,
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.3s ease',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: theme.spacing.md,
                borderBottom: `1px solid ${theme.colors.gray[200]}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <img
                src="/images/logo-aion.png"
                alt="Aion Engenharia"
                style={{
                  height: '40px',
                  width: 'auto',
                }}
              />
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  padding: theme.spacing.xs,
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Fechar menu"
              >
                <FiX size={24} color={theme.colors.gray[600]} />
              </button>
            </div>

            {/* Menu Items */}
            <nav
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: theme.spacing.sm,
              }}
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || 
                                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.md,
                      padding: theme.spacing.md,
                      borderRadius: theme.borderRadius.md,
                      textDecoration: 'none',
                      color: isActive ? theme.colors.primary : theme.colors.gray[700],
                      backgroundColor: isActive ? `${theme.colors.primary}10` : 'transparent',
                      fontWeight: isActive ? 600 : 500,
                      marginBottom: theme.spacing.xs,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = theme.colors.gray[50];
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </>
  );
}

