"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Filter,
  X,
  ArrowLeft,
  Calendar,
  Tag,
  MapPin,
  MessageCircle,
  User,
  Loader2,
} from "lucide-react";
import {
  searchAll,
  getResultIcon,
  getResultColor,
  getResultTypeLabel,
  type SearchResult,
  type SearchFilters,
} from "@/lib/search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    type: "all",
    category: "all",
  });

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  async function performSearch(searchQuery: string) {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchResults = await searchAll(searchQuery, filters, 50);
      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    // Update URL
    router.push(`/search?q=${encodeURIComponent(query)}`);
    performSearch(query);
  }

  function handleFilterChange(key: keyof SearchFilters, value: string) {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Re-search with new filters
    if (query.trim()) {
      performSearch(query);
    }
  }

  function clearFilters() {
    setFilters({ type: "all", category: "all" });
    if (query.trim()) {
      performSearch(query);
    }
  }

  function getResultLink(result: SearchResult): string {
    switch (result.result_type) {
      case "pin":
        return `/?pin=${result.result_id}`;
      case "thread":
        return `/forum/${result.result_id}`;
      case "user":
        return `/profile/${result.result_id}`;
      default:
        return "#";
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const filteredResults = results;
  const hasActiveFilters = filters.type !== "all" || filters.category !== "all";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
                  aria-hidden
                />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pins, forum, users..."
                  className="h-11 w-full rounded-full pl-10 pr-4"
                  autoFocus
                />
              </div>
            </form>

            {/* Filter Toggle */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-zinc-100 dark:bg-zinc-800" : ""}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters Bar */}
          {showFilters && (
            <div className="mt-4 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Filters
                </h3>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Type Filter */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Type
                  </label>
                  <select
                    value={filters.type || "all"}
                    onChange={(e) => handleFilterChange("type", e.target.value)}
                    className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value="all">All Types</option>
                    <option value="pin">Pins</option>
                    <option value="thread">Forum Threads</option>
                    <option value="user">Users</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Category
                  </label>
                  <select
                    value={filters.category || "all"}
                    onChange={(e) => handleFilterChange("category", e.target.value)}
                    className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value="all">All Categories</option>
                    <option value="lost_property">Lost Property</option>
                    <option value="found_property">Found Property</option>
                    <option value="missing_pet">Missing Pet</option>
                    <option value="found_pet">Found Pet</option>
                    <option value="stolen_vehicle">Stolen Vehicle</option>
                    <option value="suspicious_activity">Suspicious Activity</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Results */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Results Header */}
        {query && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Search results for "{query}"
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {loading ? (
                "Searching..."
              ) : (
                <>
                  {filteredResults.length} result{filteredResults.length === 1 ? "" : "s"} found
                </>
              )}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        )}

        {/* Empty State */}
        {!loading && query && filteredResults.length === 0 && (
          <div className="py-12 text-center">
            <Search className="mx-auto h-12 w-12 text-zinc-400" />
            <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              No results found
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Try different keywords or adjust your filters
            </p>
          </div>
        )}

        {/* Results List */}
        {!loading && filteredResults.length > 0 && (
          <div className="space-y-3">
            {filteredResults.map((result) => {
              const icon = getResultIcon(result.result_type);
              const colorClass = getResultColor(result.result_type);
              const typeLabel = getResultTypeLabel(result.result_type);

              return (
                <Link
                  key={`${result.result_type}-${result.result_id}`}
                  href={getResultLink(result)}
                  className="block rounded-xl border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                      <span className="text-lg">{icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                          {result.title}
                        </h3>
                        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {typeLabel}
                        </span>
                      </div>

                      <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {result.description}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                        {result.category && result.category !== 'user' && (
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {result.category.replace(/_/g, ' ')}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(result.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* No Query State */}
        {!query && !loading && (
          <div className="py-12 text-center">
            <Search className="mx-auto h-12 w-12 text-zinc-400" />
            <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Start searching
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Search for lost items, forum discussions, or users
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
