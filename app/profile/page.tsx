"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  MapPin as MapPinIcon,
  ShieldCheck,
  ClipboardList,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CategoryId =
  | "lost_property"
  | "found_property"
  | "missing_pet"
  | "found_pet"
  | "stolen_vehicle"
  | "break_in"
  | "suspicious_activity";

type PinStatus = "open" | "in_progress" | "resolved";

interface MapPin {
  id: string;
  title: string;
  description: string | null;
  category: CategoryId;
  latitude: number;
  longitude: number;
  image_url: string | null;
  user_id: string | null;
  status: PinStatus | null;
  created_at: string;
  updated_at: string;
}

interface VerificationRow {
  upvoteId: string;
  pin: MapPin;
}

const CATEGORY_LABELS: Record<CategoryId, string> = {
  lost_property: "Lost Property",
  found_property: "Found Property",
  missing_pet: "Missing Pet",
  found_pet: "Found Pet",
  stolen_vehicle: "Stolen Vehicle",
  break_in: "Break-In",
  suspicious_activity: "Suspicious Activity",
};

const STATUS_META: Record<PinStatus, { label: string; classes: string }> = {
  open: { label: "Open", classes: "bg-blue-100 text-blue-800 ring-blue-300" },
  in_progress: {
    label: "In Progress",
    classes: "bg-yellow-100 text-yellow-800 ring-yellow-300",
  },
  resolved: {
    label: "Resolved",
    classes: "bg-green-100 text-green-800 ring-green-300",
  },
};

const STATUSES: PinStatus[] = ["open", "in_progress", "resolved"];

