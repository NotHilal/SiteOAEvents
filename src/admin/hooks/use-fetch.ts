"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Loads data on mount / when `key` changes; `reload()` refetches silently. */
export function useFetch<T>(loader: () => Promise<T>, key: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const seq = useRef(0);

  const run = useCallback(async (silent = false) => {
    const id = ++seq.current;
    if (!silent) setLoading(true);
    try {
      const result = await loaderRef.current();
      if (id === seq.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (id === seq.current) setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: key drives refetch
  useEffect(() => {
    run();
  }, key);

  return { data, error, loading, reload: () => run(true), setData };
}
