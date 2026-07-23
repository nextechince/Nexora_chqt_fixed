/**
 * Authentication Manager
 * Handles all auth operations with Supabase + JWT
 */
import API from './api.js';
import Toast from './toast.js';
import { Socket } from './socket.js';

class AuthManager {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.listeners = new Map();
    this.init();
  }

  /**
   * Initialize auth state
   */
  async init() {
    // Check for stored token
    const token = localStorage.getItem('token');
    if (token) {
      API.setToken(token);
      try {
        await this.getCurrentUser();
      } catch {
        // Token invalid, logout
        this.logout();
      }
    }

    // Listen for auth events
    window.addEventListener('auth:logout', () => this.logout());
    window.addEventListener('auth:login', (e) => this.handleLogin(e.detail));
  }

  /**
   * Get current user from API
   */
  async getCurrentUser() {
    try {
      const user = await API.get('/users/me');
      this.user = user;
      this.isAuthenticated = true;
      localStorage.setItem('user', JSON.stringify(user));
      this.emit('authenticated', user);
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Login with phone/email and password
   */
  async login(identifier, password, remember = false) {
    try {
      const data = await API.login({
        identifier,
        password,
        remember
      });

      if (data.requiresOTP) {
        // OTP required
        this.emit('otp_required', { identifier });
        return { requiresOTP: true, identifier };
      }

      await this.handleSuccessfulLogin(data);
      return { success: true, user: this.user };
    } catch (error) {
      Toast.error(error.message || 'Login failed');
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(userData) {
    try {
      const data = await API.register(userData);
      
      if (data.requiresOTP) {
        this.emit('otp_required', { identifier: userData.phone || userData.email });
        return { requiresOTP: true, identifier: userData.phone || userData.email };
      }

      await this.handleSuccessfulLogin(data);
      return { success: true, user: this.user };
    } catch (error) {
      Toast.error(error.message || 'Registration failed');
      throw error;
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(identifier, code) {
    try {
      const data = await API.verifyOTP({
        identifier,
        code
      });

      await this.handleSuccessfulLogin(data);
      return { success: true, user: this.user };
    } catch (error) {
      Toast.error(error.message || 'OTP verification failed');
      throw error;
    }
  }

  /**
   * Resend OTP
   */
  async resendOTP(identifier) {
    try {
      await API.resendOTP(identifier);
      Toast.success('OTP resent successfully');
      return true;
    } catch (error) {
      Toast.error(error.message || 'Failed to resend OTP');
      throw error;
    }
  }

  /**
   * Handle successful login
   */
  async handleSuccessfulLogin(data) {
    // Store tokens
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      API.setToken(data.token);
    }

    // Get user data
    await this.getCurrentUser();

    // Connect socket
    Socket.connect(data.token);

    this.emit('login', this.user);
    Toast.success(`Welcome ${this.user.display_name || 'User'}!`);
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await API.logout();
    } catch {
      // Ignore
    }

    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    this.user = null;
    this.isAuthenticated = false;
    API.setToken(null);
    Socket.disconnect();

    this.emit('logout');
    Toast.info('Logged out successfully');
    
    // Redirect to login
    window.dispatchEvent(new CustomEvent('navigate', { 
      detail: { page: 'login' } 
    }));
  }

  /**
   * Forgot password
   */
  async forgotPassword(identifier) {
    try {
      await API.post('/auth/forgot-password', { identifier });
      Toast.success('Password reset instructions sent');
      return true;
    } catch (error) {
      Toast.error(error.message || 'Failed to send reset instructions');
      throw error;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(token, newPassword) {
    try {
      await API.post('/auth/reset-password', { token, newPassword });
      Toast.success('Password reset successfully');
      return true;
    } catch (error) {
      Toast.error(error.message || 'Failed to reset password');
      throw error;
    }
  }

  /**
   * Change password (authenticated)
   */
  async changePassword(oldPassword, newPassword) {
    try {
      await API.post('/auth/change-password', { oldPassword, newPassword });
      Toast.success('Password changed successfully');
      return true;
    } catch (error) {
      Toast.error(error.message || 'Failed to change password');
      throw error;
    }
  }

  /**
   * Update profile
   */
  async updateProfile(data) {
    try {
      const user = await API.put('/users/profile', data);
      this.user = user;
      localStorage.setItem('user', JSON.stringify(user));
      this.emit('profile_updated', user);
      Toast.success('Profile updated');
      return user;
    } catch (error) {
      Toast.error(error.message || 'Failed to update profile');
      throw error;
    }
  }

  /**
   * Upload avatar
   */
  async uploadAvatar(file) {
    try {
      const data = await API.upload('/media/avatar', file);
      this.user.avatar_url = data.url;
      localStorage.setItem('user', JSON.stringify(this.user));
      this.emit('avatar_updated', data.url);
      Toast.success('Avatar updated');
      return data.url;
    } catch (error) {
      Toast.error(error.message || 'Failed to upload avatar');
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.isAuthenticated && !!this.user;
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * Check if user has premium
   */
  isPremium() {
    return this.user?.is_premium || false;
  }

  /**
   * Check if user is verified
   */
  isVerified() {
    return this.user?.is_verified || false;
  }

  /**
   * Event system
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }
}

// Export singleton
export const Auth = new AuthManager();
export default Auth;
