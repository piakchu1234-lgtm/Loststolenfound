'use client';
import { useEffect } from 'react';

export default function SidebarAdBanner() {
  useEffect(() => {
    try {
      // Safely trigger the programmatic network's push function
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (error) {
      console.error('Ad initialization paused:', error);
    }
  }, []);

  return (
    <div className="w-full my-4 py-3 bg-zinc-50 border border-zinc-100 rounded-lg flex flex-col items-center">
      <span className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1 block">
        Sponsored Advertisement
      </span>
      {/* The AdChoices/AdSense Placeholder Block */}
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '90px' }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Your unique publisher ID
        data-ad-slot="XXXXXXXXXX"               // Your specific layout slot ID
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  );
}
