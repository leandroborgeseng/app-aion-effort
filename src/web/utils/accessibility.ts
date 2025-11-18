// src/web/utils/accessibility.ts

/**
 * Utilitários para melhorar acessibilidade
 */

/**
 * Gera IDs únicos para elementos de formulário
 */
let idCounter = 0;
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Props padrão de acessibilidade para botões
 */
export const buttonA11yProps = {
  role: 'button' as const,
  tabIndex: 0,
};

/**
 * Props padrão de acessibilidade para inputs
 */
export function getInputA11yProps(label: string, error?: string) {
  const id = generateId('input');
  const errorId = error ? `${id}-error` : undefined;
  
  return {
    id,
    'aria-label': label,
    'aria-describedby': errorId,
    'aria-invalid': error ? 'true' : 'false',
    errorId,
  };
}

/**
 * Handler para navegação por teclado (Enter e Espaço)
 */
export function handleKeyboardNavigation(
  callback: () => void,
  event: React.KeyboardEvent
) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    callback();
  }
}

/**
 * Focus trap para modais
 */
export function trapFocus(element: HTMLElement | null) {
  if (!element) return;

  const focusableElements = element.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  element.addEventListener('keydown', handleTab);
  
  return () => {
    element.removeEventListener('keydown', handleTab);
  };
}

