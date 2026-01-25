const API_BASE_URL = 'http://localhost:5100';

export interface User {
  id: number;
  email: string;
  name: string;
  avatarUrl?: string;
  workspaceId: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginInitResponse {
  authorizationUrl: string;
  state: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Try to restore token from localStorage
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Merge any additional headers from options
    if (options.headers) {
      const optionHeaders = options.headers as Record<string, string>;
      Object.assign(headers, optionHeaders);
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Clear invalid token
        this.setToken(null);
        throw new Error('Unauthorized');
      }
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async initiateLogin(): Promise<LoginInitResponse> {
    return this.request('/api/auth/login');
  }

  async handleCallback(code: string, state: string): Promise<AuthResponse> {
    return this.request(`/api/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
  }

  async getCurrentUser(): Promise<User> {
    return this.request('/api/auth/me');
  }

  async logout(): Promise<void> {
    await this.request('/api/auth/logout', { method: 'POST' });
    this.setToken(null);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/api/health');
  }
}

export const api = new ApiClient();
