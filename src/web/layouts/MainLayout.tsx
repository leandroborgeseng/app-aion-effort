import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FiPackage, FiClipboard, FiCalendar, FiRefreshCw, FiDollarSign, FiFileText, FiShield, FiX, FiBarChart2, FiShoppingCart, FiHelpCircle } from 'react-icons/fi';
import UserMenu from '../components/UserMenu';
import MobileMenu from '../components/MobileMenu';
import KeyboardShortcutsHelp from '../components/KeyboardShortcutsHelp';
import HelpModal from '../components/HelpModal';
import LastSyncIndicator from '../components/LastSyncIndicator';
import { theme } from '../styles/theme';
import { useUser } from '../contexts/UserContext';
import { usePermissions } from '../hooks/usePermissions';
import { useIsMobile } from '../hooks/useMediaQuery';

export const MainLayout = () => {
    const location = useLocation();
    const { user, impersonation, stopImpersonation } = useUser();
    const { canAccessPageSync } = usePermissions();
    const isMobile = useIsMobile();
    const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isSideMenuCollapsed, setIsSideMenuCollapsed] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

            if (isInput) return;

            if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault();
                setIsShortcutsHelpOpen(true);
            }

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
        staleTime: 5 * 60 * 1000,
    });

    const visibleNavItems = navItems.filter((item) => {
        if (user?.role === 'admin') return true;
        if (!rolePermissions?.permissions) return true;

        const userRole = user?.role || 'comum';
        const rolePerms = rolePermissions.permissions[userRole] || [];
        const perm = rolePerms.find((p) => p.page === item.pageKey);

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
            {!isMobile && (
                <MobileMenu
                    navItems={visibleNavItems}
                    isCollapsed={isSideMenuCollapsed}
                    onToggleCollapse={() => setIsSideMenuCollapsed(!isSideMenuCollapsed)}
                />
            )}

            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    marginLeft: isMobile ? 0 : `${sidebarWidth}px`,
                    transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    minWidth: 0,
                }}
            >
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                        {isMobile && <MobileMenu navItems={visibleNavItems} />}
                    </div>

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

            <KeyboardShortcutsHelp
                isOpen={isShortcutsHelpOpen}
                onClose={() => setIsShortcutsHelpOpen(false)}
            />

            <HelpModal
                isOpen={isHelpModalOpen}
                onClose={() => setIsHelpModalOpen(false)}
            />
        </div>
    );
};
