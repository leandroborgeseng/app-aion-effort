// Teste simples
import React from 'react';
import { createRoot } from 'react-dom/client';

const TestApp = () => {
  return (
    <div style={{ padding: 50, fontFamily: 'sans-serif' }}>
      <h1 style={{ color: 'red', fontSize: 32 }}>TESTE - Se você vê isso, React está funcionando!</h1>
      <p>Se não aparecer nada, há um problema com o React.</p>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<TestApp />);
} else {
  console.error('Elemento root não encontrado!');
}

