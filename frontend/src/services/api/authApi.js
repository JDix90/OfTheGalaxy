/**
 * Auth API Client
 * Frontend API service for authentication
 */

import { apiClient } from './client';

const authApi = {
  /**
   * Register a new user
   */
  async register(email, password) {
    return await apiClient.post('/auth/register', {
      email,
      password
    });
  },

  /**
   * Login user
   */
  async login(email, password) {
    return await apiClient.post('/auth/login', {
      email,
      password
    });
  },

  /**
   * Get current user
   */
  async getCurrentUser() {
    return await apiClient.get('/auth/me');
  },

  /**
   * Verify token
   */
  async verifyToken(token) {
    return await apiClient.post('/auth/verify', { token });
  }
};

export default authApi;


