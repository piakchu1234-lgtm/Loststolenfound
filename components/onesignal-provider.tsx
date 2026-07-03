'use client'

import { useEffect } from 'react'
import { initOneSignal } from '@/lib/onesignal'

export function OneSignalProvider() {
  useEffect(() => {
    // 只在客户端且有 App ID 时初始化
    if (process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) {
      initOneSignal()
    }
  }, [])

  return null
}
