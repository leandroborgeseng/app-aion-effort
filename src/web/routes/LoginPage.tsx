// src/web/routes/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { FiLock, FiMail, FiEye, FiEyeOff } from 'react-icons/fi';
import { theme } from '../styles/theme';
import { useIsMobile } from '../hooks/useMediaQuery';
import { apiClient } from '../lib/apiClient';
import LoadingSpinner from '../components/LoadingSpinner';
import { useUser } from '../contexts/UserContext';

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
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState<number | null>(null);
  const { setUser } = useUser();
  const queryClient = useQueryClient();

  // Se já estiver logado, redirecionar para dashboard
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        // Atualizar contexto do usuário
        setUser(user);
        // Redirecionar para dashboard
        setIsRedirecting(true);
        navigate('/dashboard', { replace: true });
      } catch (e) {
        console.error('[LoginPage] Erro ao carregar usuário do localStorage:', e);
        setLoginError('Erro ao carregar dados do usuário. Por favor, faça login novamente.');
        // Se houver erro, limpar e permitir novo login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }
    }
  }, [navigate, setUser]);

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
      setLoginError(null); // Limpar erro anterior
      
      try {
        // Usar fetch diretamente para ter mais controle sobre erros
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        });

        const data = await response.json();

        // Se não for sucesso, lançar erro com mensagem específica
        if (!response.ok) {
          const errorMessage = data.message || data.error || `Erro ${response.status}: ${response.statusText}`;
          
          // Mensagens específicas baseadas no status code
          if (response.status === 401) {
            throw new Error('Email ou senha incorretos. Verifique suas credenciais.');
          } else if (response.status === 403) {
            throw new Error('Usuário inativo. Entre em contato com o administrador.');
          } else if (response.status === 423) {
            // Extrair tempo restante da mensagem se disponível
            const message = data.message || 'Conta bloqueada por muitas tentativas. Tente novamente mais tarde.';
            // Tentar extrair minutos da mensagem (ex: "Tente novamente em 15 minuto(s)")
            const timeMatch = message.match(/(\d+)\s*minuto/i);
            if (timeMatch) {
              const minutes = parseInt(timeMatch[1], 10);
              setLockoutTimeLeft(minutes * 60); // Converter para segundos
            } else {
              // Se não conseguir extrair, assumir 15 minutos (padrão do sistema)
              setLockoutTimeLeft(15 * 60);
            }
            throw new Error(message);
          } else if (response.status === 400) {
            throw new Error(data.message || 'Dados inválidos. Verifique o formato do email.');
          } else if (response.status === 429) {
            // Rate limiter bloqueou (muitas tentativas por IP)
            throw new Error('Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.');
          } else if (response.status === 500) {
            throw new Error('Erro no servidor. Tente novamente em alguns instantes.');
          } else {
            throw new Error(errorMessage);
          }
        }

        console.log('[LoginPage] Resposta do servidor:', data);
        return data;
      } catch (error: any) {
        // Capturar erro de rede
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
        }
        
        // Se já é um Error com mensagem, apenas relançar
        if (error instanceof Error) {
          throw error;
        }
        
        throw new Error(error?.message || 'Erro ao fazer login. Tente novamente.');
      }
    },
    onSuccess: (data: any) => {
      console.log('[LoginPage] Login bem-sucedido, dados recebidos:', data);
      
      // Verificar se a resposta tem token
      if (!data.token) {
        console.error('[LoginPage] Resposta sem token:', data);
        const errorMsg = 'Resposta inválida do servidor. O login pode ter falhado.';
        setLoginError(errorMsg);
        toast.error(errorMsg);
        return;
      }
      
      // Verificar se tem dados do usuário
      if (!data.user) {
        console.error('[LoginPage] Resposta sem dados do usuário:', data);
        const errorMsg = 'Dados do usuário não recebidos. Por favor, tente novamente.';
        setLoginError(errorMsg);
        toast.error(errorMsg);
        return;
      }
      
      try {
        // Salvar token no localStorage
        localStorage.setItem('auth_token', data.token);
        const userData = data.user || data;
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Atualizar contexto do usuário imediatamente
        setUser(userData);
        
        // Invalidar queries para forçar atualização
        queryClient.invalidateQueries();
        
        console.log('[LoginPage] ✅ Token salvo no localStorage e contexto atualizado');
        toast.success('Login realizado com sucesso!');
        
        // Redirecionar para dashboard usando navigate (sem recarregar página)
        setIsRedirecting(true);
        setTimeout(() => {
          console.log('[LoginPage] 🔄 Redirecionando para /dashboard...');
          navigate('/dashboard', { replace: true });
        }, 300);
      } catch (e: any) {
        console.error('[LoginPage] Erro ao salvar dados:', e);
        const errorMsg = 'Erro ao salvar dados do login. Por favor, tente novamente.';
        setLoginError(errorMsg);
        toast.error(errorMsg);
      }
    },
    onError: (err: Error) => {
      console.error('[LoginPage] Erro no login:', err);
      const errorMessage = err.message || 'Erro ao fazer login. Verifique suas credenciais.';
      setLoginError(errorMessage);
      toast.error(errorMessage);
    },
  });

  // Contador regressivo para bloqueio
  useEffect(() => {
    if (lockoutTimeLeft !== null && lockoutTimeLeft > 0) {
      const timer = setInterval(() => {
        setLockoutTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else if (lockoutTimeLeft === 0) {
      setLockoutTimeLeft(null);
      setLoginError(null);
      loginMutation.reset();
    }
  }, [lockoutTimeLeft, loginMutation]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const onSubmit = (data: LoginFormData) => {
    if (lockoutTimeLeft !== null && lockoutTimeLeft > 0) {
      return; // Não permitir tentativas enquanto bloqueado
    }
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
        padding: `${theme.spacing.xl} ${theme.spacing.xl * 2}`,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '450px',
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: isMobile ? `${theme.spacing.xl * 1.5} ${theme.spacing.xl}` : `${theme.spacing.xl * 2} ${theme.spacing.xl * 2.5}`,
          boxShadow: theme.shadows.xl,
          border: `1px solid ${theme.colors.gray[200]}`,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: theme.spacing.xl * 2 }}>
          <div style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.xs }}>
            <img
              src="/images/logo-aion.png"
              alt="Aion Engenharia"
              style={{
                height: '64px',
                width: 'auto',
                maxWidth: '100%',
                objectFit: 'contain',
                marginBottom: theme.spacing.xs,
              }}
            />
          </div>
          <p style={{ margin: 0, marginBottom: theme.spacing.xl, color: theme.colors.gray[600], fontSize: '14px' }}>
            Sistema de Gestão de Equipamentos Médicos
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Banner de erro geral */}
          {(loginError || loginMutation.isError) && (
            <div
              style={{
                marginBottom: theme.spacing.lg,
                padding: theme.spacing.md,
                backgroundColor: lockoutTimeLeft !== null ? `${theme.colors.warning}10` : `${theme.colors.danger}10`,
                border: `2px solid ${lockoutTimeLeft !== null ? theme.colors.warning : theme.colors.danger}`,
                borderRadius: theme.borderRadius.md,
                color: lockoutTimeLeft !== null ? theme.colors.warning : theme.colors.danger,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: theme.spacing.sm }}>
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '16px' }}>
                    {lockoutTimeLeft !== null ? '⏱️ Conta Bloqueada Temporariamente' : 'Erro ao fazer login:'}
                  </strong>
                  <div style={{ fontSize: '14px', lineHeight: 1.5, marginBottom: lockoutTimeLeft !== null ? theme.spacing.sm : 0 }}>
                    {lockoutTimeLeft !== null ? (
                      <>
                        <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: theme.spacing.xs }}>
                          Tempo restante: {formatTime(lockoutTimeLeft)}
                        </div>
                        <div style={{ fontSize: '13px', opacity: 0.9 }}>
                          Sua conta foi bloqueada por segurança após várias tentativas de login falhadas.
                          Aguarde o tempo indicado acima para tentar novamente.
                        </div>
                      </>
                    ) : (
                      loginError || (loginMutation.error as Error)?.message || 'Erro desconhecido'
                    )}
                  </div>
                  {lockoutTimeLeft === null && (
                    <div style={{ fontSize: '12px', marginTop: theme.spacing.xs, opacity: 0.8 }}>
                      Possíveis causas:
                      <ul style={{ margin: `${theme.spacing.xs} 0 0 ${theme.spacing.md}`, padding: 0 }}>
                        <li>Email ou senha incorretos</li>
                        <li>Conta bloqueada por muitas tentativas</li>
                        <li>Usuário inativo</li>
                        <li>Problema de conexão com o servidor</li>
                      </ul>
                    </div>
                  )}
                </div>
                {lockoutTimeLeft === null && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoginError(null);
                      loginMutation.reset();
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: lockoutTimeLeft !== null ? theme.colors.warning : theme.colors.danger,
                      cursor: 'pointer',
                      padding: theme.spacing.xs,
                      fontSize: '20px',
                      lineHeight: 1,
                    }}
                    aria-label="Fechar mensagem de erro"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Mensagem de redirecionamento */}
          {isRedirecting && (
            <div
              style={{
                marginBottom: theme.spacing.lg,
                padding: theme.spacing.md,
                backgroundColor: `${theme.colors.success}10`,
                border: `2px solid ${theme.colors.success}`,
                borderRadius: theme.borderRadius.md,
                color: theme.colors.success,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
              }}
            >
              <LoadingSpinner size="small" />
              <span>Login realizado com sucesso! Redirecionando...</span>
            </div>
          )}

          <div style={{ marginBottom: theme.spacing.xl, paddingLeft: theme.spacing.md, paddingRight: theme.spacing.md }}>
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
                  borderRadius: theme.borderRadius.md,
                  fontSize: '16px',
                  minHeight: '48px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  backgroundColor: theme.colors.white,
                  color: theme.colors.dark,
                }}
                onBlur={(e) => {
                  // Remover espaços em branco
                  e.target.value = e.target.value.trim();
                  e.target.style.borderColor = errors.email ? theme.colors.danger : theme.colors.gray[300];
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.colors.primary;
                  e.target.style.boxShadow = `0 0 0 3px ${theme.colors.primary}20`;
                }}
              />
            {errors.email && (
              <span style={{ fontSize: '12px', color: theme.colors.danger, marginTop: theme.spacing.xs, display: 'block' }}>
                {errors.email.message}
              </span>
            )}
          </div>

          <div style={{ marginBottom: theme.spacing.xl * 1.5, paddingLeft: theme.spacing.md, paddingRight: theme.spacing.md }}>
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
                autoComplete="current-password"
                aria-invalid={errors.password ? 'true' : 'false'}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.md + 4}px ${theme.spacing.xl * 2.5}px ${theme.spacing.md + 4}px ${theme.spacing.md}px`,
                  border: `2px solid ${errors.password ? theme.colors.danger : theme.colors.gray[300]}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: '16px',
                  minHeight: '48px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  backgroundColor: theme.colors.white,
                  color: theme.colors.dark,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.colors.primary;
                  e.target.style.boxShadow = `0 0 0 3px ${theme.colors.primary}20`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.password ? theme.colors.danger : theme.colors.gray[300];
                  e.target.style.boxShadow = 'none';
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
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = theme.colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = theme.colors.gray[500];
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

          <div style={{ paddingLeft: theme.spacing.md, paddingRight: theme.spacing.md, marginTop: theme.spacing.xl }}>
            <button
              type="submit"
              disabled={isSubmitting || loginMutation.isPending || (lockoutTimeLeft !== null && lockoutTimeLeft > 0)}
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
                cursor: (isSubmitting || loginMutation.isPending || (lockoutTimeLeft !== null && lockoutTimeLeft > 0)) ? 'not-allowed' : 'pointer',
                opacity: (isSubmitting || loginMutation.isPending || (lockoutTimeLeft !== null && lockoutTimeLeft > 0)) ? 0.6 : 1,
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
            {lockoutTimeLeft !== null && lockoutTimeLeft > 0
              ? `Bloqueado (${formatTime(lockoutTimeLeft)})`
              : (isSubmitting || loginMutation.isPending) ? 'Entrando...' : 'Entrar'}
          </button>
          </div>
        </form>
      </div>
    </div>
  );
}

