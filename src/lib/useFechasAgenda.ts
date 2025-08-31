// src/lib/useFechasAgenda.ts
import { useMemo } from "react";

export function useFechasAgenda(dias: number = 14) {
  return useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // evitar desfase por zona horaria

    return Array.from({ length: dias }).map((_, i) => {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + i);

      const dayName = d.toLocaleDateString("es-ES", { weekday: "short" });
      const dayNum = d.getDate().toString().padStart(2, "0");
      const monthNum = (d.getMonth() + 1).toString().padStart(2, "0");

      return {
        label: `${dayName} ${dayNum}/${monthNum}`,
        value: d.toISOString().split("T")[0], // formato YYYY-MM-DD
      };
    });
  }, [dias]);
}
