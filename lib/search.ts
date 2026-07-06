import { supabase } from './supabase';

export interface SearchResult {
  result_type: 'pin' | 'thread' | 'user';
  result_id: string;
  title: string;
  description: string;
  category: string;
  rank: number;
  created_at: string;
}

export interface SearchSuggestion {
  suggestion: string;
  result_type: 'pin' | 'thread';
  count: number;
}

export interface SearchFilters {
  type?: 'pin' | 'thread' | 'user' | 'all';
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

/**
 * Universal search across pins, forum threads, and users
 */
export async function searchAll(
  query: string,
  filters?: SearchFilters,
  limit: number = 20
): Promise<SearchResult[]> {
  try {
    if (!query.trim()) return [];

    // Call the search function
    const { data, error } = await supabase.rpc('search_all', {
      search_query: query.trim(),
      limit_count: limit,
    });

    if (error) throw error;

    let results = (data || []) as SearchResult[];

    // Apply filters
    if (filters) {
      // Filter by type
      if (filters.type && filters.type !== 'all') {
        results = results.filter((r) => r.result_type === filters.type);
      }

      // Filter by category
      if (filters.category && filters.category !== 'all') {
        results = results.filter((r) => r.category === filters.category);
      }

      // Filter by date range
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        results = results.filter(
          (r) => new Date(r.created_at) >= fromDate
        );
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        results = results.filter(
          (r) => new Date(r.created_at) <= toDate
        );
      }

      // Filter by status (pins only)
      if (filters.status && filters.status !== 'all') {
        results = results.filter(
          (r) => r.result_type === 'pin' && r.category === filters.status
        );
      }
    }

    return results;
  } catch (error) {
    console.error('Error searching:', error);
    return [];
  }
}

/**
 * Get search suggestions based on partial query
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 5
): Promise<SearchSuggestion[]> {
  try {
    if (!query.trim() || query.length < 2) return [];

    const { data, error } = await supabase.rpc('search_suggestions', {
      search_query: query.trim(),
      limit_count: limit,
    });

    if (error) throw error;
    return (data || []) as SearchSuggestion[];
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return [];
  }
}

/**
 * Search pins only
 */
export async function searchPins(
  query: string,
  filters?: { category?: string; status?: string },
  limit: number = 20
): Promise<SearchResult[]> {
  const results = await searchAll(query, { ...filters, type: 'pin' }, limit);
  return results;
}

/**
 * Search forum threads only
 */
export async function searchThreads(
  query: string,
  filters?: { category?: string },
  limit: number = 20
): Promise<SearchResult[]> {
  const results = await searchAll(query, { ...filters, type: 'thread' }, limit);
  return results;
}

/**
 * Search users only
 */
export async function searchUsers(
  query: string,
  limit: number = 20
): Promise<SearchResult[]> {
  const results = await searchAll(query, { type: 'user' }, limit);
  return results;
}

/**
 * Get result icon based on type
 */
export function getResultIcon(type: SearchResult['result_type']): string {
  switch (type) {
    case 'pin':
      return '📍';
    case 'thread':
      return '💬';
    case 'user':
      return '👤';
    default:
      return '🔍';
  }
}

/**
 * Get result color based on type
 */
export function getResultColor(type: SearchResult['result_type']): string {
  switch (type) {
    case 'pin':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300';
    case 'thread':
      return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300';
    case 'user':
      return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300';
    default:
      return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';
  }
}

/**
 * Format result type label
 */
export function getResultTypeLabel(type: SearchResult['result_type']): string {
  switch (type) {
    case 'pin':
      return 'Pin';
    case 'thread':
      return 'Forum Thread';
    case 'user':
      return 'User';
    default:
      return 'Result';
  }
}

/**
 * Highlight search query in text
 */
export function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query.trim().split(' ').join('|')})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-900">$1</mark>');
}
