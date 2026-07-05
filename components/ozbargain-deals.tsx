"use client";

import { useEffect, useState } from "react";
import { ExternalLink, TrendingUp, Loader2 } from "lucide-react";

interface Deal {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category: string;
}

export function OzBargainDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const response = await fetch("/api/ozbargain");
        const data = await response.json();

        if (data.deals && data.deals.length > 0) {
          setDeals(data.deals);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Failed to fetch deals:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-lg border border-orange-200 dark:border-orange-800 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
        </div>
      </div>
    );
  }

  if (error || deals.length === 0) {
    return null; // Don't show widget if there's an error
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-lg border border-orange-200 dark:border-orange-800 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Community Deals
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              From OzBargain
            </p>
          </div>
        </div>
        <a
          href="https://www.ozbargain.com.au"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex items-center gap-1 transition-colors"
        >
          View All
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Deals List */}
      <div className="space-y-3">
        {deals.map((deal, index) => (
          <a
            key={index}
            href={deal.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-orange-100 dark:border-orange-900 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md transition-all">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {deal.title}
                  </h4>
                  {deal.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {deal.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                      {deal.category}
                    </span>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 flex-shrink-0 transition-colors" />
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-800">
        <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
          💡 Helpful deals for the Australian community
        </p>
      </div>
    </div>
  );
}
