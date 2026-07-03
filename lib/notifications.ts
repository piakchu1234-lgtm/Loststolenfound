const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || ''
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || ''

interface NotificationPayload {
  userIds: string[]
  heading: string
  content: string
  url?: string
  data?: Record<string, any>
}

export async function sendPushNotification(payload: NotificationPayload) {
  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: payload.userIds,
        headings: { en: payload.heading },
        contents: { en: payload.content },
        url: payload.url,
        data: payload.data,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[OneSignal] Send notification error:', data)
      return { success: false, error: data }
    }

    return { success: true, data }
  } catch (error) {
    console.error('[OneSignal] Exception:', error)
    return { success: false, error }
  }
}

// 便捷函数

export async function notifyNewMatch(userId: string, matchData: {
  itemTitle: string
  matchScore: number
  pinId: string
}) {
  return sendPushNotification({
    userIds: [userId],
    heading: 'New Match Found! 🎯',
    content: `We found a ${matchData.matchScore}% match for "${matchData.itemTitle}"`,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/?pin=${matchData.pinId}`,
    data: { type: 'match', pinId: matchData.pinId },
  })
}

export async function notifyClaimReceived(userId: string, claimData: {
  itemTitle: string
  claimerName: string
  claimId: string
}) {
  return sendPushNotification({
    userIds: [userId],
    heading: 'Someone Claimed Your Item! 📦',
    content: `${claimData.claimerName} claimed "${claimData.itemTitle}". Review their evidence.`,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/claims/${claimData.claimId}`,
    data: { type: 'claim_received', claimId: claimData.claimId },
  })
}

export async function notifyClaimApproved(userId: string, claimData: {
  itemTitle: string
  claimId: string
}) {
  return sendPushNotification({
    userIds: [userId],
    heading: 'Claim Approved! ✅',
    content: `Your claim for "${claimData.itemTitle}" was approved. Coordinate the exchange!`,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/claims/${claimData.claimId}`,
    data: { type: 'claim_approved', claimId: claimData.claimId },
  })
}

export async function notifyClaimRejected(userId: string, claimData: {
  itemTitle: string
  reason?: string
}) {
  return sendPushNotification({
    userIds: [userId],
    heading: 'Claim Update',
    content: `Your claim for "${claimData.itemTitle}" was not approved.${claimData.reason ? ` Reason: ${claimData.reason}` : ''}`,
    data: { type: 'claim_rejected' },
  })
}

export async function notifyNewComment(userId: string, commentData: {
  itemTitle: string
  commenterName: string
  pinId: string
}) {
  return sendPushNotification({
    userIds: [userId],
    heading: 'New Comment 💬',
    content: `${commentData.commenterName} commented on "${commentData.itemTitle}"`,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/?pin=${commentData.pinId}`,
    data: { type: 'comment', pinId: commentData.pinId },
  })
}
