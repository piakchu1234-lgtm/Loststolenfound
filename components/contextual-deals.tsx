"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Deal {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category: string;
}

interface ContextualDealsProps {
  category: string; // Lost item category
  onClose?: () => void;
}

export function ContextualDeals({ category, onClose }: ContextualDealsProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const response = await fetch(`/api/ozbargain?category=${encodeURIComponent(category)}`);
        const data = await response.json();

        if (data.deals && data.deals.length > 0) {
          setDeals(data.deals.slice(0, 3)); // Show top 3 contextual deals
        }
      } catch (err) {
        console.error("Failed to fetch contextual deals:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, [category]);

  if (loading || deals.length === 0) {
    return null; // Don't show if no relevant deals
  }

  const getCategoryMessage = (cat: string) => {
    const messages: Record<string, string> = {
      'electronics': 'Looking for replacement electronics? Check these deals:',
      'phone': 'Need a replacement phone? Here are some deals:',
      'wallet': 'Lost your wallet? Consider these helpful deals:',
      'keys': 'Lost keys? These products might help:',
      'bag': 'Need a new bag? Check out these offers:',
      'jewelry': 'Looking for jewelry? Browse these deals:',
      'documents': 'Need document security? Check these:',
      'pet': 'Pet-related deals that might help:',
      'bicycle': 'Bicycle security and deals:',
      'vehicle': 'Vehicle-related deals:',
    };
    return messages[cat.toLowerCase()] || 'Helpful deals from the community:';
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Lightbulb className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              Helpful Deals
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {getCategoryMessage(category)}
            </p>
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Deals List */}
      <div className="space-y-2">
        {deals.map((deal, index) => (
          <a
            key={index}
            href={deal.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <div className="bg-white dark:bg-gray-800 rounded-md p-2.5 border border-blue-100 dark:border-blue-900 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow transition-all">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-medium text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {deal.title}
                  </h5>
                  {deal.description && (
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                      {deal.description}
                    </p>
                  )}
                </div>
                <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex-shrink-0 transition-colors mt-0.5" />
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-blue-200 dark:border-blue-800">
        <a
          href="https://www.ozbargain.com.au"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center justify-center gap-1 transition-colors"
        >
          More deals on OzBargain
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </div>
    </div>
  );
}
