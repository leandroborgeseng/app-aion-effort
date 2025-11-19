// src/web/routes/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { FiLock, FiMail, FiEye, FiEyeOff } from 'react-icons/fi';
import { theme } from '../styles/theme';
import { useIsMobile } from '../hooks/useMediaQuery';
import { apiClient } from '../lib/apiClient';
import LoadingSpinner from '../components/LoadingSpinner';

const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur', // Validar apenas quando sair do campo
    reValidateMode: 'onBlur',
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginFormData) => {
      console.log('[LoginPage] Tentando fazer login com:', credentials.email);
      const response = await apiClient.post('/api/auth/login', credentials, { skipAuth: true });
      console.log('[LoginPage] Resposta do servidor:', response);
      return response;
    },
    onSuccess: (data: any) => {
      console.log('[LoginPage] Login bem-sucedido, dados recebidos:', data);
      
      // Verificar se a resposta tem token
      if (!data.token) {
        console.error('[LoginPage] Resposta sem token:', data);
        toast.error('Resposta inválida do servidor');
        return;
      }
      
      // Salvar token no localStorage
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user || data));
      
      console.log('[LoginPage] Token salvo no localStorage');
      toast.success('Login realizado com sucesso!');
      
      // Recarregar página para atualizar contexto do usuário
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    },
    onError: (err: Error) => {
      console.error('[LoginPage] Erro no login:', err);
      toast.error(err.message || 'Erro ao fazer login');
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.gray[50],
        padding: theme.spacing.md,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: isMobile ? theme.spacing.lg : theme.spacing.xl * 2,
          boxShadow: theme.shadows.lg,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: theme.spacing.xl }}>
          <h1
            style={{
              margin: 0,
              marginBottom: theme.spacing.xs,
              fontSize: '28px',
              fontWeight: 700,
              color: theme.colors.dark,
            }}
          >
            Aion View
          </h1>
          <p style={{ margin: 0, color: theme.colors.gray[600], fontSize: '14px' }}>
            Sistema de Gestão de Equipamentos Médicos
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Removido o banner de erro geral - os erros aparecem abaixo de cada campo */}

          <div style={{ marginBottom: theme.spacing.lg }}>
            <label
              htmlFor="email"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                marginBottom: theme.spacing.sm,
                fontSize: '14px',
                fontWeight: 500,
                color: theme.colors.dark,
              }}
            >
              <FiMail size={18} style={{ color: theme.colors.gray[500] }} />
              Email
            </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                placeholder="admin@teste.com"
                autoComplete="email"
                aria-invalid={errors.email ? 'true' : 'false'}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.md + 4}px ${theme.spacing.md}px`,
                  border: `2px solid ${errors.email ? theme.colors.danger : theme.colors.gray[300]}`,
                  fontSize: '16px',
                  minHeight: '48px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                }}
                onBlur={(e) => {
                  // Remover espaços em branco
                  e.target.value = e.target.value.trim();
                  e.target.style.borderColor = errors.email ? theme.colors.danger : theme.colors.gray[300];
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.colors.primary;
                }}
              />
            {errors.email && (
              <span style={{ fontSize: '12px', color: theme.colors.danger, marginTop: theme.spacing.xs, display: 'block' }}>
                {errors.email.message}
              </span>
            )}
          </div>

          <div style={{ marginBottom: theme.spacing.lg }}>
            <label
              htmlFor="password"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                marginBottom: theme.spacing.sm,
                fontSize: '14px',
                fontWeight: 500,
                color: theme.colors.dark,
              }}
            >
              <FiLock size={18} style={{ color: theme.colors.gray[500] }} />
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="••••••••"
                aria-invalid={errors.password ? 'true' : 'false'}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.md + 4}px ${theme.spacing.xl * 2.5}px ${theme.spacing.md + 4}px ${theme.spacing.md}px`,
                  border: `2px solid ${errors.password ? theme.colors.danger : theme.colors.gray[300]}`,
                  fontSize: '16px',
                  minHeight: '48px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.colors.primary;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.password ? theme.colors.danger : theme.colors.gray[300];
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: theme.spacing.md,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  padding: theme.spacing.xs,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.colors.gray[500],
                  zIndex: 1,
                }}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
            {errors.password && (
              <span style={{ fontSize: '12px', color: theme.colors.danger, marginTop: theme.spacing.xs, display: 'block' }}>
                {errors.password.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || loginMutation.isPending}
            style={{
              width: '100%',
              padding: `${theme.spacing.md + 4}px ${theme.spacing.md}px`,
              backgroundColor: theme.colors.primary,
              color: theme.colors.white,
              border: 'none',
              borderRadius: theme.borderRadius.md,
              fontSize: '16px',
              fontWeight: 600,
              minHeight: '48px',
              cursor: (isSubmitting || loginMutation.isPending) ? 'not-allowed' : 'pointer',
              opacity: (isSubmitting || loginMutation.isPending) ? 0.6 : 1,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.sm,
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting && !loginMutation.isPending) {
                e.currentTarget.style.opacity = '0.9';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting && !loginMutation.isPending) {
                e.currentTarget.style.opacity = '1';
              }
            }}
          >
            {(isSubmitting || loginMutation.isPending) && (
              <LoadingSpinner size="small" />
            )}
            {(isSubmitting || loginMutation.isPending) ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

