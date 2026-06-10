/**
 * Loading Spinner Component
 * Reusable loading spinner with customizable size and message
 */

import React from 'react';
import './LoadingSpinner.css';

export default function LoadingSpinner({ 
  size = 'medium', 
  message = 'Loading...', 
  fullScreen = false,
  className = '' 
}) {
  const sizeClass = `spinner-${size}`;
  const containerClass = fullScreen ? 'loading-fullscreen' : 'loading-container';

  return (
    <div className={`${containerClass} ${className}`}>
      <div className={`spinner ${sizeClass}`}>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}


