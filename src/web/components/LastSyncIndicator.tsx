import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FiRefreshCw, FiClock } from 'react-icons/fi';
import { useSync } from '../contexts/SyncContext';
import { theme } from '../styles/theme';
import { formatBrazilianDateTime } from '../utils/dateUtils';

// Query keys que indicam sincronização com Effort API
const EFFORT_QUERY_KEYS = [
  'inv',
  'os',
  'cronograma',
  'rondas',
  'disponibilidade',
  'equipamentos',
  'critical',
  'critical-kpi',
  'critical-equipamentos',
  'contracts',
  'investment-sectors',
];

function isEffortQuery(queryKey: any[]): boolean {
  if (!Array.isArray(queryKey) || queryKey.length === 0) {
    return false;
  }
  
  const firstKey = queryKey[0];
  if (typeof firstKey === 'string') {
    return EFFORT_QUERY_KEYS.some(key => firstKey.includes(key));
  }
  
  return false;
}

export default function LastSyncIndicator() {
  const { lastSyncTime, updateLastSync } = useSync();
  const queryClient = useQueryClient();
  const [timeAgo, setTimeAgo] = useState<string>('');

  // Observar mudanças nas queries do React Query
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'updated' && event.query.state.status === 'success') {
        const queryKey = event.query.queryKey;
        if (isEffortQuery(queryKey)) {
          updateLastSync();
        }
      }
    });

    return () => unsubscribe();
  }, [queryClient, updateLastSync]);

  // Atualizar tempo relativo a cada minuto
  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastSyncTime) {
        setTimeAgo('');
        return;
      }

      const now = new Date();
      const diffMs = now.getTime() - lastSyncTime.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSeconds < 60) {
        setTimeAgo('agora');
      } else if (diffMinutes < 60) {
        setTimeAgo(`${diffMinutes} min${diffMinutes > 1 ? 's' : ''} atrás`);
      } else if (diffHours < 24) {
        setTimeAgo(`${diffHours} h${diffHours > 1 ? 's' : ''} atrás`);
      } else {
        setTimeAgo(`${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, [lastSyncTime]);

  if (!lastSyncTime) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.xs,
        fontSize: '12px',
        color: theme.colors.gray[600],
        flexShrink: 0,
      }}
      title={`Última sincronização: ${formatBrazilianDateTime(lastSyncTime)}`}
    >
      <FiClock size={14} color={theme.colors.gray[500]} />
      <span>Última sync:</span>
      <span style={{ color: theme.colors.primary, fontWeight: 600 }}>{timeAgo}</span>
    </div>
  );
}

