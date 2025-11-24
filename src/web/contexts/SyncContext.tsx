import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface SyncContextType {
  lastSyncTime: Date | null;
  updateLastSync: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const STORAGE_KEY = 'effort_last_sync';

export function SyncProvider({ children }: { children: ReactNode }) {
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
    // Carregar do localStorage ao inicializar
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return new Date(stored);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });

  const updateLastSync = () => {
    const now = new Date();
    setLastSyncTime(now);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, now.toISOString());
    }
  };

  return (
    <SyncContext.Provider value={{ lastSyncTime, updateLastSync }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within SyncProvider');
  }
  return context;
}

