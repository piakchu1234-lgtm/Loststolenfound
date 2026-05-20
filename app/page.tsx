"use client";

import { useEffect, useState } from "react";
import Map, { Marker, type ViewState } from "react-map-gl/mapbox";
import {
  Plus,
  PackageSearch,
  PawPrint,
  Car,
  DoorOpen,
  Eye,
  ArrowLeft,
  ArrowRight,
  MapPin as MapPinIcon,
  Mic,
  Send,
  Check,
  Home as HomeIcon,
  HelpCircle,
  AlertTriangle,
  Dog,
  Map as MapIcon,
  List,
  Camera,
  X,
  LogOut,
  Mail,
} from "lucide-react";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type CategoryId =
  | "lost_property"
  | "missing_pet"
  | "stolen_vehicle"
  | "break_in"
  | "suspicious_activity";

type Category = {
  id: CategoryId;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  color: string;
};

interface MapPin {
  id: string;
  title: string;
  description: string | null;
  category: CategoryId;
  latitude: number;
  longitude: number;
  image_url: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: string;
  pin_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

const CATEGORIES: Category[] = [
  {
    id: "lost_property",
    label: "Lost Property",
    description: "Wallet, phone, keys, bag",
    Icon: PackageSearch,
    color:
      "bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-900 border-amber-300 data-[selected=true]:ring-amber-500",
  },
  {
    id: "missing_pet",
    label: "Missing Pet",
    description: "Dog, cat or other animal",
    Icon: PawPrint,
    color:
      "bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-900 border-emerald-300 data-[selected=true]:ring-emerald-500",
  },
  {
    id: "stolen_vehicle",
    label: "Stolen Vehicle",
    description: "Car, motorbike, bicycle",
    Icon: Car,
    color:
      "bg-sky-100 hover:bg-sky-200 active:bg-sky-300 text-sky-900 border-sky-300 data-[selected=true]:ring-sky-500",
  },
  {
    id: "break_in",
    label: "Break-In",
    description: "Home, garage or shed",
    Icon: DoorOpen,
    color:
      "bg-rose-100 hover:bg-rose-200 active:bg-rose-300 text-rose-900 border-rose-300 data-[selected=true]:ring-rose-500",
  },
  {
    id: "suspicious_activity",
    label: "Suspicious Activity",
    description: "Something didn't feel right",
    Icon: Eye,
    color:
      "bg-violet-100 hover:bg-violet-200 active:bg-violet-300 text-violet-900 border-violet-300 data-[selected=true]:ring-violet-500",
  },
];

const PIN_VISUALS: Record<
  CategoryId,
  {
    Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
    bg: string;
    text: string;
    ring: string;
  }
> = {
  stolen_vehicle: {
    Icon: Car,
    bg: "bg-sky-500",
    text: "text-white",
    ring: "ring-sky-200",
  },
  break_in: {
    Icon: HomeIcon,
    bg: "bg-rose-500",
    text: "text-white",
    ring: "ring-rose-200",
  },
  lost_property: {
    Icon: HelpCircle,
    bg: "bg-amber-500",
    text: "text-white",
    ring: "ring-amber-200",
  },
  missing_pet: {
    Icon: Dog,
    bg: "bg-emerald-500",
    text: "text-white",
    ring: "ring-emerald-200",
  },
  suspicious_activity: {
    Icon: AlertTriangle,
    bg: "bg-violet-500",
    text: "text-white",
    ring: "ring-violet-200",
  },
};

type Step = 1 | 2 | 3;

const SENSITIVE_CATEGORIES: ReadonlySet<string> = new Set([
  "break_in",
  "suspicious_activity",
]);

function fuzzCoordinates(
  lat: number,
  lng: number,
  category: string,
): { latitude: number; longitude: number } {
  if (!SENSITIVE_CATEGORIES.has(category)) {
    return { latitude: lat, longitude: lng };
  }
  const randomOffset = () => {
    const magnitude = 0.0005 + Math.random() * 0.0005;
    const sign = Math.random() < 0.5 ? -1 : 1;
    return magnitude * sign;
  };
  return {
    latitude: lat + randomOffset(),
    longitude: lng + randomOffset(),
  };
}

const INITIAL_VIEW = {
  longitude: 145.0506,
  latitude: -37.8822,
  zoom: 13,
};

export default function Home() {
  const [viewState, setViewState] = useState<Partial<ViewState>>(INITIAL_VIEW);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [voiceInputSimulated, setVoiceInputSimulated] = useState(false);
  const [pinned, setPinned] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authSending, setAuthSending] = useState(false);
  const [authSent, setAuthSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [userUpvoteId, setUserUpvoteId] = useState<string | null>(null);
  const [upvoting, setUpvoting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [loadingSocial, setLoadingSocial] = useState(false);

  const center = {
    latitude: viewState.latitude ?? INITIAL_VIEW.latitude,
    longitude: viewState.longitude ?? INITIAL_VIEW.longitude,
  };

  async function fetchPins() {
    const { data, error } = await supabase.from("MapPin").select("*");
    if (error) {
      console.error("[fetchPins]", error);
      return;
    }
    setPins((data ?? []) as MapPin[]);
  }

  useEffect(() => {
    fetchPins();
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        setShowAuthModal(false);
        setAuthSent(false);
        setAuthEmail("");
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function fetchSocial(pinId: string) {
    setLoadingSocial(true);
    const [commentsRes, upvotesRes] = await Promise.all([
      supabase
        .from("Comments")
        .select("*")
        .eq("pin_id", pinId)
        .order("created_at", { ascending: true }),
      supabase.from("Upvotes").select("id,user_id").eq("pin_id", pinId),
    ]);
    if (commentsRes.error) {
      console.error("[fetchSocial:comments]", commentsRes.error);
    } else {
      setComments((commentsRes.data ?? []) as Comment[]);
    }
    if (upvotesRes.error) {
      console.error("[fetchSocial:upvotes]", upvotesRes.error);
      setUpvoteCount(0);
      setUserUpvoteId(null);
    } else {
      const rows = (upvotesRes.data ?? []) as {
        id: string;
        user_id: string;
      }[];
      setUpvoteCount(rows.length);
      const mine = session
        ? rows.find((r) => r.user_id === session.user.id)
        : undefined;
      setUserUpvoteId(mine?.id ?? null);
    }
    setLoadingSocial(false);
  }

  useEffect(() => {
    if (!selectedPin) {
      setComments([]);
      setUpvoteCount(0);
      setUserUpvoteId(null);
      setNewComment("");
      return;
    }
    fetchSocial(selectedPin.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPin?.id, session?.user.id]);

  function requireAuth(): boolean {
    if (session) return true;
    setShowAuthModal(true);
    return false;
  }

  async function handleSendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const email = authEmail.trim();
    if (!email || authSending) return;
    setAuthSending(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setAuthSending(false);
    if (error) {
      console.error("[signInWithOtp]", error);
      setAuthError(error.message);
      return;
    }
    setAuthSent(true);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  async function toggleUpvote() {
    if (!selectedPin || upvoting) return;
    if (!requireAuth() || !session) return;
    setUpvoting(true);
    if (userUpvoteId) {
      const prevId = userUpvoteId;
      setUserUpvoteId(null);
      setUpvoteCount((c) => Math.max(0, c - 1));
      const { error } = await supabase
        .from("Upvotes")
        .delete()
        .eq("id", prevId);
      if (error) {
        console.error("[toggleUpvote:delete]", error);
        setUserUpvoteId(prevId);
        setUpvoteCount((c) => c + 1);
      }
    } else {
      const { data, error } = await supabase
        .from("Upvotes")
        .insert({ pin_id: selectedPin.id, user_id: session.user.id })
        .select("id")
        .single();
      if (error || !data) {
        console.error("[toggleUpvote:insert]", error);
      } else {
        setUserUpvoteId(data.id as string);
        setUpvoteCount((c) => c + 1);
      }
    }
    setUpvoting(false);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPin || postingComment) return;
    const content = newComment.trim();
    if (!content) return;
    if (!requireAuth() || !session) return;
    setPostingComment(true);
    const { error } = await supabase.from("Comments").insert({
      pin_id: selectedPin.id,
      user_id: session.user.id,
      content,
    });
    setPostingComment(false);
    if (error) {
      console.error("[submitComment]", error);
      return;
    }
    setNewComment("");
    await fetchSocial(selectedPin.id);
  }

  function resetForm() {
    setStep(1);
    setCategory(null);
    setTitle("");
    setDescription("");
    setVoiceInputSimulated(false);
    setPinned(null);
    clearImage();
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      console.error("[handleImageChange] not an image", file.type);
      return;
    }
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setImageFile(file);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      resetForm();
      setPinned({ lat: center.latitude, lng: center.longitude });
    }
  }

  function goNext() {
    if (step === 1 && !category) return;
    if (step === 2 && title.trim().length === 0) return;
    if (step < 3) setStep((s) => (s + 1) as Step);
  }

  function goBack() {
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  async function handleSubmit() {
    if (!category || !pinned || submitting) return;
    if (!requireAuth() || !session) return;
    setSubmitting(true);
    const { latitude, longitude } = fuzzCoordinates(
      pinned.lat,
      pinned.lng,
      category,
    );

    let image_url: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("incident-photos")
        .upload(path, imageFile, {
          contentType: imageFile.type,
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) {
        console.error("[ReportSubmit] image upload failed", uploadError);
        setSubmitting(false);
        alert("Image upload failed. Please try again or submit without a photo.");
        return;
      }
      const { data: publicUrlData } = supabase.storage
        .from("incident-photos")
        .getPublicUrl(path);
      image_url = publicUrlData.publicUrl;
    }

    const { error } = await supabase.from("MapPin").insert({
      title: title.trim(),
      description: description.trim() || null,
      category,
      latitude,
      longitude,
      image_url,
      user_id: session.user.id,
    });
    setSubmitting(false);
    if (error) {
      console.error("[ReportSubmit]", error);
      return;
    }
    setOpen(false);
    resetForm();
    await fetchPins();
  }

  const canAdvance =
    (step === 1 && !!category) ||
    (step === 2 && title.trim().length > 0) ||
    step === 3;

  const visiblePins = pins.filter(
    (pin) => activeFilters.length === 0 || activeFilters.includes(pin.category),
  );

  function toggleFilter(id: CategoryId) {
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  return (
    <div className="fixed inset-0 h-screen w-screen">
      <div className="fixed top-6 right-4 z-[50]">
        {session ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="h-9 gap-2 rounded-full bg-white px-3 text-xs font-semibold shadow-md"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() => setShowAuthModal(true)}
            className="h-9 gap-2 rounded-full bg-zinc-900 px-3 text-xs font-semibold text-white shadow-md hover:bg-zinc-800"
          >
            <Mail className="h-4 w-4" aria-hidden />
            Sign in
          </Button>
        )}
      </div>
      <div
        role="tablist"
        aria-label="Choose view"
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[50] bg-white rounded-full shadow-lg p-1 flex gap-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === "map"}
          onClick={() => setViewMode("map")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
            viewMode === "map"
              ? "bg-zinc-900 text-white"
              : "bg-transparent text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          <MapIcon className="h-4 w-4" aria-hidden />
          Map
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === "list"}
          onClick={() => setViewMode("list")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
            viewMode === "list"
              ? "bg-zinc-900 text-white"
              : "bg-transparent text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          <List className="h-4 w-4" aria-hidden />
          Feed
        </button>
      </div>

      <div
        role="group"
        aria-label="Filter by category"
        className="fixed top-20 left-0 right-0 z-[50] flex justify-center px-4"
      >
        <div className="flex max-w-full gap-2 overflow-x-auto rounded-full bg-white/95 p-1.5 shadow-lg ring-1 ring-zinc-200 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((c) => {
            const isActive = activeFilters.includes(c.id);
            const v = PIN_VISUALS[c.id];
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => toggleFilter(c.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                  isActive
                    ? `${v.bg} ${v.text} shadow-md ring-2 ring-offset-1 ring-zinc-900/10`
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                <c.Icon className="h-4 w-4" aria-hidden />
                <span className="whitespace-nowrap">{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {viewMode === "map" && (
        <>
          <Map
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        {visiblePins.map((p) => {
          const v = PIN_VISUALS[p.category];
          const Icon = v.Icon;
          return (
            <Marker
              key={p.id}
              latitude={p.latitude}
              longitude={p.longitude}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedPin(p);
              }}
            >
              <span
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full shadow-lg ring-4 transition-transform hover:scale-110 ${v.bg} ${v.text} ${v.ring}`}
                title={p.title}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
            </Marker>
          );
        })}

        {pinned && open && step === 3 && (
          <Marker latitude={pinned.lat} longitude={pinned.lng} anchor="bottom">
            <MapPinIcon
              className="h-10 w-10 text-rose-600 drop-shadow-lg"
              aria-hidden
            />
          </Marker>
        )}
      </Map>

      <Sheet
        open={!!selectedPin}
        onOpenChange={(open) => {
          if (!open) setSelectedPin(null);
        }}
      >
        <SheetContent className="w-full gap-0 sm:max-w-md">
          {selectedPin && (() => {
            const v = PIN_VISUALS[selectedPin.category];
            const HeaderIcon = v.Icon;
            const categoryLabel =
              CATEGORIES.find((c) => c.id === selectedPin.category)?.label ??
              selectedPin.category;
            const formattedDate = new Date(
              selectedPin.created_at,
            ).toLocaleString(undefined, {
              dateStyle: "long",
              timeStyle: "short",
            });
            return (
              <>
                <SheetHeader className="border-b">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-md ring-4 ${v.bg} ${v.text} ${v.ring}`}
                    >
                      <HeaderIcon className="h-6 w-6" aria-hidden />
                    </span>
                    <span className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                      {categoryLabel}
                    </span>
                  </div>
                  <SheetTitle className="text-2xl font-bold leading-tight tracking-tight text-zinc-900">
                    {selectedPin.title}
                  </SheetTitle>
                  <SheetDescription className="text-sm text-zinc-600">
                    Reported {formattedDate}
                  </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-4 py-5">
                  {selectedPin.image_url && (
                    <div className="mb-5 overflow-hidden rounded-xl ring-1 ring-zinc-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedPin.image_url}
                        alt={`Photo evidence for ${selectedPin.title}`}
                        className="max-h-64 w-full object-cover"
                      />
                    </div>
                  )}
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                    Description
                  </h3>
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-zinc-800">
                    {selectedPin.description?.trim()
                      ? selectedPin.description
                      : "No additional description was provided."}
                  </p>
                </div>

                <div className="border-t bg-zinc-50 px-4 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                      Community Verification
                    </h3>
                    <Button
                      type="button"
                      onClick={toggleUpvote}
                      disabled={upvoting || loadingSocial}
                      aria-pressed={!!userUpvoteId}
                      aria-label={
                        userUpvoteId ? "Remove upvote" : "Upvote this report"
                      }
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

                  <div className="mt-4">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Comments ({comments.length})
                    </h4>
                    {loadingSocial && comments.length === 0 ? (
                      <p className="text-sm text-zinc-500">Loading…</p>
                    ) : comments.length === 0 ? (
                      <p className="text-sm text-zinc-500">
                        No comments yet. Be the first to add context.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {comments.map((c) => (
                          <li
                            key={c.id}
                            className="rounded-lg bg-white px-3 py-2 ring-1 ring-zinc-200"
                          >
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
                              {c.content}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              <time dateTime={c.created_at}>
                                {new Date(c.created_at).toLocaleString(
                                  undefined,
                                  { dateStyle: "medium", timeStyle: "short" },
                                )}
                              </time>
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <form onSubmit={submitComment} className="mt-4 flex gap-2">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={
                        session
                          ? "Add a comment…"
                          : "Sign in to add a comment…"
                      }
                      aria-label="New comment"
                      className="h-11 text-base"
                      disabled={postingComment}
                    />
                    <Button
                      type="submit"
                      disabled={
                        postingComment || newComment.trim().length === 0
                      }
                      className="h-11 bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                    >
                      <Send className="mr-1 h-4 w-4" aria-hidden />
                      {postingComment ? "Posting…" : "Post"}
                    </Button>
                  </form>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Crosshair while choosing pin location */}
      {open && step === 3 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="h-6 w-6 rounded-full border-4 border-rose-600 bg-white/80 shadow-lg" />
        </div>
      )}

      {/* Floating Trigger Button */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center sm:bottom-10">
        <Button
          size="lg"
          aria-label="Report an incident"
          onClick={() => {
            if (!requireAuth()) return;
            handleOpenChange(true);
          }}
          className="pointer-events-auto h-16 gap-3 rounded-full bg-rose-600 px-8 text-lg font-semibold text-white shadow-2xl ring-4 ring-white/70 transition-transform hover:bg-rose-700 hover:scale-105 active:scale-100 active:bg-rose-800 focus-visible:ring-rose-300 sm:h-20 sm:px-10 sm:text-xl"
        >
          <Plus className="!h-7 !w-7" aria-hidden />
          Report Incident
        </Button>
      </div>
        </>
      )}

      {viewMode === "list" && (
        <div className="w-full min-h-screen bg-slate-50 overflow-y-auto pt-24 pb-12 px-4">
          <div className="mx-auto max-w-2xl">
            <header className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                Community Feed
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                Recent incident reports from your neighbourhood, newest first.
              </p>
            </header>

            {visiblePins.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-white p-10 text-center">
                <p className="text-base font-medium text-zinc-700">
                  {pins.length === 0
                    ? "No reports yet."
                    : "No reports match the active filters."}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  {pins.length === 0
                    ? "Be the first to share something happening nearby."
                    : "Try clearing a filter to see more reports."}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-4" aria-label="Incident reports">
                {[...visiblePins]
                  .sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime(),
                  )
                  .map((p) => {
                    const v = PIN_VISUALS[p.category];
                    const Icon = v.Icon;
                    const categoryLabel =
                      CATEGORIES.find((c) => c.id === p.category)?.label ??
                      p.category;
                    const formattedDate = new Date(
                      p.created_at,
                    ).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                    return (
                      <li key={p.id}>
                        <Card className="bg-white">
                          {p.image_url && (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={p.image_url}
                                alt={`Photo evidence for ${p.title}`}
                                className="h-48 w-full object-cover"
                              />
                            </>
                          )}
                          <CardHeader>
                            <div className="flex items-start gap-3">
                              <span
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-md ring-4 ${v.bg} ${v.text} ${v.ring}`}
                                aria-hidden
                              >
                                <Icon className="h-5 w-5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                  {categoryLabel}
                                </span>
                                <CardTitle className="mt-0.5 text-lg font-bold leading-snug text-zinc-900">
                                  {p.title}
                                </CardTitle>
                                <p className="mt-1 text-xs text-zinc-500">
                                  <time dateTime={p.created_at}>
                                    {formattedDate}
                                  </time>
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                              {p.description?.trim()
                                ? p.description
                                : "No additional description was provided."}
                            </p>
                          </CardContent>
                          <CardFooter>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled
                              aria-label="Upvote or verify (coming soon)"
                            >
                              👍 Upvote / Verify
                            </Button>
                          </CardFooter>
                        </Card>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-lg gap-0 p-0 sm:max-w-xl"
          showCloseButton
        >
          <DialogHeader className="border-b px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-2xl font-bold tracking-tight">
                {step === 1 && "What happened?"}
                {step === 2 && "Tell us about it"}
                {step === 3 && "Confirm location"}
              </DialogTitle>
              <span
                className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700"
                aria-live="polite"
              >
                Step {step} of 3
              </span>
            </div>
            <DialogDescription className="text-base text-zinc-600">
              {step === 1 && "Pick the option that fits best."}
              {step === 2 && "A short title is enough — details help, but are optional."}
              {step === 3 && "We will pin this report to your current map view."}
            </DialogDescription>
            <StepIndicator step={step} />
          </DialogHeader>

          <div className="px-6 py-6">
            {step === 1 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Incident category">
                {CATEGORIES.map((c) => {
                  const selected = category === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      data-selected={selected}
                      onClick={() => setCategory(c.id)}
                      className={`flex h-full min-h-[120px] w-full flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 ${c.color} ${selected ? "ring-4 scale-[1.02]" : ""}`}
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/70">
                        <c.Icon className="h-7 w-7" aria-hidden />
                      </span>
                      <span className="flex-1">
                        <span className="block text-lg font-semibold leading-tight">{c.label}</span>
                        <span className="mt-1 block text-sm opacity-80">{c.description}</span>
                      </span>
                      {selected && (
                        <Check className="h-6 w-6 shrink-0 self-end" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="report-title" className="text-base font-semibold">
                    Title
                  </Label>
                  <Input
                    id="report-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Lost wallet near Glen Eira Rd"
                    className="h-12 text-base"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Label htmlFor="report-description" className="text-base font-semibold">
                      Description
                    </Label>
                    <div className="flex items-center gap-2">
                      <Mic
                        className={`h-4 w-4 ${voiceInputSimulated ? "text-rose-600" : "text-zinc-500"}`}
                        aria-hidden
                      />
                      <Label
                        htmlFor="voice-toggle"
                        className="text-sm font-medium text-zinc-700"
                      >
                        Voice Input (Speech-to-Text Demo)
                      </Label>
                      <Switch
                        id="voice-toggle"
                        checked={voiceInputSimulated}
                        onCheckedChange={setVoiceInputSimulated}
                      />
                    </div>
                  </div>
                  <Textarea
                    id="report-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      voiceInputSimulated
                        ? "Listening… (simulated) — type to fill in for now"
                        : "Anything else that may help (optional)"
                    }
                    className="min-h-[120px] text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-image" className="text-base font-semibold">
                    Photo evidence (optional)
                  </Label>
                  <input
                    id="report-image"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleImageChange}
                  />
                  {imagePreview ? (
                    <div className="relative overflow-hidden rounded-xl border-2 border-zinc-200 bg-zinc-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Selected evidence preview"
                        className="h-40 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={clearImage}
                        aria-label="Remove selected photo"
                        className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900/80 text-white shadow-lg transition hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
                      >
                        <X className="h-5 w-5" aria-hidden />
                      </button>
                    </div>
                  ) : (
                    <Label
                      htmlFor="report-image"
                      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center transition hover:border-zinc-400 hover:bg-zinc-100 focus-within:border-zinc-500 focus-within:ring-4 focus-within:ring-zinc-200"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200">
                        <Camera className="h-6 w-6" aria-hidden />
                      </span>
                      <span className="text-base font-semibold text-zinc-900">
                        Add a photo
                      </span>
                      <span className="text-sm text-zinc-600">
                        Tap to upload from your camera or gallery
                      </span>
                    </Label>
                  )}
                </div>
              </div>
            )}

            {step === 3 && pinned && (
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-600 text-white">
                      <MapPinIcon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-rose-900">Pinned at map centre</p>
                      <p className="text-xs text-rose-700">
                        Drag the map behind this dialog to fine-tune.
                      </p>
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-base">
                    <div className="rounded-lg bg-white px-3 py-2">
                      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Latitude
                      </dt>
                      <dd className="font-mono text-base text-zinc-900">
                        {pinned.lat.toFixed(6)}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-white px-3 py-2">
                      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Longitude
                      </dt>
                      <dd className="font-mono text-base text-zinc-900">
                        {pinned.lng.toFixed(6)}
                      </dd>
                    </div>
                  </dl>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full text-base"
                  onClick={() =>
                    setPinned({ lat: center.latitude, lng: center.longitude })
                  }
                >
                  <MapPinIcon className="mr-2 h-5 w-5" aria-hidden />
                  Recapture current map centre
                </Button>
                {category && SENSITIVE_CATEGORIES.has(category) && (
                  <div className="flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3">
                    <Eye className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
                    <p className="text-sm text-emerald-900">
                      <span className="font-semibold">Privacy Protection Active:</span>{" "}
                      Your exact location will be anonymized and shifted to a nearby intersection.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 border-t bg-zinc-50 px-6 py-4 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={goBack}
              disabled={step === 1 || submitting}
              className="h-12 px-5 text-base"
            >
              <ArrowLeft className="mr-1 h-5 w-5" aria-hidden />
              Back
            </Button>
            {step < 3 ? (
              <Button
                type="button"
                size="lg"
                onClick={goNext}
                disabled={!canAdvance}
                className="h-12 px-6 text-base"
              >
                Next
                <ArrowRight className="ml-1 h-5 w-5" aria-hidden />
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                onClick={handleSubmit}
                disabled={submitting}
                className="h-12 bg-rose-600 px-6 text-base font-semibold text-white hover:bg-rose-700 active:bg-rose-800 disabled:opacity-70"
              >
                <Send className="mr-2 h-5 w-5" aria-hidden />
                {submitting ? "Submitting..." : "Submit Report"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAuthModal}
        onOpenChange={(next) => {
          setShowAuthModal(next);
          if (!next) {
            setAuthSent(false);
            setAuthError(null);
          }
        }}
      >
        <DialogContent className="max-w-md gap-0 p-0">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              Sign in
            </DialogTitle>
            <DialogDescription className="text-base text-zinc-600">
              We&apos;ll email you a one-time magic link — no password needed.
            </DialogDescription>
          </DialogHeader>
          {authSent ? (
            <div className="px-6 py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Mail className="h-6 w-6" aria-hidden />
              </div>
              <p className="text-lg font-semibold text-zinc-900">
                Check your email!
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                We sent a magic link to{" "}
                <span className="font-medium text-zinc-900">{authEmail}</span>.
                Open it on this device to sign in.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendMagicLink} className="space-y-4 px-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="auth-email" className="text-base font-semibold">
                  Email
                </Label>
                <Input
                  id="auth-email"
                  type="email"
                  required
                  autoFocus
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 text-base"
                  disabled={authSending}
                />
              </div>
              {authError && (
                <p role="alert" className="text-sm text-rose-600">
                  {authError}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={authSending || authEmail.trim().length === 0}
                className="h-12 w-full bg-zinc-900 text-base font-semibold text-white hover:bg-zinc-800 disabled:opacity-70"
              >
                <Mail className="mr-2 h-5 w-5" aria-hidden />
                {authSending ? "Sending…" : "Send Magic Link"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="mt-3 flex gap-2" aria-hidden>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            n <= step ? "bg-rose-600" : "bg-zinc-200"
          }`}
        />
      ))}
    </div>
  );
}
