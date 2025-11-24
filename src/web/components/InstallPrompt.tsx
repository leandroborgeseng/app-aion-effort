// Componente para prompt de instalação do PWA
import React, { useState, useEffect } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';
import { theme } from '../styles/theme';
import toast from 'react-hot-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Verificar se já foi instalado anteriormente
    const installed = localStorage.getItem('pwa-installed');
    if (installed === 'true') {
      setIsInstalled(true);
      return;
    }

    // Escutar o evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    // Escutar quando o app é instalado
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem('pwa-installed', 'true');
      toast.success('App instalado com sucesso!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      // Mostrar o prompt de instalação
      await deferredPrompt.prompt();

      // Aguardar a escolha do usuário
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        toast.success('Instalando aplicativo...');
      } else {
        toast('Instalação cancelada. Você pode instalar depois pelo menu do navegador.');
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Erro ao instalar PWA:', error);
      toast.error('Erro ao instalar aplicativo');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Não mostrar novamente por 7 dias
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Verificar se foi dispensado recentemente
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        setShowPrompt(false);
      }
    }
  }, []);

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: theme.spacing.lg,
        left: theme.spacing.lg,
        right: theme.spacing.lg,
        maxWidth: '500px',
        margin: '0 auto',
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.lg,
        boxShadow: theme.shadows.xl,
        padding: theme.spacing.lg,
        zIndex: 10000,
        border: `1px solid ${theme.colors.gray[200]}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: theme.spacing.md,
        }}
      >
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: 0,
              marginBottom: theme.spacing.xs,
              fontSize: '18px',
              fontWeight: 600,
              color: theme.colors.dark,
            }}
          >
            Instalar Aion View
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: theme.colors.gray[600],
              lineHeight: 1.5,
            }}
          >
            Instale o aplicativo para acesso rápido, funcionamento offline e notificações.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            padding: theme.spacing.xs,
            marginLeft: theme.spacing.sm,
          }}
          aria-label="Fechar"
        >
          <FiX size={20} color={theme.colors.gray[600]} />
        </button>
      </div>
      <div
        style={{
          display: 'flex',
          gap: theme.spacing.sm,
          justifyContent: 'flex-end',
        }}
      >
        <button
          onClick={handleDismiss}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            backgroundColor: theme.colors.white,
            border: `1px solid ${theme.colors.gray[300]}`,
            borderRadius: theme.borderRadius.md,
            color: theme.colors.dark,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Depois
        </button>
        <button
          onClick={handleInstallClick}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            backgroundColor: theme.colors.primary,
            border: 'none',
            borderRadius: theme.borderRadius.md,
            color: theme.colors.white,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
          }}
        >
          <FiDownload size={16} />
          Instalar
        </button>
      </div>
    </div>
  );
}

