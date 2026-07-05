"use client";

import { useEffect, useState } from "react";
import { Trophy, Award, TrendingUp, Star, Zap } from "lucide-react";
import {
  getUserPoints,
  getUserBadges,
  getPointsHistory,
  getUserRank,
  getBadgeIcon,
  formatActionType,
  type UserPoints,
  type UserBadge,
  type PointsHistory,
} from "@/lib/rewards";

interface RewardsDashboardProps {
  userId: string;
}

export function RewardsDashboard({ userId }: RewardsDashboardProps) {
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [history, setHistory] = useState<PointsHistory[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [pointsData, badgesData, historyData, rankData] = await Promise.all([
        getUserPoints(userId),
        getUserBadges(userId),
        getPointsHistory(userId, 5),
        getUserRank(userId),
      ]);

      setPoints(pointsData);
      setBadges(badgesData);
      setHistory(historyData);
      setRank(rankData);
      setLoading(false);
    };

    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg border border-purple-200 dark:border-purple-800 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
      </div>
    );
  }

  const totalPoints = points?.total_points || 0;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg border border-purple-200 dark:border-purple-800 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
              Your Rewards
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Keep helping the community!
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Total Points */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-100 dark:border-purple-900">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Total Points
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {totalPoints}
          </p>
        </div>

        {/* Rank */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-100 dark:border-purple-900">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Rank
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {rank ? `#${rank}` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Badges Section */}
      {badges.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              Badges ({badges.length})
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-purple-100 dark:border-purple-900 flex items-center gap-2"
                title={badge.badge_description || badge.badge_name}
              >
                <span className="text-lg">{getBadgeIcon(badge.badge_type)}</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {badge.badge_name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              Recent Activity
            </h4>
          </div>
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-100 dark:border-purple-900 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                    {formatActionType(item.action_type)}
                  </p>
                  {item.description && (
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate">
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                    +{item.points}
                  </span>
                  <Star className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {badges.length === 0 && history.length === 0 && totalPoints === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trophy className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            Start Earning Rewards!
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Help the community by returning lost items and earn points & badges
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-purple-200 dark:border-purple-800">
        <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
          🎯 Earn points by helping others find their lost items
        </p>
      </div>
    </div>
  );
}
