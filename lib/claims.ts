import { createClient } from '@/lib/supabase/client'

export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled'

export type ClaimNotificationType =
  | 'claim_received'
  | 'claim_approved'
  | 'claim_rejected'
  | 'claim_completed'
  | 'claim_cancelled'
  | 'more_info_requested'

export interface Claim {
  id: string
  pin_id: string
  claimer_id: string
  claimer_evidence: string
  claimer_photos: string[]
  status: ClaimStatus
  owner_response: string | null
  rejection_reason: string | null
  meeting_location: string | null
  meeting_location_id: string | null
  meeting_time: string | null
  meeting_notes: string | null
  completed_at: string | null
  completed_by: string | null
  created_at: string
  updated_at: string

  // Joined data
  pin?: {
    id: string
    title: string
    description: string | null
    category: string
    image_url: string | null
    user_id: string | null
  }
  claimer?: {
    id: string
    email: string
    display_name: string | null
    avatar_url: string | null
  }
}

export interface ClaimNotification {
  id: string
  claim_id: string
  user_id: string
  notification_type: ClaimNotificationType
  message: string
  read: boolean
  created_at: string
}

export interface ClaimStats {
  total_claims: number
  pending_claims: number
  approved_claims: number
  completed_claims: number
  rejected_claims: number
}

/**
 * Create a new claim for an item
 */
export async function createClaim(params: {
  pinId: string
  evidence: string
  photos?: string[]
}): Promise<{ success: boolean; claim?: Claim; error?: string }> {
  const supabase = createClient()

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'You must be logged in to claim an item' }
    }

    // Verify pin exists and is not owned by user
    const { data: pin, error: pinError } = await supabase
      .from('MapPin')
      .select('id, user_id, status')
      .eq('id', params.pinId)
      .single()

    if (pinError || !pin) {
      return { success: false, error: 'Item not found' }
    }

    if (pin.user_id === user.id) {
      return { success: false, error: 'You cannot claim your own item' }
    }

    if (pin.status === 'resolved') {
      return { success: false, error: 'This item has already been resolved' }
    }

    // Create the claim
    const { data, error } = await supabase
      .from('claims')
      .insert({
        pin_id: params.pinId,
        claimer_id: user.id,
        claimer_evidence: params.evidence,
        claimer_photos: params.photos || [],
      })
      .select()
      .single()

    if (error) {
      console.error('[createClaim] Error:', error)
      return { success: false, error: 'Failed to create claim' }
    }

    return { success: true, claim: data as Claim }
  } catch (err) {
    console.error('[createClaim] Exception:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Get claims for a specific pin
 */
export async function getClaimsForPin(pinId: string): Promise<Claim[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('claims')
      .select(`
        *,
        claimer:profiles!claims_claimer_id_fkey(id, email, display_name, avatar_url)
      `)
      .eq('pin_id', pinId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[getClaimsForPin] Error:', error)
      return []
    }

    return (data || []) as any
  } catch (err) {
    console.error('[getClaimsForPin] Exception:', err)
    return []
  }
}

/**
 * Get user's claims
 */
export async function getUserClaims(userId: string): Promise<Claim[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('claims')
      .select(`
        *,
        pin:MapPin!claims_pin_id_fkey(id, title, description, category, image_url, user_id)
      `)
      .eq('claimer_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[getUserClaims] Error:', error)
      return []
    }

    return (data || []) as any
  } catch (err) {
    console.error('[getUserClaims] Exception:', err)
    return []
  }
}

/**
 * Approve a claim (owner action)
 */
