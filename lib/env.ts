function getEnvVar(key: string, required: boolean = true): string {
  const value = process.env[key]
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value || ''
}

export const env = {
  supabase: {
    url: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
  },
  mapbox: {
    token: getEnvVar('NEXT_PUBLIC_MAPBOX_TOKEN'),
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    env: process.env.NODE_ENV || 'development',
    isProd: process.env.NODE_ENV === 'production',
    isDev: process.env.NODE_ENV === 'development',
  },
} as const

// Validate on server startup
if (typeof window === 'undefined') {
  try {
    console.log('✅ Environment variables validated successfully')
    console.log(`📍 Environment: ${env.app.env}`)
    console.log(`🌐 App URL: ${env.app.url}`)
  } catch (error) {
    console.error('❌ Environment validation failed:', error)
    throw error
  }
}

export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_MAPBOX_TOKEN',
  ]

  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.join('\n')}`
    )
  }
}
