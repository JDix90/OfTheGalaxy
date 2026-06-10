/**
 * Auth Store
 * Zustand store for authentication state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authApi from '../services/api/authApi';
import { setAuthToken, clearAuthToken } from '../services/api/client';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      /**
       * Register a new user
       */
      register: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(email, password);
          const { user, token } = response.data || response;

          // Store token
          setAuthToken(token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          return { success: true, user, token };
        } catch (error) {
          const errorMessage = error.message || 'Registration failed';
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false
          });
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Login user
       */
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          const { user, token } = response.data || response;

          // Store token
          setAuthToken(token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          return { success: true, user, token };
        } catch (error) {
          const errorMessage = error.message || 'Login failed';
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false
          });
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Logout user
       */
      logout: () => {
        clearAuthToken();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        });
      },

      /**
       * Check if user is authenticated (verify token)
       */
      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return false;
        }

        set({ isLoading: true });
        try {
          // Verify token and get current user
          const userResponse = await authApi.getCurrentUser();
          const user = userResponse.data || userResponse;

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          return true;
        } catch (error) {
          // Token is invalid or expired
          clearAuthToken();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
          return false;
        }
      },

      /**
       * Clear error
       */
      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export { useAuthStore };


