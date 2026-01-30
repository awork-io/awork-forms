const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  workspaceId: string;
  workspaceName?: string;
  workspaceUrl?: string;
}

export interface AuthResponse {
  token?: string;
  user: User;
}

export interface Form {
  id: number;
  publicId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  submissionCount: number;
  fieldCount: number;
}

export interface FormDetail extends Form {
  fieldsJson: string;
  nameTranslations?: Record<string, string>;
  descriptionTranslations?: Record<string, string>;
  actionType?: string;
  aworkProjectId?: string;
  aworkProjectTypeId?: string;
  aworkTaskListId?: string;
  aworkTaskStatusId?: string;
  aworkTypeOfWorkId?: string;
  aworkAssigneeId?: string;
  aworkTaskIsPriority?: boolean;
  aworkTaskTag?: string;
  fieldMappingsJson?: string;
  primaryColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
}

export interface CreateFormDto {
  name: string;
  description?: string;
  nameTranslations?: Record<string, string>;
  descriptionTranslations?: Record<string, string>;
  fieldsJson?: string;
  actionType?: string;
  aworkProjectId?: string;
  aworkProjectTypeId?: string;
  aworkTaskListId?: string;
  aworkTaskStatusId?: string;
  aworkTypeOfWorkId?: string;
  aworkAssigneeId?: string;
  aworkTaskIsPriority?: boolean;
  aworkTaskTag?: string;
  fieldMappingsJson?: string;
  primaryColor?: string;
  backgroundColor?: string;
  isActive?: boolean;
}

export interface UpdateFormDto {
  name?: string;
  description?: string;
  nameTranslations?: Record<string, string>;
  descriptionTranslations?: Record<string, string>;
  fieldsJson?: string;
  actionType?: string;
  aworkProjectId?: string;
  aworkProjectTypeId?: string;
  aworkTaskListId?: string;
  aworkTaskStatusId?: string;
  aworkTypeOfWorkId?: string;
  aworkAssigneeId?: string;
  aworkTaskIsPriority?: boolean;
  aworkTaskTag?: string;
  fieldMappingsJson?: string;
  primaryColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
  isActive?: boolean;
}

export interface LoginInitResponse {
  authorizationUrl: string;
  state: string;
}

// awork API types
export interface AworkProject {
  id: string;
  name: string;
  description?: string;
  projectTypeId?: string;
  projectStatusId?: string;
  startDate?: string;
  dueDate?: string;
  isBillableByDefault: boolean;
  color?: string;
}

export interface AworkProjectType {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isPreset: boolean;
}

export interface AworkUser {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  position?: string;
  profileImage?: string;
  isExternal: boolean;
  isArchived: boolean;
}

export interface AworkProjectStatus {
  id: string;
  name: string;
  type: string;
  order: number;
}

export interface AworkTaskStatus {
  id: string;
  name: string;
  type: string;
  order: number;
}

export interface AworkTaskList {
  id: string;
  name: string;
  order: number;
  orderOfNewTasks: number;
}

export interface AworkTypeOfWork {
  id: string;
  name: string;
  icon?: string;
  isArchived: boolean;
}

export interface AworkCustomFieldDefinition {
  id: string;
  name: string;
  type: string; // text, number, date, datetime, select, coloredSelect, link, boolean, user
  entity?: string;
  isRequired: boolean;
  isArchived: boolean;
  selectionOptions?: AworkCustomFieldSelectionOption[];
}

export interface AworkCustomFieldSelectionOption {
  id: string;
  value: string;
  order: number;
  color?: string;
}

// Public form types (no auth required)
export interface PublicForm {
  id: number;
  publicId: string;
  name: string;
  description?: string;
  nameTranslations?: Record<string, string>;
  descriptionTranslations?: Record<string, string>;
  fieldsJson: string;
  primaryColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
  isActive: boolean;
}

export interface SubmissionResponse {
  success: boolean;
  message: string;
  submissionId: number;
  aworkProjectId?: string;
  aworkTaskId?: string;
  integrationStatus?: 'completed' | 'failed';
  integrationError?: string;
}

