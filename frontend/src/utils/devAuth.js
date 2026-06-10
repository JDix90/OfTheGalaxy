/**
 * Development Authentication Helper
 * Automatically sets a test token in development mode
 * 
 * This is for development only. In production, use proper authentication.
 */

import { setAuthToken } from '../services/api/client';

// Test token for development (expires in 7 days)
// Generate a new one with: cd backend && node src/utils/generateTestToken.js
const DEV_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3NjQwMjk4NDcsImV4cCI6MTc2NDYzNDY0N30.J0jf23B0e2TPykQ-h6vc2UKH6n-_oOzkMCBOQUMkHX4';

/**
 * Initialize development authentication
 * Sets a test token if in development mode and no token exists
 */
export const initDevAuth = () => {
  // Only in development
  if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
    const existingToken = localStorage.getItem('auth_token');
    
    if (!existingToken) {
      console.log('🔧 Development Mode: Setting test authentication token');
      console.log('⚠️  This is for development only. In production, use proper authentication.');
      setAuthToken(DEV_TOKEN);
    }
  }
};

/**
 * Clear development token
 */
export const clearDevAuth = () => {
  localStorage.removeItem('auth_token');
  console.log('Development token cleared');
};


