import { AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react'

type MessageType = 'error' | 'warning' | 'info' | 'success'

interface ErrorMessageProps {
  type?: MessageType
  title?: string
  message: string
  onRetry?: () => void
}

const typeConfig = {
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    textColor: 'text-red-900 dark:text-red-300',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    textColor: 'text-yellow-900 dark:text-yellow-300',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-900 dark:text-blue-300',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    textColor: 'text-green-900 dark:text-green-300',
    iconColor: 'text-green-600 dark:text-green-400',
  },
}

export function ErrorMessage({
  type = 'error',
  title,
  message,
  onRetry,
}: ErrorMessageProps) {
  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <div className={`rounded-lg p-4 ${config.bgColor}`}>
      <div className="flex gap-3">
        <Icon className={`h-5 w-5 ${config.iconColor} shrink-0 mt-0.5`} />
        <div className="flex-1">
          {title && (
            <h3 className={`font-semibold ${config.textColor} mb-1`}>
              {title}
            </h3>
          )}
          <p className={`text-sm ${config.textColor}`}>{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className={`mt-2 text-sm font-medium ${config.textColor} underline hover:no-underline`}
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
