'use client'

import Script from 'next/script'
import { useEffect } from 'react'

export function GoogleAnalytics() {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || []

    function gtag(...args: any[]) {
      window.dataLayer.push(args)
    }

    gtag('js', new Date())
    gtag('config', GA_MEASUREMENT_ID, {
      page_path: window.location.pathname,
    })
  }, [GA_MEASUREMENT_ID])

  if (!GA_MEASUREMENT_ID) {
    return null
  }

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      strategy="afterInteractive"
    />
  )
}
