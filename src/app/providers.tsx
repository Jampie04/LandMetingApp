"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

// --- Minimal offline persistence for React Query --------------------------
// We persist a small slice of read queries to localStorage so previously
// visited dashboard pages can render with real data while offline.
// Only "safe" read query keys are persisted (no auth, no mutations).
const PERSIST_KEY = "grongmarki-rq-cache-v1";
const PERSIST_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const PERSIST_PREFIXES = new Set(["profile", "projects", "project"]);

type PersistedEntry = {
  queryKey: readonly unknown[];
  data: unknown;
  dataUpdatedAt: number;
};

function shouldPersist(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0];
  return typeof root === "string" && PERSIST_PREFIXES.has(root);
}

function loadPersisted(): PersistedEntry[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; entries: PersistedEntry[] };
    if (!parsed?.ts || Date.now() - parsed.ts > PERSIST_TTL_MS) return null;
    return Array.isArray(parsed.entries) ? parsed.entries : null;
  } catch {
    return null;
  }
}

function savePersisted(entries: PersistedEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({ ts: Date.now(), entries })
    );
  } catch {
    // localStorage full or disabled — silently ignore.
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            gcTime: PERSIST_TTL_MS, // keep cached data around for 24h
            retry: 1,
          },
        },
      })
  );

  useEffect(() => {
    // 1. Hydrate any persisted entries into the in-memory cache.
    const cached = loadPersisted();
    if (cached) {
      for (const entry of cached) {
        if (!Array.isArray(entry.queryKey)) continue;
        if (!shouldPersist(entry.queryKey)) continue;
        queryClient.setQueryData(entry.queryKey, entry.data);
      }
      // Trigger a background refresh of any active queries — fails silently
      // when offline, refreshes on screen when online.
      queryClient.invalidateQueries();
    }

    // 2. Persist the cache on changes, throttled.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        const all = queryClient.getQueryCache().getAll();
        const entries: PersistedEntry[] = [];
        for (const q of all) {
          if (!Array.isArray(q.queryKey)) continue;
          if (!shouldPersist(q.queryKey)) continue;
          if (q.state.status !== "success" || q.state.data === undefined) continue;
          entries.push({
            queryKey: q.queryKey,
            data: q.state.data,
            dataUpdatedAt: q.state.dataUpdatedAt,
          });
        }
        savePersisted(entries);
      }, 750);
    };

    const unsubscribe = queryClient.getQueryCache().subscribe(schedule);
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        richColors
        position="top-right"
        toastOptions={{
          style: {
            background: "hsl(var(--card))",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "14px",
            boxShadow: "0 10px 26px rgba(31,29,26,0.14)",
          },
          className: "font-sans",
        }}
      />
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
