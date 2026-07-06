"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2, X } from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  getInAppNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToNotifications,
  getNotificationIcon,
  getNotificationColor,
  type InAppNotification,
} from "@/lib/notifications";

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
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        getInAppNotifications(10),
        getUnreadNotificationCount(),
      ]);
      setNotifications(notifs);
      setUnread(count);
    } catch (error) {
      console.error("[bell:refresh]", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();

    // Subscribe to real-time notifications
    const unsubscribe = subscribeToNotifications(userId, (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev].slice(0, 10));
      if (!newNotif.is_read) {
        setUnread((u) => u + 1);
      }
    });

    return unsubscribe;
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

  async function handleSelect(notif: InAppNotification) {
    setOpen(false);

    // Mark as read
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnread((u) => Math.max(0, u - 1));
      await markNotificationAsRead(notif.id);
    }

    // Navigate if there's a link
    if (notif.link) {
      router.push(notif.link);
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
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
          className="absolute right-0 top-full z-[60] mt-2 w-96 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
        >
          <div className="flex items-center justify-between border-b px-4 py-3 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Notifications
            </p>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                    {unread} new
                  </span>
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    Mark all read
                  </button>
                </>
              )}
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center px-4 py-8">
              <Loader2
                className="h-5 w-5 animate-spin text-zinc-400"
                aria-hidden
              />
            </div>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              No notifications yet
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {notifications.map((notif) => {
                const icon = getNotificationIcon(notif.type);
                const colorClass = getNotificationColor(notif.type);

                return (
                  <li
                    key={notif.id}
                    className={
                      notif.is_read
                        ? "border-b last:border-b-0 dark:border-zinc-800"
                        : "border-b bg-blue-50/40 last:border-b-0 dark:border-zinc-800 dark:bg-blue-500/5"
                    }
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleSelect(notif)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none dark:hover:bg-zinc-800 dark:focus-visible:bg-zinc-800"
                    >
                      {/* Icon */}
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                        <span className="text-sm">{icon}</span>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-semibold leading-snug ${
                            notif.is_read
                              ? "text-zinc-700 dark:text-zinc-300"
                              : "text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          {notif.title}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                          {notif.message}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          <time dateTime={notif.created_at}>
                            {formatRelativeTime(notif.created_at)}
                          </time>
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!notif.is_read && (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500"
                          aria-hidden
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
