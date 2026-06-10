/**
 * Centralized Error Handler
 * Provides consistent error handling and user-friendly error messages
 */

/**
 * Get user-friendly error message from error object
 */
export function getErrorMessage(error) {
  if (!error) {
    return 'An unexpected error occurred';
  }

  // Handle error objects with message property
  if (error.message) {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }

    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('401')) {
      return 'You need to log in to perform this action.';
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return 'You do not have permission to perform this action.';
    }

    // Not found errors
    if (message.includes('not found') || message.includes('404')) {
      return 'The requested resource was not found.';
    }

    // Server errors
    if (message.includes('server error') || message.includes('500')) {
      return 'Server error. Please try again later.';
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Invalid input. Please check your data and try again.';
    }

    // Conflict errors
    if (message.includes('conflict') || message.includes('409')) {
      return 'This action conflicts with the current state.';
    }

    // Return the original message if it's user-friendly
    if (error.message.length < 100 && !error.message.includes('Error:')) {
      return error.message;
    }
  }

  // Handle error response objects
  if (error.response) {
    const { data, status } = error.response;

    if (data?.message) {
      return data.message;
    }

    if (data?.error) {
      return data.error;
    }

    if (status === 400) {
      return 'Invalid request. Please check your input.';
    }

    if (status === 401) {
      return 'You need to log in to perform this action.';
    }

    if (status === 403) {
      return 'You do not have permission to perform this action.';
    }

    if (status === 404) {
      return 'The requested resource was not found.';
    }

    if (status === 409) {
      return 'This action conflicts with the current state.';
    }

    if (status >= 500) {
      return 'Server error. Please try again later.';
    }
  }

  // Default message
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Log error with context
 */
export function logError(error, context = {}) {
  const errorMessage = getErrorMessage(error);
  const errorDetails = {
    message: errorMessage,
    originalError: error,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  console.error('Error occurred:', errorDetails);

  // Send to error reporting service if configured
  if (window.errorReportingService) {
    window.errorReportingService.captureException(error, {
      extra: context
    });
  }

  return errorMessage;
}

/**
 * Handle error and return user-friendly message
 */
export function handleError(error, context = {}) {
  return logError(error, context);
}

/**
 * Create error object with user-friendly message
 */
export function createError(message, originalError = null) {
  const error = new Error(message);
  if (originalError) {
    error.originalError = originalError;
    error.stack = originalError.stack;
  }
  return error;
}


