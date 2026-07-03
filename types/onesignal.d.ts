interface Window {
  OneSignal: any[] & {
    init: (config: any) => void
    setExternalUserId: (userId: string) => Promise<void>
    showNativePrompt: () => Promise<void>
    setSubscription: (subscribed: boolean) => void
    isPushNotificationsSupported: () => Promise<boolean>
    getNotificationPermission: () => Promise<string>
    push: (callback: () => void) => void
  }
}