export interface Submission {
  id: number;
  formId: number;
  formName: string;
  dataJson: string;
  status: 'pending' | 'completed' | 'failed';
  aworkProjectId?: string;
  aworkTaskId?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = null;
  }

  setToken(token: string | null) {
    this.token = token;
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

  // Forms endpoints
  async getForms(): Promise<Form[]> {
    return this.request('/api/forms');
  }

  async getForm(id: number): Promise<FormDetail> {
    return this.request(`/api/forms/${id}`);
  }

  async createForm(data: CreateFormDto): Promise<FormDetail> {
    return this.request('/api/forms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateForm(id: number, data: UpdateFormDto): Promise<FormDetail> {
    return this.request(`/api/forms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteForm(id: number): Promise<{ message: string }> {
    return this.request(`/api/forms/${id}`, {
      method: 'DELETE',
    });
  }

  // awork API proxy endpoints
  async getAworkProjects(): Promise<AworkProject[]> {
    return this.request('/api/awork/projects');
  }

  async getAworkProjectTypes(): Promise<AworkProjectType[]> {
    return this.request('/api/awork/projecttypes');
  }

  async getAworkUsers(): Promise<AworkUser[]> {
    return this.request('/api/awork/users');
  }

  async getAworkProjectStatuses(projectTypeId: string): Promise<AworkProjectStatus[]> {
    return this.request(`/api/awork/projecttypes/${projectTypeId}/projectstatuses`);
  }

  async getAworkTaskStatuses(projectId: string): Promise<AworkTaskStatus[]> {
    return this.request(`/api/awork/projects/${projectId}/taskstatuses`);
  }

  async getAworkTaskLists(projectId: string): Promise<AworkTaskList[]> {
    return this.request(`/api/awork/projects/${projectId}/tasklists`);
  }

  async getAworkTypesOfWork(): Promise<AworkTypeOfWork[]> {
    return this.request('/api/awork/typesofwork');
  }

  async getAworkCustomFields(projectId: string): Promise<AworkCustomFieldDefinition[]> {
    return this.request(`/api/awork/projects/${projectId}/customfields`);
  }

  async getAworkTaskCustomFields(): Promise<AworkCustomFieldDefinition[]> {
    return this.request('/api/awork/customfields/tasks');
  }

  // Logo upload endpoints
  async uploadLogo(formId: number, file: File): Promise<{ logoUrl: string }> {
    const url = `${API_BASE_URL}/api/forms/${formId}/logo`;
    const formData = new FormData();
    formData.append('logo', file);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.setToken(null);
        throw new Error('Unauthorized');
      }
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async deleteLogo(formId: number): Promise<{ message: string }> {
    return this.request(`/api/forms/${formId}/logo`, {
      method: 'DELETE',
    });
  }

  // Submissions endpoints
  async getSubmissions(): Promise<Submission[]> {
    return this.request('/api/submissions');
  }

  async getFormSubmissions(formId: number): Promise<Submission[]> {
    return this.request(`/api/forms/${formId}/submissions`);
  }

  // Public form endpoints (no auth required)
  async getPublicForm(publicId: string): Promise<PublicForm> {
    const url = `${API_BASE_URL}/api/f/${publicId}`;
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Form not found' }));
      throw new Error(error.error || 'Form not found');
    }

    return response.json();
  }

  async submitPublicForm(publicId: string, data: Record<string, unknown>): Promise<SubmissionResponse> {
    const url = `${API_BASE_URL}/api/f/${publicId}/submit`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Submission failed' }));
      throw new Error(error.error || 'Submission failed');
    }

    return response.json();
  }

  async uploadPublicFile(publicId: string, file: File): Promise<{ fileName: string; fileUrl: string; fileSize: number }> {
    const url = `${API_BASE_URL}/api/f/${publicId}/upload`;
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }
}

export const api = new ApiClient();
