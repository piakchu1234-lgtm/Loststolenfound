import { supabase } from './supabase'

export interface EmergencyEvent {
  id: string
  user_id: string
  event_type: 'police_call' | 'alarm_activated'
  location?: { lat: number; lng: number }
  timestamp: string
  resolved: boolean
  resolved_at?: string
  notes?: string
}

/**
 * Create an emergency event
 */
export async function createEmergencyEvent(
  eventType: 'police_call' | 'alarm_activated',
  location?: { lat: number; lng: number }
) {
  const { data: user } = await supabase.auth.getUser()

  if (!user.user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('emergency_events')
    .insert({
      user_id: user.user.id,
      event_type: eventType,
      location: location ? `POINT(${location.lng} ${location.lat})` : null,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get nearby emergency events
 */
export async function getNearbyEmergencies(
  location: { lat: number; lng: number },
  radiusMeters: number = 5000
) {
  const { data, error } = await supabase.rpc('get_nearby_emergencies', {
    user_lat: location.lat,
    user_lng: location.lng,
    radius_meters: radiusMeters,
  })

  if (error) throw error
  return data as EmergencyEvent[]
}

/**
 * Mark emergency as resolved (admin only)
 */
export async function resolveEmergency(eventId: string, notes?: string) {
  const { data, error } = await supabase
    .from('emergency_events')
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      notes,
    })
    .eq('id', eventId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get user's emergency events
 */
export async function getUserEmergencyEvents(userId: string) {
  const { data, error } = await supabase
    .from('emergency_events')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })

  if (error) throw error
  return data as EmergencyEvent[]
}

/**
 * Subscribe to nearby emergency events
 */
export function subscribeToNearbyEmergencies(
  callback: (event: EmergencyEvent) => void
) {
  return supabase
    .channel('emergency_events')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'emergency_events',
      },
      (payload) => {
        callback(payload.new as EmergencyEvent)
      }
    )
    .subscribe()
}

/**
 * Send emergency notification to nearby users
 */
export async function notifyNearbyUsers(
  location: { lat: number; lng: number },
  eventType: string
) {
  // This would integrate with OneSignal to send push notifications
  // to users within a certain radius

  try {
    // Get nearby users (you'd need a function to get users within radius)
    // Then use OneSignal API to send notifications

    console.log('Emergency notification sent to nearby users')

    // Example OneSignal integration (requires REST API)
    if (process.env.ONESIGNAL_REST_API_KEY) {
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
          headings: { en: '🚨 Emergency Alert' },
          contents: { en: 'Emergency situation reported nearby. Stay alert.' },
          filters: [
            // Add location-based filters here
            { field: 'location', radius: 5000, lat: location.lat, long: location.lng },
          ],
        }),
      })

      return response.json()
    }
  } catch (error) {
    console.error('Failed to send emergency notification:', error)
  }
}
