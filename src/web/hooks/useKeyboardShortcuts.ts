// Hook para gerenciar atalhos de teclado globais
import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: (e: KeyboardEvent) => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrlKey ? e.ctrlKey : !e.ctrlKey;
        const metaMatch = shortcut.metaKey ? e.metaKey : !e.metaKey;
        const shiftMatch = shortcut.shiftKey !== undefined 
          ? (shortcut.shiftKey === e.shiftKey) 
          : true;
        const altMatch = shortcut.altKey !== undefined 
          ? (shortcut.altKey === e.altKey) 
          : true;

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
          // Evitar conflito com inputs de texto
          const target = e.target as HTMLElement;
          const isInput = target.tagName === 'INPUT' || 
                         target.tagName === 'TEXTAREA' || 
                         target.isContentEditable;
          
          // Permitir apenas se não estiver em um input (exceto para alguns atalhos especiais)
          if (!isInput || shortcut.key === 'k' || shortcut.key === '/') {
            e.preventDefault();
            shortcut.handler(e);
          }
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

