// src/lib/effortClient.ts
import axios from 'axios';
import { getTokenForEndpoint } from './apiTokens';

// Garantir que dotenv está carregado
if (typeof require !== 'undefined') {
  try {
    require('dotenv').config();
  } catch (e) {
    // Ignorar se dotenv não estiver disponível
  }
}

const baseURL = process.env.EFFORT_BASE_URL || 'https://sjh.globalthings.net';

// Log para debug
if (process.env.NODE_ENV === 'development') {
  console.log('[effortClient] Base URL:', baseURL);
}

export const effort = axios.create({ baseURL, timeout: 30000 });

effort.interceptors.request.use((config) => {
  // Obtém o token específico para o endpoint
  const token = getTokenForEndpoint(config.url || '');
  
  config.headers = config.headers || {};
  
  // Alguns endpoints usam X-API-KEY; /oficina usa API-KEY
  if (config.url?.includes('/api/pbi/v1/oficina')) {
    (config.headers as any)['API-KEY'] = token;
  } else {
    (config.headers as any)['X-API-KEY'] = token;
  }
  
  // Log para debug (apenas em desenvolvimento)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[effortClient] ${config.method?.toUpperCase()} ${config.url}`);
    console.log(`[effortClient] Token configurado: ${token ? 'Sim' : 'Não'}`);
  }
  
  return config;
});

// Interceptor de resposta para melhor tratamento de erros
effort.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('[effortClient] Erro na resposta:', {
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config?.url,
        data: error.response.data,
      });
    } else if (error.request) {
      console.error('[effortClient] Erro na requisição:', {
        message: error.message,
        code: error.code,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      });
      
      // Tratamento específico para erros DNS
      if (error.code === 'ENOTFOUND' || error.message?.includes('getaddrinfo ENOTFOUND')) {
        console.error('[effortClient] ⚠️ Erro DNS - Não foi possível resolver o hostname:', baseURL);
        console.error('[effortClient] Verifique:');
        console.error('[effortClient] 1. Se o domínio está correto:', baseURL);
        console.error('[effortClient] 2. Se há conectividade de rede');
        console.error('[effortClient] 3. Se há firewall bloqueando');
        console.error('[effortClient] 4. Se o servidor DNS está acessível');
      }
    } else {
      console.error('[effortClient] Erro:', error.message);
    }
    return Promise.reject(error);
  }
);

// Transformação de arrays "multi"
export function toMulti(name: string, values?: (string | number)[]) {
  const params: Record<string, any> = {};
  (values || []).forEach((v) => {
    if (!params[name]) {
      params[name] = [];
    }
    params[name].push(v);
  });
  return params;
}

