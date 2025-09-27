// src/lib/cacheAgenda.ts

// 🔹 Guardar item en cache
export function setCache<T>(slug: string, key: string, value: T) {
  try {
    localStorage.setItem(`${key}_${slug}`, JSON.stringify(value));
  } catch (err) {
    console.error("Error guardando en cache:", err);
  }
}

// 🔹 Leer item del cache
export function getCache<T>(slug: string, key: string): T | null {
  try {
    const data = localStorage.getItem(`${key}_${slug}`);
    return data ? JSON.parse(data) as T : null;
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
