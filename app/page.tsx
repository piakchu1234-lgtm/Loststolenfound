"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Map, { Marker, Source, Layer, type MapRef, type ViewState } from "react-map-gl/mapbox";
import type mapboxgl from "mapbox-gl";
import { useTheme } from "next-themes";
import imageCompression from "browser-image-compression";
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
  LocateFixed,
  Loader2,
  Share,
  Moon,
  Sun,
  Pencil,
  Trash2,
  Search,
  Crosshair,
  PackageCheck,
  Heart,
  User,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  ChevronRight,
  Phone,
  ShieldOff,
  TrendingUp,
} from "lucide-react";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { findPotentialMatches, type MatchPin } from "@/lib/matching";
import {
  getMatchesForPin,
  type PotentialMatch
} from "@/lib/matching-enhanced";
import {
  getClaimsForPin,
  type Claim
} from "@/lib/claims";
import { MatchList } from "@/components/match-list";
import { MatchComparison } from "@/components/match-comparison";
import { ClaimDialog } from "@/components/claim-dialog";
import { ClaimReview } from "@/components/claim-review";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import SidebarAdBanner from "@/components/SidebarAdBanner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type CategoryId =
  | "lost_property"
  | "found_property"
  | "missing_pet"
  | "found_pet"
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
  status: PinStatus | null;
  created_at: string;
  updated_at: string;
  profiles?: { display_name: string | null; avatar_url: string | null } | null;
}

type PinStatus = "open" | "in_progress" | "resolved";

const STATUS_META: Record<
  PinStatus,
  { label: string; classes: string }
> = {
  open: {
    label: "Open",
    classes: "bg-blue-100 text-blue-800 ring-blue-300",
  },
  in_progress: {
    label: "In Progress",
    classes: "bg-yellow-100 text-yellow-800 ring-yellow-300",
  },
  resolved: {
    label: "Resolved",
    classes: "bg-green-100 text-green-800 ring-green-300",
  },
};

interface Comment {
  id: string;
  pin_id: string;
  user_id: string;
  user_email: string | null;
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
    id: "found_property",
    label: "Found Property",
    description: "Picked something up nearby",
    Icon: PackageCheck,
    color:
      "bg-teal-100 hover:bg-teal-200 active:bg-teal-300 text-teal-900 border-teal-300 data-[selected=true]:ring-teal-500",
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
    id: "found_pet",
    label: "Found Pet",
    description: "Spotted a wandering animal",
    Icon: Heart,
    color:
      "bg-pink-100 hover:bg-pink-200 active:bg-pink-300 text-pink-900 border-pink-300 data-[selected=true]:ring-pink-500",
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
  found_property: {
    Icon: PackageCheck,
    bg: "bg-teal-500",
    text: "text-white",
    ring: "ring-teal-200",
  },
  missing_pet: {
    Icon: Dog,
    bg: "bg-emerald-500",
    text: "text-white",
    ring: "ring-emerald-200",
  },
  found_pet: {
    Icon: Heart,
    bg: "bg-pink-500",
    text: "text-white",
    ring: "ring-pink-200",
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
  const mapRef = useRef<MapRef | null>(null);
  const hasInitiallyFlownRef = useRef(false);
  const [viewState, setViewState] = useState<Partial<ViewState>>(INITIAL_VIEW);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
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
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "compressing" | "uploading" | "saving"
  >("idle");
  const [pins, setPins] = useState<MapPin[]>([]);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [drawerWide, setDrawerWide] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryId | "all">("all");
  const [activeStatus, setActiveStatus] = useState<PinStatus | "all">("open");
  const [session, setSession] = useState<Session | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authSending, setAuthSending] = useState(false);
  const [authSent, setAuthSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[] | null>([]);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [userVote, setUserVote] = useState<1 | -1 | null>(null);
  const [upvoting, setUpvoting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [editingPin, setEditingPin] = useState<MapPin | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [readableAddress, setReadableAddress] = useState<string>(
    "Fetching location details...",
  );
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressInput, setAddressInput] = useState<string>("");
  const [forwardGeocoding, setForwardGeocoding] = useState(false);
  const [isTargetingMode, setIsTargetingMode] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [potentialMatches, setPotentialMatches] = useState<MatchPin[]>([]);
  const [postSubmitView, setPostSubmitView] = useState<"form" | "matches">(
    "form",
  );
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [userVotes, setUserVotes] = useState<Record<string, 1 | -1>>({});
  const [profilesByUserId, setProfilesByUserId] = useState<
    Record<string, { display_name: string | null; avatar_url: string | null }>
  >({});
  const [creatorReputation, setCreatorReputation] = useState<
    Record<string, number>
  >({});
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanKeyword, setScanKeyword] = useState("");
  const [scanCategory, setScanCategory] = useState<
    "all" | "lost_property" | "missing_pet"
  >("all");
  const [scanResults, setScanResults] = useState<MapPin[] | null>(null);
  const [scanLoading, setScanLoading] = useState(false);

  // Matching system state
  const [matches, setMatches] = useState<PotentialMatch[]>([])
  const [showMatches, setShowMatches] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<PotentialMatch | null>(null)
  const [matchesLoading, setMatchesLoading] = useState(false)

  // Claims system state
  const [claims, setClaims] = useState<Claim[]>([])
  const [showClaimDialog, setShowClaimDialog] = useState(false)
  const [showClaimReview, setShowClaimReview] = useState(false)
  const [claimsLoading, setClaimsLoading] = useState(false)

  const center = {
    latitude: viewState.latitude ?? INITIAL_VIEW.latitude,
    longitude: viewState.longitude ?? INITIAL_VIEW.longitude,
  };

  // Hydration fix: set mounted state after initial render
  useEffect(() => {
    setMounted(true);
  }, []);

  const mapStyle =
    theme === "dark"
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/streets-v12";

  // Admin check using environment variable instead of hardcoded email
  const isAdmin = session?.user?.email &&
    process.env.NEXT_PUBLIC_ADMIN_EMAIL &&
    session.user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const canModifyPin = (pin: MapPin) =>
    session?.user?.id === pin.user_id || isAdmin;

