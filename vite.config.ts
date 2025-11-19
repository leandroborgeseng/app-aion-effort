import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/', // Garantir caminho base absoluto
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true, // Habilitar sourcemaps para debug
    // Usar esbuild como minificador (padrão, mais rápido e já incluído)
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
});

