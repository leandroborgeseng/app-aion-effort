// Componente Skeleton Screen para estados de loading mais elegantes
import React from 'react';
import { theme } from '../styles/theme';

interface SkeletonScreenProps {
  type?: 'table' | 'cards' | 'list' | 'chart';
  rows?: number;
  columns?: number;
}

export default function SkeletonScreen({ 
  type = 'table', 
  rows = 5,
  columns = 4 
}: SkeletonScreenProps) {
  const skeletonAnimation = `
    @keyframes skeleton-loading {
      0% {
        background-position: -200px 0;
      }
      100% {
        background-position: calc(200px + 100%) 0;
      }
    }
  `;

  const skeletonStyle: React.CSSProperties = {
    background: `linear-gradient(90deg, ${theme.colors.gray[200]} 25%, ${theme.colors.gray[100]} 50%, ${theme.colors.gray[200]} 75%)`,
    backgroundSize: '200px 100%',
    animation: 'skeleton-loading 1.5s ease-in-out infinite',
    borderRadius: theme.borderRadius.sm,
  };

  if (type === 'table') {
    return (
      <>
        <style>{skeletonAnimation}</style>
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: theme.spacing.md,
              padding: theme.spacing.md,
              borderBottom: `1px solid ${theme.colors.gray[200]}`,
              backgroundColor: theme.colors.gray[50],
            }}
          >
            {Array.from({ length: columns }).map((_, i) => (
              <div
                key={i}
                style={{
                  ...skeletonStyle,
                  height: '20px',
                }}
              />
            ))}
          </div>
          {/* Rows */}
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div
              key={rowIdx}
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: theme.spacing.md,
                padding: theme.spacing.md,
                borderBottom: `1px solid ${theme.colors.gray[100]}`,
              }}
            >
              {Array.from({ length: columns }).map((_, colIdx) => (
                <div
                  key={colIdx}
                  style={{
                    ...skeletonStyle,
                    height: '16px',
                    width: colIdx === 0 ? '60%' : '100%',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </>
    );
  }

  if (type === 'cards') {
    return (
      <>
        <style>{skeletonAnimation}</style>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: theme.spacing.md,
          }}
        >
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              style={{
                backgroundColor: theme.colors.white,
                borderRadius: theme.borderRadius.md,
                boxShadow: theme.shadows.sm,
                padding: theme.spacing.lg,
              }}
            >
              <div
                style={{
                  ...skeletonStyle,
                  height: '20px',
                  width: '60%',
                  marginBottom: theme.spacing.md,
                }}
              />
              <div
                style={{
                  ...skeletonStyle,
                  height: '32px',
                  width: '80%',
                  marginBottom: theme.spacing.sm,
                }}
              />
              <div
                style={{
                  ...skeletonStyle,
                  height: '16px',
                  width: '40%',
                }}
              />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (type === 'list') {
    return (
      <>
        <style>{skeletonAnimation}</style>
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            padding: theme.spacing.md,
          }}
        >
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.md,
                padding: theme.spacing.md,
                borderBottom: i < rows - 1 ? `1px solid ${theme.colors.gray[200]}` : 'none',
              }}
            >
              <div
                style={{
                  ...skeletonStyle,
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    ...skeletonStyle,
                    height: '16px',
                    width: '60%',
                    marginBottom: theme.spacing.xs,
                  }}
                />
                <div
                  style={{
                    ...skeletonStyle,
                    height: '14px',
                    width: '40%',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (type === 'chart') {
    return (
      <>
        <style>{skeletonAnimation}</style>
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            padding: theme.spacing.lg,
            height: '400px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              ...skeletonStyle,
              width: '300px',
              height: '300px',
              borderRadius: '50%',
            }}
          />
        </div>
      </>
    );
  }

  return null;
}

