/**
 * Test data seeding script for Supabase database
 * Creates sample users, categories, and items for testing
 *
 * Usage:
 *   npm run seed-test-data
 *
 * Prerequisites:
 *   - Supabase project must be running (local or remote)
 *   - Environment variables must be configured
 *   - Database schema must be applied
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function seedTestData() {
  console.log('Starting test data seeding...')

  try {
    // Create test users
    console.log('\n1. Creating test users...')
    const testUsers = [
      {
        email: 'alice@example.com',
        password: 'password123',
        display_name: 'Alice Johnson',
      },
      {
        email: 'bob@example.com',
        password: 'password123',
        display_name: 'Bob Smith',
      },
      {
        email: 'charlie@example.com',
        password: 'password123',
        display_name: 'Charlie Brown',
      },
    ]

    const createdUsers = []
    for (const user of testUsers) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      })

      if (authError) {
        console.error(`Failed to create user ${user.email}:`, authError.message)
        continue
      }

      // Create user profile
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        email: user.email,
        display_name: user.display_name,
      })

      if (profileError) {
        console.error(`Failed to create profile for ${user.email}:`, profileError.message)
        continue
      }

      createdUsers.push({ ...user, id: authData.user.id })
      console.log(`✓ Created user: ${user.email}`)
    }

    // Get categories
    console.log('\n2. Fetching categories...')
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')

    if (categoriesError) {
      throw new Error(`Failed to fetch categories: ${categoriesError.message}`)
    }

    console.log(`✓ Found ${categories.length} categories`)

    // Create lost items
    console.log('\n3. Creating lost items...')
    const lostItems = [
      {
        title: 'Black iPhone 14 Pro',
        description: 'Lost near the coffee shop on Main Street. Has a blue case.',
        category_id: categories.find((c) => c.name === 'electronics')?.id,
        location: 'Main Street Coffee Shop',
        coordinates: '(-122.4194, 37.7749)', // San Francisco
        date_lost: '2026-05-20',
        reporter_id: createdUsers[0]?.id,
        status: 'active',
      },
      {
        title: 'Brown Leather Wallet',
        description: 'Contains ID and credit cards. Lost in the park.',
        category_id: categories.find((c) => c.name === 'accessories')?.id,
        location: 'Central Park',
        coordinates: '(-122.4183, 37.7750)',
        date_lost: '2026-05-22',
        reporter_id: createdUsers[1]?.id,
        status: 'active',
      },
      {
        title: 'Passport',
        description: 'US Passport, blue cover. Lost at the airport.',
        category_id: categories.find((c) => c.name === 'documents')?.id,
        location: 'SFO Airport Terminal 2',
        coordinates: '(-122.3789, 37.6213)',
        date_lost: '2026-05-25',
        reporter_id: createdUsers[2]?.id,
        status: 'active',
      },
    ]

    for (const item of lostItems) {
      const { error } = await supabase.from('lost_items').insert(item)
      if (error) {
        console.error(`Failed to create lost item "${item.title}":`, error.message)
      } else {
        console.log(`✓ Created lost item: ${item.title}`)
      }
    }

    // Create found items
    console.log('\n4. Creating found items...')
    const foundItems = [
      {
        title: 'Silver Watch',
        description: 'Found on the bench near the fountain. Looks expensive.',
        category_id: categories.find((c) => c.name === 'accessories')?.id,
        location: 'City Plaza Fountain',
        coordinates: '(-122.4195, 37.7748)',
        date_found: '2026-05-21',
        finder_id: createdUsers[0]?.id,
        status: 'active',
      },
      {
        title: 'Set of Keys',
        description: 'Found in the parking lot. Has a red keychain.',
        category_id: categories.find((c) => c.name === 'other')?.id,
        location: 'Shopping Mall Parking Lot',
        coordinates: '(-122.4200, 37.7755)',
        date_found: '2026-05-23',
        finder_id: createdUsers[1]?.id,
        status: 'active',
      },
      {
        title: 'Small Dog - Beagle',
        description: 'Friendly beagle found wandering. No collar.',
        category_id: categories.find((c) => c.name === 'pets')?.id,
        location: 'Residential Area on Oak Street',
        coordinates: '(-122.4210, 37.7760)',
        date_found: '2026-05-26',
        finder_id: createdUsers[2]?.id,
        status: 'active',
      },
    ]

    for (const item of foundItems) {
      const { error } = await supabase.from('found_items').insert(item)
      if (error) {
        console.error(`Failed to create found item "${item.title}":`, error.message)
      } else {
        console.log(`✓ Created found item: ${item.title}`)
      }
    }

    console.log('\n✅ Test data seeding completed successfully!')
    console.log('\nTest user credentials:')
    testUsers.forEach((user) => {
      console.log(`  ${user.email} / ${user.password}`)
    })
  } catch (error) {
    console.error('\n❌ Error seeding test data:', error)
    process.exit(1)
  }
}

seedTestData()
