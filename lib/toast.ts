import { toast } from 'sonner'
import { getUserFriendlyMessage } from './errors'

/**
 * Show success toast
 */
export function showSuccess(message: string) {
  toast.success(message)
}

/**
 * Show error toast
 */
export function showError(error: unknown) {
  const message = getUserFriendlyMessage(error)
  toast.error(message)
}

/**
 * Show info toast
 */
export function showInfo(message: string) {
  toast.info(message)
}

/**
 * Show warning toast
 */
export function showWarning(message: string) {
  toast.warning(message)
}

/**
 * Show loading toast
 */
export function showLoading(message: string) {
  return toast.loading(message)
}

/**
 * Dismiss toast
 */
export function dismissToast(id: string | number) {
  toast.dismiss(id)
}

/**
 * Promise toast - shows loading, then success or error
 */
export function showPromiseToast<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string
    error?: string
  }
) {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error || 'Something went wrong',
  })
}
