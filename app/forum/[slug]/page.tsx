"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Send,
  CheckCircle,
  Clock,
  Eye,
  Pin,
  Lock,
} from "lucide-react";
import {
  getForumThread,
  getForumReplies,
  createForumReply,
  voteForumReply,
  type ForumThread,
  type ForumReply,
  FORUM_CATEGORIES,
} from "@/lib/forum";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ThreadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [thread, setThread] = useState<ForumThread | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadThread();
  }, [slug]);

  async function loadThread() {
    setLoading(true);
    const threadData = await getForumThread(slug);
    if (threadData) {
      setThread(threadData);
      const repliesData = await getForumReplies(threadData.id);
      setReplies(repliesData);
    }
    setLoading(false);
  }

  async function handleSubmitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!thread || !replyContent.trim()) return;

    setSubmitting(true);
    const result = await createForumReply(thread.id, replyContent);

    if (result.success && result.reply) {
      setReplies([...replies, result.reply]);
      setReplyContent("");
    }
    setSubmitting(false);
  }

  async function handleVote(replyId: string, vote: 1 | -1) {
    await voteForumReply(replyId, vote);
    loadThread(); // Reload to get updated vote counts
  }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading discussion...
          </p>
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Thread not found</p>
          <Button onClick={() => router.push("/forum")} className="mt-4">
            Back to Forum
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push("/forum")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Forum
        </Button>

        {/* Thread */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          {/* Thread Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xl">
                {thread.profiles?.display_name?.[0]?.toUpperCase() || "?"}
              </span>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {thread.is_pinned && (
                  <Pin className="h-4 w-4 text-yellow-600" />
                )}
                {thread.is_locked && (
                  <Lock className="h-4 w-4 text-gray-600" />
                )}
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  {
                    FORUM_CATEGORIES.find((c) => c.id === thread.category)
                      ?.label
                  }
                </span>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {thread.title}
              </h1>

              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">
                  {thread.profiles?.display_name || "Anonymous"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatTimeAgo(thread.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {thread.view_count} views
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {thread.reply_count} replies
                </span>
              </div>
            </div>
          </div>

          {/* Thread Content */}
          <div className="prose dark:prose-invert max-w-none mt-6">
            <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {thread.content}
            </p>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
          </h2>

          {replies.map((reply) => (
            <div
              key={reply.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${
                reply.is_solution
                  ? "ring-2 ring-green-500 dark:ring-green-600"
                  : ""
              }`}
            >
              {/* Reply Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">
                    {reply.profiles?.display_name?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {reply.profiles?.display_name || "Anonymous"}
                    </span>
                    {reply.is_solution && (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        Solution
                      </span>
                    )}
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatTimeAgo(reply.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reply Content */}
              <div className="prose dark:prose-invert max-w-none mb-4">
                <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {reply.content}
                </p>
              </div>

              {/* Reply Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleVote(reply.id, 1)}
                  className="flex items-center gap-1 px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span className="text-sm">{reply.upvotes}</span>
                </button>
                <button
                  onClick={() => handleVote(reply.id, -1)}
                  className="flex items-center gap-1 px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ThumbsDown className="h-4 w-4" />
                  <span className="text-sm">{reply.downvotes}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Reply Form */}
        {!thread.is_locked && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Post a Reply
            </h3>

            <form onSubmit={handleSubmitReply}>
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Share your thoughts..."
                rows={6}
                required
              />

              <div className="flex justify-end mt-4">
                <Button
                  type="submit"
                  disabled={submitting || !replyContent.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Post Reply
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {thread.is_locked && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
            <Lock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-yellow-800 dark:text-yellow-200">
              This thread is locked. No new replies can be posted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
