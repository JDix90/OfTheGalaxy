/**
 * Main Entry Point
 * Renders the React application
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { useAuthStore } from './state/authSlice';

// Check authentication on app load
const checkAuthOnLoad = () => {
  const { checkAuth } = useAuthStore.getState();
  checkAuth();
};

// Listen for unauthorized events
window.addEventListener('auth:unauthorized', () => {
  const { logout } = useAuthStore.getState();
  logout();
});

// Initialize auth check
checkAuthOnLoad();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
