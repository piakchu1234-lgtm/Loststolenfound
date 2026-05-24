"use client";

import { useEffect, useRef, useState } from "react";
import Map, { Marker, type MapRef, type ViewState } from "react-map-gl/mapbox";
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
  Maximize2,
  Minimize2,
  Crosshair,
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
  status: PinStatus | null;
  created_at: string;
  updated_at: string;
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
  const [userUpvoteId, setUserUpvoteId] = useState<string | null>(null);
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const center = {
    latitude: viewState.latitude ?? INITIAL_VIEW.latitude,
    longitude: viewState.longitude ?? INITIAL_VIEW.longitude,
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const mapStyle =
    theme === "dark"
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/streets-v12";

  const isAdmin = session?.user?.email === "yapshin1001@gmail.com";
  const canModifyPin = (pin: MapPin) =>
    session?.user?.id === pin.user_id || isAdmin;

  async function fetchAddress(lat: number, lng: number) {
    setAddressLoading(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`,
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

    setForwardGeocoding(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`,
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
    const { data, error } = await supabase.from("MapPin").select("*");
    if (error) {
      console.error("[fetchPins]", error);
      return;
    }
    const rows = (data ?? []) as MapPin[];
    setPins(rows);
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

  async function fetchSocial(pinId: string) {
    setLoadingSocial(true);
    const upvotesRes = await supabase
      .from("PinUpvote")
      .select("id,user_id")
      .eq("pin_id", pinId);
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
    fetchComments(selectedPin.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPin?.id, session?.user.id]);

  useEffect(() => {
    if (pinned && step === 3) {
      fetchAddress(pinned.lat, pinned.lng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned?.lat, pinned?.lng, step]);

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

  async function toggleUpvote() {
    if (!selectedPin || upvoting) return;
    if (!requireAuth() || !session) return;
    setUpvoting(true);
    if (userUpvoteId) {
      const prevId = userUpvoteId;
      setUserUpvoteId(null);
      setUpvoteCount((c) => Math.max(0, c - 1));
      const { error } = await supabase
        .from("PinUpvote")
        .delete()
        .eq("id", prevId);
      if (error) {
        console.error("[toggleUpvote:delete]", error);
        setUserUpvoteId(prevId);
        setUpvoteCount((c) => c + 1);
      }
    } else {
      const { data, error } = await supabase
        .from("PinUpvote")
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
      if (!editingPin) {
        setPinned({ lat: center.latitude, lng: center.longitude });
      }
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
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
    setSubmitStatus("idle");
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
      <div className="fixed top-6 right-4 z-[50] flex gap-2">
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
        aria-label="Filter incidents"
        className="fixed top-20 left-0 right-0 z-[50] flex flex-col items-center gap-2 px-4"
      >
        <div className="relative w-full max-w-md">
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
            className="h-10 rounded-full bg-white/95 pl-9 pr-3 text-sm shadow-lg ring-1 ring-zinc-200 backdrop-blur dark:bg-zinc-800/95 dark:ring-zinc-700"
          />
        </div>
        <div className="flex max-w-full gap-2 overflow-x-auto rounded-full bg-white/95 p-1.5 shadow-lg ring-1 ring-zinc-200 backdrop-blur dark:bg-zinc-800/95 dark:ring-zinc-700 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            aria-pressed={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
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
                className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
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
        <div
          role="group"
          aria-label="Filter by status"
          className="flex max-w-full gap-2 overflow-x-auto rounded-full bg-white/95 p-1.5 shadow-lg ring-1 ring-zinc-200 backdrop-blur dark:bg-zinc-800/95 dark:ring-zinc-700 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {(["all", "open", "in_progress", "resolved"] as const).map((s) => {
            const isActive = activeStatus === s;
            const label = s === "all" ? "All Status" : STATUS_META[s].label;
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
      </div>

      {viewMode === "map" && (
        <>
          <Map
        ref={mapRef}
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
        onLoad={() => setIsMapLoaded(true)}
        onClick={handleMapClick}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
      >
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
          if (!open) {
            setSelectedPin(null);
            setIsExpanded(false);
          }
        }}
      >
        <SheetContent
          className={`w-full gap-0 transition-all duration-300 ease-out ${
            isExpanded ? "sm:max-w-4xl" : "sm:max-w-md"
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
            return (
              <>
                <SheetHeader className="border-b">
                  <div className="flex items-center justify-between gap-3">
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsExpanded((prev) => !prev)}
                      aria-label={
                        isExpanded ? "Collapse view" : "Expand view"
                      }
                      className="h-9 w-9 shrink-0 p-0"
                    >
                      {isExpanded ? (
                        <Minimize2 className="h-4 w-4" aria-hidden />
                      ) : (
                        <Maximize2 className="h-4 w-4" aria-hidden />
                      )}
                    </Button>
                  </div>
                  <SheetTitle className="text-2xl font-bold leading-tight tracking-tight text-zinc-900">
                    {selectedPin.title}
                  </SheetTitle>
                  <SheetDescription className="text-sm text-zinc-600">
                    Reported {formattedDate}
                  </SheetDescription>
                  <Button
                    type="button"
                    onClick={() => handleShare(selectedPin.id)}
                    aria-label="Share this report"
                    className="mt-2 h-10 w-fit gap-2 rounded-full bg-zinc-900 px-4 text-sm font-semibold text-white shadow-md hover:bg-zinc-800 focus-visible:ring-4 focus-visible:ring-zinc-300"
                  >
                    <Share className="h-4 w-4" aria-hidden />
                    Share
                  </Button>

                  {canModifyPin(selectedPin) && (
                    <div className="mt-3">
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
                                  : "bg-white text-zinc-700 ring-zinc-300 hover:bg-zinc-100"
                              }`}
                            >
                              {meta.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-4 py-5">
                  {selectedPin.image_url && (
                    <div className="mb-5 overflow-hidden rounded-xl ring-1 ring-zinc-200">
                      <PinImage
                        src={selectedPin.image_url}
                        alt={`Photo evidence for ${selectedPin.title}`}
                        className="h-64 w-full"
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
                        userUpvoteId ? "Remove verification" : "Verify this report"
                      }
                      className={`h-10 gap-2 rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-60 ${
                        userUpvoteId
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-white text-zinc-800 ring-1 ring-zinc-300 hover:bg-zinc-100"
                      }`}
                    >
                      <span aria-hidden>👍</span>
                      <span>
                        {userUpvoteId ? "Verified" : "Verify"} · {upvoteCount}
                      </span>
                    </Button>
                  </div>

                  {canModifyPin(selectedPin) && (
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

                  <div className="mt-4">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Comments {comments && `(${comments.length})`}
                    </h4>
                    {comments === null ? (
                      <ul className="flex flex-col gap-2" aria-label="Loading comments">
                        {[0, 1, 2].map((i) => (
                          <li
                            key={i}
                            className="rounded-lg bg-white px-3 py-2 ring-1 ring-zinc-200"
                          >
                            <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-200" />
                            <div className="mt-2 h-4 w-full animate-pulse rounded bg-zinc-200" />
                            <div className="mt-1 h-4 w-3/4 animate-pulse rounded bg-zinc-200" />
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
                              className="rounded-lg bg-white px-3 py-2 ring-1 ring-zinc-200"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-semibold text-zinc-900">
                                    {emailLabel}
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
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
                      className="h-auto bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
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

            {filteredPins.length === 0 ? (
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
                            <PinImage
                              src={p.image_url}
                              alt={`Photo evidence for ${p.title}`}
                              className="h-48 w-full"
                            />
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
                          <CardFooter className="gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled
                              aria-label="Upvote or verify (coming soon)"
                            >
                              👍 Upvote / Verify
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleShare(p.id)}
                              aria-label={`Share report: ${p.title}`}
                              className="gap-1.5"
                            >
                              <Share className="h-4 w-4" aria-hidden />
                              Share
                            </Button>
                            {canModifyPin(p) && (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(p)}
                                  className="gap-1.5"
                                >
                                  <Pencil className="h-4 w-4" aria-hidden />
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(p.id)}
                                  className="gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden />
                                  Delete
                                </Button>
                              </>
                            )}
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

      <Dialog open={open && !isTargetingMode} onOpenChange={handleOpenChange}>
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setImageLoaded(true)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          imageLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
