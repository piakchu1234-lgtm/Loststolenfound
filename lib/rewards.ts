import { supabase } from './supabase';

// Point values for different actions
export const POINT_VALUES = {
  ITEM_RETURNED: 50,        // Successfully returned an item
  ITEM_FOUND: 20,           // Reported a found item
  CLAIM_ACCEPTED: 30,       // Had your claim accepted
  VERIFIED_REPORT: 10,      // Made a verified report
  HELPFUL_COMMENT: 5,       // Posted a helpful comment
} as const;

// Badge definitions
export const BADGES = {
  FIRST_RETURN: {
    type: 'first_return',
    name: 'First Return',
    description: 'Returned your first lost item',
    icon: '🎯',
  },
  HELPER_HERO: {
    type: 'helper_hero',
    name: 'Helper Hero',
    description: 'Returned 5 lost items',
    icon: '🦸',
  },
  COMMUNITY_CHAMPION: {
    type: 'community_champion',
    name: 'Community Champion',
    description: 'Returned 10 lost items',
    icon: '👑',
  },
  CENTURY_CLUB: {
    type: 'century_club',
    name: 'Century Club',
    description: 'Earned 100 points',
    icon: '💯',
  },
  POINT_MASTER: {
    type: 'point_master',
    name: 'Point Master',
    description: 'Earned 500 points',
    icon: '⭐',
  },
  LEGEND: {
    type: 'legend',
    name: 'Legend',
    description: 'Earned 1000 points',
    icon: '🏆',
  },
} as const;

export interface UserPoints {
  id: string;
  user_id: string;
  total_points: number;
  created_at: string;
  updated_at: string;
}

export interface PointsHistory {
  id: string;
  user_id: string;
  points: number;
  action_type: string;
  reference_id?: string;
  description?: string;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_type: string;
  badge_name: string;
  badge_description?: string;
  earned_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  total_points: number;
  badge_count: number;
  rank: number;
}

/**
 * Award points to a user
 */
export async function awardPoints(
  userId: string,
  points: number,
  actionType: keyof typeof POINT_VALUES,
  referenceId?: string,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('award_points', {
      p_user_id: userId,
      p_points: points,
      p_action_type: actionType.toLowerCase(),
      p_reference_id: referenceId || null,
      p_description: description || null,
    });

    if (error) {
      console.error('Error awarding points:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error awarding points:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get user's current points
 */
export async function getUserPoints(userId: string): Promise<UserPoints | null> {
  try {
    const { data, error } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user points:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user points:', error);
    return null;
  }
}

/**
 * Get user's points history
 */
export async function getPointsHistory(
  userId: string,
  limit: number = 20
): Promise<PointsHistory[]> {
  try {
    const { data, error } = await supabase
      .from('points_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching points history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching points history:', error);
    return [];
  }
}

/**
 * Get user's badges
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      console.error('Error fetching user badges:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user badges:', error);
    return [];
  }
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase.rpc('get_leaderboard', {
      p_limit: limit,
    });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

/**
 * Get user's rank
 */
export async function getUserRank(userId: string): Promise<number | null> {
  try {
    const leaderboard = await getLeaderboard(100); // Get top 100
    const entry = leaderboard.find((e) => e.user_id === userId);
    return entry?.rank || null;
  } catch (error) {
    console.error('Error fetching user rank:', error);
    return null;
  }
}

/**
 * Get badge icon by type
 */
export function getBadgeIcon(badgeType: string): string {
  const badge = Object.values(BADGES).find((b) => b.type === badgeType);
  return badge?.icon || '🏅';
}

/**
 * Format action type for display
 */
export function formatActionType(actionType: string): string {
  const formats: Record<string, string> = {
    item_returned: 'Item Returned',
    item_found: 'Item Found',
    claim_accepted: 'Claim Accepted',
    verified_report: 'Verified Report',
    helpful_comment: 'Helpful Comment',
  };
  return formats[actionType] || actionType;
}
