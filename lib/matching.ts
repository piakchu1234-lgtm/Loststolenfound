import { supabase } from "@/lib/supabase";

export type MatchableCategory =
  | "lost_property"
  | "found_property"
  | "missing_pet"
  | "found_pet"
  | "stolen_vehicle"
  | "break_in"
  | "suspicious_activity";

type PinStatus = "open" | "in_progress" | "resolved";

export interface MatchPin {
  id: string;
  title: string;
  description: string | null;
  category: MatchableCategory;
  latitude: number;
  longitude: number;
  image_url: string | null;
  status: PinStatus | null;
  created_at: string;
}

const OPPOSITE_CATEGORY: Partial<
  Record<MatchableCategory, MatchableCategory>
> = {
  lost_property: "found_property",
  found_property: "lost_property",
  missing_pet: "found_pet",
  found_pet: "missing_pet",
};

export function getOppositeCategory(
  category: MatchableCategory,
): MatchableCategory | null {
  return OPPOSITE_CATEGORY[category] ?? null;
}

export async function findPotentialMatches(pin: {
  id: string;
  category: MatchableCategory;
}): Promise<MatchPin[]> {
  const opposite = getOppositeCategory(pin.category);
  if (!opposite) return [];
  const cutoff = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data, error } = await supabase
    .from("MapPin")
    .select(
      "id,title,description,category,latitude,longitude,image_url,status,created_at",
    )
    .eq("category", opposite)
    .eq("status", "open")
    .gte("created_at", cutoff)
    .neq("id", pin.id)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) {
    console.error("[findPotentialMatches]", error);
    return [];
  }
  return (data ?? []) as MatchPin[];
}
