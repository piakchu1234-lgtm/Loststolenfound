"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Send, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";

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

type VoteValue = 1 | -1;

export function PinSocial({ pinId }: { pinId: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [netScore, setNetScore] = useState<number>(0);
  const [userVote, setUserVote] = useState<VoteValue | null>(null);
  const [voting, setVoting] = useState(false);

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
      const allRes = await supabase
        .from("PinUpvote")
        .select("vote_type")
        .eq("pin_id", pinId);
      if (!active) return;
      if (allRes.error) {
        console.error("[PinSocial:fetchVotes]", allRes.error);
        setNetScore(0);
      } else {
        const rows = (allRes.data ?? []) as { vote_type: number }[];
        const sum = rows.reduce((s, r) => s + (r.vote_type ?? 0), 0);
        setNetScore(sum);
      }

      if (!session) {
        setUserVote(null);
        return;
      }
      const mineRes = await supabase
        .from("PinUpvote")
        .select("vote_type")
        .eq("pin_id", pinId)
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!active) return;
      if (mineRes.error) {
        console.error("[PinSocial:fetchUserVote]", mineRes.error);
        setUserVote(null);
      } else if (!mineRes.data) {
        setUserVote(null);
      } else {
        const v = (mineRes.data as { vote_type: number }).vote_type;
        setUserVote(v === 1 ? 1 : v === -1 ? -1 : null);
      }
    })();
    return () => {
      active = false;
    };
  }, [pinId, session?.user.id]);

  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  async function castVote(direction: VoteValue) {
    if (!session) {
      alert("Please sign in to verify incidents.");
      return;
    }
    if (voting) return;
    const previous = userVote;
    const removing = previous === direction;
    const nextVote: VoteValue | null = removing ? null : direction;
    const delta = (nextVote ?? 0) - (previous ?? 0);

    setVoting(true);
    setUserVote(nextVote);
    setNetScore((s) => s + delta);

    const { error } = removing
      ? await supabase
          .from("PinUpvote")
          .delete()
          .eq("pin_id", pinId)
          .eq("user_id", session.user.id)
      : await supabase
          .from("PinUpvote")
          .upsert(
            {
              pin_id: pinId,
              user_id: session.user.id,
              vote_type: direction,
            },
            { onConflict: "pin_id,user_id" },
          );

    if (error) {
      console.error("[PinSocial:castVote]", error);
      setUserVote(previous);
      setNetScore((s) => s - delta);
    }
    setVoting(false);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Community Verification
          </h2>
          <p
            className={`mt-0.5 text-2xl font-bold leading-none ${
              netScore > 0
                ? "text-emerald-600"
                : netScore < 0
                  ? "text-rose-600"
                  : "text-zinc-700 dark:text-zinc-200"
            }`}
            aria-label={`Net trust score: ${netScore}`}
          >
            {netScore > 0 ? `+${netScore}` : netScore}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => castVote(1)}
            disabled={voting}
            aria-pressed={userVote === 1}
            aria-label={
              userVote === 1 ? "Remove your verification" : "Verify this report"
            }
            className={`h-10 gap-2 rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-60 ${
              userVote === 1
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-white text-zinc-800 ring-1 ring-zinc-300 hover:bg-zinc-100"
            }`}
          >
            <ThumbsUp className="h-4 w-4" aria-hidden />
            <span>{userVote === 1 ? "Verified" : "Verify"}</span>
          </Button>
          <Button
            type="button"
            onClick={() => castVote(-1)}
            disabled={voting}
            aria-pressed={userVote === -1}
            aria-label={
              userVote === -1 ? "Remove your flag" : "Flag this report"
            }
            className={`h-10 gap-2 rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-60 ${
              userVote === -1
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-white text-zinc-800 ring-1 ring-zinc-300 hover:bg-zinc-100"
            }`}
          >
            <ThumbsDown className="h-4 w-4" aria-hidden />
            <span>{userVote === -1 ? "Flagged" : "Flag"}</span>
          </Button>
        </div>
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
