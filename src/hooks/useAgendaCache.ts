// src/hooks/useAgendaCache.ts
import { useState, useEffect, useRef } from "react";
import { getCache, setCache, clearCacheKey } from "../lib/cacheAgenda";

/**
 * Hook para manejar cache local de datos de la agenda
 * con sincronización automática cuando el valor cambia en Firestore.
 */
export function useAgendaCache<T>(slug: string, key: string, initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const loadedRef = useRef(false);

  // 🔹 Al montar, cargar del cache
  useEffect(() => {
    const cacheData = getCache<T>(slug, key);
    if (cacheData !== undefined && cacheData !== null) {
      setState(cacheData);
    }
    loadedRef.current = true;
  }, [slug, key]);

  // 🔹 Guardar en cache SOLO si el valor cambia y ya se cargó antes
  useEffect(() => {
    if (!loadedRef.current) return;
    if (state === undefined || state === null) return;

    const current = getCache<T>(slug, key);
    // Evitar sobrescribir con datos iguales
    if (JSON.stringify(current) !== JSON.stringify(state)) {
      setCache(slug, key, state);
    }
  }, [slug, key, state]);

  // 🧹 Helper para limpiar cache manualmente
  const clear = () => {
    clearCacheKey(slug, key);
  };

  return [state, setState, clear] as const;
}
