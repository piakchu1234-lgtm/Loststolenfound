"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  TrendingUp,
  Clock,
  Pin,
  Lock,
  Plus,
  Search,
} from "lucide-react";
import {
  getForumThreads,
  FORUM_CATEGORIES,
  type ForumThread,
} from "@/lib/forum";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForumPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadThreads();
  }, [selectedCategory]);

  async function loadThreads() {
    setLoading(true);
    const data = await getForumThreads(
      selectedCategory === "all" ? undefined : selectedCategory
    );
    setThreads(data);
    setLoading(false);
  }

  const filteredThreads = threads.filter((thread) =>
    thread.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                Community Forum
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Share tips, success stories, and get help from the community
              </p>
            </div>
            <Button
              onClick={() => router.push("/forum/new")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Thread
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search discussions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Categories */}
          <aside className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Categories
              </h3>
              <div className="space-y-1">
                {FORUM_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span className="mr-2">{category.icon}</span>
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mt-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Forum Stats
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Threads</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {threads.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Active Today</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {threads.filter((t) => {
                      const hoursSince = (Date.now() - new Date(t.last_activity_at).getTime()) / 3600000;
                      return hoursSince < 24;
                    }).length}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content - Thread List */}
          <main className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                  <p className="mt-4 text-gray-600 dark:text-gray-400">
                    Loading discussions...
                  </p>
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-12 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No threads found. Be the first to start a discussion!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredThreads.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => router.push(`/forum/${thread.slug}`)}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Thread Icon */}
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>

                        {/* Thread Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {thread.is_pinned && (
                              <Pin className="h-4 w-4 text-yellow-600" />
                            )}
                            {thread.is_locked && (
                              <Lock className="h-4 w-4 text-gray-600" />
                            )}
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {thread.title}
                            </h3>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              {thread.reply_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-4 w-4" />
                              {thread.view_count} views
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatTimeAgo(thread.last_activity_at)}
                            </span>
                          </div>

                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {
                                FORUM_CATEGORIES.find(
                                  (c) => c.id === thread.category
                                )?.label
                              }
                            </span>
                          </div>
                        </div>

                        {/* Author */}
                        <div className="text-right text-sm flex-shrink-0">
                          <p className="text-gray-900 dark:text-gray-100 font-medium">
                            {thread.profiles?.display_name || "Anonymous"}
                          </p>
                          <p className="text-gray-600 dark:text-gray-400 text-xs">
                            {formatTimeAgo(thread.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