  async function fetchAddress(lat: number, lng: number) {
    setAddressLoading(true);
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!mapboxToken) {
      console.error("[fetchAddress] Mapbox token not configured");
      setReadableAddress("Address lookup unavailable");
      setAddressInput("");
      setAddressLoading(false);
      return;
    }
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}`,
      );
      if (!response.ok) {
        throw new Error("Geocoding request failed");
      }
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const placeName = data.features[0].place_name;
        setReadableAddress(placeName);
        setAddressInput(placeName);
      } else {
        setReadableAddress("Address not found. Drop pin to refine.");
        setAddressInput("");
      }
    } catch (error) {
      console.error("[fetchAddress]", error);
      setReadableAddress("Address not found. Drop pin to refine.");
      setAddressInput("");
    } finally {
      setAddressLoading(false);
    }
  }

  async function handleForwardGeocode() {
    const query = addressInput.trim();
    if (!query || forwardGeocoding) return;

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!mapboxToken) {
      alert("Address search is unavailable. Mapbox token not configured.");
      return;
    }

    setForwardGeocoding(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}`,
      );
      if (!response.ok) {
        throw new Error("Forward geocoding request failed");
      }
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setPinned({ lat, lng });
        setReadableAddress(data.features[0].place_name);
        setAddressInput(data.features[0].place_name);

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: Math.max(mapRef.current.getZoom(), 15),
            duration: 1500,
            essential: true,
          });
        }
      } else {
        alert("No results found for that address. Please try a different search.");
      }
    } catch (error) {
      console.error("[handleForwardGeocode]", error);
      alert("Failed to search for address. Please try again.");
    } finally {
      setForwardGeocoding(false);
    }
  }

  function handleMapClick(e: mapboxgl.MapLayerMouseEvent) {
    if (isTargetingMode) {
      const { lng, lat } = e.lngLat;
      setPinned({ lat, lng });
      fetchAddress(lat, lng);
      setIsTargetingMode(false);
      return;
    }
    if (open && step === 3) {
      const { lng, lat } = e.lngLat;
      setPinned({ lat, lng });
      fetchAddress(lat, lng);
    }
  }

  async function updateStatus(newStatus: PinStatus) {
    if (!selectedPin || updatingStatus) return;
    setUpdatingStatus(true);
    const { error } = await supabase
      .from("MapPin")
      .update({ status: newStatus })
      .eq("id", selectedPin.id);
    setUpdatingStatus(false);
    if (error) {
      console.error("[updateStatus]", error);
      alert("Failed to update status. Please try again.");
      return;
    }
    setSelectedPin({ ...selectedPin, status: newStatus });
    setPins((prev) =>
      prev.map((p) =>
        p.id === selectedPin.id ? { ...p, status: newStatus } : p,
      ),
    );
  }

  async function fetchPins() {
    const joinRes = await supabase
      .from("MapPin")
      .select("*, profiles(display_name, avatar_url)");

    let rows: MapPin[];
    if (joinRes.error) {
      console.warn(
        "[fetchPins:join] falling back to separate query",
        joinRes.error,
      );
      const { data, error } = await supabase.from("MapPin").select("*");
      if (error) {
        console.error("[fetchPins]", error);
        return;
      }
      rows = (data ?? []) as MapPin[];
    } else {
      rows = (joinRes.data ?? []) as MapPin[];
    }
    setPins(rows);

    const map: Record<
      string,
      { display_name: string | null; avatar_url: string | null }
    > = {};
    for (const r of rows) {
      if (r.user_id && r.profiles) {
        map[r.user_id] = {
          display_name: r.profiles.display_name,
          avatar_url: r.profiles.avatar_url,
        };
      }
    }

    const missingUserIds = Array.from(
      new Set(
        rows
          .map((r) => r.user_id)
          .filter((id): id is string => !!id && !map[id]),
      ),
    );
    if (missingUserIds.length === 0) {
      setProfilesByUserId(map);
      return;
    }
    const profilesRes = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url")
      .in("id", missingUserIds);
    if (profilesRes.error) {
      console.error("[fetchPins:profiles]", profilesRes.error);
      setProfilesByUserId(map);
      return;
    }
    for (const row of (profilesRes.data ?? []) as {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
    }[]) {
      map[row.id] = {
        display_name: row.display_name,
        avatar_url: row.avatar_url,
      };
    }
    setProfilesByUserId(map);
  }

  // Fetch pins on mount
  useEffect(() => {
    fetchPins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function fetchComments(pinId: string) {
    setComments(null);
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("pin_id", pinId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[fetchComments]", error);
      setComments([]);
      return;
    }
    setComments((data ?? []) as Comment[]);
  }

  async function deleteComment(commentId: string) {
    if (!session) return;
    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) return;
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);
    if (error) {
      console.error("[deleteComment]", error);
      alert("Failed to delete comment.");
      return;
    }
    setComments((prev) =>
      prev ? prev.filter((c) => c.id !== commentId) : prev,
    );
  }

  async function runOwnerScan() {
    setScanLoading(true);
    setScanResults(null);
    let query = supabase
      .from("MapPin")
      .select("*")
      .neq("status", "resolved");
    if (scanCategory === "all") {
      query = query.in("category", ["lost_property", "missing_pet"]);
    } else {
      query = query.eq("category", scanCategory);
    }
    const keyword = scanKeyword.trim();
    if (keyword) {
      const safe = keyword.replace(/[%,]/g, " ");
      query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
    }
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(25);
    setScanLoading(false);
    if (error) {
      console.error("[runOwnerScan]", error);
      setScanResults([]);
      return;
    }
    setScanResults((data ?? []) as MapPin[]);
  }

  function openScanResultPin(p: MapPin) {
    setShowScanModal(false);
    setSelectedPin(p);
    setViewMode("map");
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [p.longitude, p.latitude],
        zoom: Math.max(mapRef.current.getZoom(), 15),
        duration: 1200,
        essential: true,
      });
    }
  }

  async function fetchAllVotes() {
    const { data, error } = await supabase
      .from("PinUpvote")
      .select("pin_id,user_id,vote_type");
    if (error) {
      console.error("[fetchAllVotes]", error);
      return;
    }
    const counts: Record<string, number> = {};
    const mine: Record<string, 1 | -1> = {};
    const pinOwnerById: Record<string, string | null> = {};
    for (const p of pins) pinOwnerById[p.id] = p.user_id;
    const repByOwner: Record<string, number> = {};
    for (const row of (data ?? []) as {
      pin_id: string;
      user_id: string;
      vote_type: number;
    }[]) {
      counts[row.pin_id] = (counts[row.pin_id] ?? 0) + (row.vote_type ?? 0);
      const owner = pinOwnerById[row.pin_id];
      if (owner) {
        repByOwner[owner] = (repByOwner[owner] ?? 0) + (row.vote_type ?? 0);
      }
      if (session?.user.id === row.user_id) {
        if (row.vote_type === 1) mine[row.pin_id] = 1;
        else if (row.vote_type === -1) mine[row.pin_id] = -1;
      }
    }
    setVoteCounts(counts);
    setUserVotes(mine);
    setCreatorReputation(repByOwner);
  }

  async function castVoteForPin(pin: MapPin, direction: 1 | -1) {
    if (!requireAuth() || !session) return;
    if (pin.user_id && pin.user_id === session.user.id) return;
    const previous = userVotes[pin.id] ?? null;
    const removing = previous === direction;
    const nextVote: 1 | -1 | null = removing ? null : direction;
    const delta = (nextVote ?? 0) - (previous ?? 0);

    setUserVotes((prev) => {
      const next = { ...prev };
      if (nextVote === null) delete next[pin.id];
      else next[pin.id] = nextVote;
      return next;
    });
    setVoteCounts((prev) => ({
      ...prev,
      [pin.id]: (prev[pin.id] ?? 0) + delta,
    }));
    if (selectedPin?.id === pin.id) {
      setUserVote(nextVote);
      setUpvoteCount((c) => c + delta);
    }

    const { error } = removing
      ? await supabase
          .from("PinUpvote")
          .delete()
          .eq("pin_id", pin.id)
          .eq("user_id", session.user.id)
      : await supabase.from("PinUpvote").upsert(
          {
            pin_id: pin.id,
            user_id: session.user.id,
            vote_type: direction,
          },
          { onConflict: "pin_id,user_id" },
        );

    if (error) {
      console.error("[castVoteForPin]", error);
      setUserVotes((prev) => {
        const next = { ...prev };
        if (previous === null) delete next[pin.id];
        else next[pin.id] = previous;
        return next;
      });
      setVoteCounts((prev) => ({
        ...prev,
        [pin.id]: (prev[pin.id] ?? 0) - delta,
      }));
      if (selectedPin?.id === pin.id) {
        setUserVote(previous);
        setUpvoteCount((c) => c - delta);
      }
    } else if (
      !removing &&
      direction === 1 &&
      pin.user_id &&
      pin.user_id !== session.user.id
    ) {
      const notifRes = await supabase.from("Notification").insert({
        user_id: pin.user_id,
        pin_id: pin.id,
        type: "verify",
        message: "A neighbor verified your report.",
      });
      if (notifRes.error) {
        console.error("[castVoteForPin:notify]", notifRes.error);
      }
    }
  }

  useEffect(() => {
    fetchAllVotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, pins.length]);

  async function fetchSocial(pinId: string) {
    setLoadingSocial(true);
    const upvotesRes = await supabase
      .from("PinUpvote")
      .select("user_id,vote_type")
      .eq("pin_id", pinId);
    if (upvotesRes.error) {
      console.error("[fetchSocial:upvotes]", upvotesRes.error);
      setUpvoteCount(0);
      setUserVote(null);
    } else {
      const rows = (upvotesRes.data ?? []) as {
        user_id: string;
        vote_type: number;
      }[];
      const net = rows.reduce((s, r) => s + (r.vote_type ?? 0), 0);
      setUpvoteCount(net);
      const mine = session
        ? rows.find((r) => r.user_id === session.user.id)
        : undefined;
      const v = mine?.vote_type;
      setUserVote(v === 1 ? 1 : v === -1 ? -1 : null);
    }
    setLoadingSocial(false);
  }

  // Reset drawer and fetch social data when selected pin changes
  useEffect(() => {
    setDrawerWide(false);
    if (!selectedPin) {
      setComments([]);
      setUpvoteCount(0);
      setUserVote(null);
      setNewComment("");
      return;
    }
    fetchSocial(selectedPin.id);
    fetchComments(selectedPin.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPin?.id, session?.user.id]);

  // Fetch address when pin location changes in step 3
  useEffect(() => {
    if (pinned && step === 3) {
      fetchAddress(pinned.lat, pinned.lng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned?.lat, pinned?.lng, step]);

  // Fetch matches when selected pin changes
  useEffect(() => {
    if (selectedPin?.id) {
      fetchMatchesForPin(selectedPin.id)
      // Also fetch claims if user is the owner
      if (session?.user && selectedPin.user_id === session.user.id) {
        fetchClaimsForSelectedPin(selectedPin.id)
      }
    } else {
      setMatches([])
      setShowMatches(false)
      setSelectedMatch(null)
      setClaims([])
      setShowClaimDialog(false)
      setShowClaimReview(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPin?.id, session?.user?.id])

  // Fetch matches for a pin
  async function fetchMatchesForPin(pinId: string) {
    if (!pinId) return

    try {
      setMatchesLoading(true)
      const response = await fetch(`/api/matches?pinId=${pinId}`)

      if (!response.ok) {
        console.error('[fetchMatchesForPin] API error')
        return
      }

      const data = await response.json()
      setMatches(data.matches || [])
    } catch (err) {
      console.error('[fetchMatchesForPin] Exception:', err)
      setMatches([])
    } finally {
      setMatchesLoading(false)
    }
  }

  // Handle viewing a match
  function handleViewMatch(match: PotentialMatch) {
    setSelectedMatch(match)
    setShowMatches(false)

    // Mark as viewed
    fetch('/api/matches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match.id, status: 'viewed' })
    }).catch(err => console.error('[handleViewMatch] Error:', err))
  }

  // Handle rejecting a match
  function handleRejectMatch(matchId: string) {
    fetch('/api/matches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, status: 'rejected' })
    })
    .then(() => {
      setMatches(prev => prev.filter(m => m.id !== matchId))
      setSelectedMatch(null)
    })
    .catch(err => console.error('[handleRejectMatch] Error:', err))
  }

  // Handle contacting about a match
  function handleContactMatch() {
    setSelectedMatch(null)
    // Scroll to comments or show message
    alert('Use the comments section below to discuss this match with the other person.')
  }

  // Fetch claims for a pin (owner only)
  async function fetchClaimsForSelectedPin(pinId: string) {
    if (!pinId) return

    try {
      setClaimsLoading(true)
      const response = await fetch(`/api/claims?pinId=${pinId}`)

      if (!response.ok) {
        console.error('[fetchClaimsForSelectedPin] API error')
        return
      }

      const data = await response.json()
      setClaims(data.claims || [])
    } catch (err) {
      console.error('[fetchClaimsForSelectedPin] Exception:', err)
      setClaims([])
    } finally {
      setClaimsLoading(false)
    }
  }

  // Handle successful claim submission
  function handleClaimSuccess() {
    setShowClaimDialog(false)
    alert('Your claim has been submitted! The owner will review it soon.')
  }


  function requireAuth(): boolean {
    if (session) return true;
    setShowAuthModal(true);
    return false;
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    const email = authEmail.trim();
    const password = authPassword.trim();

    if (!email || authSending) return;

    if (!password || password.length < 6) {
      setAuthError("Password must be at least 6 characters");
      return;
    }

    setAuthSending(true);
    setAuthError(null);

    if (authMode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      setAuthSending(false);
      if (error) {
        console.error("[signUp]", error);
        setAuthError(error.message);
        return;
      }
      setAuthSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setAuthSending(false);
      if (error) {
        console.error("[signInWithPassword]", error);
        setAuthError(error.message);
        return;
      }
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  async function castVote(direction: 1 | -1) {
    if (!selectedPin || upvoting) return;
    if (!requireAuth() || !session) return;
    if (selectedPin.user_id && selectedPin.user_id === session.user.id) return;
    const previous = userVote;
    const removing = previous === direction;
    const nextVote: 1 | -1 | null = removing ? null : direction;
    const delta = (nextVote ?? 0) - (previous ?? 0);

    setUpvoting(true);
    setUserVote(nextVote);
    setUpvoteCount((c) => c + delta);

    const { error } = removing
      ? await supabase
          .from("PinUpvote")
          .delete()
          .eq("pin_id", selectedPin.id)
          .eq("user_id", session.user.id)
      : await supabase
          .from("PinUpvote")
          .upsert(
            {
              pin_id: selectedPin.id,
              user_id: session.user.id,
              vote_type: direction,
            },
            { onConflict: "pin_id,user_id" },
          );

    if (error) {
      console.error("[castVote]", error);
      setUserVote(previous);
      setUpvoteCount((c) => c - delta);
    } else if (
      !removing &&
      direction === 1 &&
      selectedPin.user_id &&
      selectedPin.user_id !== session.user.id
    ) {
      const notifRes = await supabase.from("Notification").insert({
        user_id: selectedPin.user_id,
        pin_id: selectedPin.id,
        type: "verify",
        message: "A neighbor verified your report.",
      });
      if (notifRes.error) {
        console.error("[castVote:notify]", notifRes.error);
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
    const { error } = await supabase.from("comments").insert({
      pin_id: selectedPin.id,
      user_id: session.user.id,
      user_email: session.user.email ?? null,
      content,
    });
    setPostingComment(false);
    if (error) {
      console.error("[submitComment]", error);
      return;
    }
    setNewComment("");
    await fetchComments(selectedPin.id);
  }

  function resetForm() {
    setStep(1);
    setCategory(null);
    setTitle("");
    setDescription("");
    setVoiceInputSimulated(false);
    setPinned(null);
    setEditingPin(null);
    setReadableAddress("Fetching location details...");
    setAddressInput("");
    setAddressLoading(false);
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
      setPotentialMatches([]);
      setPostSubmitView("form");
      if (!editingPin) {
        setPinned({ lat: center.latitude, lng: center.longitude });
      }
    } else {
      setPotentialMatches([]);
      setPostSubmitView("form");
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

    if (editingPin) {
      const { error } = await supabase
        .from("MapPin")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          category,
        })
        .eq("id", editingPin.id);
      setSubmitting(false);
      if (error) {
        console.error("[handleSubmit:update]", error);
        alert("Failed to update the report. Please try again.");
        return;
      }
      setOpen(false);
      resetForm();
      await fetchPins();
      if (selectedPin?.id === editingPin.id) {
        const updated = await supabase
          .from("MapPin")
          .select("*")
          .eq("id", editingPin.id)
          .single();
        if (updated.data) setSelectedPin(updated.data as MapPin);
      }
      return;
    }

    const { latitude, longitude } = fuzzCoordinates(
      pinned.lat,
      pinned.lng,
      category,
    );

    let image_url: string | null = null;
    if (imageFile) {
      let fileToUpload: File = imageFile;
      try {
        setSubmitStatus("compressing");
        fileToUpload = await imageCompression(imageFile, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
      } catch (compressionError) {
        console.error(
          "[ReportSubmit] image compression failed, falling back to original",
          compressionError,
        );
        fileToUpload = imageFile;
      }

      setSubmitStatus("uploading");
      const ext = fileToUpload.name.split(".").pop()?.toLowerCase() || "jpg";
      // Generate unique filename outside of render phase
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).slice(2, 8);
      const path = `${timestamp}-${randomStr}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("incident-photos")
        .upload(path, fileToUpload, {
          contentType: fileToUpload.type || imageFile.type,
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) {
        console.error("[ReportSubmit] image upload failed", uploadError);
        setSubmitting(false);
        setSubmitStatus("idle");
        alert("Image upload failed. Please try again or submit without a photo.");
        return;
      }
      const { data: publicUrlData } = supabase.storage
        .from("incident-photos")
        .getPublicUrl(path);
      image_url = publicUrlData.publicUrl;
    }

    setSubmitStatus("saving");
    const { data: insertedRow, error } = await supabase
      .from("MapPin")
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        category,
        latitude,
        longitude,
        image_url,
        user_id: session.user.id,
      })
      .select("id,category")
      .single();
    setSubmitting(false);
    setSubmitStatus("idle");
    if (error || !insertedRow) {
      console.error("[ReportSubmit]", error);
      return;
    }
    await fetchPins();
    const matches = await findPotentialMatches({
      id: insertedRow.id as string,
      category,
    });
    if (matches.length > 0) {
      setPotentialMatches(matches);
      setPostSubmitView("matches");
      return;
    }
    setOpen(false);
    resetForm();
  }

  const canAdvance =
    (step === 1 && !!category) ||
    (step === 2 && title.trim().length > 0) ||
    step === 3;

  const filteredPins = pins.filter((pin) => {
    if (activeCategory !== "all" && pin.category !== activeCategory) return false;
    const pinStatus: PinStatus = pin.status ?? "open";
    if (activeStatus !== "all" && pinStatus !== activeStatus) return false;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const haystack = `${pin.title} ${pin.description ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  function handleLocate() {
    if (gpsLoading) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const map = mapRef.current;
        if (map) {
          map.flyTo({
            center: [longitude, latitude],
            zoom: Math.max(map.getZoom(), 15),
            duration: 1500,
            essential: true,
          });
        } else {
          setViewState((prev) => ({ ...prev, latitude, longitude, zoom: 15 }));
        }
        setGpsLoading(false);
      },
      (error) => {
        setGpsLoading(false);
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location access was denied. Please enable location permissions in your browser settings."
            : error.code === error.POSITION_UNAVAILABLE
              ? "Your location is currently unavailable. Please try again."
              : error.code === error.TIMEOUT
                ? "Locating you took too long. Please try again."
                : "Unable to retrieve your location.";
        alert(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  async function handleShare(pinId: string) {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/p/${pinId}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Incident Report", url });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return;
        console.error("[handleShare:navigator.share]", err);
      }
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard!");
      } else {
        window.prompt("Copy this link:", url);
      }
    } catch (err) {
      console.error("[handleShare:clipboard]", err);
      window.prompt("Copy this link:", url);
    }
  }

  function handleEdit(pin: MapPin) {
    setEditingPin(pin);
    setCategory(pin.category);
    setTitle(pin.title);
    setDescription(pin.description || "");
    setPinned({ lat: pin.latitude, lng: pin.longitude });
    setStep(2);
    setSelectedPin(null);
    setOpen(true);
  }

  async function handleDelete(pinId: string) {
    if (!session) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this report? This action cannot be undone.",
    );
    if (!confirmed) return;

    const { error } = await supabase.from("MapPin").delete().eq("id", pinId);
    if (error) {
      console.error("[handleDelete]", error);
      alert("Failed to delete the report. Please try again.");
      return;
    }

    setPins((prev) => prev.filter((p) => p.id !== pinId));
    if (selectedPin?.id === pinId) {
      setSelectedPin(null);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedPin) {
      window.history.replaceState(null, "", `?pin=${selectedPin.id}`);
    } else {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [selectedPin?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasInitiallyFlownRef.current) return;
    if (!isMapLoaded || pins.length === 0) return;

    const urlPinId = new URLSearchParams(window.location.search).get("pin");
    if (!urlPinId) {
      hasInitiallyFlownRef.current = true;
      return;
    }

    const match = pins.find((p) => p.id === urlPinId);
    if (!match) {
      window.history.replaceState(null, "", window.location.pathname);
      hasInitiallyFlownRef.current = true;
      return;
    }

    setSelectedPin(match);
    const map = mapRef.current;
    if (map) {
      map.flyTo({
        center: [match.longitude, match.latitude],
        zoom: Math.max(map.getZoom(), 15),
        duration: 1500,
        essential: true,
      });
    } else {
      setViewState((prev) => ({
        ...prev,
        latitude: match.latitude,
        longitude: match.longitude,
        zoom: 15,
      }));
    }
    hasInitiallyFlownRef.current = true;
  }, [isMapLoaded, pins]);

  return (
    <div className="fixed inset-0 h-screen w-screen">
      {isTargetingMode && (
        <div className="fixed top-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full bg-zinc-900 px-5 py-3 text-white shadow-2xl ring-4 ring-rose-500/40">
          <Crosshair className="h-5 w-5 animate-pulse text-rose-400" aria-hidden />
          <span className="text-sm font-semibold">
            Click anywhere on the map to set location
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsTargetingMode(false)}
            className="h-7 rounded-full bg-white px-3 text-xs font-semibold text-zinc-900 hover:bg-zinc-100"
          >
            Cancel
          </Button>
        </div>
      )}
      <div className="fixed top-6 right-4 z-[50] flex max-w-[calc(100vw-2rem)] flex-wrap items-center justify-end gap-2 sm:gap-3">
        <div role="search" className="relative hidden md:block w-48 lg:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incidents..."
            aria-label="Search incidents"
            className="h-9 w-full rounded-full bg-white/95 pl-9 pr-3 text-sm shadow-md ring-1 ring-zinc-200 backdrop-blur dark:bg-zinc-800/95 dark:ring-zinc-700"
          />
        </div>
        {mounted && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 rounded-full bg-white dark:bg-zinc-800 p-0 shadow-md"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" aria-hidden />
            ) : (
              <Moon className="h-4 w-4" aria-hidden />
            )}
          </Button>
        )}
        {session ? (
          <>
            <NotificationBell userId={session.user.id} />
            <Link
              href="/profile"
              aria-label="Open your profile dashboard"
              className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-3 text-xs font-semibold text-zinc-800 shadow-md ring-1 ring-zinc-200 transition-colors hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-700"
            >
              <User className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Profile</span>
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="h-9 gap-2 rounded-full bg-white dark:bg-zinc-800 px-3 text-xs font-semibold shadow-md"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() => setShowAuthModal(true)}
            className="h-9 gap-2 rounded-full bg-zinc-900 dark:bg-white dark:text-zinc-900 px-3 text-xs font-semibold text-white shadow-md hover:bg-zinc-800 dark:hover:bg-zinc-100"
          >
            <Mail className="h-4 w-4" aria-hidden />
            Sign in
          </Button>
        )}
      </div>
      <div
        role="tablist"
        aria-label="Choose view"
        className="fixed top-6 left-4 z-[50] bg-white dark:bg-zinc-800 rounded-full shadow-lg p-1 flex gap-1 ring-1 ring-zinc-200 dark:ring-zinc-700"
      >
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === "map"}
          onClick={() => setViewMode("map")}
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
            viewMode === "map"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "bg-transparent text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
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
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
            viewMode === "list"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "bg-transparent text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
          }`}
        >
          <List className="h-4 w-4" aria-hidden />
          Feed
        </button>
      </div>

      {/* Centered desktop top filter pill — Map view only. Drops to row 2 below the top cluster on md/lg; joins row 1 at xl where there's room. */}
      {viewMode === "map" && (
        <div className="fixed top-20 left-1/2 z-40 hidden max-w-[calc(100vw-2rem)] -translate-x-1/2 md:block xl:top-6">
          <div
            role="group"
            aria-label="Filter by category"
            className="flex flex-wrap items-center justify-center gap-1 rounded-full bg-white/95 p-1 shadow-lg ring-1 ring-zinc-200 backdrop-blur dark:bg-zinc-800/95 dark:ring-zinc-700"
          >
            <button
              type="button"
              aria-pressed={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                activeCategory === "all"
                  ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900"
                  : "bg-transparent text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              <span className="whitespace-nowrap">All</span>
            </button>
            {CATEGORIES.map((c) => {
              const isActive = activeCategory === c.id;
              const v = PIN_VISUALS[c.id];
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveCategory(isActive ? "all" : c.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                    isActive
                      ? `${v.bg} ${v.text} shadow-sm`
                      : "bg-transparent text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  <c.Icon className="h-4 w-4" aria-hidden />
                  <span className="whitespace-nowrap">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        role="search"
        className="fixed top-20 right-4 z-[50] md:hidden w-[calc(100vw-32px)] max-w-xs"
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incidents..."
            aria-label="Search incidents"
            className="h-9 rounded-full bg-white/95 pl-9 pr-3 text-sm shadow-lg ring-1 ring-zinc-200 backdrop-blur dark:bg-zinc-800/95 dark:ring-zinc-700"
          />
        </div>
      </div>

      <div
        role="group"
        aria-label="Filter by status"
        className="fixed bottom-24 left-4 z-[40] flex max-w-[calc(100vw-32px)] flex-wrap gap-2 rounded-2xl bg-white/95 p-1.5 shadow-lg ring-1 ring-zinc-200 backdrop-blur dark:bg-zinc-800/95 dark:ring-zinc-700"
      >
        {(["all", "open", "in_progress", "resolved"] as const).map((s) => {
          const isActive = activeStatus === s;
          const label = s === "all" ? "All" : STATUS_META[s].label;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveStatus(s)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                isActive
                  ? s === "all"
                    ? "bg-zinc-900 text-white ring-zinc-900 dark:bg-white dark:text-zinc-900 dark:ring-white"
                    : `${STATUS_META[s].classes} ring-2 ring-offset-1`
                  : "bg-white text-zinc-700 ring-zinc-300 hover:bg-zinc-100 dark:bg-zinc-700 dark:text-zinc-200 dark:ring-zinc-600 dark:hover:bg-zinc-600"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? (
        <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
          <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-lg dark:bg-zinc-900">
            <MapIcon className="mx-auto h-16 w-16 text-zinc-400" aria-hidden />
            <h2 className="mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Map Unavailable
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Mapbox token is not configured. Please add NEXT_PUBLIC_MAPBOX_TOKEN to your environment variables.
            </p>
          </div>
        </div>
      ) : (
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(e) => setViewState(e.viewState)}
          onLoad={() => setIsMapLoaded(true)}
          onClick={handleMapClick}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          style={{ width: "100%", height: "100%", zIndex: 0 }}
          mapStyle={mapStyle}
        >
        <Source
          id="fuzz-radius-source"
          type="geojson"
          data={{
            type: "FeatureCollection",
            features: filteredPins
              .filter((p) => SENSITIVE_CATEGORIES.has(p.category))
              .map((p) => ({
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [p.longitude, p.latitude],
                },
                properties: { id: p.id, category: p.category },
              })),
          }}
        >
          <Layer
            id="fuzz-radius-fill"
            type="circle"
            paint={{
              "circle-radius": [
                "interpolate",
                ["exponential", 2],
                ["zoom"],
                10,
                4,
                15,
                40,
                20,
                900,
              ],
              "circle-color": [
                "match",
                ["get", "category"],
                "break_in",
                "#f43f5e",
                "suspicious_activity",
                "#8b5cf6",
                "#71717a",
              ],
              "circle-opacity": 0.12,
              "circle-stroke-color": [
                "match",
                ["get", "category"],
                "break_in",
                "#e11d48",
                "suspicious_activity",
                "#7c3aed",
                "#52525b",
              ],
              "circle-stroke-opacity": 0.4,
              "circle-stroke-width": 1.5,
            }}
          />
        </Source>

        {filteredPins.map((p) => {
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
              <div className="relative flex flex-col items-center" style={{ zIndex: 10 }}>
                <span
                  className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full shadow-lg ring-4 transition-transform hover:scale-110 ${v.bg} ${v.text} ${v.ring}`}
                  title={p.title}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                {(viewState.zoom ?? 0) >= 14 && (
                  <span
                    className="pointer-events-none mt-1 max-w-[140px] truncate rounded-md bg-white/95 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-900 shadow ring-1 ring-zinc-900/10 dark:bg-zinc-900/95 dark:text-zinc-50 dark:ring-white/20"
                    style={{
                      textShadow:
                        "0 1px 2px rgba(255,255,255,0.95), 0 -1px 2px rgba(255,255,255,0.95), 1px 0 2px rgba(255,255,255,0.95), -1px 0 2px rgba(255,255,255,0.95)",
                    }}
                  >
                    {p.title}
                  </span>
                )}
              </div>
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
      )}

      {/* Pin Detail Drawer (progressive narrow/wide) — slides in when a pin is selected */}
      {selectedPin && drawerWide && (
        <div
          aria-hidden
          onClick={() => setDrawerWide(false)}
          className="fixed inset-0 z-30 hidden bg-black/20 backdrop-blur-sm transition-opacity duration-300 md:block"
        />
      )}
      <aside
        aria-label="Pin details"
        aria-hidden={!selectedPin}
        className={`fixed z-[55] flex flex-col bg-white shadow-2xl ring-1 ring-zinc-200 transition-all duration-300 ease-in-out dark:bg-zinc-900 dark:ring-zinc-700
          bottom-0 left-0 right-0 h-[70vh] rounded-t-2xl border-t
          md:top-0 md:right-0 md:bottom-0 md:left-auto md:h-auto md:rounded-t-none md:rounded-l-2xl md:border-t-0 md:border-l
          ${drawerWide ? "md:w-[75vw]" : "md:w-96"}
          ${
            selectedPin
              ? "translate-y-0 md:translate-x-0"
              : "translate-y-full md:translate-y-0 md:translate-x-full pointer-events-none"
          }`}
      >
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
          const currentStatus: PinStatus = selectedPin.status ?? "open";
          const statusMeta = STATUS_META[currentStatus];
          const isOwnPin =
            !!session?.user?.id &&
            selectedPin.user_id === session.user.id;
          const voteDisabledReason = isOwnPin
            ? "You cannot vote on your own report."
            : !session
              ? "Sign in to vote on reports."
              : undefined;
          const detailProfile =
            selectedPin.profiles ??
            (selectedPin.user_id
              ? profilesByUserId[selectedPin.user_id]
              : undefined);
          const detailCreatorName =
            detailProfile?.display_name?.trim() || "Anonymous";
          const detailCreatorAvatar = detailProfile?.avatar_url ?? null;
          return (
            <>
              {/* Edge-attached minimize/maximize tab — outside-left edge of drawer (desktop only) */}
              <button
                type="button"
                onClick={() => setDrawerWide((w) => !w)}
                aria-label={
                  drawerWide
                    ? "Minimise pin details panel"
                    : "Maximise pin details panel"
                }
                aria-pressed={drawerWide}
                title={drawerWide ? "Minimise panel" : "Maximise panel"}
                className="absolute -left-8 top-1/2 z-[60] hidden h-16 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-l-md border border-r-0 border-zinc-200 bg-white text-zinc-700 shadow-md transition-all duration-300 hover:bg-zinc-50 md:flex dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {drawerWide ? (
                  <ChevronRight className="h-4 w-4" aria-hidden />
                ) : (
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                )}
              </button>
              {/* Header: close button on the LEFT to avoid the top-right user nav */}
              <div
                className={`relative z-[50] flex items-center gap-2 border-b border-zinc-200 px-4 py-3 pl-4 dark:border-zinc-700 ${
                  drawerWide ? "md:pr-[26rem]" : ""
                }`}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPin(null)}
                  aria-label="Close pin details"
                  className="relative z-[50] h-9 shrink-0 gap-1.5 rounded-full px-3 text-xs font-semibold"
                >
                  <X className="h-4 w-4" aria-hidden />
                  <span>Close</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setViewMode("map");
                    if (mapRef.current) {
                      mapRef.current.flyTo({
                        center: [
                          selectedPin.longitude,
                          selectedPin.latitude,
                        ],
                        zoom: Math.max(mapRef.current.getZoom(), 16),
                        duration: 1200,
                        essential: true,
                      });
                    }
                    setSelectedPin(null);
                  }}
                  aria-label="Show this pin on the map"
                  className="h-9 gap-1.5 rounded-full bg-sky-600 px-4 text-xs font-semibold text-white shadow-md hover:bg-sky-700"
                >
                  <MapPinIcon className="h-4 w-4" aria-hidden />
                  Show on Map
                </Button>
                <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                  <a
                    href="tel:000"
                    aria-label="Call emergency services on triple zero"
                    className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-md flex items-center gap-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
                  >
                    <Phone className="h-4 w-4" aria-hidden />
                    <span>Call Police</span>
                  </a>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    aria-label="Silent Report (coming soon)"
                    title="Coming Soon: Secure backend integration pending."
                    className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-4 py-2 rounded-md flex items-center gap-2 text-xs shadow-sm opacity-50 cursor-not-allowed"
                  >
                    <ShieldOff className="h-4 w-4" aria-hidden />
                    <span>Silent Report</span>
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare(selectedPin.id)}
                    aria-label="Share this report"
                    className="h-9 gap-1.5 rounded-full px-3 text-xs font-semibold"
                  >
                    <Share className="h-4 w-4" aria-hidden />
                    <span className="hidden sm:inline">Share</span>
                  </Button>

                  {/* Matches button */}
                  {matches.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMatches(true)}
                      className="h-9 gap-1.5 rounded-full px-3 text-xs font-semibold relative"
                    >
                      <TrendingUp className="h-4 w-4" aria-hidden />
                      <span>{matches.length} Match{matches.length > 1 ? 'es' : ''}</span>
                      {matches.some(m => m.confidence === 'high' && m.status === 'pending') && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
                          {matches.filter(m => m.confidence === 'high' && m.status === 'pending').length}
                        </span>
                      )}
                    </Button>
                  )}

                  {matchesLoading && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="hidden sm:inline">Finding matches...</span>
                    </div>
                  )}

                  {/* Claim button (for non-owners) */}
                  {!canModifyPin(selectedPin) && selectedPin.status === 'open' && (
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => setShowClaimDialog(true)}
                      className="h-9 gap-1.5 rounded-full px-4 text-xs font-semibold bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4" aria-hidden />
                      <span>Claim This Item</span>
                    </Button>
                  )}

                  {/* View claims button (for owners) */}
                  {canModifyPin(selectedPin) && claims.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowClaimReview(true)}
                      className="h-9 gap-1.5 rounded-full px-3 text-xs font-semibold relative"
                    >
                      <User className="h-4 w-4" aria-hidden />
                      <span>{claims.length} Claim{claims.length > 1 ? 's' : ''}</span>
                      {claims.some(c => c.status === 'pending') && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                          {claims.filter(c => c.status === 'pending').length}
                        </span>
                      )}
                    </Button>
                  )}

                  {claimsLoading && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="hidden sm:inline">Loading claims...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="border-b border-zinc-200 px-4 py-4 dark:border-zinc-700">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-md ring-4 ${v.bg} ${v.text} ${v.ring}`}
                    >
                      <HeaderIcon className="h-6 w-6" aria-hidden />
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                        {categoryLabel}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${statusMeta.classes}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>
                  <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
                    {selectedPin.title}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Reported {formattedDate}
                  </p>

                  <div className="mt-3 flex items-center gap-2.5">
                    {detailCreatorAvatar ? (
                      <Image
                        src={detailCreatorAvatar}
                        alt={`${detailCreatorName}'s avatar`}
                        width={36}
                        height={36}
                        className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-zinc-200 dark:ring-zinc-700"
                      />
                    ) : (
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300"
                        aria-hidden
                      >
                        <User className="h-5 w-5" aria-hidden />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                        Posted by
                      </p>
                      <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-50">
                        {detailCreatorName}
                      </p>
                    </div>
                  </div>

                  {canModifyPin(selectedPin) && drawerWide && (
                    <div className="mt-4">
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Update Status
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(STATUS_META) as PinStatus[]).map((s) => {
                          const meta = STATUS_META[s];
                          const isActive = currentStatus === s;
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => updateStatus(s)}
                              disabled={updatingStatus || isActive}
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors disabled:cursor-not-allowed ${
                                isActive
                                  ? `${meta.classes} ring-2 ring-offset-1`
                                  : "bg-white text-zinc-700 ring-zinc-300 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700"
                              }`}
                            >
                              {meta.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-4 py-5">
                  {selectedPin.image_url && (
                    <div className="mb-5 overflow-hidden rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-700">
                      <PinImage
                        src={selectedPin.image_url}
                        alt={`Photo evidence for ${selectedPin.title}`}
                        className="h-64 w-full"
                      />
                    </div>
                  )}
                  {drawerWide && (
                    <>
                      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                        Description
                      </h3>
                      <p className="whitespace-pre-wrap text-base leading-relaxed text-zinc-800 dark:text-zinc-200">
                        {selectedPin.description?.trim()
                          ? selectedPin.description
                          : "No additional description was provided."}
                      </p>
                    </>
                  )}
                </div>

                <div className="border-t bg-zinc-50 px-4 py-5 dark:border-zinc-700 dark:bg-zinc-800/40">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                        Community Verification
                      </h3>
                      <p
                        className={`mt-0.5 text-2xl font-bold leading-none tabular-nums ${
                          upvoteCount > 0
                            ? "text-emerald-600"
                            : upvoteCount < 0
                              ? "text-rose-600"
                              : "text-zinc-700 dark:text-zinc-200"
                        }`}
                        aria-label={`Net trust score: ${upvoteCount}`}
                      >
                        {upvoteCount > 0 ? `+${upvoteCount}` : upvoteCount}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => castVote(1)}
                        disabled={
                          upvoting || loadingSocial || isOwnPin
                        }
                        aria-pressed={userVote === 1}
                        aria-label={
                          isOwnPin
                            ? "You cannot vote on your own report"
                            : userVote === 1
                              ? "Remove your verification"
                              : "Verify this report"
                        }
                        title={voteDisabledReason}
                        className={`h-10 gap-2 rounded-full px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          userVote === 1
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-white text-zinc-800 ring-1 ring-zinc-300 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700"
                        }`}
                      >
                        <ThumbsUp className="h-4 w-4" aria-hidden />
                        <span>{userVote === 1 ? "Verified" : "Verify"}</span>
                      </Button>
                      <Button
                        type="button"
                        onClick={() => castVote(-1)}
                        disabled={
                          upvoting || loadingSocial || isOwnPin
                        }
                        aria-pressed={userVote === -1}
                        aria-label={
                          isOwnPin
                            ? "You cannot vote on your own report"
                            : userVote === -1
                              ? "Remove your flag"
                              : "Flag this report"
                        }
                        title={voteDisabledReason}
                        className={`h-10 gap-2 rounded-full px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          userVote === -1
                            ? "bg-rose-600 text-white hover:bg-rose-700"
                            : "bg-white text-zinc-800 ring-1 ring-zinc-300 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700"
                        }`}
                      >
                        <ThumbsDown className="h-4 w-4" aria-hidden />
                        <span>{userVote === -1 ? "Flagged" : "Flag"}</span>
                      </Button>
                    </div>
                  </div>
                  {isOwnPin && (
                    <p className="mt-2 text-xs italic text-zinc-500 dark:text-zinc-400">
                      You cannot vote on your own report.
                    </p>
                  )}

                  {canModifyPin(selectedPin) && drawerWide && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(selectedPin)}
                        className="flex-1 gap-2"
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(selectedPin.id)}
                        className="flex-1 gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        Delete
                      </Button>
                    </div>
                  )}

                  {drawerWide && (
                    <>
                      <div className="mt-4">
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Comments {comments && `(${comments.length})`}
                        </h4>
                        {comments === null ? (
                          <ul className="flex flex-col gap-2" aria-label="Loading comments">
                            {[0, 1, 2].map((i) => (
                              <li
                                key={i}
                                className="rounded-lg bg-white px-3 py-2 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700"
                              >
                                <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                                <div className="mt-2 h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                                <div className="mt-1 h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
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
                              const canDeleteComment =
                                session?.user?.id === c.user_id || isAdmin;
                              const emailLabel = c.user_email
                                ? c.user_email.split("@")[0]
                                : "Anonymous";
                              return (
                                <li
                                  key={c.id}
                                  className="rounded-lg bg-white px-3 py-2 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700"
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
                                    {canDeleteComment && (
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
                            session
                              ? "Add a comment…"
                              : "Sign in to leave a comment."
                          }
                          aria-label="New comment"
                          className="min-h-[44px] flex-1 text-base"
                          disabled={postingComment || !session}
                          rows={2}
                        />
                        <Button
                          type="submit"
                          disabled={
                            postingComment ||
                            newComment.trim().length === 0 ||
                            !session
                          }
                          className="h-auto bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                        >
                          <Send className="mr-1 h-4 w-4" aria-hidden />
                          {postingComment ? "Posting…" : "Post"}
                        </Button>
                      </form>

              {/* Ad Zone 2 — Pin Detail drawer bottom banner */}
                      <SidebarAdBanner />
                    </>
                  )}
                </div>
              </div>
            </>
          );
        })()}
      </aside>

      {/* Crosshair while choosing pin location */}
      {open && step === 3 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="h-6 w-6 rounded-full border-4 border-rose-600 bg-white/80 shadow-lg" />
        </div>
      )}

      {/* Floating GPS / Locate-Me button */}
      <button
        type="button"
        onClick={handleLocate}
        disabled={gpsLoading}
        aria-label={
          gpsLoading ? "Locating your position" : "Center map on my location"
        }
        aria-busy={gpsLoading}
        className="absolute bottom-8 right-4 z-[40] flex h-12 w-12 items-center justify-center rounded-full bg-white p-3 shadow-lg ring-1 ring-zinc-200 transition hover:bg-zinc-50 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 disabled:opacity-70"
      >
        {gpsLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-zinc-700" aria-hidden />
        ) : (
          <LocateFixed className="h-5 w-5 text-zinc-700" aria-hidden />
        )}
      </button>

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

      {/* Category filter bar — mobile only on the map view; desktop lives in the centered top strip */}
      {viewMode === "map" && (
        <div
          role="group"
          aria-label="Filter by category"
          className="fixed left-4 right-4 bottom-40 z-40 md:hidden"
        >
          <div className="flex w-full flex-wrap gap-2 rounded-2xl bg-white/95 p-2 shadow-lg ring-1 ring-zinc-200 backdrop-blur dark:bg-zinc-800/95 dark:ring-zinc-700">
            <button
              type="button"
              aria-pressed={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                activeCategory === "all"
                  ? "bg-zinc-900 text-white shadow-md dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
              }`}
            >
              <span className="whitespace-nowrap">All</span>
            </button>
            {CATEGORIES.map((c) => {
              const isActive = activeCategory === c.id;
              const v = PIN_VISUALS[c.id];
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveCategory(isActive ? "all" : c.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                    isActive
                      ? `${v.bg} ${v.text} shadow-md ring-2 ring-offset-1 ring-zinc-900/10`
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
                  }`}
                >
                  <c.Icon className="h-4 w-4" aria-hidden />
                  <span className="whitespace-nowrap">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Full-screen Community Feed (replaces map when viewMode === "list") */}
      {viewMode === "list" && (
        <section
          aria-label="Community feed"
          className="fixed inset-0 z-[42] flex flex-col bg-white dark:bg-zinc-900"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-4 pt-20 pb-3 dark:border-zinc-700 md:pt-6">
            <div className="ml-auto md:ml-44 flex items-center gap-2 min-w-0">
              <div className="min-w-0 text-right md:text-left">
                <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Community Feed
                </h2>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {filteredPins.length} report
                  {filteredPins.length === 1 ? "" : "s"} matching filters
                </p>
              </div>
            </div>
            <div className="ml-auto" />
          </header>

          {/* Ad Zone 1 — Community Feed top banner */}
          <div
            role="complementary"
            aria-label="Sponsored placement"
            className="shrink-0 border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/60"
          >
            <div className="mx-auto flex h-20 max-w-[1200px] items-center justify-center rounded-md border border-dashed border-zinc-300 bg-zinc-100 px-4 text-center dark:border-zinc-600 dark:bg-zinc-900/40">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  Advertisement
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                  Sponsor this neighborhood space
                </p>
              </div>
            </div>
          </div>

          {/* Mobile-only: Latest Incidents strip (sidebar takes over on md+) */}
          {pins.length > 0 && (
            <div className="shrink-0 border-b border-zinc-200 bg-amber-50/60 px-4 py-2 dark:border-zinc-700 dark:bg-amber-950/30 md:hidden">
              <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-900 dark:text-amber-200">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                Latest Incidents
              </p>
              <ul className="flex flex-col gap-0.5">
                {[...pins]
                  .sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime(),
                  )
                  .slice(0, 5)
                  .map((p) => {
                    const categoryLabel =
                      CATEGORIES.find((c) => c.id === p.category)?.label ??
                      p.category;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPin(p);
                            if (mapRef.current) {
                              mapRef.current.flyTo({
                                center: [p.longitude, p.latitude],
                                zoom: Math.max(
                                  mapRef.current.getZoom(),
                                  15,
                                ),
                                duration: 1200,
                                essential: true,
                              });
                            }
                          }}
                          className="flex w-full items-baseline gap-2 rounded px-1 py-0.5 text-left text-xs hover:bg-amber-100/60 dark:hover:bg-amber-900/40"
                        >
                          <span className="shrink-0 text-[10px] font-mono text-amber-700 dark:text-amber-300">
                            {formatRelativeTime(p.created_at)}
                          </span>
                          <span className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
                            {p.title}
                          </span>
                          <span className="shrink-0 text-[10px] uppercase text-zinc-500 dark:text-zinc-400">
                            {categoryLabel}
                          </span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}

          {/* OzBargain-style two-column layout on desktop */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1400px] md:grid md:grid-cols-4 md:gap-4 md:px-4 md:py-4">
              {/* Left column (75% on desktop) */}
              <div className="md:col-span-3 md:flex md:flex-col">
                {/* Category filter bar — pinned at top of feed column */}
                <div
                  role="group"
                  aria-label="Filter feed by category"
                  className="sticky top-0 z-10 -mx-0 mb-0 border-b border-zinc-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95 md:rounded-lg md:border md:shadow-sm"
                >
                  <div className="flex w-full gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button
                      type="button"
                      aria-pressed={activeCategory === "all"}
                      onClick={() => setActiveCategory("all")}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                        activeCategory === "all"
                          ? "bg-zinc-900 text-white shadow-md dark:bg-white dark:text-zinc-900"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
                      }`}
                    >
                      <span className="whitespace-nowrap">All</span>
                    </button>
                    {CATEGORIES.map((c) => {
                      const isActive = activeCategory === c.id;
                      const v = PIN_VISUALS[c.id];
                      return (
                        <button
                          key={c.id}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() =>
                            setActiveCategory(isActive ? "all" : c.id)
                          }
                          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                            isActive
                              ? `${v.bg} ${v.text} shadow-md ring-2 ring-offset-1 ring-zinc-900/10`
                              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
                          }`}
                        >
                          <c.Icon className="h-4 w-4" aria-hidden />
                          <span className="whitespace-nowrap">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {filteredPins.length === 0 ? (
                  <div className="m-4 rounded-lg border-2 border-dashed border-zinc-300 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-800">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                      {pins.length === 0
                        ? "No reports yet."
                        : "No reports match the active filters."}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {pins.length === 0
                        ? "Be the first to share something happening nearby."
                        : "Try clearing a filter to see more reports."}
                    </p>
                  </div>
                ) : (
                  <ul
                    className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-700 md:mt-3 md:divide-y-0 md:rounded-lg md:border md:border-zinc-200 md:bg-white md:shadow-sm md:dark:border-zinc-700 md:dark:bg-zinc-800"
                    aria-label="Incident reports"
                  >
                    {[...filteredPins]
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
                        const net = voteCounts[p.id] ?? 0;
                        const myVote = userVotes[p.id] ?? null;
                        const pinStatus: PinStatus = p.status ?? "open";
                        const statusMeta = STATUS_META[pinStatus];
                        const creatorProfile =
                          p.profiles ??
                          (p.user_id ? profilesByUserId[p.user_id] : undefined);
                        const creatorName =
                          creatorProfile?.display_name?.trim() || "Anonymous";
                        const creatorAvatar =
                          creatorProfile?.avatar_url ?? null;
                        const creatorRep =
                          p.user_id &&
                          creatorReputation[p.user_id] !== undefined
                            ? creatorReputation[p.user_id]
                            : 0;
                        const creatorRepLabel =
                          creatorRep > 0 ? `+${creatorRep}` : `${creatorRep}`;
                        const isOwnRow =
                          !!session?.user?.id && p.user_id === session.user.id;
                        const rowVoteTitle = isOwnRow
                          ? "You cannot vote on your own report."
                          : !session
                            ? "Sign in to vote on reports."
                            : undefined;
                        return (
                          <li
                            key={p.id}
                            className="flex items-stretch gap-3 px-3 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60 md:border-b md:border-zinc-200 md:last:border-b-0 md:dark:border-zinc-700"
                          >
                            {/* Far Left: Avatar + Name (OzBargain-style poster column) */}
                            <button
                              type="button"
                              onClick={() => setSelectedPin(p)}
                              aria-label={`Posted by ${creatorName}`}
                              className="flex w-20 shrink-0 flex-col items-center gap-1 self-start text-center"
                            >
                              {creatorAvatar ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={creatorAvatar}
                                  alt=""
                                  className="h-10 w-10 rounded-full object-cover ring-2 ring-zinc-200 dark:ring-zinc-700"
                                />
                              ) : (
                                <span
                                  className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300"
                                  aria-hidden
                                >
                                  <User className="h-5 w-5" aria-hidden />
                                </span>
                              )}
                              <span className="line-clamp-1 w-full text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                                {creatorName}
                              </span>
                              <span
                                className={`text-[10px] font-bold tabular-nums leading-none ${
                                  creatorRep > 0
                                    ? "text-emerald-600"
                                    : creatorRep < 0
                                      ? "text-rose-600"
                                      : "text-zinc-500"
                                }`}
                              >
                                ({creatorRepLabel})
                              </span>
                            </button>

                            {/* Middle: Title + Description + meta */}
                            <button
                              type="button"
                              onClick={() => setSelectedPin(p)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="line-clamp-2 text-sm font-bold leading-tight text-zinc-900 dark:text-zinc-50">
                                  {p.title}
                                </span>
                                <span
                                  className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider ring-1 ${statusMeta.classes}`}
                                >
                                  {statusMeta.label}
                                </span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs leading-snug text-zinc-600 dark:text-zinc-400">
                                {p.description?.trim() ||
                                  "No additional description provided."}
                              </p>
                              <p className="mt-1 truncate text-[10px] text-zinc-500 dark:text-zinc-500">
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                  {categoryLabel}
                                </span>
                                {" • "}
                                <time dateTime={p.created_at}>
                                  {formatRelativeTime(p.created_at)}
                                </time>
                              </p>
                            </button>

                            {/* Far Right: Incident thumbnail */}
                            <button
                              type="button"
                              onClick={() => setSelectedPin(p)}
                              aria-label={`Open ${p.title}`}
                              className="shrink-0 self-start"
                            >
                              {p.image_url ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={p.image_url}
                                  alt=""
                                  className="h-16 w-16 rounded object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
                                />
                              ) : (
                                <span
                                  className={`flex h-16 w-16 items-center justify-center rounded ${v.bg} ${v.text} ring-1 ring-black/5`}
                                  aria-hidden
                                >
                                  <Icon className="h-7 w-7" />
                                </span>
                              )}
                            </button>

                            {/* Vote column */}
                            <div className="flex shrink-0 flex-col items-center justify-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => castVoteForPin(p, 1)}
                                disabled={isOwnRow}
                                aria-label={
                                  isOwnRow
                                    ? "You cannot vote on your own report"
                                    : "Upvote"
                                }
                                aria-pressed={myVote === 1}
                                title={rowVoteTitle}
                                className={`flex h-6 w-6 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                  myVote === 1
                                    ? "bg-emerald-600 text-white"
                                    : "text-zinc-500 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/40"
                                }`}
                              >
                                <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
                              </button>
                              <span
                                className={`text-xs font-bold tabular-nums leading-none ${
                                  net > 0
                                    ? "text-emerald-600"
                                    : net < 0
                                      ? "text-rose-600"
                                      : "text-zinc-600 dark:text-zinc-400"
                                }`}
                                aria-label={`Net trust score ${net}`}
                              >
                                {net > 0 ? `+${net}` : net}
                              </span>
                              <button
                                type="button"
                                onClick={() => castVoteForPin(p, -1)}
                                disabled={isOwnRow}
                                aria-label={
                                  isOwnRow
                                    ? "You cannot vote on your own report"
                                    : "Downvote"
                                }
                                aria-pressed={myVote === -1}
                                title={rowVoteTitle}
                                className={`flex h-6 w-6 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                  myVote === -1
                                    ? "bg-rose-600 text-white"
                                    : "text-zinc-500 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-900/40"
                                }`}
                              >
                                <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>

              {/* Right sidebar (25% on desktop) — OzBargain "New Deals" style */}
              <aside
                aria-label="Latest incidents sidebar"
                className="hidden md:col-span-1 md:block"
              >
                <div className="sticky top-4 rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <div className="flex items-center gap-1.5 border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-200">
                      Latest Incidents
                    </h3>
                  </div>
                  {pins.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                      Nothing reported yet.
                    </p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-700">
                      {[...pins]
                        .sort(
                          (a, b) =>
                            new Date(b.created_at).getTime() -
                            new Date(a.created_at).getTime(),
                        )
                        .slice(0, 5)
                        .map((p) => {
                          const categoryLabel =
                            CATEGORIES.find((c) => c.id === p.category)
                              ?.label ?? p.category;
                          const sideProfile =
                            p.profiles ??
                            (p.user_id
                              ? profilesByUserId[p.user_id]
                              : undefined);
                          const sideAvatar = sideProfile?.avatar_url ?? null;
                          return (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedPin(p)}
                                className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700/40"
                              >
                                {sideAvatar ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={sideAvatar}
                                    alt=""
                                    className="mt-0.5 h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
                                  />
                                ) : (
                                  <span
                                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300"
                                    aria-hidden
                                  >
                                    <User className="h-3.5 w-3.5" aria-hidden />
                                  </span>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="line-clamp-2 text-xs font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                                    {p.title}
                                  </p>
                                  <p className="mt-0.5 truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                                    <span className="uppercase tracking-wide">
                                      {categoryLabel}
                                    </span>
                                    {" • "}
                                    <time dateTime={p.created_at}>
                                      {formatRelativeTime(p.created_at)}
                                    </time>
                                  </p>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </section>
      )}

      <Dialog open={open && !isTargetingMode} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-lg gap-0 p-0 sm:max-w-xl"
          showCloseButton
        >
          {postSubmitView === "matches" ? (
            <>
              <DialogHeader className="border-b px-6 py-5">
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  Report Submitted! We found potential matches…
                </DialogTitle>
                <DialogDescription className="text-base text-zinc-600">
                  These nearby reports look like they could be related. Take a
                  look — one of them might be exactly what you&rsquo;re looking
                  for.
                </DialogDescription>
              </DialogHeader>
              <div className="px-6 py-5">
                <ul
                  className="flex flex-col gap-3"
                  aria-label="Potential matches"
                >
                  {potentialMatches.map((m) => {
                    const v = PIN_VISUALS[m.category as CategoryId];
                    const Icon = v?.Icon ?? PackageSearch;
                    return (
                      <li
                        key={m.id}
                        className="flex items-center gap-3 rounded-xl border bg-white p-3 ring-1 ring-zinc-200"
                      >
                        {m.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={m.image_url}
                            alt=""
                            className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-zinc-200"
                          />
                        ) : (
                          <span
                            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg ${v?.bg ?? "bg-zinc-200"} ${v?.text ?? "text-zinc-700"}`}
                            aria-hidden
                          >
                            <Icon className="h-7 w-7" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold text-zinc-900">
                            {m.title}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            <time dateTime={m.created_at}>
                              {formatRelativeTime(m.created_at)}
                            </time>
                          </p>
                        </div>
                        <Link
                          href={`/p/${m.id}`}
                          onClick={() => {
                            setOpen(false);
                            resetForm();
                            setPotentialMatches([]);
                            setPostSubmitView("form");
                          }}
                          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-zinc-900 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800"
                        >
                          View this Pin
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <DialogFooter className="gap-2 border-t bg-zinc-50 px-6 py-4 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                    setPotentialMatches([]);
                    setPostSubmitView("form");
                  }}
                  className="h-12 px-5 text-base"
                >
                  None of these match, take me to the map
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
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
                    <div className="flex-1">
                      <p className="text-sm font-medium text-rose-900">Pin Location</p>
                      <p className="text-xs text-rose-700">
                        Type an address or click the map to drop a pin
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-900">
                      Address
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleForwardGeocode();
                          }
                        }}
                        placeholder="Search for an address..."
                        className="h-11 flex-1 text-sm"
                        disabled={addressLoading || forwardGeocoding}
                      />
                      <Button
                        type="button"
                        onClick={handleForwardGeocode}
                        disabled={addressLoading || forwardGeocoding || !addressInput.trim()}
                        className="h-11 px-4"
                      >
                        {forwardGeocoding ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Search className="h-4 w-4" aria-hidden />
                        )}
                      </Button>
                    </div>
                    {addressLoading && (
                      <p className="mt-2 flex items-center gap-2 text-xs text-rose-700">
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                        Fetching location details...
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full gap-2 text-base"
                  onClick={() => setIsTargetingMode(true)}
                >
                  <Crosshair className="h-5 w-5" aria-hidden />
                  📍 Choose location on map
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
                {submitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <Send className="mr-2 h-5 w-5" aria-hidden />
                )}
                {submitStatus === "compressing"
                  ? "Compressing photo..."
                  : submitStatus === "uploading"
                    ? "Uploading..."
                    : submitStatus === "saving"
                      ? "Saving report..."
                      : submitting
                        ? "Submitting..."
                        : "Submit Report"}
              </Button>
            )}
          </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAuthModal}
        onOpenChange={(next) => {
          setShowAuthModal(next);
          if (!next) {
            setAuthSent(false);
            setAuthError(null);
            setAuthPassword("");
            setAuthMode("login");
          }
        }}
      >
        <DialogContent className="max-w-md gap-0 p-0">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {authMode === "login" ? "Sign in" : "Create Account"}
            </DialogTitle>
            <DialogDescription className="text-base text-zinc-600">
              {authMode === "login"
                ? "Sign in with your email and password."
                : "Create your account to start reporting incidents."}
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
                We sent a confirmation link to{" "}
                <span className="font-medium text-zinc-900">{authEmail}</span>.
                Open it on this device to verify your account.
              </p>
            </div>
          ) : (
            <form onSubmit={handleAuthSubmit} className="space-y-4 px-6 py-6">
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
              <div className="space-y-2">
                <Label htmlFor="auth-password" className="text-base font-semibold">
                  Password
                </Label>
                <Input
                  id="auth-password"
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="h-12 text-base"
                  disabled={authSending}
                  minLength={6}
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
                disabled={authSending || authEmail.trim().length === 0 || authPassword.trim().length === 0}
                className="h-12 w-full bg-zinc-900 text-base font-semibold text-white hover:bg-zinc-800 disabled:opacity-70"
              >
                {authSending
                  ? authMode === "login"
                    ? "Signing in…"
                    : "Creating account…"
                  : authMode === "login"
                    ? "Sign In"
                    : "Create Account"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === "login" ? "signup" : "login");
                    setAuthError(null);
                  }}
                  className="text-sm text-zinc-600 hover:text-zinc-900 underline"
                >
                  {authMode === "login"
                    ? "Need an account? Sign up"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Matches Sheet */}
      {showMatches && selectedPin && (
        <Sheet open={showMatches} onOpenChange={setShowMatches}>
          <SheetContent
            side="right"
            className="w-full sm:w-[400px] p-0 overflow-hidden flex flex-col"
          >
            <MatchList
              pinId={selectedPin.id}
              onClose={() => setShowMatches(false)}
              onMatchSelect={handleViewMatch}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Match Comparison Dialog */}
      {selectedMatch && selectedPin && (
        <Dialog
          open={!!selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
            <MatchComparison
              match={selectedMatch}
              currentPinId={selectedPin.id}
              onBack={() => {
                setSelectedMatch(null)
                setShowMatches(true)
              }}
              onContact={handleContactMatch}
              onReject={() => handleRejectMatch(selectedMatch.id)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Claim Dialog */}
      {showClaimDialog && selectedPin && (
        <ClaimDialog
          open={showClaimDialog}
          onOpenChange={setShowClaimDialog}
          pinId={selectedPin.id}
          pinTitle={selectedPin.title}
          onSuccess={handleClaimSuccess}
        />
      )}

      {/* Claim Review Sheet */}
      {showClaimReview && selectedPin && (
        <Sheet open={showClaimReview} onOpenChange={setShowClaimReview}>
          <SheetContent
            side="right"
            className="w-full sm:w-[500px] p-0 overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Claims for "{selectedPin.title}"
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Review and manage claims for this item
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ClaimReview
                claims={claims}
                pinTitle={selectedPin.title}
                onUpdate={() => {
                  if (selectedPin.id) {
                    fetchClaimsForSelectedPin(selectedPin.id)
                  }
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
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

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffSeconds = Math.floor((now - date.getTime()) / 1000);
  if (diffSeconds < 5) return "just now";
  if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60)
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24)
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4)
    return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PinImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  return (
    <div className={`relative ${className ?? ""}`}>
      {!imageLoaded && (
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse bg-zinc-200"
        />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        onLoad={() => setImageLoaded(true)}
        className={`object-cover transition-opacity duration-300 ${
          imageLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
