# Apply Rewards System Migration

## Quick Steps

1. **Open Supabase SQL Editor**:
   https://supabase.com/dashboard/project/nivcvueuohxofajchssk/sql/new

2. **Copy the SQL below** (or from `supabase/migrations/20260708_add_rewards_system.sql`)

3. **Paste into SQL Editor**

4. **Click "Run"** (or press Ctrl+Enter)

5. **Verify** - You should see tables created:
   - user_points
   - points_history
   - user_badges

6. **Done!** Refresh your app to see the rewards system

---

## Already Applied?

If you see errors like "relation already exists", the migration is already applied. You can safely ignore those errors.

---

## What This Creates

### Tables:
- **user_points** - Total points per user
- **points_history** - Audit log of all point transactions
- **user_badges** - Achievement badges earned by users

### Functions:
- **award_points()** - Awards points and checks badges
- **check_badge_eligibility()** - Auto-awards badges
- **get_leaderboard()** - Returns top users

### Point Values:
- 50 pts - Item returned
- 30 pts - Claim accepted
- 20 pts - Item found
- 10 pts - Verified report
- 5 pts - Helpful comment

### Badges:
- 🎯 First Return (1 return)
- 🦸 Helper Hero (5 returns)
- 👑 Community Champion (10 returns)
- 💯 Century Club (100 points)
- ⭐ Point Master (500 points)
- 🏆 Legend (1000 points)

---

## Need Help?

If you encounter issues:
1. Check that you're logged into the correct Supabase project
2. Verify you have admin/owner access
3. Try running sections of the SQL separately if there are errors
4. Contact me if you need assistance

---

**Migration File Location**: `supabase/migrations/20260708_add_rewards_system.sql`
