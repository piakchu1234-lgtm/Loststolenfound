/**
 * Analytics tracking utility functions
 */

// Event categories
export const AnalyticsCategory = {
  REPORT: 'Report',
  MATCH: 'Match',
  CLAIM: 'Claim',
  MESSAGE: 'Message',
  USER: 'User',
  SEARCH: 'Search',
} as const

// Event actions
export const AnalyticsAction = {
  CREATE: 'Create',
  VIEW: 'View',
  UPDATE: 'Update',
  DELETE: 'Delete',
  CLICK: 'Click',
  SUBMIT: 'Submit',
  SEARCH: 'Search',
  SHARE: 'Share',
} as const

/**
 * Track page view
 */
export function trackPageView(path: string, title?: string) {
  if (typeof window === 'undefined') return

  // Google Analytics 4
  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title,
    })
  }
}

/**
 * Track custom event
 */
export function trackEvent(
  category: string,
  action: string,
  label?: string,
  value?: number
) {
  if (typeof window === 'undefined') return

  // Google Analytics 4
  if (window.gtag) {
    window.gtag('event', action.toLowerCase().replace(/\s/g, '_'), {
      event_category: category,
      event_label: label,
      value: value,
    })
  }

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', { category, action, label, value })
  }
}

/**
 * Track report events
 */
export const trackReportCreated = (type: 'lost' | 'found') =>
  trackEvent(AnalyticsCategory.REPORT, AnalyticsAction.CREATE, type)

export const trackReportViewed = (reportId: string) =>
  trackEvent(AnalyticsCategory.REPORT, AnalyticsAction.VIEW, reportId)

export const trackReportUpdated = (reportId: string) =>
  trackEvent(AnalyticsCategory.REPORT, AnalyticsAction.UPDATE, reportId)

/**
 * Track match events
 */
export const trackMatchViewed = (matchId: string, confidence: number) =>
  trackEvent(AnalyticsCategory.MATCH, AnalyticsAction.VIEW, matchId, confidence)

export const trackMatchClicked = (matchId: string) =>
  trackEvent(AnalyticsCategory.MATCH, AnalyticsAction.CLICK, matchId)

/**
 * Track claim events
 */
export const trackClaimCreated = (claimId: string) =>
  trackEvent(AnalyticsCategory.CLAIM, AnalyticsAction.CREATE, claimId)

export const trackClaimApproved = (claimId: string) =>
  trackEvent(AnalyticsCategory.CLAIM, 'Approve', claimId)

export const trackClaimRejected = (claimId: string) =>
  trackEvent(AnalyticsCategory.CLAIM, 'Reject', claimId)

/**
 * Track message events
 */
export const trackConversationStarted = (conversationId: string) =>
  trackEvent(AnalyticsCategory.MESSAGE, 'Start', conversationId)

export const trackMessageSent = (messageType: string) =>
  trackEvent(AnalyticsCategory.MESSAGE, 'Send', messageType)

/**
 * Track user events
 */
export const trackUserSignUp = (method: string) =>
  trackEvent(AnalyticsCategory.USER, 'Sign Up', method)

export const trackUserLogin = (method: string) =>
  trackEvent(AnalyticsCategory.USER, 'Login', method)

export const trackUserLogout = () =>
  trackEvent(AnalyticsCategory.USER, 'Logout')

/**
 * Track search events
 */
export const trackSearch = (query: string, resultCount: number) =>
  trackEvent(AnalyticsCategory.SEARCH, AnalyticsAction.SEARCH, query, resultCount)

/**
 * Set user properties
 */
export function setUserProperties(properties: {
  userId?: string
  userType?: string
  [key: string]: any
}) {
  if (typeof window === 'undefined') return

  if (window.gtag) {
    window.gtag('set', 'user_properties', properties)
  }
}

/**
 * Track conversion
 */
export function trackConversion(
  conversionId: string,
  value?: number,
  currency: string = 'AUD'
) {
  if (typeof window === 'undefined') return

  if (window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: conversionId,
      value: value,
      currency: currency,
    })
  }
}

// TypeScript declarations
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}
