// src/lib/useFechasAgenda.ts
import { useMemo } from "react";

function normalizeDia(str: any): string {
  if (!str) return "";
  return String(str)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // quita tildes
}

/**
 * Hook para generar las fechas que se muestran en el calendario.
 * Ahora puede marcar días como "disabled" según diasLibres.
 *
 * - dias: cuántos días hacia adelante mostrar
 * - diasLibres: array de días en texto, ej: ["domingo", "lunes"]
 */
export function useFechasAgenda(
  dias: number = 14,
  diasLibres: string[] = []
) {
  return useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // evitar desfase por zona horaria

    // 🔹 Normalizamos días libres que vienen de Firebase
    const diasLibresNorm = diasLibres.map(normalizeDia);

    // 🔹 Abreviaturas de meses en español
    const meses = [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sept",
      "Oct",
      "Nov",
      "Dic",
    ];

    const lista = Array.from({ length: dias }).map((_, i) => {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + i);

      const dayNameShort = d
        .toLocaleDateString("es-ES", { weekday: "short" })
        .replace(".", ""); // algunos locales agregan un punto

      const dayNameLong = d.toLocaleDateString("es-ES", { weekday: "long" });
      const dayNum = d.getDate().toString().padStart(2, "0");
      const monthName = meses[d.getMonth()];

      const disabled = diasLibresNorm.includes(normalizeDia(dayNameLong));

      return {
        date: d,
        label:
          `${dayNameShort.charAt(0).toUpperCase() + dayNameShort.slice(1)} ` +
          `${dayNum}/${monthName}`,
        value: d.toISOString().split("T")[0], // formato YYYY-MM-DD
        disabled, // 👈 NUEVO: indica si ese día está bloqueado
      };
    });

    // Debug mientras probamos
    console.log("[useFechasAgenda] diasLibres:", diasLibres, lista);

    return lista;
  }, [dias, diasLibres]);
}
