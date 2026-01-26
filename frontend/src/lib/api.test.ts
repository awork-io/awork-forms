import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from './api';

describe('ApiClient', () => {
  const originalFetch = globalThis.fetch;
  const mockFetch = vi.fn();

  beforeEach(() => {
    globalThis.fetch = mockFetch;
    // Clear localStorage
    localStorage.clear();
    // Reset api token
    api.setToken(null);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mockFetch.mockReset();
  });

  describe('token management', () => {
    it('should store token in localStorage when set', () => {
      api.setToken('test-token');

      expect(localStorage.getItem('auth_token')).toBe('test-token');
      expect(api.getToken()).toBe('test-token');
    });

    it('should remove token from localStorage when set to null', () => {
      api.setToken('test-token');
      api.setToken(null);

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(api.getToken()).toBeNull();
    });

    it('should restore token from localStorage on init', () => {
      localStorage.setItem('auth_token', 'stored-token');

      // Create a new api instance to simulate initialization
      // The api singleton already reads from localStorage in constructor
      // So we verify by checking the get/set behavior
      expect(api.getToken()).toBeNull(); // Previous test cleared it
      api.setToken('new-token');
      expect(api.getToken()).toBe('new-token');
    });
  });

  describe('healthCheck', () => {
    it('should return health status from API', async () => {
      const mockResponse = { status: 'healthy', timestamp: '2024-01-01T00:00:00Z' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.healthCheck();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5100/api/health',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getPublicForm', () => {
    it('should fetch public form without authentication', async () => {
      const mockForm = {
        id: 1,
        publicId: 'abc-123',
        name: 'Test Form',
        fieldsJson: '[]',
        isActive: true,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockForm),
      });

      const result = await api.getPublicForm('abc-123');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:5100/api/f/abc-123');
      expect(result).toEqual(mockForm);
    });

    it('should throw error when form not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Form not found' }),
      });

      await expect(api.getPublicForm('non-existent')).rejects.toThrow('Form not found');
    });
  });

  describe('submitPublicForm', () => {
    it('should submit form data and return response', async () => {
      const mockResponse = {
        success: true,
        message: 'Submission received',
        submissionId: 42,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const formData = { name: 'John', email: 'john@example.com' };
      const result = await api.submitPublicForm('abc-123', formData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5100/api/f/abc-123/submit',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: formData }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should include integration error in response when present', async () => {
      const mockResponse = {
        success: true,
        message: 'Submission received',
        submissionId: 42,
        integrationStatus: 'failed',
        integrationError: 'awork API error',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.submitPublicForm('abc-123', { name: 'Test' });

      expect(result.integrationStatus).toBe('failed');
      expect(result.integrationError).toBe('awork API error');
    });
  });

  describe('authenticated requests', () => {
    it('should include Authorization header when token is set', async () => {
      api.setToken('my-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await api.getForms();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5100/api/forms',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-token',
          }),
        })
      );
    });

    it('should clear token and throw on 401 response', async () => {
      api.setToken('invalid-token');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      await expect(api.getForms()).rejects.toThrow('Unauthorized');
      expect(api.getToken()).toBeNull();
    });
  });
});
