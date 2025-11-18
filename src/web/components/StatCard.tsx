import React from 'react';
import { IconType } from 'react-icons';
import { theme } from '../styles/theme';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: IconType;
  color?: string;
  subtitle?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  color = theme.colors.primary,
  subtitle,
}: StatCardProps) {
  return (
    <div
      style={{
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        boxShadow: theme.shadows.md,
        borderTop: `4px solid ${color}`,
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = theme.shadows.lg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = theme.shadows.md;
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: theme.colors.gray[600],
              fontWeight: 500,
              marginBottom: theme.spacing.xs,
            }}
          >
            {title}
          </p>
          <h3
            style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 700,
              color: theme.colors.dark,
            }}
          >
            {value}
          </h3>
          {subtitle && (
            <p
              style={{
                margin: `${theme.spacing.xs} 0 0 0`,
                fontSize: '12px',
                color: theme.colors.gray[500],
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: theme.borderRadius.md,
            backgroundColor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={28} color={color} />
        </div>
      </div>
    </div>
  );
}

