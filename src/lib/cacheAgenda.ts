// src/lib/cacheAgenda.ts

type CacheItem<T> = {
  value: T;
  expiry?: number; // timestamp en ms (opcional)
};

// 🔹 Guardar item en cache por negocio (usa slug) con TTL opcional
export function setCache<T>(
  slug: string,
  key: string,
  value: T,
  ttlMs?: number
) {
  try {
    const item: CacheItem<T> = {
      value,
      expiry: ttlMs ? Date.now() + ttlMs : undefined,
    };
    localStorage.setItem(`${key}_${slug}`, JSON.stringify(item));
  } catch (err) {
    console.error("Error guardando en cache:", err);
  }
}

// 🔹 Leer item del cache por negocio (usa slug)
export function getCache<T>(slug: string, key: string): T | null {
  try {
    const raw = localStorage.getItem(`${key}_${slug}`);
    if (!raw) return null;

    const item: CacheItem<T> = JSON.parse(raw);

    // ✅ Si tiene expiry y ya venció → borrar y devolver null
    if (item.expiry && Date.now() > item.expiry) {
      localStorage.removeItem(`${key}_${slug}`);
      return null;
    }

    return item.value as T;
  } catch (err) {
    console.error("Error leyendo cache:", err);
    return null;
  }
}

// 🔹 Borrar item del cache (opcional)
export function clearCache(slug: string, key: string) {
  try {
    localStorage.removeItem(`${key}_${slug}`);
  } catch (err) {
    console.error("Error borrando cache:", err);
  }
}

/* ============================================================
   📌 Consentimiento de cookies (clave global fija, sin slug)
   ============================================================ */
const COOKIE_KEY = "cookiesAceptadas";

export function setCookieConsent(value: boolean) {
  try {
    localStorage.setItem(COOKIE_KEY, JSON.stringify(value));
  } catch (err) {
    console.error("Error guardando consentimiento de cookies:", err);
  }
}

export function getCookieConsent(): boolean {
  try {
    const data = localStorage.getItem(COOKIE_KEY);
    return data ? JSON.parse(data) : false;
  } catch (err) {
    console.error("Error leyendo consentimiento de cookies:", err);
    return false;
  }
}
