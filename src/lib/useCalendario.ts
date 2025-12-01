// src/lib/useCalendario.ts
import { useMemo } from "react";

type ConfiguracionAgenda = {
  modoTurnos: "personalizado" | "jornada";
  clientesPorDia?: number;     // usado en modo personalizado
  horasSeparacion?: number;    // minutos por cliente en modo jornada
  diasLibres?: string[];       // ← NEGOCIO + EMPLEADO
  inicio: string;              // "08:00"
  fin: string;                 // "17:00"
};

// Normaliza nombre de día: " Domingo " -> "domingo"
function normalizeDia(str: any): string {
  if (!str) return "";
  return String(str)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function useCalendario(
  calendario: ConfiguracionAgenda | null,
  diasAdelante = 14
) {
  return useMemo(() => {
    if (!calendario?.inicio || !calendario?.fin) {
      console.warn("⚠️ Calendario no configurado o incompleto", calendario);
      return { diasDisponibles: [], horariosDisponibles: [] };
    }

    const diasLibresNorm = (calendario.diasLibres || []).map(normalizeDia);

    console.log("[useCalendario] calendario recibido:", calendario);
    console.log("[useCalendario] diasLibres normalizados:", diasLibresNorm);

    // 📅 GENERAR DÍAS DISPONIBLES
    const ahora = new Date();
    const diasDisponibles = Array.from({ length: diasAdelante }, (_, i) => {
      const d = new Date();
      d.setDate(ahora.getDate() + i);

      const dayNameLong = d.toLocaleDateString("es-ES", { weekday: "long" });
      const dayNameNorm = normalizeDia(dayNameLong);

      const disabled = diasLibresNorm.includes(dayNameNorm);

      const item = {
        date: d,
        label: d.toLocaleDateString("es-ES", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
        value: d.toISOString().split("T")[0],
        disabled,
      };

      return item;
    });

    console.log("[useCalendario] diasDisponibles:", diasDisponibles);

    // ⏰ HORARIOS
    const horariosDisponibles: string[] = [];
    const [hIni, mIni] = calendario.inicio.split(":").map(Number);
    const [hFin, mFin] = calendario.fin.split(":").map(Number);

    const start = hIni * 60 + mIni;
    const end = hFin * 60 + mFin;
    const totalMinutes = end - start;

    if (calendario.modoTurnos === "personalizado" && calendario.clientesPorDia) {
      const step = Math.floor(totalMinutes / calendario.clientesPorDia);
      for (let i = 0; i < calendario.clientesPorDia; i++) {
        const t = start + i * step;
        const hh = String(Math.floor(t / 60)).padStart(2, "0");
        const mm = String(t % 60).padStart(2, "0");
        horariosDisponibles.push(`${hh}:${mm}`);
      }
    } else if (calendario.modoTurnos === "jornada" && calendario.horasSeparacion) {
      let t = start;
      while (t + calendario.horasSeparacion <= end) {
        const hh = String(Math.floor(t / 60)).padStart(2, "0");
        const mm = String(t % 60).padStart(2, "0");
        horariosDisponibles.push(`${hh}:${mm}`);
        t += calendario.horasSeparacion;
      }
    }

    console.log("[useCalendario] horariosDisponibles:", horariosDisponibles);

    return { diasDisponibles, horariosDisponibles };
  }, [calendario, diasAdelante]);
}
