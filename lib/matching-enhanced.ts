import { createClient } from '@/lib/supabase/client'

export type MatchableCategory =
  | 'lost_property'
  | 'found_property'
  | 'missing_pet'
  | 'found_pet'
  | 'stolen_vehicle'
  | 'break_in'
  | 'suspicious_activity'

export type MatchConfidence = 'high' | 'medium' | 'low'

export type MatchStatus =
  | 'pending'
  | 'viewed'
  | 'contacted'
  | 'claimed'
  | 'rejected'
  | 'expired'

export interface PotentialMatch {
  id: string
  lost_item_id: string
  found_item_id: string
  keyword_score: number
  location_score: number
  time_score: number
  overall_score: number
  confidence: MatchConfidence
  status: MatchStatus
  distance_km: number
  time_diff_hours: number
  category_match: boolean
  matching_keywords: string[]
  created_at: string
  updated_at: string

  // Joined data
  lost_item?: MatchPin
  found_item?: MatchPin
}

export interface MatchPin {
  id: string
  title: string
  description: string | null
  category: MatchableCategory
  latitude: number
  longitude: number
  image_url: string | null
  status: string | null
  created_at: string
  user_id: string | null
}

const OPPOSITE_CATEGORY: Partial<
  Record<MatchableCategory, MatchableCategory>
> = {
  lost_property: 'found_property',
  found_property: 'lost_property',
  missing_pet: 'found_pet',
  found_pet: 'missing_pet',
}

export function getOppositeCategory(
  category: MatchableCategory,
): MatchableCategory | null {
  return OPPOSITE_CATEGORY[category] ?? null
}

/**
 * Find potential matches for a given pin
 * @param pinId - The pin ID to find matches for
 * @param minScore - Minimum overall score threshold (default: 30)
 * @returns Array of potential matches with scores
 */
export async function findPotentialMatches(
  pinId: string,
  minScore: number = 30
): Promise<PotentialMatch[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .rpc('find_potential_matches', { target_pin_id: pinId })

    if (error) {
      console.error('[findPotentialMatches]', error)
      return []
    }

    // Filter by minimum score
    return (data || []).filter((match: any) => match.overall_score >= minScore)
  } catch (err) {
    console.error('[findPotentialMatches] Exception:', err)
    return []
  }
}

/**
 * Get existing matches for a pin
 * @param pinId - The pin ID
 * @param includeItems - Whether to include full item details
 * @returns Array of potential matches
 */
export async function getMatchesForPin(
  pinId: string,
  includeItems: boolean = true
): Promise<PotentialMatch[]> {
  const supabase = createClient()

  try {
    let query = supabase
      .from('potential_matches')
      .select(includeItems ? `
        *,
        lost_item:MapPin!potential_matches_lost_item_id_fkey(*),
        found_item:MapPin!potential_matches_found_item_id_fkey(*)
      ` : '*')
      .or(`lost_item_id.eq.${pinId},found_item_id.eq.${pinId}`)
      .order('overall_score', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('[getMatchesForPin]', error)
      return []
    }

    return (data || []) as any
  } catch (err) {
    console.error('[getMatchesForPin] Exception:', err)
    return []
  }
}

/**
 * Get high-confidence matches for a pin
 * @param pinId - The pin ID
 * @returns Array of high-confidence matches (score >= 70)
 */
export async function getHighConfidenceMatches(
  pinId: string
): Promise<PotentialMatch[]> {
  const matches = await getMatchesForPin(pinId, true)
  return matches.filter(m => m.confidence === 'high' && m.status === 'pending')
}

/**
 * Update match status
 * @param matchId - The match ID
 * @param status - New status
 * @returns Success boolean
 */
export async function updateMatchStatus(
  matchId: string,
  status: MatchStatus
): Promise<boolean> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .rpc('update_match_status', {
        match_id: matchId,
        new_status: status
      })

    if (error) {
      console.error('[updateMatchStatus]', error)
      return false
    }

    return data === true
  } catch (err) {
    console.error('[updateMatchStatus] Exception:', err)
    return false
  }
}

/**
 * Mark match as viewed
 * @param matchId - The match ID
 */
export async function markMatchAsViewed(matchId: string): Promise<void> {
  await updateMatchStatus(matchId, 'viewed')
}

