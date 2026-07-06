"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  MapPin,
  MessageCircle,
  TrendingUp,
  Award,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AnalyticsStats {
  totalUsers: number;
  totalPins: number;
  totalThreads: number;
  totalReplies: number;
  totalPoints: number;
  totalBadges: number;
  totalClaims: number;
  activePins: number;
  resolvedPins: number;
}

interface CategoryStats {
  category: string;
  count: number;
}

interface TopContributor {
  user_id: string;
  email: string;
  display_name: string | null;
  total_points: number;
  rank: number;
}

interface RecentActivity {
  type: string;
  count: number;
  date: string;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<AnalyticsStats>({
    totalUsers: 0,
    totalPins: 0,
    totalThreads: 0,
    totalReplies: 0,
    totalPoints: 0,
    totalBadges: 0,
    totalClaims: 0,
    activePins: 0,
    resolvedPins: 0,
  });
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [topContributors, setTopContributors] = useState<TopContributor[]>([]);
  const [dailyActivity, setDailyActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      // Check if user is admin (you can add admin role checking here)
      // For now, all authenticated users can view analytics
      setIsAdmin(true);

      await loadAnalytics();
    } catch (error) {
      console.error("Error checking admin:", error);
      router.push("/");
    }
  }

  async function loadAnalytics() {
    try {
      setLoading(true);

      // Load all analytics in parallel
      const [
        usersCount,
        pinsCount,
        threadsCount,
        repliesCount,
        pointsSum,
        badgesCount,
        claimsCount,
        activePinsCount,
        resolvedPinsCount,
        categories,
        contributors,
        activity,
      ] = await Promise.all([
        // Total users
        supabase.from("profiles").select("*", { count: "exact", head: true }),

        // Total pins
        supabase.from("Pin").select("*", { count: "exact", head: true }),

        // Total threads
        supabase
          .from("forum_threads")
          .select("*", { count: "exact", head: true })
          .eq("is_deleted", false),

        // Total replies
        supabase
          .from("forum_replies")
          .select("*", { count: "exact", head: true })
          .eq("is_deleted", false),

        // Total points
        supabase.rpc("get_total_points"),

        // Total badges
        supabase.from("user_badges").select("*", { count: "exact", head: true }),

        // Total claims
        supabase.from("claims").select("*", { count: "exact", head: true }),

        // Active pins
        supabase
          .from("Pin")
          .select("*", { count: "exact", head: true })
          .eq("status", "open"),

        // Resolved pins
        supabase
          .from("Pin")
          .select("*", { count: "exact", head: true })
          .eq("status", "resolved"),

        // Category breakdown
        supabase.rpc("get_category_stats"),

        // Top contributors
        supabase.rpc("get_leaderboard", { limit_count: 10 }),

        // Daily activity (last 7 days)
        supabase.rpc("get_daily_activity", { days: 7 }),
      ]);

      setStats({
        totalUsers: usersCount.count || 0,
        totalPins: pinsCount.count || 0,
        totalThreads: threadsCount.count || 0,
        totalReplies: repliesCount.count || 0,
        totalPoints: pointsSum.data || 0,
        totalBadges: badgesCount.count || 0,
        totalClaims: claimsCount.count || 0,
        activePins: activePinsCount.count || 0,
        resolvedPins: resolvedPinsCount.count || 0,
      });

      setCategoryStats(categories.data || []);
      setTopContributors(contributors.data || []);
      setDailyActivity(activity.data || []);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-zinc-400" />
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Loading analytics...
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const successRate = stats.totalPins > 0
    ? ((stats.resolvedPins / stats.totalPins) * 100).toFixed(1)
    : "0";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  Analytics Dashboard
                </h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Platform insights and statistics
                </p>
              </div>
            </div>

            <button
              onClick={loadAnalytics}
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Key Metrics */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {formatNumber(stats.totalUsers)}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Users</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                <MapPin className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {formatNumber(stats.totalPins)}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Pins</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                <MessageCircle className="h-6 w-6 text-purple-600 dark:text-purple-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {formatNumber(stats.totalThreads)}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Forum Threads</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
                <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {formatNumber(stats.totalPoints)}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Points</p>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {stats.totalBadges}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">Badges</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {stats.totalReplies}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">Replies</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {stats.totalClaims}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">Claims</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {stats.activePins}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">Active</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {successRate}%
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">Resolved</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Top Contributors */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Top Contributors
            </h2>

            {topContributors.length > 0 ? (
              <div className="space-y-3">
                {topContributors.map((contributor, index) => (
                  <div
                    key={contributor.user_id}
                    className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-bold text-white">
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                        {contributor.display_name || contributor.email?.split("@")[0] || "Anonymous"}
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {contributor.total_points.toLocaleString()} points
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No contributors yet
              </p>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Category Breakdown
            </h2>

            {categoryStats.length > 0 ? (
              <div className="space-y-3">
                {categoryStats.map((cat) => {
                  const percentage = stats.totalPins > 0
                    ? ((cat.count / stats.totalPins) * 100).toFixed(1)
                    : "0";

                  return (
                    <div key={cat.category}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">
                          {cat.category.replace(/_/g, " ")}
                        </span>
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {cat.count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No data available
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
