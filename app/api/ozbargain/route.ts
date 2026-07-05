import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

// Cache for 15 minutes
let cachedDeals: any = null;
let cacheTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // Return cached data if still valid
    const now = Date.now();
    if (cachedDeals && (now - cacheTime) < CACHE_DURATION) {
      // Filter by category if requested
      if (category) {
        return NextResponse.json({
          deals: filterDealsByCategory(cachedDeals.deals, category),
          fetchedAt: cachedDeals.fetchedAt,
        });
      }
      return NextResponse.json(cachedDeals);
    }

    // Fetch RSS feed from OzBargain
    const response = await fetch('https://www.ozbargain.com.au/deals/feed', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LostFoundApp/1.0)',
      },
      next: { revalidate: 900 }, // Revalidate every 15 minutes
    });

    if (!response.ok) {
      throw new Error('Failed to fetch OzBargain feed');
    }

    const xmlData = await response.text();

    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '_',
    });

    const parsed = parser.parse(xmlData);
    const items = parsed.rss?.channel?.item || [];

    // Extract and format deals (limit to 20 for filtering)
    const deals = items.slice(0, 20).map((item: any) => ({
      title: item.title || 'No title',
      link: item.link || '#',
      description: item.description?.replace(/<[^>]*>/g, '').substring(0, 150) || '',
      pubDate: item.pubDate || '',
      category: item.category || 'General',
    }));

    // Cache the results
    cachedDeals = { deals, fetchedAt: new Date().toISOString() };
    cacheTime = now;

    // Filter by category if requested
    if (category) {
      return NextResponse.json({
        deals: filterDealsByCategory(deals, category),
        fetchedAt: cachedDeals.fetchedAt,
      });
    }

    // Return top 5 for general display
    return NextResponse.json({
      deals: deals.slice(0, 5),
      fetchedAt: cachedDeals.fetchedAt,
    });
  } catch (error) {
    console.error('Error fetching OzBargain deals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deals', deals: [] },
      { status: 500 }
    );
  }
}

// Filter deals by lost item category
function filterDealsByCategory(deals: any[], lostCategory: string): any[] {
  const keywords = getCategoryKeywords(lostCategory);

  if (keywords.length === 0) {
    return deals.slice(0, 5);
  }

  // Search for relevant deals
  const filtered = deals.filter((deal) => {
    const searchText = `${deal.title} ${deal.description} ${deal.category}`.toLowerCase();
    return keywords.some((keyword) => searchText.includes(keyword.toLowerCase()));
  });

  // Return up to 5 relevant deals, or top 5 general deals if no matches
  return filtered.length > 0 ? filtered.slice(0, 5) : deals.slice(0, 5);
}

// Map lost item categories to relevant deal keywords
function getCategoryKeywords(category: string): string[] {
  const mapping: Record<string, string[]> = {
    'electronics': ['phone', 'mobile', 'smartphone', 'tablet', 'ipad', 'laptop', 'computer', 'electronics', 'tech', 'apple', 'samsung', 'gadget'],
    'phone': ['phone', 'mobile', 'smartphone', 'iphone', 'android', 'samsung', 'case', 'charger', 'sim'],
    'wallet': ['wallet', 'purse', 'card', 'bank', 'credit', 'debit', 'money', 'leather goods', 'accessories'],
    'keys': ['key', 'keychain', 'key finder', 'tile', 'airtag', 'tracker', 'locksmith', 'lock'],
    'bag': ['bag', 'backpack', 'luggage', 'suitcase', 'travel', 'storage'],
    'jewelry': ['jewelry', 'jewellery', 'ring', 'necklace', 'watch', 'bracelet', 'accessories'],
    'clothing': ['clothing', 'clothes', 'fashion', 'jacket', 'shoes', 'apparel'],
    'documents': ['document', 'folder', 'organizer', 'scanner', 'shredder', 'security'],
    'pet': ['pet', 'dog', 'cat', 'collar', 'tag', 'tracker', 'gps', 'animal'],
    'bicycle': ['bicycle', 'bike', 'cycling', 'lock', 'helmet', 'security'],
    'vehicle': ['car', 'vehicle', 'automotive', 'insurance', 'dash cam', 'security'],
    'other': [],
  };

  return mapping[category.toLowerCase()] || [];
}
