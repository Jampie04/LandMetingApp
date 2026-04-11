"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="flex items-center gap-2 border-b border-warning/35 bg-warning px-4 py-2.5 text-sm font-medium text-white shadow-[0_2px_10px_rgba(201,138,26,0.28)]">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        Geen internetverbinding — u werkt offline. Gegevens kunnen verouderd zijn.
      </span>
    </div>
  );
}
