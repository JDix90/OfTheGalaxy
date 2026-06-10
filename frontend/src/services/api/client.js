/**
 * API Client
 * Axios instance with interceptors for authentication and error handling
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Set authentication token
 */
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('auth_token', token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('auth_token');
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

/**
 * Get authentication token
 */
export const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

/**
 * Clear authentication token
 */
export const clearAuthToken = () => {
  localStorage.removeItem('auth_token');
  delete apiClient.defaults.headers.common['Authorization'];
};

// Initialize token from localStorage on load
const savedToken = localStorage.getItem('auth_token');
if (savedToken) {
  setAuthToken(savedToken);
}

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response.data; // Return just the data
  },
  (error) => {
    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      if (status === 401) {
        // Unauthorized - clear token
        clearAuthToken();
        // Dispatch custom event for auth store to handle
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        throw new Error('Authentication required. Please login.');
      }
      
      if (status === 403) {
        // Forbidden
        throw new Error('You do not have permission to perform this action');
      }
      
      if (status === 404) {
        // Not found
        throw new Error(data.message || 'Resource not found');
      }
      
      if (status === 409) {
        // Conflict - resource already exists (expected in race conditions)
        // Return a special error that can be handled gracefully
        const conflictError = new Error(data.message || 'Resource already exists');
        conflictError.status = 409;
        conflictError.response = error.response;
        throw conflictError;
      }
      
      if (status === 500) {
        // Server error
        throw new Error('Server error. Please try again later.');
      }
      
      // Validation errors (400)
      if (status === 400 && data.message) {
        const errorMessage = Array.isArray(data.errors) 
          ? data.errors.map(e => e.message || `${e.field}: ${e.message}`).join(', ')
          : data.message;
        const error = new Error(errorMessage);
        error.response = error.response;
        error.status = status;
        throw error;
      }
      
      // Other errors
      throw new Error(data.message || 'An error occurred');
    } else if (error.request) {
      // Request made but no response
      throw new Error('No response from server. Please check your connection.');
    } else {
      // Something else happened
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
);
