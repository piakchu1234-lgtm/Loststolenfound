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

// ============================================
// In-App Notification System
// ============================================

import { supabase } from './supabase';

export interface InAppNotification {
  id: string;
  user_id: string;
  type: 'forum_reply' | 'solution_marked' | 'match_found' | 'claim_update' | 'badge_earned' | 'upvote' | 'milestone';
  title: string;
  message: string;
  link?: string;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Get in-app notifications for current user
 */
export async function getInAppNotifications(limit: number = 20): Promise<InAppNotification[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId,
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase.rpc('mark_all_notifications_read', {
      p_user_id: user.id,
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error marking all as read:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Subscribe to real-time notifications
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notification: InAppNotification) => void
) {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as InAppNotification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Get notification icon based on type
 */
export function getNotificationIcon(type: InAppNotification['type']): string {
  switch (type) {
    case 'forum_reply':
      return '💬';
    case 'solution_marked':
      return '✅';
    case 'match_found':
      return '🔍';
    case 'claim_update':
      return '📦';
    case 'badge_earned':
      return '🏅';
    case 'upvote':
      return '👍';
    case 'milestone':
      return '🎉';
    default:
      return '🔔';
  }
}

/**
 * Get notification color based on type
 */
export function getNotificationColor(type: InAppNotification['type']): string {
  switch (type) {
    case 'forum_reply':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300';
    case 'solution_marked':
      return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300';
    case 'match_found':
      return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300';
    case 'claim_update':
      return 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300';
    case 'badge_earned':
      return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300';
    case 'upvote':
      return 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300';
    case 'milestone':
      return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300';
    default:
      return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';
  }
}
