import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiShield, FiSave, FiRefreshCw, FiCheck, FiX, FiUsers, FiEye, FiEyeOff } from 'react-icons/fi';
import { theme } from '../styles/theme';
import { useUser } from '../contexts/UserContext';
import { useIsMobile } from '../hooks/useMediaQuery';
import { getResponsivePadding } from '../utils/responsive';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import toast from 'react-hot-toast';

interface Page {
  key: string;
  label: string;
  description: string;
}

interface Permission {
  page: string;
  canAccess: boolean;
  id: string;
}

interface RolePermissions {
  [role: string]: Permission[];
}

const ROLES = [
  { key: 'admin', label: 'Administrador', color: theme.colors.danger },
  { key: 'gerente', label: 'Gerente', color: theme.colors.warning },
  { key: 'comum', label: 'Usuário Comum', color: theme.colors.info },
];

export default function RolePermissionsPage() {
  const { user } = useUser();
  const isMobile = useIsMobile();
  const padding = getResponsivePadding(isMobile, false);
  const queryClient = useQueryClient();

  const [permissions, setPermissions] = useState<RolePermissions>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [originalPermissions, setOriginalPermissions] = useState<RolePermissions>({});

  // Verificar se é admin
  if (user?.role !== 'admin') {
    return (
      <div style={{ padding, textAlign: 'center' }}>
        <ErrorMessage message="Apenas administradores podem acessar esta página" />
      </div>
    );
  }

  const { data: pagesData, isLoading: pagesLoading } = useQuery<{ success: boolean; pages: Page[] }>({
    queryKey: ['role-permissions-pages'],
    queryFn: async () => {
      const res = await fetch('/api/config/role-permissions/pages');
      if (!res.ok) throw new Error('Erro ao buscar páginas');
      return res.json();
    },
  });

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery<{
    success: boolean;
    permissions: RolePermissions;
    allPermissions: Array<{ id: string; role: string; page: string; canAccess: boolean }>;
  }>({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const res = await fetch('/api/config/role-permissions');
      if (!res.ok) throw new Error('Erro ao buscar permissões');
      return res.json();
    },
    onSuccess: (data) => {
      setPermissions(data.permissions || {});
      setOriginalPermissions(JSON.parse(JSON.stringify(data.permissions || {})));
      setHasChanges(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ role, permissions: rolePerms }: { role: string; permissions: Permission[] }) => {
      const res = await fetch(`/api/config/role-permissions/${role}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: rolePerms }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Erro ao atualizar permissões');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      setHasChanges(false);
      toast.success('Permissões atualizadas com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar permissões');
    },
  });

  const togglePermission = (role: string, page: string) => {
    setPermissions((prev) => {
      const newPerms = { ...prev };
      if (!newPerms[role]) {
        newPerms[role] = [];
      }

      const existingIndex = newPerms[role].findIndex((p) => p.page === page);
      if (existingIndex >= 0) {
        newPerms[role][existingIndex] = {
          ...newPerms[role][existingIndex],
          canAccess: !newPerms[role][existingIndex].canAccess,
        };
      } else {
        newPerms[role].push({ page, canAccess: true, id: '' });
      }

      return newPerms;
    });
    setHasChanges(true);
  };

  const saveAll = async () => {
    for (const role of ROLES.map((r) => r.key)) {
      const rolePerms = permissions[role] || [];
      if (rolePerms.length > 0) {
        await updateMutation.mutateAsync({ role, permissions: rolePerms });
      }
    }
  };

  const reset = () => {
    setPermissions(JSON.parse(JSON.stringify(originalPermissions)));
    setHasChanges(false);
  };

  const getPermission = (role: string, page: string): boolean => {
    // Admin sempre tem acesso a tudo
    if (role === 'admin') return true;

    const rolePerms = permissions[role] || [];
    const perm = rolePerms.find((p) => p.page === page);
    // Se não existe permissão configurada, assume que tem acesso (comportamento padrão)
    return perm ? perm.canAccess : true;
  };

  if (pagesLoading || permissionsLoading) {
    return (
      <div style={{ padding, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!pagesData || !permissionsData) {
    return (
      <div style={{ padding }}>
        <ErrorMessage message="Erro ao carregar dados de configuração" />
      </div>
    );
  }

  const pages = pagesData.pages || [];

  return (
    <div style={{ padding, backgroundColor: theme.colors.gray[50], minHeight: '100vh' }}>
      {/* Cabeçalho */}
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          marginBottom: theme.spacing.lg,
          boxShadow: theme.shadows.md,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.md }}>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: isMobile ? '24px' : '32px',
                fontWeight: 700,
                color: theme.colors.dark,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
              }}
            >
              <FiShield size={isMobile ? 24 : 32} color={theme.colors.primary} />
              Configuração de Permissões
            </h1>
            <p style={{ margin: `${theme.spacing.xs} 0 0 0`, color: theme.colors.gray[600], fontSize: '14px' }}>
              Configure quais páginas cada tipo de usuário pode visualizar no sistema
            </p>
          </div>
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            {hasChanges && (
              <button
                onClick={reset}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  backgroundColor: theme.colors.white,
                  color: theme.colors.gray[700],
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  fontWeight: 600,
                }}
              >
                <FiX size={16} />
                Cancelar
              </button>
            )}
            <button
              onClick={saveAll}
              disabled={!hasChanges || updateMutation.isPending}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.borderRadius.md,
                border: 'none',
                backgroundColor: hasChanges && !updateMutation.isPending ? theme.colors.primary : theme.colors.gray[300],
                color: hasChanges && !updateMutation.isPending ? theme.colors.white : theme.colors.gray[600],
                fontSize: '14px',
                cursor: hasChanges && !updateMutation.isPending ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                fontWeight: 600,
              }}
            >
              {updateMutation.isPending ? (
                <>
                  <FiRefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Salvando...
                </>
              ) : (
                <>
                  <FiSave size={16} />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Permissões */}
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          boxShadow: theme.shadows.md,
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${theme.colors.gray[200]}` }}>
              <th
                style={{
                  padding: theme.spacing.md,
                  textAlign: 'left',
                  fontWeight: 600,
                  color: theme.colors.dark,
                  fontSize: '14px',
                  position: 'sticky',
                  left: 0,
                  backgroundColor: theme.colors.white,
                  zIndex: 10,
                }}
              >
                Página
              </th>
              {ROLES.map((role) => (
                <th
                  key={role.key}
                  style={{
                    padding: theme.spacing.md,
                    textAlign: 'center',
                    fontWeight: 600,
                    color: theme.colors.dark,
                    fontSize: '14px',
                    minWidth: '150px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: theme.spacing.xs }}>
                    <FiUsers size={20} color={role.color} />
                    <span>{role.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr
                key={page.key}
                style={{
                  borderBottom: `1px solid ${theme.colors.gray[100]}`,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.gray[50];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <td
                  style={{
                    padding: theme.spacing.md,
                    position: 'sticky',
                    left: 0,
                    backgroundColor: 'inherit',
                    zIndex: 5,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: theme.colors.dark, marginBottom: theme.spacing.xs / 2 }}>
                      {page.label}
                    </div>
                    <div style={{ fontSize: '12px', color: theme.colors.gray[600] }}>{page.description}</div>
                  </div>
                </td>
                {ROLES.map((role) => {
                  const canAccess = getPermission(role.key, page.key);
                  return (
                    <td key={role.key} style={{ padding: theme.spacing.md, textAlign: 'center' }}>
                      <button
                        onClick={() => togglePermission(role.key, page.key)}
                        disabled={role.key === 'admin'}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: theme.borderRadius.md,
                          border: `2px solid ${canAccess ? theme.colors.success : theme.colors.gray[300]}`,
                          backgroundColor: canAccess ? theme.colors.success : theme.colors.white,
                          color: canAccess ? theme.colors.white : theme.colors.gray[400],
                          cursor: role.key === 'admin' ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          margin: '0 auto',
                        }}
                        title={role.key === 'admin' ? 'Administradores sempre têm acesso a todas as páginas' : canAccess ? 'Clique para remover acesso' : 'Clique para permitir acesso'}
                      >
                        {canAccess ? <FiCheck size={20} /> : <FiX size={20} />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Informações */}
      <div
        style={{
          backgroundColor: theme.colors.info + '15',
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginTop: theme.spacing.lg,
          border: `1px solid ${theme.colors.info}40`,
        }}
      >
        <h3 style={{ margin: `0 0 ${theme.spacing.sm} 0`, fontSize: '16px', fontWeight: 600, color: theme.colors.dark }}>
          ℹ️ Informações
        </h3>
        <ul style={{ margin: 0, paddingLeft: theme.spacing.lg, color: theme.colors.gray[700], fontSize: '14px', lineHeight: 1.8 }}>
          <li>Administradores sempre têm acesso a todas as páginas e não podem ter permissões removidas.</li>
          <li>Se uma permissão não estiver configurada, o sistema assume que o usuário tem acesso (comportamento padrão).</li>
          <li>As alterações são aplicadas imediatamente após salvar.</li>
          <li>Usuários já logados precisarão fazer logout e login novamente para ver as mudanças.</li>
        </ul>
      </div>
    </div>
  );
}
