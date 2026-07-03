import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  environment: process.env.NODE_ENV,

  ignoreErrors: [
    'NetworkError',
    'Network request failed',
    'Failed to fetch',
    'AbortError',
  ],

  beforeSend(event) {
    // Don't send errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Sentry Server]', event)
      return null
    }

    return event
  },
})
