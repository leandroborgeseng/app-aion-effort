// Utilitários para melhorar experiência mobile
import { theme } from '../styles/theme';

export const mobileStyles = {
  // Espaçamentos otimizados para mobile
  padding: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '20px',
    xl: '24px',
  },
  // Tamanhos de fonte otimizados
  fontSize: {
    xs: '11px',
    sm: '13px',
    md: '15px',
    lg: '18px',
    xl: '22px',
    xxl: '26px',
  },
  // Altura mínima de toque (44px recomendado pela Apple)
  touchTarget: '44px',
  // Espaçamento entre elementos touch
  touchSpacing: '12px',
};

// Helper para criar cards responsivos
export const getCardStyle = (isMobile: boolean) => ({
  padding: isMobile ? mobileStyles.padding.md : theme.spacing.lg,
  borderRadius: theme.borderRadius.lg,
  backgroundColor: theme.colors.white,
  boxShadow: theme.shadows.md,
  marginBottom: isMobile ? mobileStyles.padding.md : theme.spacing.md,
});

// Helper para criar botões touch-friendly
export const getTouchButtonStyle = (isMobile: boolean, variant: 'primary' | 'secondary' | 'danger' = 'primary') => {
  const baseStyle = {
    minHeight: isMobile ? mobileStyles.touchTarget : '36px',
    padding: isMobile 
      ? `${mobileStyles.padding.sm} ${mobileStyles.padding.md}` 
      : `${theme.spacing.sm} ${theme.spacing.md}`,
    fontSize: isMobile ? mobileStyles.fontSize.md : '14px',
    fontWeight: 600,
    borderRadius: theme.borderRadius.md,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  };

  switch (variant) {
    case 'primary':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.primary,
        color: theme.colors.white,
      };
    case 'secondary':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.white,
        color: theme.colors.dark,
        border: `1px solid ${theme.colors.gray[300]}`,
      };
    case 'danger':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.danger,
        color: theme.colors.white,
      };
    default:
      return baseStyle;
  }
};

// Helper para criar grids responsivos
export const getResponsiveGrid = (isMobile: boolean, columns: number) => ({
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : `repeat(${columns}, 1fr)`,
  gap: isMobile ? mobileStyles.padding.md : theme.spacing.md,
});

// Helper para criar estatísticas cards mobile-friendly
export const getStatCardStyle = (isMobile: boolean) => ({
  padding: isMobile ? mobileStyles.padding.md : theme.spacing.lg,
  borderRadius: theme.borderRadius.md,
  backgroundColor: theme.colors.white,
  boxShadow: theme.shadows.sm,
  borderLeft: `3px solid ${theme.colors.primary}`,
  minHeight: isMobile ? 'auto' : '100px',
});

