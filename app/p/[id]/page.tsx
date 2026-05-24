import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin as MapPinIcon } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { PinSocial } from "@/components/pin-social";

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

const CATEGORY_ACCENT: Record<CategoryId, string> = {
  lost_property: "from-amber-500/15 to-amber-500/0",
  found_property: "from-teal-500/15 to-teal-500/0",
  missing_pet: "from-emerald-500/15 to-emerald-500/0",
  found_pet: "from-pink-500/15 to-pink-500/0",
  stolen_vehicle: "from-sky-500/15 to-sky-500/0",
  break_in: "from-rose-500/15 to-rose-500/0",
  suspicious_activity: "from-violet-500/15 to-violet-500/0",
};

async function fetchPin(id: string): Promise<MapPin | null> {
  const { data, error } = await supabase
    .from("MapPin")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[p/[id]:fetchPin]", error);
    return null;
  }
  return (data as MapPin | null) ?? null;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pin = await fetchPin(id);

  if (!pin) {
    return {
      title: "Report not found | LostStolenFound Malvern East",
      description:
        "This incident report could not be found. Browse the live community map for nearby reports.",
    };
  }

  const title = `${pin.title} | LostStolenFound Malvern East`;
  const description = truncate(
    pin.description?.trim() ||
      `${CATEGORY_LABELS[pin.category]} reported in Malvern East via LostStolenFound.`,
    150,
  );
  const image = pin.image_url ?? "/og-image.jpg";

  return {
    title,
    description,
    openGraph: {
      type: "article",
      locale: "en_AU",
      title,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function PinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pin = await fetchPin(id);
  if (!pin) notFound();

  const categoryLabel = CATEGORY_LABELS[pin.category];
  const status: PinStatus = pin.status ?? "open";
  const statusMeta = STATUS_META[status];
  const accent = CATEGORY_ACCENT[pin.category];
  const formattedDate = new Date(pin.created_at).toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <main className="min-h-screen bg-zinc-50 pb-16 dark:bg-zinc-950">
      <div className={`bg-gradient-to-b ${accent}`}>
        <div className="mx-auto max-w-3xl px-4 pb-8 pt-10 sm:pt-14">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to map
            </Link>
            <Link
              href={`/?pin=${pin.id}`}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              <MapPinIcon className="h-4 w-4" aria-hidden />
              View on Map
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-zinc-900/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              {categoryLabel}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusMeta.classes}`}
            >
              {statusMeta.label}
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            {pin.title}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Reported{" "}
            <time dateTime={pin.created_at}>{formattedDate}</time>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4">
        {pin.image_url && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pin.image_url}
              alt={`Photo evidence for ${pin.title}`}
              className="h-auto max-h-[640px] w-full object-cover"
            />
          </div>
        )}

        <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Description
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-zinc-800 dark:text-zinc-200">
            {pin.description?.trim()
              ? pin.description
              : "No additional description was provided."}
          </p>
        </section>

        <div className="mt-6">
          <PinSocial pinId={pin.id} />
        </div>
      </div>
    </main>
  );
}
