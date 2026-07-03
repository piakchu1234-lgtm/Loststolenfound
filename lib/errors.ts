/**
 * Enhanced error types for better error handling
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400, true)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401, true)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Permission denied') {
    super(message, 'AUTHORIZATION_ERROR', 403, true)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND', 404, true)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409, true)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 'RATE_LIMIT', 429, true)
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network error occurred') {
    super(message, 'NETWORK_ERROR', 0, true)
  }
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }

  if (error instanceof Error) {
    // Supabase errors
    if (error.message.includes('JWT')) {
      return 'Your session has expired. Please log in again.'
    }
    if (error.message.includes('violates foreign key constraint')) {
      return 'Cannot perform this action due to related data.'
    }
    if (error.message.includes('duplicate key value')) {
      return 'This item already exists.'
    }
    if (error.message.includes('Network request failed')) {
      return 'Network error. Please check your connection and try again.'
    }

    return error.message
  }

  return 'An unexpected error occurred. Please try again.'
}

/**
 * Check if error should be reported to Sentry
 */
export function shouldReportError(error: unknown): boolean {
  if (error instanceof AppError) {
    return !error.isOperational || error.statusCode >= 500
  }

  return true
}

/**
 * Get error status code
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode
  }

  return 500
}
