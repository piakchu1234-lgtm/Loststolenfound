export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(error: unknown): {
  message: string
  status: number
  code?: string
} {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      status: error.status,
      code: error.code,
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      status: 500,
    }
  }

  return {
    message: 'An unexpected error occurred',
    status: 500,
  }
}

export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return 'Invalid request. Please check your input and try again.'
      case 401:
        return 'You need to be logged in to do this.'
      case 403:
        return 'You don\'t have permission to do this.'
      case 404:
        return 'The item you\'re looking for doesn\'t exist.'
      case 409:
        return 'This action conflicts with existing data.'
      case 429:
        return 'Too many requests. Please wait a moment and try again.'
      case 500:
        return 'Something went wrong on our end. Please try again later.'
      default:
        return error.message
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred. Please try again.'
}
