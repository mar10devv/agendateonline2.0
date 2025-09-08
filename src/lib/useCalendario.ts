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
    // 🚨 Si no hay calendario o faltan datos -> devolvemos vacío
    if (!calendario?.inicio || !calendario?.fin) {
      console.warn("⚠️ Calendario no configurado para este empleado");
      return { diasDisponibles: [], horariosDisponibles: [] };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // ⏰ Revisar si hoy ya cerró
    const [hFin, mFin] = calendario.fin.split(":").map(Number);
    const finHoy = new Date(hoy);
    finHoy.setHours(hFin, mFin, 0, 0);

    // Si ya pasó el horario de cierre, arranco desde mañana
    if (new Date() >= finHoy) {
      hoy.setDate(hoy.getDate() + 1);
    }

    // 🔹 Días libres a índices (0=domingo, 1=lunes, etc.)
    const map: Record<string, number> = {
      domingo: 0,
      lunes: 1,
      martes: 2,
      miércoles: 3,
      jueves: 4,
      viernes: 5,
      sábado: 6,
    };
    const diasLibresIndex =
      calendario.diasLibres?.map((d) => map[d.toLowerCase()]) ?? [];

    // 🔹 Generar días disponibles
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
    const diasDisponibles = Array.from({ length: dias }, (_, i) => {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + i);

      const dayName = d
        .toLocaleDateString("es-ES", { weekday: "short" })
        .replace(".", "");
      const dayNum = d.getDate().toString().padStart(2, "0");
      const monthName = meses[d.getMonth()];

      const disabled = diasLibresIndex.includes(d.getDay());

      return {
        date: d,
        label: `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayNum}/${monthName}`,
        value: d.toISOString().split("T")[0], // YYYY-MM-DD
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
