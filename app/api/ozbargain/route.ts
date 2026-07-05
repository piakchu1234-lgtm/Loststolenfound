import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

// Cache for 15 minutes
let cachedDeals: any = null;
let cacheTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export async function GET() {
  try {
    // Return cached data if still valid
    const now = Date.now();
    if (cachedDeals && (now - cacheTime) < CACHE_DURATION) {
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

    // Extract and format deals (limit to 5)
    const deals = items.slice(0, 5).map((item: any) => ({
      title: item.title || 'No title',
      link: item.link || '#',
      description: item.description?.replace(/<[^>]*>/g, '').substring(0, 150) || '',
      pubDate: item.pubDate || '',
      category: item.category || 'General',
    }));

    // Cache the results
    cachedDeals = { deals, fetchedAt: new Date().toISOString() };
    cacheTime = now;

    return NextResponse.json(cachedDeals);
  } catch (error) {
    console.error('Error fetching OzBargain deals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deals', deals: [] },
      { status: 500 }
    );
  }
}
