// src/lib/useFechasAgenda.ts
import { useMemo } from "react";

export function useFechasAgenda(dias: number = 14) {
  return useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // evitar desfase por zona horaria

    // 🔹 Abreviaturas de meses en español
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sept", "Oct", "Nov", "Dic"];

    return Array.from({ length: dias }).map((_, i) => {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + i);

      const dayName = d
        .toLocaleDateString("es-ES", { weekday: "short" })
        .replace(".", ""); // algunos locales agregan un punto
      const dayNum = d.getDate().toString().padStart(2, "0");
      const monthName = meses[d.getMonth()];

      return {
        label: `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayNum}/${monthName}`,
        value: d.toISOString().split("T")[0], // formato YYYY-MM-DD
      };
    });
  }, [dias]);
}
