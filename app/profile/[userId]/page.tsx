"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Trophy,
  MapPin,
  MessageCircle,
  Calendar,
  Award,
  TrendingUp,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getUserPoints, getUserBadges, type UserBadge } from "@/lib/rewards";
import { BADGES } from "@/lib/rewards";
import { Button } from "@/components/ui/button";

interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  display_name?: string;
  avatar_url?: string;
}

interface UserStats {
  totalPins: number;
  totalThreads: number;
  totalReplies: number;
  solutionsMarked: number;
  claimsCompleted: number;
}

interface RecentActivity {
  type: "pin" | "thread" | "reply";
  id: string;
  title: string;
  created_at: string;
  category?: string;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({
    totalPins: 0,
    totalThreads: 0,
    totalReplies: 0,
    solutionsMarked: 0,
    claimsCompleted: 0,
  });
  const [points, setPoints] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  async function fetchUserProfile() {
    try {
      setLoading(true);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);
        return;
      }

      setProfile(profileData);

      // Fetch points
      const pointsData = await getUserPoints(userId);
      setPoints(pointsData?.total_points || 0);

      // Fetch rank from leaderboard
      const { data: leaderboardData } = await supabase.rpc("get_leaderboard", {
        limit_count: 100,
      });

      if (leaderboardData) {
        const userRank = leaderboardData.findIndex(
          (entry: any) => entry.user_id === userId
        );
        setRank(userRank >= 0 ? userRank + 1 : null);
      }

      // Fetch badges
      const badgesData = await getUserBadges(userId);
      setBadges(badgesData);

      // Fetch stats
      await fetchUserStats();

      // Fetch recent activity
      await fetchRecentActivity();
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserStats() {
    try {
      // Count pins
      const { count: pinsCount } = await supabase
        .from("Pin")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Count forum threads
      const { count: threadsCount } = await supabase
        .from("forum_threads")
        .select("*", { count: "exact", head: true })
        .eq("author_id", userId)
        .eq("is_deleted", false);

      // Count forum replies
      const { count: repliesCount } = await supabase
        .from("forum_replies")
        .select("*", { count: "exact", head: true })
        .eq("author_id", userId)
        .eq("is_deleted", false);

      // Count solutions marked
      const { count: solutionsCount } = await supabase
        .from("forum_replies")
        .select("*", { count: "exact", head: true })
        .eq("author_id", userId)
        .eq("is_solution", true)
        .eq("is_deleted", false);

      // Count completed claims
      const { count: claimsCount } = await supabase
        .from("claims")
        .select("*", { count: "exact", head: true })
        .eq("claimer_id", userId)
        .eq("status", "completed");

      setStats({
        totalPins: pinsCount || 0,
        totalThreads: threadsCount || 0,
        totalReplies: repliesCount || 0,
        solutionsMarked: solutionsCount || 0,
        claimsCompleted: claimsCount || 0,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }

  async function fetchRecentActivity() {
    try {
      const activities: RecentActivity[] = [];

      // Fetch recent pins
      const { data: pins } = await supabase
        .from("Pin")
        .select("id, title, created_at, category")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (pins) {
        pins.forEach((pin) => {
          activities.push({
            type: "pin",
            id: pin.id,
            title: pin.title,
            created_at: pin.created_at,
            category: pin.category,
          });
        });
      }

      // Fetch recent threads
      const { data: threads } = await supabase
        .from("forum_threads")
        .select("id, title, created_at, category")
        .eq("author_id", userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(5);

      if (threads) {
        threads.forEach((thread) => {
          activities.push({
            type: "thread",
            id: thread.id,
            title: thread.title,
            created_at: thread.created_at,
            category: thread.category,
          });
        });
      }

      // Sort all activities by date
      activities.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setRecentActivity(activities.slice(0, 10));
    } catch (err) {
      console.error("Error fetching activity:", err);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function getRelativeTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatDate(dateString);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-50 mx-auto" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="max-w-md text-center">
          <User className="mx-auto h-16 w-16 text-zinc-400" />
          <h2 className="mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">
            User Not Found
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This user profile doesn't exist or has been removed.
          </p>
          <Button
            onClick={() => router.push("/")}
            className="mt-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name || profile.email?.split("@")[0] || "Anonymous";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Map
          </Link>
        </div>
      </header>

      {/* Profile Content */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-3xl font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                {displayName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {formatDate(profile.created_at)}
                </div>
                {rank && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    Rank #{rank}
                  </div>
                )}
              </div>

              {/* Points Display */}
              <div className="mt-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-white shadow-md">
                  <Trophy className="h-5 w-5" />
                  <span className="text-lg font-bold">{points.toLocaleString()}</span>
                  <span className="text-sm opacity-90">points</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Stats & Badges */}
          <div className="lg:col-span-1 space-y-6">
            {/* Stats Card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                <TrendingUp className="h-5 w-5" />
                Statistics
              </h2>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-zinc-600 dark:text-zinc-400">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Pins Created
                  </dt>
                  <dd className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {stats.totalPins}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-zinc-600 dark:text-zinc-400">
                    <MessageCircle className="inline h-4 w-4 mr-1" />
                    Threads Started
                  </dt>
                  <dd className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {stats.totalThreads}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-zinc-600 dark:text-zinc-400">
                    Replies Posted
                  </dt>
                  <dd className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {stats.totalReplies}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-zinc-600 dark:text-zinc-400">
                    Solutions Marked
                  </dt>
                  <dd className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {stats.solutionsMarked}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-zinc-600 dark:text-zinc-400">
                    Claims Completed
                  </dt>
                  <dd className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {stats.claimsCompleted}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Badges Card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                <Award className="h-5 w-5" />
                Badges ({badges.length})
              </h2>
              {badges.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {badges.map((badge) => {
                    const badgeInfo = Object.values(BADGES).find(
                      (b) => b.type === badge.badge_type
                    );
                    return (
                      <div
                        key={badge.id}
                        className="flex flex-col items-center rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-800 dark:bg-zinc-900"
                        title={badge.badge_description || badgeInfo?.description}
                      >
                        <span className="text-3xl">{badgeInfo?.icon || "🏅"}</span>
                        <span className="mt-2 text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                          {badge.badge_name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No badges earned yet. Keep contributing!
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Recent Activity */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Recent Activity
              </h2>
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div
                      key={`${activity.type}-${activity.id}`}
                      className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="shrink-0">
                        {activity.type === "pin" && (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                            <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                          </div>
                        )}
                        {activity.type === "thread" && (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                            <MessageCircle className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                          {activity.type === "pin" && "Created pin"}
                          {activity.type === "thread" && "Started thread"}
                        </p>
                        <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
                          {activity.title}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                          {getRelativeTime(activity.created_at)}
                        </p>
                      </div>
                      {activity.type === "thread" && (
                        <Link
                          href={`/forum/${activity.id}`}
                          className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 py-8">
                  No recent activity to display.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
