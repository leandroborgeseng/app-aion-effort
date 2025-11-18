// src/web/components/UserMenu.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiUser, FiLogOut, FiEdit2, FiShield, FiX, FiSave, FiUsers, FiSettings } from 'react-icons/fi';
import { useUser } from '../contexts/UserContext';
import { usePermissions } from '../hooks/usePermissions';
import { theme } from '../styles/theme';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'comum' | 'gerente';
  active: boolean;
  canImpersonate: boolean;
  sectors: Array<{ id: string; sectorId: number; sectorName?: string }>;
}

export default function UserMenu() {
  const { user, impersonation, startImpersonation, stopImpersonation, setUser } = useUser();
  const { isAdmin, isGerente } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<User>>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Buscar usuários para personificação
  const { data: users } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Erro ao buscar usuários');
      return res.json();
    },
    enabled: showImpersonateModal && (isAdmin || isGerente),
  });

  // Atualizar perfil do usuário
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<User>) => {
      const res = await fetch(`/api/users/${user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao atualizar perfil');
      return res.json();
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowEditModal(false);
      setEditFormData({});
    },
  });

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Chamar API de logout
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(() => {
          // Ignorar erros de rede
        });
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      // Limpar dados locais
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('impersonation');
      // Redirecionar para login
      window.location.href = '/login';
    }
  };

  const handleEditProfile = () => {
    if (!user) return;
    setEditFormData({
      name: user.name,
      email: user.email,
    });
    setShowEditModal(true);
    setShowMenu(false);
  };

  const handleSaveProfile = () => {
    if (!user) return;
    updateProfileMutation.mutate(editFormData);
  };

  const handleImpersonate = async (targetUser: User) => {
    try {
      if (impersonation.isImpersonating) {
        await stopImpersonation();
      } else {
        // Buscar dados completos do usuário antes de personificar
        const res = await fetch(`/api/users/${targetUser.id}`);
        if (!res.ok) throw new Error('Erro ao buscar dados do usuário');
        const fullUserData = await res.json();
        
        // Garantir que tenha setores (mesmo que vazio)
        const userWithSectors: User = {
          ...fullUserData,
          sectors: fullUserData.sectors || [],
        };
        
        await startImpersonation(userWithSectors);
      }
      setShowImpersonateModal(false);
      setShowMenu(false);
    } catch (error: any) {
      console.error('Erro ao personificar:', error);
      alert(error?.message || 'Erro ao personificar usuário. Verifique se o usuário tem setores cadastrados.');
    }
  };

  const getRoleColor = () => {
    if (!user) return theme.colors.gray[600];
    switch (user.role) {
      case 'admin':
        return theme.colors.danger;
      case 'gerente':
        return theme.colors.warning;
      case 'comum':
        return theme.colors.info;
      default:
        return theme.colors.gray[600];
    }
  };

  const getRoleLabel = () => {
    if (!user) return '';
    switch (user.role) {
      case 'admin':
        return 'Administrador';
      case 'gerente':
        return 'Gerente';
      case 'comum':
        return 'Usuário';
      default:
        return user.role;
    }
  };

  if (!user) return null;

  const canImpersonate = isAdmin || isGerente || user.canImpersonate;
  const currentDisplayUser = impersonation.isImpersonating 
    ? impersonation.impersonatedUser 
    : user;

  return (
    <>
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={{
            marginLeft: theme.spacing.md,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            borderRadius: theme.borderRadius.sm,
            backgroundColor: `${getRoleColor()}15`,
            border: `1px solid ${getRoleColor()}40`,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${getRoleColor()}25`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = `${getRoleColor()}15`;
          }}
        >
          <FiUser size={16} color={getRoleColor()} />
          <span style={{ color: getRoleColor(), fontWeight: 600 }}>
            {currentDisplayUser?.name || user.name}
          </span>
        </button>

        {showMenu && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: theme.spacing.xs,
              backgroundColor: theme.colors.white,
              borderRadius: theme.borderRadius.md,
              boxShadow: theme.shadows.lg,
              border: `1px solid ${theme.colors.gray[200]}`,
              minWidth: '200px',
              zIndex: 1000,
            }}
          >
            {/* Informações do usuário */}
            <div
              style={{
                padding: theme.spacing.sm,
                borderBottom: `1px solid ${theme.colors.gray[200]}`,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '14px', color: theme.colors.dark }}>
                {currentDisplayUser?.name || user.name}
              </div>
              <div style={{ fontSize: '12px', color: theme.colors.gray[600], marginTop: theme.spacing.xs / 2 }}>
                {currentDisplayUser?.email || user.email}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: getRoleColor(),
                  marginTop: theme.spacing.xs / 2,
                  fontWeight: 600,
                }}
              >
                {getRoleLabel()}
              </div>
              {impersonation.isImpersonating && (
                <div
                  style={{
                    fontSize: '11px',
                    color: theme.colors.warning,
                    marginTop: theme.spacing.xs / 2,
                    padding: `${theme.spacing.xs / 2} ${theme.spacing.xs}`,
                    backgroundColor: `${theme.colors.warning}15`,
                    borderRadius: theme.borderRadius.sm,
                  }}
                >
                  Personificando: {impersonation.impersonatedUser?.name}
                </div>
              )}
            </div>

            {/* Menu items */}
            <div style={{ padding: theme.spacing.xs }}>
              <button
                onClick={handleEditProfile}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  borderRadius: theme.borderRadius.sm,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: theme.colors.gray[700],
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  fontSize: '14px',
                  textAlign: 'left',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.gray[100];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <FiEdit2 size={16} />
                Editar Perfil
              </button>

              {/* Menu de Administração - apenas para admins */}
              {isAdmin && (
                <>
                  <div
                    style={{
                      height: '1px',
                      backgroundColor: theme.colors.gray[200],
                      margin: `${theme.spacing.xs} 0`,
                    }}
                  />
                  <button
                    onClick={() => {
                      navigate('/usuarios');
                      setShowMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      borderRadius: theme.borderRadius.sm,
                      border: 'none',
                      backgroundColor: location.pathname === '/usuarios' ? theme.colors.primary : 'transparent',
                      color: location.pathname === '/usuarios' ? theme.colors.white : theme.colors.gray[700],
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                      fontSize: '14px',
                      textAlign: 'left',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (location.pathname !== '/usuarios') {
                        e.currentTarget.style.backgroundColor = theme.colors.gray[100];
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (location.pathname !== '/usuarios') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <FiUsers size={16} />
                    Usuários
                  </button>
                  <button
                    onClick={() => {
                      navigate('/configuracoes');
                      setShowMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      borderRadius: theme.borderRadius.sm,
                      border: 'none',
                      backgroundColor: location.pathname === '/configuracoes' ? theme.colors.primary : 'transparent',
                      color: location.pathname === '/configuracoes' ? theme.colors.white : theme.colors.gray[700],
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                      fontSize: '14px',
                      textAlign: 'left',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (location.pathname !== '/configuracoes') {
                        e.currentTarget.style.backgroundColor = theme.colors.gray[100];
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (location.pathname !== '/configuracoes') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <FiSettings size={16} />
                    Configurações
                  </button>
                </>
              )}

              {canImpersonate && (
                <>
                  <div
                    style={{
                      height: '1px',
                      backgroundColor: theme.colors.gray[200],
                      margin: `${theme.spacing.xs} 0`,
                    }}
                  />
                  <button
                    onClick={() => {
                      setShowImpersonateModal(true);
                      setShowMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      borderRadius: theme.borderRadius.sm,
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: theme.colors.gray[700],
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                      fontSize: '14px',
                      textAlign: 'left',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.gray[100];
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <FiShield size={16} />
                    {impersonation.isImpersonating ? 'Parar Personificação' : 'Personificar Usuário'}
                  </button>
                </>
              )}

              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  borderRadius: theme.borderRadius.sm,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: theme.colors.danger,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  fontSize: '14px',
                  textAlign: 'left',
                  transition: 'background-color 0.2s',
                  marginTop: theme.spacing.xs,
                  borderTop: `1px solid ${theme.colors.gray[200]}`,
                  paddingTop: theme.spacing.sm,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${theme.colors.danger}10`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <FiLogOut size={16} />
                Sair do Sistema
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Editar Perfil */}
      {showEditModal && (
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
            zIndex: 2000,
          }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            style={{
              backgroundColor: theme.colors.white,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.lg,
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: theme.colors.dark }}>Editar Perfil</h2>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  padding: theme.spacing.xs,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <FiX size={20} color={theme.colors.gray[600]} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
                  Nome
                </label>
                <input
                  type="text"
                  value={editFormData.name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: theme.spacing.sm,
                    borderRadius: theme.borderRadius.sm,
                    border: `1px solid ${theme.colors.gray[300]}`,
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={editFormData.email || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: theme.spacing.sm,
                    borderRadius: theme.borderRadius.sm,
                    border: `1px solid ${theme.colors.gray[300]}`,
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.lg, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  backgroundColor: theme.colors.white,
                  color: theme.colors.gray[700],
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  borderRadius: theme.borderRadius.md,
                  border: 'none',
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.white,
                  cursor: 'pointer',
                  opacity: updateProfileMutation.isPending ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                }}
              >
                <FiSave size={16} />
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Personificação */}
      {showImpersonateModal && (
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
            zIndex: 2000,
          }}
          onClick={() => setShowImpersonateModal(false)}
        >
          <div
            style={{
              backgroundColor: theme.colors.white,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.lg,
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: theme.colors.dark }}>
                {impersonation.isImpersonating ? 'Parar Personificação' : 'Personificar Usuário'}
              </h2>
              <button
                onClick={() => setShowImpersonateModal(false)}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  padding: theme.spacing.xs,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <FiX size={20} color={theme.colors.gray[600]} />
              </button>
            </div>

            {impersonation.isImpersonating ? (
              <div>
                <p style={{ color: theme.colors.gray[700], marginBottom: theme.spacing.md }}>
                  Você está personificando <strong>{impersonation.impersonatedUser?.name}</strong>.
                  Clique no botão abaixo para voltar ao seu perfil.
                </p>
                <button
                  onClick={() => handleImpersonate(impersonation.impersonatedUser!)}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    borderRadius: theme.borderRadius.md,
                    border: 'none',
                    backgroundColor: theme.colors.warning,
                    color: theme.colors.white,
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  Parar Personificação
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: theme.colors.gray[700], marginBottom: theme.spacing.md }}>
                  Selecione um usuário para personificar:
                </p>
                <div style={{ maxHeight: '400px', overflowY: 'auto', border: `1px solid ${theme.colors.gray[200]}`, borderRadius: theme.borderRadius.sm }}>
                  {users?.filter(u => u.id !== user.id && u.active).map((targetUser) => (
                    <button
                      key={targetUser.id}
                      onClick={() => handleImpersonate(targetUser)}
                      style={{
                        width: '100%',
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        border: 'none',
                        borderBottom: `1px solid ${theme.colors.gray[100]}`,
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.gray[50];
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: theme.colors.dark }}>
                          {targetUser.name}
                        </div>
                        <div style={{ fontSize: '12px', color: theme.colors.gray[600] }}>
                          {targetUser.email} • {targetUser.role === 'admin' ? 'Administrador' : targetUser.role === 'gerente' ? 'Gerente' : 'Usuário'}
                        </div>
                      </div>
                      <FiShield size={16} color={theme.colors.primary} />
                    </button>
                  ))}
                </div>
                {users?.filter(u => u.id !== user.id && u.active).length === 0 && (
                  <p style={{ color: theme.colors.gray[500], textAlign: 'center', padding: theme.spacing.md }}>
                    Nenhum usuário disponível para personificar.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

