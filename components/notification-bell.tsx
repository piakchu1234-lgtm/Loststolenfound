"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase";

interface NotificationRow {
  id: string;
  pin_id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${Math.max(diff, 1)}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[] | null>(null);
  const [unread, setUnread] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    const recentRes = await supabase
      .from("Notification")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    if (recentRes.error) {
      console.error("[bell:fetchRecent]", recentRes.error);
      setItems([]);
    } else {
      setItems((recentRes.data ?? []) as NotificationRow[]);
    }
    const countRes = await supabase
      .from("Notification")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (countRes.error) {
      console.error("[bell:fetchUnread]", countRes.error);
    } else {
      setUnread(countRes.count ?? 0);
    }
  }

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`notif:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Notification",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  async function handleSelect(n: NotificationRow) {
    setOpen(false);
    if (!n.is_read) {
      setItems((prev) =>
        prev
          ? prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
          : prev,
      );
      setUnread((u) => Math.max(0, u - 1));
      const { error } = await supabase
        .from("Notification")
        .update({ is_read: true })
        .eq("id", n.id);
      if (error) console.error("[bell:markRead]", error);
    }
    router.push(`/p/${n.pin_id}`);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-label={
          unread > 0
            ? `Notifications, ${unread} unread`
            : "Notifications"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) refresh();
        }}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-zinc-200 transition-colors hover:bg-zinc-100 dark:bg-zinc-800 dark:ring-zinc-700 dark:hover:bg-zinc-700"
      >
        <Bell
          className="h-4 w-4 text-zinc-700 dark:text-zinc-200"
          aria-hidden
        />
        {unread > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-zinc-900"
            aria-hidden
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Recent notifications"
          className="absolute right-0 top-full z-[60] mt-2 w-80 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
        >
          <div className="flex items-center justify-between border-b px-4 py-3 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Notifications
            </p>
            {unread > 0 && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                {unread} new
              </span>
            )}
          </div>
          {items === null ? (
            <div className="flex items-center justify-center px-4 py-8">
              <Loader2
                className="h-5 w-5 animate-spin text-zinc-400"
                aria-hidden
              />
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              No new notifications
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={
                    n.is_read
                      ? "border-b last:border-b-0 dark:border-zinc-800"
                      : "border-b bg-rose-50/40 last:border-b-0 dark:border-zinc-800 dark:bg-rose-500/5"
                  }
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleSelect(n)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none dark:hover:bg-zinc-800 dark:focus-visible:bg-zinc-800"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        n.is_read ? "bg-transparent" : "bg-rose-500"
                      }`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm leading-snug ${
                          n.is_read
                            ? "text-zinc-600 dark:text-zinc-400"
                            : "font-semibold text-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        {n.message}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        <time dateTime={n.created_at}>
                          {formatRelativeTime(n.created_at)}
                        </time>
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
