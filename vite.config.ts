import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Aion View - Gestão de Equipamentos Médicos',
        short_name: 'Aion View',
        description: 'Sistema de gestão do ciclo de vida de equipamentos médicos',
        theme_color: '#0066CC',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          }
        ],
        categories: ['productivity', 'business', 'medical'],
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'Acessar o dashboard principal',
            url: '/dashboard',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Inventário',
            short_name: 'Inventário',
            description: 'Ver inventário de equipamentos',
            url: '/inventario',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Ordens de Serviço',
            short_name: 'OS',
            description: 'Ver ordens de serviço',
            url: '/os',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 ano
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 ano
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutos
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 dias
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false // Desabilitar em desenvolvimento para evitar conflitos
      }
    })
  ],
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
      // Ignorar módulos do backend durante o build do frontend
      external: (id) => {
        // Ignorar imports de serviços do backend (incluindo caminhos relativos)
        if (id.includes('prismaService') || 
            id.includes('/services/prismaService') ||
            id.includes('\\services\\prismaService')) {
          return true;
        }
        return false;
      },
    },
  },
  resolve: {
    alias: {
      // Criar um stub para prismaService que sempre retorna null
      // Isso evita que o Vite tente resolver o módulo real durante o build
      '../services/prismaService': path.resolve(__dirname, './src/utils/prismaServiceStub.ts'),
      '../../services/prismaService': path.resolve(__dirname, './src/utils/prismaServiceStub.ts'),
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

