// src/web/components/ResponsiveContainer.tsx
import React from 'react';
import { useIsMobile, useIsTablet } from '../hooks/useMediaQuery';
import { getResponsivePadding, getResponsiveGap } from '../utils/responsive';
import { theme } from '../styles/theme';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Container responsivo que ajusta padding e espaçamento automaticamente
 */
export default function ResponsiveContainer({ children, style, className }: ResponsiveContainerProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const padding = getResponsivePadding(isMobile, isTablet);

  return (
    <div
      className={className}
      style={{
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Grid responsivo que ajusta número de colunas automaticamente
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  minColumnWidth?: string;
  gap?: string;
  style?: React.CSSProperties;
}

export function ResponsiveGrid({ children, minColumnWidth = '250px', gap, style }: ResponsiveGridProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const gridGap = gap || getResponsiveGap(isMobile);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile
          ? '1fr'
          : isTablet
          ? 'repeat(2, 1fr)'
          : `repeat(auto-fill, minmax(${minColumnWidth}, 1fr))`,
        gap: gridGap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

