"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Send, Trash2 } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Comment {
  id: string;
  pin_id: string;
  user_id: string;
  user_email: string | null;
  content: string;
  created_at: string;
}

const ADMIN_EMAIL = "yapshin1001@gmail.com";

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 60) return `${Math.max(diff, 1)} seconds ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PinSocial({ pinId }: { pinId: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [userUpvoteId, setUserUpvoteId] = useState<string | null>(null);
  const [upvoting, setUpvoting] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s),
    );
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("pin_id", pinId)
        .order("created_at", { ascending: true });
      if (!active) return;
      if (error) {
        console.error("[PinSocial:fetchComments]", error);
        setComments([]);
        return;
      }
      setComments((data ?? []) as Comment[]);
    })();
    return () => {
      active = false;
    };
  }, [pinId]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("Upvotes")
        .select("id,user_id")
        .eq("pin_id", pinId);
      if (!active) return;
      if (error) {
        console.error("[PinSocial:fetchUpvotes]", error);
        setUpvoteCount(0);
        setUserUpvoteId(null);
        return;
      }
      const rows = (data ?? []) as { id: string; user_id: string }[];
      setUpvoteCount(rows.length);
      const mine = session
        ? rows.find((r) => r.user_id === session.user.id)
        : undefined;
      setUserUpvoteId(mine?.id ?? null);
    })();
    return () => {
      active = false;
    };
  }, [pinId, session?.user.id]);

  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  async function toggleUpvote() {
    if (!session) {
      alert("Please sign in to upvote.");
      return;
    }
    if (upvoting) return;
    setUpvoting(true);
    if (userUpvoteId) {
      const prev = userUpvoteId;
      setUserUpvoteId(null);
      setUpvoteCount((c) => Math.max(0, c - 1));
      const { error } = await supabase.from("Upvotes").delete().eq("id", prev);
      if (error) {
        console.error("[PinSocial:upvote:delete]", error);
        setUserUpvoteId(prev);
        setUpvoteCount((c) => c + 1);
      }
    } else {
      const { data, error } = await supabase
        .from("Upvotes")
        .insert({ pin_id: pinId, user_id: session.user.id })
        .select("id")
        .single();
      if (error || !data) {
        console.error("[PinSocial:upvote:insert]", error);
      } else {
        setUserUpvoteId(data.id as string);
        setUpvoteCount((c) => c + 1);
      }
    }
    setUpvoting(false);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (posting) return;
    const content = newComment.trim();
    if (!content) return;
    if (!session) {
      alert("Please sign in to comment.");
      return;
    }
    setPosting(true);
    const { error } = await supabase.from("comments").insert({
      pin_id: pinId,
      user_id: session.user.id,
      user_email: session.user.email ?? null,
      content,
    });
    setPosting(false);
    if (error) {
      console.error("[PinSocial:submitComment]", error);
      return;
    }
    setNewComment("");
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("pin_id", pinId)
      .order("created_at", { ascending: true });
    setComments((data ?? []) as Comment[]);
  }

  async function deleteComment(id: string) {
    if (!session) return;
    if (!window.confirm("Delete this comment?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) {
      console.error("[PinSocial:deleteComment]", error);
      alert("Failed to delete comment.");
      return;
    }
    setComments((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
  }

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Community Verification
        </h2>
        <Button
          type="button"
          onClick={toggleUpvote}
          disabled={upvoting}
          aria-pressed={!!userUpvoteId}
          className={`h-10 gap-2 rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-60 ${
            userUpvoteId
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-white text-zinc-800 ring-1 ring-zinc-300 hover:bg-zinc-100"
          }`}
        >
          <span aria-hidden>👍</span>
          <span>
            {userUpvoteId ? "Verified" : "Upvote"} · {upvoteCount}
          </span>
        </Button>
      </div>

      <div className="mt-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Comments {comments && `(${comments.length})`}
        </h3>
        {comments === null ? (
          <ul className="flex flex-col gap-2" aria-label="Loading comments">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="rounded-lg bg-zinc-50 px-3 py-2 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700"
              >
                <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="mt-2 h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              </li>
            ))}
          </ul>
        ) : comments.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No comments yet. Be the first to help!
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {comments.map((c) => {
              const canDelete = session?.user?.id === c.user_id || isAdmin;
              const emailLabel = c.user_email
                ? c.user_email.split("@")[0]
                : "Anonymous";
              return (
                <li
                  key={c.id}
                  className="rounded-lg bg-zinc-50 px-3 py-2 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {emailLabel}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                        {c.content}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        <time dateTime={c.created_at}>
                          {formatRelativeTime(c.created_at)}
                        </time>
                      </p>
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => deleteComment(c.id)}
                        aria-label="Delete comment"
                        className="shrink-0 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form onSubmit={submitComment} className="mt-4 flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={
            session ? "Add a comment…" : "Sign in to leave a comment."
          }
          aria-label="New comment"
          className="min-h-[44px] flex-1 text-base"
          disabled={posting || !session}
          rows={2}
        />
        <Button
          type="submit"
          disabled={posting || newComment.trim().length === 0 || !session}
          className="h-auto bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          <Send className="mr-1 h-4 w-4" aria-hidden />
          {posting ? "Posting…" : "Post"}
        </Button>
      </form>
    </section>
  );
}
