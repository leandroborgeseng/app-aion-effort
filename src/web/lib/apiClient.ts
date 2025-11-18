// src/web/lib/apiClient.ts
import toast from 'react-hot-toast';

interface RequestConfig extends RequestInit {
  skipAuth?: boolean;
  skipErrorToast?: boolean;
}

class ApiClient {
  private baseURL: string = '';

  constructor() {
    // Em desenvolvimento, usar proxy do Vite
    this.baseURL = import.meta.env.PROD ? '' : '';
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { skipAuth = false, skipErrorToast = false, ...fetchConfig } = config;

    // Adicionar token de autenticação
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchConfig.headers,
    };

    if (token && !skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...fetchConfig,
        headers,
      });

      // Tratar erros de autenticação
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      // Tratar erros de autorização
      if (response.status === 403) {
        if (!skipErrorToast) {
          toast.error('Você não tem permissão para realizar esta ação.');
        }
        throw new Error('Acesso negado');
      }

      // Tratar outros erros
      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            message: `Erro ${response.status}: ${response.statusText}`,
          };
        }

        const errorMessage = errorData.message || errorData.error?.message || `Erro ${response.status}`;
        
        if (!skipErrorToast) {
          toast.error(errorMessage);
        }

        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error: any) {
      // Erros de rede
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        if (!skipErrorToast) {
          toast.error('Erro de conexão. Verifique sua internet.');
        }
        throw new Error('Erro de conexão');
      }

      throw error;
    }
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export default apiClient;

