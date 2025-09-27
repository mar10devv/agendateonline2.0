import { useState, useEffect } from "react";
import { getCache, setCache } from "../lib/cacheAgenda";

export function useAgendaCache<T>(slug: string, key: string, initialValue: T) {
  const [state, setState] = useState<T>(initialValue);

  // Al montar, leer del cache
  useEffect(() => {
    const cacheData = getCache<T>(slug, key);
    if (cacheData) {
      setState(cacheData);
    }
  }, [slug, key]);

  // Cuando cambie, guardar en cache
  useEffect(() => {
    if (state) {
      setCache(slug, key, state);
    }
  }, [slug, key, state]);

  return [state, setState] as const;
}
