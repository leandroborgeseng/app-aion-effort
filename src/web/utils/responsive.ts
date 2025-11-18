// src/web/utils/responsive.ts
import { theme } from '../styles/theme';

export const breakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
};

/**
 * Retorna padding responsivo baseado no tamanho da tela
 */
export function getResponsivePadding(isMobile: boolean, isTablet: boolean): string {
  if (isMobile) return theme.spacing.md;
  if (isTablet) return theme.spacing.lg;
  return theme.spacing.xl;
}

/**
 * Retorna tamanho de fonte responsivo
 */
export function getResponsiveFontSize(isMobile: boolean, isTablet: boolean, base: string): string {
  if (isMobile) {
    const size = parseInt(base);
    return `${Math.max(size - 2, 12)}px`;
  }
  return base;
}

/**
 * Retorna número de colunas para grid responsivo
 */
export function getResponsiveColumns(isMobile: boolean, isTablet: boolean): number {
  if (isMobile) return 1;
  if (isTablet) return 2;
  return 3;
}

/**
 * Retorna gap para grid responsivo
 */
export function getResponsiveGap(isMobile: boolean): string {
  return isMobile ? theme.spacing.sm : theme.spacing.md;
}

