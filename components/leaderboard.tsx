"use client";

import { useEffect, useState } from "react";
import { Trophy, Medal, Crown } from "lucide-react";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/rewards";

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      const data = await getLeaderboard(10);
      setLeaderboard(data);
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return null;
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-orange-600" />;
      default:
        return <span className="text-sm font-bold text-gray-500">#{rank}</span>;
    }
  };

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
            Top Helpers
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Community heroes
          </p>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2">
        {leaderboard.map((entry, index) => (
          <div
            key={entry.user_id}
            className={`bg-white dark:bg-gray-800 rounded-lg p-3 border transition-all ${
              entry.rank <= 3
                ? 'border-yellow-300 dark:border-yellow-700 shadow-md'
                : 'border-yellow-100 dark:border-yellow-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Rank Badge */}
              <div className="flex-shrink-0 w-8 flex items-center justify-center">
                {getRankIcon(entry.rank)}
              </div>

              {/* User Info (placeholder - would show username/avatar) */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  User #{entry.user_id.substring(0, 8)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {entry.badge_count} {entry.badge_count === 1 ? 'badge' : 'badges'}
                </p>
              </div>

              {/* Points */}
              <div className="flex-shrink-0 text-right">
                <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {entry.total_points}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  points
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-yellow-200 dark:border-yellow-800">
        <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
          🏆 Help more people to climb the ranks!
        </p>
      </div>
    </div>
  );
}