/**
 * Mark match as contacted
 * @param matchId - The match ID
 */
export async function markMatchAsContacted(matchId: string): Promise<void> {
  await updateMatchStatus(matchId, 'contacted')
}

/**
 * Reject a match
 * @param matchId - The match ID
 */
export async function rejectMatch(matchId: string): Promise<void> {
  await updateMatchStatus(matchId, 'rejected')
}

/**
 * Get match statistics for a user
 * @param userId - User ID
 * @returns Match statistics
 */
export async function getMatchStatistics(userId: string): Promise<{
  total: number
  high_confidence: number
  medium_confidence: number
  low_confidence: number
  pending: number
  contacted: number
  claimed: number
}> {
  const supabase = createClient()

  try {
    // Get all user's pins
    const { data: pins, error: pinsError } = await supabase
      .from('MapPin')
      .select('id')
      .eq('user_id', userId)

    if (pinsError || !pins) {
      return {
        total: 0,
        high_confidence: 0,
        medium_confidence: 0,
        low_confidence: 0,
        pending: 0,
        contacted: 0,
        claimed: 0
      }
    }

    const pinIds = pins.map(p => p.id)

    // Get all matches for these pins
    const { data: matches, error: matchesError } = await supabase
      .from('potential_matches')
      .select('confidence, status')
      .or(pinIds.map(id => `lost_item_id.eq.${id},found_item_id.eq.${id}`).join(','))

    if (matchesError || !matches) {
      return {
        total: 0,
        high_confidence: 0,
        medium_confidence: 0,
        low_confidence: 0,
        pending: 0,
        contacted: 0,
        claimed: 0
      }
    }

    return {
      total: matches.length,
      high_confidence: matches.filter(m => m.confidence === 'high').length,
      medium_confidence: matches.filter(m => m.confidence === 'medium').length,
      low_confidence: matches.filter(m => m.confidence === 'low').length,
      pending: matches.filter(m => m.status === 'pending').length,
      contacted: matches.filter(m => m.status === 'contacted').length,
      claimed: matches.filter(m => m.status === 'claimed').length
    }
  } catch (err) {
    console.error('[getMatchStatistics] Exception:', err)
    return {
      total: 0,
      high_confidence: 0,
      medium_confidence: 0,
      low_confidence: 0,
      pending: 0,
      contacted: 0,
      claimed: 0
    }
  }
}

/**
 * Calculate distance between two coordinates (client-side)
 * @param lat1 - Latitude 1
 * @param lon1 - Longitude 1
 * @param lat2 - Latitude 2
 * @param lon2 - Longitude 2
 * @returns Distance in km
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Format distance for display
 * @param distanceKm - Distance in km
 * @returns Formatted string
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m away`
  }
  return `${distanceKm.toFixed(1)}km away`
}

/**
 * Format time difference for display
 * @param hours - Time difference in hours
 * @returns Formatted string
 */
export function formatTimeDifference(hours: number): string {
  if (hours < 1) {
    return 'Less than an hour apart'
  } else if (hours < 24) {
    return `${Math.round(hours)} hours apart`
  } else {
    const days = Math.round(hours / 24)
    return `${days} day${days === 1 ? '' : 's'} apart`
  }
}

/**
 * Get match confidence color
 * @param confidence - Confidence level
 * @returns Tailwind color classes
 */
export function getConfidenceColor(confidence: MatchConfidence): {
  bg: string
  text: string
  border: string
} {
  switch (confidence) {
    case 'high':
      return {
        bg: 'bg-green-100 dark:bg-green-900/20',
        text: 'text-green-800 dark:text-green-400',
        border: 'border-green-300 dark:border-green-700'
      }
    case 'medium':
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-900/20',
        text: 'text-yellow-800 dark:text-yellow-400',
        border: 'border-yellow-300 dark:border-yellow-700'
      }
    case 'low':
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-800 dark:text-gray-400',
        border: 'border-gray-300 dark:border-gray-600'
      }
  }
}

/**
 * Get match confidence label
 * @param confidence - Confidence level
 * @returns Human-readable label
 */
export function getConfidenceLabel(confidence: MatchConfidence): string {
  switch (confidence) {
    case 'high':
      return 'High Match'
    case 'medium':
      return 'Possible Match'
    case 'low':
      return 'Low Match'
  }
}
