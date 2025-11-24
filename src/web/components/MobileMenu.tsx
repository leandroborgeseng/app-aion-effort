// src/web/components/MobileMenu.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiX, FiMenu, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { theme } from '../styles/theme';
import { useIsMobile } from '../hooks/useMediaQuery';
import { IconType } from 'react-icons';

interface NavItem {
  path: string;
  label: string;
  icon: IconType;
  pageKey?: string;
}

interface MobileMenuProps {
  navItems: NavItem[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Componente para item do menu com tooltip
const MenuItemWithTooltip = ({ 
  item, 
  isActive, 
  isCollapsed 
}: { 
  item: NavItem; 
  isActive: boolean; 
  isCollapsed: boolean;
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const Icon = item.icon;

  return (
    <div
      style={{
        position: 'relative',
        marginBottom: theme.spacing.xs,
      }}
      onMouseEnter={() => {
        if (isCollapsed) {
          setShowTooltip(true);
        }
      }}
      onMouseLeave={() => {
        if (isCollapsed) {
          setShowTooltip(false);
        }
      }}
    >
      <Link
        to={item.path}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.md,
          padding: `${theme.spacing.md} ${isCollapsed ? theme.spacing.sm : theme.spacing.md}`,
          borderRadius: theme.borderRadius.md,
          textDecoration: 'none',
          color: isActive ? theme.colors.primary : theme.colors.gray[700],
          backgroundColor: isActive ? `${theme.colors.primary}15` : 'transparent',
          fontWeight: isActive ? 600 : 500,
          transition: 'all 0.2s ease',
          borderLeft: isActive ? `3px solid ${theme.colors.primary}` : '3px solid transparent',
          fontSize: isCollapsed ? '12px' : '14px',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
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
        <Icon size={isCollapsed ? 20 : 22} style={{ flexShrink: 0 }} />
        {!isCollapsed && <span>{item.label}</span>}
      </Link>
      
      {/* Tooltip quando colapsado */}
      {isCollapsed && (
        <div
          style={{
            position: 'absolute',
            left: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            marginLeft: theme.spacing.xs,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            backgroundColor: theme.colors.dark,
            color: theme.colors.white,
            borderRadius: theme.borderRadius.md,
            fontSize: '13px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: theme.shadows.lg,
            pointerEvents: 'none',
            opacity: showTooltip ? 1 : 0,
            visibility: showTooltip ? 'visible' : 'hidden',
            transition: 'opacity 0.15s ease-out, visibility 0.15s ease-out',
          }}
        >
          {item.label}
          {/* Seta do tooltip */}
          <div
            style={{
              position: 'absolute',
              left: '-6px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderRight: `6px solid ${theme.colors.dark}`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default function MobileMenu({ navItems, isCollapsed: externalCollapsed, onToggleCollapse }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(externalCollapsed || false);
  const location = useLocation();
  const isMobile = useIsMobile();
  const menuRef = useRef<HTMLDivElement>(null);

  // Sincronizar com prop externa se fornecida
  useEffect(() => {
    if (externalCollapsed !== undefined) {
      setIsCollapsed(externalCollapsed);
    }
  }, [externalCollapsed]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Em mobile, fechar ao clicar fora
      if (isMobile && isOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && isMobile) {
        setIsOpen(false);
      }
    };

    if (isOpen && isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const actualIsCollapsed = externalCollapsed !== undefined ? externalCollapsed : isCollapsed;

  // Em desktop, menu sempre visível (fixo ou colapsado)
  // Em mobile, menu que abre/fecha
  if (isMobile) {
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

            {/* Menu Lateral Mobile */}
            <div
              ref={menuRef}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: '300px',
                maxWidth: '85vw',
                backgroundColor: theme.colors.white,
                boxShadow: theme.shadows.xl,
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
                  backgroundColor: theme.colors.gray[50],
                }}
              >
                <img
                  src="/images/logo-aion.png"
                  alt="Aion Engenharia"
                  style={{
                    height: '40px',
                    width: 'auto',
                    objectFit: 'contain',
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
                    borderRadius: theme.borderRadius.md,
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.gray[200];
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  aria-label="Fechar menu"
                >
                  <FiX size={24} color={theme.colors.gray[700]} />
                </button>
              </div>

              {/* Menu Items */}
              <nav
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: theme.spacing.sm,
                  paddingTop: theme.spacing.md,
                }}
              >
                {navItems.length === 0 ? (
                  <div style={{ padding: theme.spacing.md, textAlign: 'center', color: theme.colors.gray[600] }}>
                    Nenhum item de menu disponível
                  </div>
                ) : (
                  navItems.map((item) => {
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
                          padding: `${theme.spacing.md} ${theme.spacing.md}`,
                          borderRadius: theme.borderRadius.md,
                          textDecoration: 'none',
                          color: isActive ? theme.colors.primary : theme.colors.gray[700],
                          backgroundColor: isActive ? `${theme.colors.primary}15` : 'transparent',
                          fontWeight: isActive ? 600 : 500,
                          marginBottom: theme.spacing.xs,
                          transition: 'all 0.2s ease',
                          borderLeft: isActive ? `3px solid ${theme.colors.primary}` : '3px solid transparent',
                          fontSize: '15px',
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
                        <Icon size={22} style={{ flexShrink: 0 }} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })
                )}
              </nav>

              {/* Footer do Menu */}
              <div
                style={{
                  padding: theme.spacing.md,
                  borderTop: `1px solid ${theme.colors.gray[200]}`,
                  backgroundColor: theme.colors.gray[50],
                  fontSize: '12px',
                  color: theme.colors.gray[600],
                  textAlign: 'center',
                }}
              >
                © {new Date().getFullYear()} Aion Engenharia
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // Desktop: Menu lateral fixo
  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: actualIsCollapsed ? '80px' : '260px',
        backgroundColor: theme.colors.white,
        boxShadow: theme.shadows.md,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRight: `1px solid ${theme.colors.gray[200]}`,
      }}
    >
      {/* Header Desktop */}
      <div
        style={{
          padding: theme.spacing.md,
          borderBottom: `1px solid ${theme.colors.gray[200]}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: actualIsCollapsed ? 'center' : 'space-between',
          backgroundColor: theme.colors.gray[50],
          minHeight: '64px',
        }}
      >
        {!actualIsCollapsed && (
          <img
            src="/images/logo-aion.png"
            alt="Aion Engenharia"
            style={{
              height: '40px',
              width: 'auto',
              objectFit: 'contain',
            }}
          />
        )}
        <button
          onClick={handleToggleCollapse}
          style={{
            padding: theme.spacing.xs,
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.borderRadius.md,
            transition: 'background-color 0.2s',
            marginLeft: actualIsCollapsed ? 0 : 'auto',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.gray[200];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label={actualIsCollapsed ? 'Expandir menu' : 'Colapsar menu'}
          title={actualIsCollapsed ? 'Expandir menu' : 'Colapsar menu'}
        >
          {actualIsCollapsed ? (
            <FiChevronRight size={20} color={theme.colors.gray[700]} />
          ) : (
            <FiChevronLeft size={20} color={theme.colors.gray[700]} />
          )}
        </button>
      </div>

      {/* Menu Items Desktop */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: theme.spacing.sm,
          paddingTop: theme.spacing.md,
        }}
      >
        {navItems.length === 0 ? (
          <div style={{ padding: theme.spacing.md, textAlign: 'center', color: theme.colors.gray[600], fontSize: '12px' }}>
            {actualIsCollapsed ? '⋯' : 'Nenhum item disponível'}
          </div>
        ) : (
          navItems.map((item) => {
            const isActive = location.pathname === item.path || 
                            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

            return (
              <MenuItemWithTooltip
                key={item.path}
                item={item}
                isActive={isActive}
                isCollapsed={actualIsCollapsed}
              />
            );
          })
        )}
      </nav>

      {/* Footer Desktop */}
      {!actualIsCollapsed && (
        <div
          style={{
            padding: theme.spacing.md,
            borderTop: `1px solid ${theme.colors.gray[200]}`,
            backgroundColor: theme.colors.gray[50],
            fontSize: '12px',
            color: theme.colors.gray[600],
            textAlign: 'center',
          }}
        >
          © {new Date().getFullYear()} Aion Engenharia
        </div>
      )}
    </div>
  );
}

