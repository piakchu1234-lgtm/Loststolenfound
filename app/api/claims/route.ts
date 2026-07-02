import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/claims
 * Get claims for a pin or user
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

    // Get claims for a specific pin
    if (pinId) {
      // Verify user owns the pin
      const { data: pin } = await supabase
        .from('MapPin')
        .select('user_id')
        .eq('id', pinId)
        .single()

      if (!pin || pin.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { data, error } = await supabase
        .from('claims')
        .select(`
          *,
          claimer:profiles!claims_claimer_id_fkey(id, email, display_name, avatar_url)
        `)
        .eq('pin_id', pinId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[GET /api/claims] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ claims: data || [] })
    }

    // Get claims for a user
    if (userId || user) {
      const targetUserId = userId || user.id

      const { data, error } = await supabase
        .from('claims')
        .select(`
          *,
          pin:MapPin!claims_pin_id_fkey(id, title, description, category, image_url, user_id)
        `)
        .eq('claimer_id', targetUserId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[GET /api/claims] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ claims: data || [] })
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  } catch (error) {
    console.error('[GET /api/claims] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/claims
 * Create a new claim
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { pinId, evidence, photos } = body

    if (!pinId || !evidence) {
      return NextResponse.json(
        { error: 'Pin ID and evidence are required' },
        { status: 400 }
      )
    }

    if (evidence.length < 50) {
      return NextResponse.json(
        { error: 'Evidence must be at least 50 characters' },
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

    // Verify pin exists and is not owned by user
    const { data: pin, error: pinError } = await supabase
      .from('MapPin')
      .select('id, user_id, status')
      .eq('id', pinId)
      .single()

    if (pinError || !pin) {
      return NextResponse.json({ error: 'Pin not found' }, { status: 404 })
    }

    if (pin.user_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot claim your own item' },
        { status: 400 }
      )
    }

    if (pin.status === 'resolved') {
      return NextResponse.json(
        { error: 'This item has already been resolved' },
        { status: 400 }
      )
    }

    // Create the claim
    const { data, error } = await supabase
      .from('claims')
      .insert({
        pin_id: pinId,
        claimer_id: user.id,
        claimer_evidence: evidence,
        claimer_photos: photos || [],
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/claims] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, claim: data })
  } catch (error) {
    console.error('[POST /api/claims] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/claims
 * Update claim status (approve/reject/complete)
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { claimId, action, response, reason } = body

    if (!claimId || !action) {
      return NextResponse.json(
        { error: 'Claim ID and action are required' },
        { status: 400 }
      )
    }

    const validActions = ['approve', 'reject', 'complete', 'cancel']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get claim
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('*, pin:MapPin!claims_pin_id_fkey(user_id)')
      .eq('id', claimId)
      .single()

    if (claimError || !claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
    }

    // Verify permissions
    const isOwner = claim.pin?.user_id === user.id
    const isClaimer = claim.claimer_id === user.id

    if (action === 'approve' || action === 'reject') {
      if (!isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (action === 'cancel' && !isClaimer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Perform action
    let updateData: any = {}

    switch (action) {
      case 'approve':
        updateData = {
          status: 'approved',
          owner_response: response || null,
        }
        break
      case 'reject':
        updateData = {
          status: 'rejected',
          rejection_reason: reason || null,
        }
        break
      case 'complete':
        updateData = {
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user.id,
        }
        break
      case 'cancel':
        updateData = {
          status: 'cancelled',
        }
        break
    }

    const { error: updateError } = await supabase
      .from('claims')
      .update(updateData)
      .eq('id', claimId)

    if (updateError) {
      console.error('[PATCH /api/claims] Error:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PATCH /api/claims] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
