export const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ''

export function initOneSignal() {
  if (typeof window === 'undefined') return

  window.OneSignal = window.OneSignal || []

  window.OneSignal.push(function() {
    window.OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      safari_web_id: process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_ID,
      notifyButton: {
        enable: false, // 我们会创建自定义按钮
      },
      allowLocalhostAsSecureOrigin: true,
    })
  })
}

export async function subscribeToNotifications(userId: string) {
  if (typeof window === 'undefined') return

  try {
    await window.OneSignal.push(async function() {
      await window.OneSignal.setExternalUserId(userId)
      await window.OneSignal.showNativePrompt()
    })

    return true
  } catch (error) {
    console.error('[OneSignal] Subscribe error:', error)
    return false
  }
}

export async function unsubscribeFromNotifications() {
  if (typeof window === 'undefined') return

  try {
    await window.OneSignal.push(function() {
      window.OneSignal.setSubscription(false)
    })
    return true
  } catch (error) {
    console.error('[OneSignal] Unsubscribe error:', error)
    return false
  }
}

export async function isSubscribed(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  try {
    const isPushSupported = await window.OneSignal.isPushNotificationsSupported()
    if (!isPushSupported) return false

    const permissionGranted = await window.OneSignal.getNotificationPermission()
    return permissionGranted === 'granted'
  } catch (error) {
    return false
  }
}
