// src/lib/useCalendario.ts
import { useMemo } from "react";

type CalendarioEmpleado = {
  inicio?: string;       // "08:00"
  fin?: string;          // "17:00"
  diasLibres?: string[]; // ["domingo", "lunes"]
};

export function useCalendario(
  calendario?: CalendarioEmpleado | null,
  dias: number = 14
) {
  return useMemo(() => {
    if (!calendario?.inicio || !calendario?.fin) {
      console.warn("⚠️ Calendario no configurado para este empleado");
      return { diasDisponibles: [], horariosDisponibles: [] };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const [hFin, mFin] = calendario.fin.split(":").map(Number);
    const finHoy = new Date(hoy);
    finHoy.setHours(hFin, mFin, 0, 0);

    if (new Date() >= finHoy) {
      hoy.setDate(hoy.getDate() + 1);
    }

    // 🔹 Función para normalizar (quita acentos y pasa a minúsculas)
    const normalizar = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    // 🔹 Arrays fijos para días/meses
    const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const meses = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sept", "Oct", "Nov", "Dic",
    ];

    const diasDisponibles = Array.from({ length: dias }, (_, i) => {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + i);

      const dayName = diasSemana[d.getDay()]; // ✅ fijo según getDay()
      const dayNum = d.getDate().toString().padStart(2, "0");
      const monthName = meses[d.getMonth()];

      // 🚨 Comparar por texto normalizado
      const disabled = calendario.diasLibres?.some(
        (diaLibre) => normalizar(diaLibre) === normalizar(
          d.toLocaleDateString("es-ES", { weekday: "long" })
        )
      ) ?? false;

      return {
        date: d,
        label: `${dayName} ${dayNum}/${monthName}`,
        value: d.toISOString().split("T")[0],
        disabled,
      };
    });

    // 🔹 Generar horarios disponibles (intervalos de 30 min)
    const horariosDisponibles: string[] = [];
    const [hInicio, mInicio] = calendario.inicio.split(":").map(Number);
    let hora = hInicio;
    let minuto = mInicio;

    while (hora < hFin || (hora === hFin && minuto <= mFin)) {
      const h = hora.toString().padStart(2, "0");
      const m = minuto.toString().padStart(2, "0");
      horariosDisponibles.push(`${h}:${m}`);

      if (minuto === 0) {
        minuto = 30;
      } else {
        minuto = 0;
        hora++;
      }
    }

    return { diasDisponibles, horariosDisponibles };
  }, [calendario, dias]);
}
