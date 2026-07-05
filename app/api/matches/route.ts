import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/matches
 * Get matches for a specific pin or for the current user
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pinId = searchParams.get('pinId')
    const userId = searchParams.get('userId')

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get matches for a specific pin
    if (pinId) {
      const { data, error } = await supabase
        .from('potential_matches')
        .select(`
          *,
          lost_item:MapPin!lost_item_id(*),
          found_item:MapPin!found_item_id(*)
        `)
        .or(`lost_item_id.eq.${pinId},found_item_id.eq.${pinId}`)
        .order('overall_score', { ascending: false })

      if (error) {
        console.error('[GET /api/matches] Error:', error)

        // If table doesn't exist, return empty matches gracefully
        if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
          console.warn('[GET /api/matches] potential_matches table not found - matching system not yet initialized')
          return NextResponse.json({ matches: [], notice: 'Matching system not initialized' })
        }

        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ matches: data || [] })
    }

    // Get all matches for user's pins
    if (userId || user) {
      const targetUserId = userId || user.id

      // First get all user's pins
      const { data: pins, error: pinsError } = await supabase
        .from('MapPin')
        .select('id')
        .eq('user_id', targetUserId)

      if (pinsError) {
        return NextResponse.json(
          { error: pinsError.message },
          { status: 500 }
        )
      }

      if (!pins || pins.length === 0) {
        return NextResponse.json({ matches: [] })
      }

      const pinIds = pins.map((p) => p.id)

      // Get matches for these pins
      const { data, error } = await supabase
        .from('potential_matches')
        .select(`
          *,
          lost_item:MapPin!lost_item_id(*),
          found_item:MapPin!found_item_id(*)
        `)
        .or(
          pinIds
            .map((id) => `lost_item_id.eq.${id},found_item_id.eq.${id}`)
            .join(',')
        )
        .order('overall_score', { ascending: false })

      if (error) {
        console.error('[GET /api/matches] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ matches: data || [] })
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  } catch (error) {
    console.error('[GET /api/matches] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/matches
 * Manually trigger match finding for a pin
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { pinId } = body

    if (!pinId) {
      return NextResponse.json(
        { error: 'Pin ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify pin belongs to user
    const { data: pin, error: pinError } = await supabase
      .from('MapPin')
      .select('id, user_id')
      .eq('id', pinId)
      .single()

    if (pinError || !pin) {
      return NextResponse.json({ error: 'Pin not found' }, { status: 404 })
    }

    if (pin.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Call the find_potential_matches function
    const { data, error } = await supabase.rpc('find_potential_matches', {
      target_pin_id: pinId,
    })

    if (error) {
      console.error('[POST /api/matches] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      matchCount: data?.length || 0,
      matches: data || [],
    })
  } catch (error) {
    console.error('[POST /api/matches] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/matches/:id
 * Update match status
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { matchId, status } = body

    if (!matchId || !status) {
      return NextResponse.json(
        { error: 'Match ID and status are required' },
        { status: 400 }
      )
    }

    const validStatuses = [
      'pending',
      'viewed',
      'contacted',
      'claimed',
      'rejected',
      'expired',
    ]
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Call the update function
    const { data, error } = await supabase.rpc('update_match_status', {
      match_id: matchId,
      new_status: status,
    })

    if (error) {
      console.error('[PATCH /api/matches] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: data })
  } catch (error) {
    console.error('[PATCH /api/matches] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