type TabId = "reports" | "verifications";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function usernameFromEmail(email: string | null | undefined): string {
  if (!email) return "you";
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

export default function ProfilePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("reports");
  const [reports, setReports] = useState<MapPin[] | null>(null);
  const [verifications, setVerifications] = useState<VerificationRow[] | null>(
    null,
  );
  const [statusUpdating, setStatusUpdating] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setSessionLoaded(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setReports(null);
      setVerifications(null);
      return;
    }
    let active = true;
    (async () => {
      const reportsRes = await supabase
        .from("MapPin")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (reportsRes.error) {
        console.error("[profile:fetchReports]", reportsRes.error);
        setReports([]);
      } else {
        setReports((reportsRes.data ?? []) as MapPin[]);
      }
    })();
    (async () => {
      const upvotesRes = await supabase
        .from("PinUpvote")
        .select("id,pin_id,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (upvotesRes.error) {
        console.error("[profile:fetchUpvotes]", upvotesRes.error);
        setVerifications([]);
        return;
      }
      const rows = (upvotesRes.data ?? []) as {
        id: string;
        pin_id: string;
        created_at: string;
      }[];
      if (rows.length === 0) {
        setVerifications([]);
        return;
      }
      const ids = rows.map((r) => r.pin_id);
      const pinsRes = await supabase
        .from("MapPin")
        .select("*")
        .in("id", ids);
      if (!active) return;
      if (pinsRes.error) {
        console.error("[profile:fetchVerifiedPins]", pinsRes.error);
        setVerifications([]);
        return;
      }
      const pinMap = new Map<string, MapPin>();
      for (const p of (pinsRes.data ?? []) as MapPin[]) pinMap.set(p.id, p);
      const merged: VerificationRow[] = rows
        .map((r) => {
          const pin = pinMap.get(r.pin_id);
          return pin ? { upvoteId: r.id, pin } : null;
        })
        .filter((v): v is VerificationRow => v !== null);
      setVerifications(merged);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  async function updateStatus(pinId: string, newStatus: PinStatus) {
    if (statusUpdating[pinId]) return;
    setStatusUpdating((m) => ({ ...m, [pinId]: true }));
    const { error } = await supabase
      .from("MapPin")
      .update({ status: newStatus })
      .eq("id", pinId);
    setStatusUpdating((m) => {
      const next = { ...m };
      delete next[pinId];
      return next;
    });
    if (error) {
      console.error("[profile:updateStatus]", error);
      alert("Failed to update status. Please try again.");
      return;
    }
    setReports((prev) =>
      prev
        ? prev.map((p) => (p.id === pinId ? { ...p, status: newStatus } : p))
        : prev,
    );
  }

  const stats = useMemo(() => {
    const reportCount = reports?.length ?? 0;
    const verificationCount = verifications?.length ?? 0;
    const openCount =
      reports?.filter((p) => (p.status ?? "open") === "open").length ?? 0;
    return { reportCount, verificationCount, openCount };
  }, [reports, verifications]);

  if (!sessionLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2
          className="h-6 w-6 animate-spin text-zinc-500"
          aria-hidden
        />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
            Please sign in to view your profile
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Your reports, verifications, and dashboard live here once you&rsquo;re
            signed in.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to map
          </Link>
        </div>
      </main>
    );
  }

  const username = usernameFromEmail(session.user.email);

  return (
    <main className="min-h-screen bg-zinc-50 pb-16 dark:bg-zinc-950">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-700 text-white dark:from-black dark:to-zinc-900">
        <div className="mx-auto max-w-5xl px-4 pb-10 pt-10 sm:pt-14">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-200 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to map
          </Link>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Dashboard
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                @{username}
              </h1>
              <p className="mt-1 text-sm text-zinc-300">
                {session.user.email}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <Stat label="Reports" value={stats.reportCount} />
              <Stat label="Still Open" value={stats.openCount} />
              <Stat label="Verified" value={stats.verificationCount} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4">
        <div
          role="tablist"
          aria-label="Profile sections"
          className="mt-6 inline-flex gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
        >
          <TabButton
            active={activeTab === "reports"}
            onClick={() => setActiveTab("reports")}
            icon={<ClipboardList className="h-4 w-4" aria-hidden />}
            label="My Reports"
            count={reports?.length}
          />
          <TabButton
            active={activeTab === "verifications"}
            onClick={() => setActiveTab("verifications")}
            icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
            label="My Verifications"
            count={verifications?.length}
          />
        </div>

        <section
          role="tabpanel"
          aria-label="My Reports"
          className={`mt-6 ${activeTab === "reports" ? "" : "hidden"}`}
        >
          {reports === null ? (
            <LoadingGrid />
          ) : reports.length === 0 ? (
            <EmptyState
              title="You haven't filed any reports yet."
              body="When you report a lost item, missing pet, or alert from the map, it will show up here."
              cta="Open the map"
            />
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {reports.map((pin) => {
                const status: PinStatus = pin.status ?? "open";
                const updating = !!statusUpdating[pin.id];
                return (
                  <li key={pin.id}>
                    <Card className="h-full bg-white dark:bg-zinc-900">
                      {pin.image_url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={pin.image_url}
                          alt=""
                          className="h-40 w-full rounded-t-xl object-cover"
                        />
                      )}
                      <CardHeader className="gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            {CATEGORY_LABELS[pin.category]}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${STATUS_META[status].classes}`}
                          >
                            {STATUS_META[status].label}
                          </span>
                        </div>
                        <CardTitle className="text-lg font-bold leading-snug">
                          {pin.title}
                        </CardTitle>
                        <p className="text-xs text-zinc-500">
                          <time dateTime={pin.created_at}>
                            {formatDate(pin.created_at)}
                          </time>
                        </p>
                      </CardHeader>
                      <CardContent>
                        <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                          {pin.description?.trim() || "No description provided."}
                        </p>
                        <div className="mt-4">
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Update status
                          </p>
                          <div
                            role="group"
                            aria-label={`Update status for ${pin.title}`}
                            className="flex flex-wrap gap-1.5"
                          >
                            {STATUSES.map((s) => {
                              const isActive = status === s;
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => updateStatus(pin.id, s)}
                                  disabled={updating || isActive}
                                  aria-pressed={isActive}
                                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                                    isActive
                                      ? `${STATUS_META[s].classes} ring-2 ring-offset-1`
                                      : "bg-white text-zinc-700 ring-zinc-300 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700 dark:hover:bg-zinc-700"
                                  }`}
                                >
                                  {STATUS_META[s].label}
                                </button>
                              );
                            })}
                            {updating && (
                              <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                                <Loader2
                                  className="h-3 w-3 animate-spin"
                                  aria-hidden
                                />
                                Saving…
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="gap-2">
                        <Link
                          href={`/p/${pin.id}`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-zinc-900 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          Open report
                        </Link>
                        <Link
                          href={`/?pin=${pin.id}`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-zinc-800 ring-1 ring-zinc-300 transition-colors hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700 dark:hover:bg-zinc-700"
                        >
                          <MapPinIcon className="h-3.5 w-3.5" aria-hidden />
                          View on Map
                        </Link>
                      </CardFooter>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          role="tabpanel"
          aria-label="My Verifications"
          className={`mt-6 ${activeTab === "verifications" ? "" : "hidden"}`}
        >
          {verifications === null ? (
            <LoadingList />
          ) : verifications.length === 0 ? (
            <EmptyState
              title="You haven't verified any reports yet."
              body="When you mark a neighbor's report as verified, it shows up here so you can find it later."
              cta="Browse the feed"
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {verifications.map(({ upvoteId, pin }) => {
                const status: PinStatus = pin.status ?? "open";
                return (
                  <li
                    key={upvoteId}
                    className="flex items-center gap-3 rounded-xl border bg-white p-3 ring-1 ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-zinc-800"
                  >
                    {pin.image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={pin.image_url}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-zinc-200"
                      />
                    ) : (
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                        aria-hidden
                      >
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                          {CATEGORY_LABELS[pin.category]}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${STATUS_META[status].classes}`}
                        >
                          {STATUS_META[status].label}
                        </span>
                      </div>
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {pin.title}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Reported{" "}
                        <time dateTime={pin.created_at}>
                          {formatDate(pin.created_at)}
                        </time>
                      </p>
                    </div>
                    <Link
                      href={`/?pin=${pin.id}`}
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-zinc-900 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                    >
                      <MapPinIcon className="h-3.5 w-3.5" aria-hidden />
                      View on Map
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur">
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-200">
        {label}
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
        active
          ? "bg-zinc-900 text-white shadow dark:bg-white dark:text-zinc-900"
          : "bg-transparent text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
      }`}
    >
      {icon}
      <span>{label}</span>
      {typeof count === "number" && (
        <span
          className={`ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
            active
              ? "bg-white/15 text-white dark:bg-zinc-900/10 dark:text-zinc-900"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
        {title}
      </p>
      <p className="mt-1 text-sm text-zinc-500">{body}</p>
      <Link
        href="/"
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-zinc-900 px-4 text-sm font-semibold text-white shadow transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
      >
        <MapPinIcon className="h-4 w-4" aria-hidden />
        {cta}
      </Link>
    </div>
  );
}

function LoadingGrid() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label="Loading">
      {[0, 1, 2, 3].map((i) => (
        <li
          key={i}
          className="h-56 animate-pulse rounded-xl bg-white ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
        />
      ))}
    </ul>
  );
}

function LoadingList() {
  return (
    <ul className="flex flex-col gap-2" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-20 animate-pulse rounded-xl bg-white ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
        />
      ))}
    </ul>
  );
}
