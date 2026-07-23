/**
 * API Client for backend communication
 */
class ApiClient {
  constructor() {
    this.baseURL = process.env.API_URL || '/api';
    this.headers = {
      'Content-Type': 'application/json',
    };
    this.token = null;
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
    if (token) {
      this.headers['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.headers['Authorization'];
    }
  }

  /**
   * Make HTTP request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: { ...this.headers, ...options.headers },
      ...options,
    };

    // Handle FormData
    if (options.body instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    try {
      const response = await fetch(url, config);
      
      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const error = new Error(data.message || data || 'API Error');
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      if (error.status === 401) {
        // Token expired, try refresh
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return this.request(endpoint, options);
        }
        // If refresh fails, redirect to login
        window.dispatchEvent(new CustomEvent('auth:logout'));
        throw new Error('Session expired. Please login again.');
      }
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const url = new URL(`${this.baseURL}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
    return this.request(url.pathname + url.search, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * PATCH request
   */
  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      body: JSON.stringify(data),
    });
  }

  /**
   * Upload file with progress
   */
  async upload(endpoint, file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open('POST', `${this.baseURL}${endpoint}`);
      xhr.setRequestHeader('Authorization', this.headers['Authorization'] || '');

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onProgress(e.loaded / e.total);
          }
        });
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(formData);
    });
  }

  /**
   * Refresh authentication token
   */
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setToken(data.token);
        localStorage.setItem('token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Auth helpers
   */
  async login(credentials) {
    const data = await this.post('/auth/login', credentials);
    if (data.token) {
      this.setToken(data.token);
      localStorage.setItem('token', data.token);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
    }
    return data;
  }

  async register(userData) {
    return this.post('/auth/register', userData);
  }

  async verifyOTP(otpData) {
    const data = await this.post('/auth/verify-otp', otpData);
    if (data.token) {
      this.setToken(data.token);
      localStorage.setItem('token', data.token);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
    }
    return data;
  }

  async resendOTP(identifier) {
    return this.post('/auth/resend-otp', { identifier });
  }

  async logout() {
    try {
      await this.post('/auth/logout');
    } catch {
      // Ignore logout errors
    }
    this.setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  /**
   * Initialize from stored token
   */
  init() {
    const token = localStorage.getItem('token');
    if (token) {
      this.setToken(token);
      return true;
    }
    return false;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated() {
    return !!this.token;
  }
}

// Export singleton
export const API = new ApiClient();
export default API;
