import { createClient } from '@/lib/supabase/client'

export type LocationType =
  | 'police_station'
  | 'shopping_center'
  | 'public_space'
  | 'cafe'
  | 'library'
  | 'community_center'
  | 'train_station'

export type LocationFacility =
  | 'parking'
  | 'cctv'
  | 'security'
  | 'indoor'
  | 'food'
  | 'restrooms'
  | 'lighting'
  | 'public'

export interface SafeLocation {
  id: string
  name: string
  type: LocationType
  address: string
  suburb: string
  postcode: string
  latitude: number
  longitude: number
  description: string | null
  hours: string | null
  facilities: LocationFacility[]
  phone: string | null
  website: string | null
  verified: boolean
  rating: number | null
  safety_score: number | null
  created_at: string
  updated_at: string

  // Computed
  distance_km?: number
}

export interface LocationReview {
  id: string
  location_id: string
  user_id: string
  rating: number
  review: string | null
  created_at: string
}

/**
 * Get all safe locations
 */
export async function getSafeLocations(): Promise<SafeLocation[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('safe_locations')
      .select('*')
      .eq('verified', true)
      .order('safety_score', { ascending: false })

    if (error) {
      console.error('[getSafeLocations] Error:', error)
      return []
    }

    return (data || []) as SafeLocation[]
  } catch (err) {
    console.error('[getSafeLocations] Exception:', err)
    return []
  }
}

/**
 * Find nearest safe locations to a point
 */
export async function findNearestLocations(
  latitude: number,
  longitude: number,
  limit: number = 10,
  maxDistanceKm: number = 10
): Promise<SafeLocation[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.rpc('find_nearest_safe_locations', {
      p_latitude: latitude,
      p_longitude: longitude,
      p_limit: limit,
      p_max_distance_km: maxDistanceKm,
    })

    if (error) {
      console.error('[findNearestLocations] Error:', error)
      return []
    }

    return (data || []) as any
  } catch (err) {
    console.error('[findNearestLocations] Exception:', err)
    return []
  }
}

/**
 * Recommend safe location for exchange between two parties
 */
export async function recommendLocationForExchange(
  location1: { lat: number; lng: number },
  location2: { lat: number; lng: number }
): Promise<SafeLocation[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.rpc('recommend_safe_location_for_exchange', {
      p_location1_lat: location1.lat,
      p_location1_lng: location1.lng,
      p_location2_lat: location2.lat,
      p_location2_lng: location2.lng,
    })

    if (error) {
      console.error('[recommendLocationForExchange] Error:', error)
      return []
    }

    return (data || []) as any
  } catch (err) {
    console.error('[recommendLocationForExchange] Exception:', err)
    return []
  }
}

/**
 * Get location by ID
 */
export async function getLocationById(id: string): Promise<SafeLocation | null> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('safe_locations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('[getLocationById] Error:', error)
      return null
    }

    return data as SafeLocation
  } catch (err) {
    console.error('[getLocationById] Exception:', err)
    return null
  }
}

/**
 * Calculate distance between two points (client-side)
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
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`
  }
  return `${distanceKm.toFixed(1)}km`
}

/**
 * Get location type icon and color
 */
export function getLocationTypeInfo(type: LocationType): {
  label: string
  icon: string
  color: string
  bgColor: string
} {
  switch (type) {
    case 'police_station':
      return {
        label: 'Police Station',
        icon: '🚓',
        color: 'text-blue-700 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      }
    case 'shopping_center':
      return {
        label: 'Shopping Centre',
        icon: '🛍️',
        color: 'text-purple-700 dark:text-purple-400',
        bgColor: 'bg-purple-100 dark:bg-purple-900/20',
      }
    case 'library':
      return {
        label: 'Library',
        icon: '📚',
        color: 'text-green-700 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/20',
      }
    case 'community_center':
      return {
        label: 'Community Centre',
        icon: '🏛️',
        color: 'text-orange-700 dark:text-orange-400',
        bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      }
    case 'train_station':
      return {
        label: 'Train Station',
        icon: '🚉',
        color: 'text-red-700 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/20',
      }
    case 'public_space':
      return {
        label: 'Public Space',
        icon: '🌳',
        color: 'text-teal-700 dark:text-teal-400',
        bgColor: 'bg-teal-100 dark:bg-teal-900/20',
      }
    case 'cafe':
      return {
        label: 'Café',
        icon: '☕',
        color: 'text-amber-700 dark:text-amber-400',
        bgColor: 'bg-amber-100 dark:bg-amber-900/20',
      }
  }
}

/**
 * Get facility icon and label
 */
export function getFacilityInfo(facility: LocationFacility): {
  label: string
  icon: string
} {
  switch (facility) {
    case 'parking':
      return { label: 'Parking', icon: '🅿️' }
    case 'cctv':
      return { label: 'CCTV', icon: '📹' }
    case 'security':
      return { label: 'Security', icon: '👮' }
    case 'indoor':
      return { label: 'Indoor', icon: '🏠' }
    case 'food':
      return { label: 'Food', icon: '🍴' }
    case 'restrooms':
      return { label: 'Restrooms', icon: '🚻' }
    case 'lighting':
      return { label: 'Lighting', icon: '💡' }
    case 'public':
      return { label: 'Public', icon: '👥' }
  }
}

/**
 * Get safety score color
 */
export function getSafetyScoreColor(score: number): {
  color: string
  label: string
} {
  if (score >= 90) {
    return { color: 'text-green-600 dark:text-green-400', label: 'Very Safe' }
  } else if (score >= 75) {
    return { color: 'text-blue-600 dark:text-blue-400', label: 'Safe' }
  } else if (score >= 60) {
    return { color: 'text-yellow-600 dark:text-yellow-400', label: 'Moderately Safe' }
  } else {
    return { color: 'text-orange-600 dark:text-orange-400', label: 'Use Caution' }
  }
}
