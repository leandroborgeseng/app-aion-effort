import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiUsers, FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiEye, FiEyeOff, FiShield, FiMapPin } from 'react-icons/fi';
import { theme } from '../styles/theme';
import { useUser } from '../contexts/UserContext';

interface UserSector {
  id: string;
  sectorId: number;
  sectorName?: string;
}

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'comum' | 'gerente';
}

interface UserManager {
  id: string;
  user: ManagedUser;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'comum' | 'gerente';
  active: boolean;
  canImpersonate: boolean;
  sectors: UserSector[];
  managedUsers?: UserManager[];
}

interface Sector {
  id: number;
  name: string;
}

export default function UsersPage() {
  const { user: currentUser, startImpersonation, stopImpersonation, impersonation } = useUser();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<User & { managedUserIds?: string[] }>>({});
  const queryClient = useQueryClient();

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Erro ao buscar usuários');
      return res.json();
    },
  });

  const { data: sectors } = useQuery<Sector[]>({
    queryKey: ['sectors'],
    queryFn: async () => {
      const res = await fetch('/api/users/sectors/list');
      if (!res.ok) throw new Error('Erro ao buscar setores');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<User>) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao criar usuário');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setFormData({});
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao atualizar usuário');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingId(null);
      setFormData({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao deletar usuário');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: async (targetUser: User) => {
      await startImpersonation(targetUser);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
      canImpersonate: user.canImpersonate,
      sectors: user.sectors.map(s => s.sectorId),
      managedUserIds: user.managedUsers?.map(mu => mu.user.id) || [],
    });
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleImpersonate = async (targetUser: User) => {
    if (impersonation.isImpersonating) {
      await stopImpersonation();
    } else {
      impersonateMutation.mutate(targetUser);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'gerente':
        return 'Gerente';
      case 'comum':
        return 'Usuário Comum';
      default:
        return role;
    }
  };

  if (usersLoading) {
    return (
      <div style={{ padding: theme.spacing.md, textAlign: 'center' }}>
        <p style={{ color: theme.colors.gray[600] }}>Carregando usuários...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: theme.spacing.md,
        maxWidth: '1400px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: theme.spacing.md }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <div>
            <h1
              style={{
                margin: 0,
                marginBottom: theme.spacing.xs,
                color: theme.colors.dark,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                fontSize: 'clamp(20px, 5vw, 28px)',
              }}
            >
              <FiUsers size={28} color={theme.colors.primary} />
              Gestão de Usuários
            </h1>
            <p style={{ color: theme.colors.gray[600], margin: 0, fontSize: '14px' }}>
              Gerenciar usuários, setores e permissões
            </p>
            {sectors && sectors.length > 0 && (
              <p style={{ color: theme.colors.gray[500], margin: `${theme.spacing.xs} 0 0 0`, fontSize: '12px' }}>
                <FiMapPin size={12} style={{ display: 'inline', marginRight: theme.spacing.xs / 2 }} />
                {sectors.length} setor(es) disponível(is) para atribuição
              </p>
            )}
          </div>
          {impersonation.isImpersonating && (
            <div
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: `${theme.colors.warning}20`,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.warning}`,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
              }}
            >
              <FiShield size={16} color={theme.colors.warning} />
              <span style={{ fontSize: '14px', color: theme.colors.dark }}>
                Personificando: <strong>{impersonation.impersonatedUser?.name}</strong>
              </span>
              <button
                onClick={() => stopImpersonation()}
                style={{
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  borderRadius: theme.borderRadius.sm,
                  border: `1px solid ${theme.colors.warning}`,
                  backgroundColor: theme.colors.white,
                  color: theme.colors.warning,
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Parar
              </button>
            </div>
          )}
          {!showForm && !editingId && (
            <button
              onClick={() => {
                setShowForm(true);
                setFormData({
                  role: 'comum',
                  active: true,
                  canImpersonate: false,
                  sectors: [],
                  managedUserIds: [],
                });
              }}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.borderRadius.md,
                border: 'none',
                backgroundColor: theme.colors.primary,
                color: theme.colors.white,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              <FiPlus size={16} />
              Novo Usuário
            </button>
          )}
        </div>
      </div>

      {/* Formulário */}
      {(showForm || editingId) && (
        <div
          style={{
            padding: theme.spacing.md,
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.md,
            marginBottom: theme.spacing.md,
          }}
        >
          <h3 style={{ margin: `0 0 ${theme.spacing.md} 0` }}>
            {editingId ? 'Editar Usuário' : 'Novo Usuário'}
          </h3>
          <div style={{ display: 'grid', gap: theme.spacing.sm, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            <div>
              <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500, color: theme.colors.dark }}>
                Nome
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  fontSize: '14px',
                  backgroundColor: theme.colors.white,
                  color: theme.colors.dark,
                }}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500, color: theme.colors.dark }}>
                Email
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  fontSize: '14px',
                  backgroundColor: theme.colors.white,
                  color: theme.colors.dark,
                }}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500, color: theme.colors.dark }}>
                Função
              </label>
              <select
                value={formData.role || 'comum'}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  fontSize: '14px',
                  backgroundColor: theme.colors.white,
                  color: theme.colors.dark,
                }}
              >
                <option value="comum" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Usuário Comum</option>
                <option value="admin" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Administrador</option>
                <option value="gerente" style={{ backgroundColor: theme.colors.white, color: theme.colors.dark }}>Gerente</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, fontSize: '14px', fontWeight: 500, color: theme.colors.dark }}>
                <input
                  type="checkbox"
                  checked={formData.active !== false}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                Ativo
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, fontSize: '14px', fontWeight: 500, marginTop: theme.spacing.xs, color: theme.colors.dark }}>
                <input
                  type="checkbox"
                  checked={formData.canImpersonate || false}
                  onChange={(e) => setFormData({ ...formData, canImpersonate: e.target.checked })}
                />
                Pode personificar usuários
              </label>
            </div>
          </div>
          {/* Setores - apenas para usuários comuns */}
          {(formData.role === 'comum' || !formData.role) && (
            <div style={{ marginTop: theme.spacing.md }}>
              <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500, color: theme.colors.dark }}>
                Setores (apenas para usuários comuns) *
              </label>
              {sectors && sectors.length > 0 ? (
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                    {sectors.map((sector) => {
                      const isSelected = (formData.sectors as number[] || []).includes(sector.id);
                      return (
                        <label
                          key={sector.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.xs,
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            borderRadius: theme.borderRadius.sm,
                            border: `1px solid ${isSelected ? theme.colors.primary : theme.colors.gray[300]}`,
                            backgroundColor: isSelected ? `${theme.colors.primary}10` : theme.colors.white,
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = theme.colors.primary;
                              e.currentTarget.style.backgroundColor = `${theme.colors.primary}05`;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = theme.colors.gray[300];
                              e.currentTarget.style.backgroundColor = theme.colors.white;
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const currentSectors = (formData.sectors as number[] || []);
                              if (e.target.checked) {
                                setFormData({ ...formData, sectors: [...currentSectors, sector.id] });
                              } else {
                                setFormData({ ...formData, sectors: currentSectors.filter(s => s !== sector.id) });
                              }
                            }}
                          />
                          {sector.name}
                          <span style={{ fontSize: '11px', color: theme.colors.gray[500] }}>(ID: {sector.id})</span>
                        </label>
                      );
                    })}
                  </div>
                  <p style={{ marginTop: theme.spacing.xs, fontSize: '12px', color: theme.colors.gray[600] }}>
                    💡 Os IDs dos setores são gerados automaticamente a partir dos nomes dos setores encontrados nos equipamentos.
                    Certifique-se de que os setores selecionados correspondem aos setores dos equipamentos que você deseja visualizar.
                  </p>
                </div>
              ) : (
                <div style={{ padding: theme.spacing.md, backgroundColor: theme.colors.gray[50], borderRadius: theme.borderRadius.sm, border: `1px solid ${theme.colors.gray[200]}` }}>
                  <p style={{ margin: 0, color: theme.colors.gray[600], fontSize: '13px' }}>
                    Nenhum setor disponível. Os setores são obtidos automaticamente dos equipamentos cadastrados.
                  </p>
                </div>
              )}
              {(formData.sectors as number[] || []).length === 0 && (
                <p style={{ marginTop: theme.spacing.xs, color: theme.colors.warning, fontSize: '12px', fontStyle: 'italic' }}>
                  ⚠️ Atenção: Usuários comuns devem ter pelo menos um setor atribuído para visualizar dados.
                </p>
              )}
            </div>
          )}

          {/* Usuários gerenciados - apenas para gerentes */}
          {formData.role === 'gerente' && (
            <div style={{ marginTop: theme.spacing.md }}>
              <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '14px', fontWeight: 500, color: theme.colors.dark }}>
                Usuários Gerenciados (apenas para gerentes)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                {users?.filter(u => u.role === 'comum' && u.id !== editingId).map((user) => {
                  const isSelected = (formData.managedUserIds as string[] || []).includes(user.id);
                  return (
                    <label
                      key={user.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing.xs,
                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                        borderRadius: theme.borderRadius.sm,
                        border: `1px solid ${isSelected ? theme.colors.warning : theme.colors.gray[300]}`,
                        backgroundColor: isSelected ? `${theme.colors.warning}10` : theme.colors.white,
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const currentManaged = (formData.managedUserIds as string[] || []);
                          if (e.target.checked) {
                            setFormData({ ...formData, managedUserIds: [...currentManaged, user.id] });
                          } else {
                            setFormData({ ...formData, managedUserIds: currentManaged.filter(id => id !== user.id) });
                          }
                        }}
                      />
                      {user.name} ({user.email})
                    </label>
                  );
                })}
              </div>
              {users?.filter(u => u.role === 'comum' && u.id !== editingId).length === 0 && (
                <p style={{ color: theme.colors.gray[500], fontSize: '13px', marginTop: theme.spacing.xs }}>
                  Nenhum usuário comum disponível para gerenciar.
                </p>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.md, justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({});
              }}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.gray[300]}`,
                backgroundColor: theme.colors.white,
                color: theme.colors.gray[700],
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
              }}
            >
              <FiX size={16} />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.borderRadius.md,
                border: 'none',
                backgroundColor: theme.colors.primary,
                color: theme.colors.white,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                opacity: (createMutation.isPending || updateMutation.isPending) ? 0.6 : 1,
              }}
            >
              <FiSave size={16} />
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Lista de usuários */}
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.md,
          boxShadow: theme.shadows.sm,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: theme.colors.gray[50], borderBottom: `1px solid ${theme.colors.gray[200]}` }}>
              <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '13px', fontWeight: 600, color: theme.colors.gray[700] }}>
                Nome
              </th>
              <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '13px', fontWeight: 600, color: theme.colors.gray[700] }}>
                Email
              </th>
              <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '13px', fontWeight: 600, color: theme.colors.gray[700] }}>
                Função
              </th>
              <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '13px', fontWeight: 600, color: theme.colors.gray[700] }}>
                Setores
              </th>
              <th style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '13px', fontWeight: 600, color: theme.colors.gray[700] }}>
                Status
              </th>
              <th style={{ padding: theme.spacing.sm, textAlign: 'right', fontSize: '13px', fontWeight: 600, color: theme.colors.gray[700] }}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => (
              <tr
                key={user.id}
                style={{
                  borderBottom: `1px solid ${theme.colors.gray[100]}`,
                  backgroundColor: user.id === editingId ? theme.colors.gray[50] : 'transparent',
                }}
              >
                <td style={{ padding: theme.spacing.sm, fontSize: '14px' }}>{user.name}</td>
                <td style={{ padding: theme.spacing.sm, fontSize: '14px', color: theme.colors.gray[600] }}>{user.email}</td>
                <td style={{ padding: theme.spacing.sm }}>
                  <span
                    style={{
                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                      borderRadius: theme.borderRadius.sm,
                      backgroundColor: `${getRoleColor(user.role)}20`,
                      color: getRoleColor(user.role),
                      fontWeight: 600,
                      fontSize: '12px',
                    }}
                  >
                    {getRoleLabel(user.role)}
                  </span>
                </td>
                <td style={{ padding: theme.spacing.sm, fontSize: '13px' }}>
                  {user.role === 'admin' ? (
                    <span style={{ color: theme.colors.gray[400] }}>Todos os setores</span>
                  ) : user.role === 'gerente' ? (
                    <div>
                      {user.managedUsers && user.managedUsers.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                          <span style={{ fontSize: '11px', color: theme.colors.gray[500], marginBottom: theme.spacing.xs }}>
                            Gerencia {user.managedUsers.length} usuário(s):
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                            {user.managedUsers.map((mu) => (
                              <span
                                key={mu.id}
                                style={{
                                  padding: `2px ${theme.spacing.xs}`,
                                  borderRadius: theme.borderRadius.sm,
                                  backgroundColor: `${theme.colors.warning}20`,
                                  fontSize: '11px',
                                }}
                              >
                                {mu.user.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: theme.colors.gray[400] }}>Nenhum usuário gerenciado</span>
                      )}
                    </div>
                  ) : user.sectors.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                      <span style={{ color: theme.colors.gray[400], fontStyle: 'italic' }}>Nenhum setor atribuído</span>
                      <button
                        onClick={() => handleEdit(user)}
                        title="Adicionar setores"
                        style={{
                          padding: theme.spacing.xs / 2,
                          borderRadius: theme.borderRadius.sm,
                          border: `1px solid ${theme.colors.gray[300]}`,
                          backgroundColor: theme.colors.white,
                          color: theme.colors.primary,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <FiMapPin size={12} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs, alignItems: 'center' }}>
                      {user.sectors.map((s) => (
                        <span
                          key={s.id}
                          style={{
                            padding: `2px ${theme.spacing.xs}`,
                            borderRadius: theme.borderRadius.sm,
                            backgroundColor: theme.colors.gray[100],
                            fontSize: '11px',
                          }}
                        >
                          {s.sectorName || `Setor ${s.sectorId}`}
                        </span>
                      ))}
                      <button
                        onClick={() => handleEdit(user)}
                        title="Editar setores"
                        style={{
                          padding: theme.spacing.xs / 2,
                          borderRadius: theme.borderRadius.sm,
                          border: `1px solid ${theme.colors.gray[300]}`,
                          backgroundColor: theme.colors.white,
                          color: theme.colors.primary,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          marginLeft: theme.spacing.xs,
                        }}
                      >
                        <FiMapPin size={12} />
                      </button>
                    </div>
                  )}
                </td>
                <td style={{ padding: theme.spacing.sm }}>
                  {user.active ? (
                    <span style={{ color: theme.colors.success, display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                      <FiEye size={14} />
                      Ativo
                    </span>
                  ) : (
                    <span style={{ color: theme.colors.gray[400], display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                      <FiEyeOff size={14} />
                      Inativo
                    </span>
                  )}
                </td>
                <td style={{ padding: theme.spacing.sm, textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: theme.spacing.xs, justifyContent: 'flex-end' }}>
                    {currentUser?.canImpersonate && user.id !== currentUser.id && (
                      <button
                        onClick={() => handleImpersonate(user)}
                        title={impersonation.isImpersonating ? 'Parar personificação' : 'Personificar usuário'}
                        style={{
                          padding: theme.spacing.xs,
                          borderRadius: theme.borderRadius.sm,
                          border: 'none',
                          backgroundColor: impersonation.impersonatedUser?.id === user.id ? theme.colors.warning : theme.colors.gray[100],
                          color: impersonation.impersonatedUser?.id === user.id ? theme.colors.white : theme.colors.gray[700],
                          cursor: 'pointer',
                        }}
                      >
                        <FiShield size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(user)}
                      style={{
                        padding: theme.spacing.xs,
                        borderRadius: theme.borderRadius.sm,
                        border: 'none',
                        backgroundColor: theme.colors.gray[100],
                        color: theme.colors.gray[700],
                        cursor: 'pointer',
                      }}
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja deletar ${user.name}?`)) {
                          deleteMutation.mutate(user.id);
                        }
                      }}
                      style={{
                        padding: theme.spacing.xs,
                        borderRadius: theme.borderRadius.sm,
                        border: 'none',
                        backgroundColor: theme.colors.gray[100],
                        color: theme.colors.danger,
                        cursor: 'pointer',
                      }}
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