export async function approveClaim(params: {
  claimId: string
  response?: string
  meetingLocation?: string
  meetingTime?: string
  meetingNotes?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('claims')
      .update({
        status: 'approved',
        owner_response: params.response,
        meeting_location: params.meetingLocation,
        meeting_time: params.meetingTime,
        meeting_notes: params.meetingNotes,
      })
      .eq('id', params.claimId)

    if (error) {
      console.error('[approveClaim] Error:', error)
      return { success: false, error: 'Failed to approve claim' }
    }

    return { success: true }
  } catch (err) {
    console.error('[approveClaim] Exception:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Reject a claim (owner action)
 */
export async function rejectClaim(params: {
  claimId: string
  reason?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('claims')
      .update({
        status: 'rejected',
        rejection_reason: params.reason,
      })
      .eq('id', params.claimId)

    if (error) {
      console.error('[rejectClaim] Error:', error)
      return { success: false, error: 'Failed to reject claim' }
    }

    return { success: true }
  } catch (err) {
    console.error('[rejectClaim] Exception:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Complete a claim (both parties confirm)
 */
export async function completeClaim(claimId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'You must be logged in' }
    }

    const { error } = await supabase
      .from('claims')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user.id,
      })
      .eq('id', claimId)

    if (error) {
      console.error('[completeClaim] Error:', error)
      return { success: false, error: 'Failed to complete claim' }
    }

    return { success: true }
  } catch (err) {
    console.error('[completeClaim] Exception:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Cancel a claim (claimer action)
 */
export async function cancelClaim(claimId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('claims')
      .update({
        status: 'cancelled',
      })
      .eq('id', claimId)

    if (error) {
      console.error('[cancelClaim] Error:', error)
      return { success: false, error: 'Failed to cancel claim' }
    }

    return { success: true }
  } catch (err) {
    console.error('[cancelClaim] Exception:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Get claim statistics for a user
 */
export async function getClaimStats(userId: string): Promise<ClaimStats> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.rpc('get_user_claim_stats', {
      p_user_id: userId,
    })

    if (error) {
      console.error('[getClaimStats] Error:', error)
      return {
        total_claims: 0,
        pending_claims: 0,
        approved_claims: 0,
        completed_claims: 0,
        rejected_claims: 0,
      }
    }

    return data[0] || {
      total_claims: 0,
      pending_claims: 0,
      approved_claims: 0,
      completed_claims: 0,
      rejected_claims: 0,
    }
  } catch (err) {
    console.error('[getClaimStats] Exception:', err)
    return {
      total_claims: 0,
      pending_claims: 0,
      approved_claims: 0,
      completed_claims: 0,
      rejected_claims: 0,
    }
  }
}

/**
 * Get claim notifications for current user
 */
export async function getClaimNotifications(): Promise<ClaimNotification[]> {
  const supabase = createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from('claim_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[getClaimNotifications] Error:', error)
      return []
    }

    return (data || []) as ClaimNotification[]
  } catch (err) {
    console.error('[getClaimNotifications] Exception:', err)
    return []
  }
}

/**
 * Mark claim notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('claim_notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (error) {
      console.error('[markNotificationAsRead] Error:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[markNotificationAsRead] Exception:', err)
    return false
  }
}

/**
 * Get status badge color
 */
export function getClaimStatusColor(status: ClaimStatus): {
  bg: string
  text: string
  border: string
} {
  switch (status) {
    case 'pending':
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-900/20',
        text: 'text-yellow-800 dark:text-yellow-400',
        border: 'border-yellow-300 dark:border-yellow-700',
      }
    case 'approved':
      return {
        bg: 'bg-green-100 dark:bg-green-900/20',
        text: 'text-green-800 dark:text-green-400',
        border: 'border-green-300 dark:border-green-700',
      }
    case 'rejected':
      return {
        bg: 'bg-red-100 dark:bg-red-900/20',
        text: 'text-red-800 dark:text-red-400',
        border: 'border-red-300 dark:border-red-700',
      }
    case 'completed':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/20',
        text: 'text-blue-800 dark:text-blue-400',
        border: 'border-blue-300 dark:border-blue-700',
      }
    case 'cancelled':
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-800 dark:text-gray-400',
        border: 'border-gray-300 dark:border-gray-600',
      }
  }
}

/**
 * Get status label
 */
export function getClaimStatusLabel(status: ClaimStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending Review'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    case 'completed':
      return 'Completed'
    case 'cancelled':
      return 'Cancelled'
  }
}
