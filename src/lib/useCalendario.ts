// src/lib/useCalendario.ts
import { useMemo } from "react";

type ConfiguracionAgenda = {
  modoTurnos: "personalizado" | "jornada";
  clientesPorDia?: number;     // usado en modo personalizado
  horasSeparacion?: number;    // minutos por cliente en modo jornada
  diasLibres?: string[];
  inicio: string;              // "08:00"
  fin: string;                 // "17:00"
};

export function useCalendario(
  calendario: ConfiguracionAgenda | null,
  diasAdelante = 14
) {
  return useMemo(() => {
    if (!calendario?.inicio || !calendario?.fin) {
      console.warn("⚠️ Calendario no configurado");
      return { diasDisponibles: [], horariosDisponibles: [] };
    }

    // 📅 Generar días disponibles
    const ahora = new Date();
    const diasDisponibles = Array.from({ length: diasAdelante }, (_, i) => {
      const d = new Date();
      d.setDate(ahora.getDate() + i);

      const dayName = d.toLocaleDateString("es-ES", { weekday: "long" });
      const disabled = calendario.diasLibres?.some(
        (dl) =>
          dl.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ===
          dayName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      );

      return {
        date: d,
        label: d.toLocaleDateString("es-ES", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
        value: d.toISOString().split("T")[0],
        disabled,
      };
    });

    // ⏰ Calcular horarios disponibles
    const horariosDisponibles: string[] = [];
    const [hIni, mIni] = calendario.inicio.split(":").map(Number);
    const [hFin, mFin] = calendario.fin.split(":").map(Number);

    const start = hIni * 60 + mIni; // minutos desde medianoche
    const end = hFin * 60 + mFin;
    const totalMinutes = end - start;

    if (calendario.modoTurnos === "personalizado" && calendario.clientesPorDia) {
      // 👉 Distribuir X clientes en todo el rango
      const step = Math.floor(totalMinutes / calendario.clientesPorDia);
      for (let i = 0; i < calendario.clientesPorDia; i++) {
        const t = start + i * step;
        const hh = String(Math.floor(t / 60)).padStart(2, "0");
        const mm = String(t % 60).padStart(2, "0");
        horariosDisponibles.push(`${hh}:${mm}`);
      }
    } else if (calendario.modoTurnos === "jornada" && calendario.horasSeparacion) {
      // 👉 Usar duración fija por cliente
      let t = start;
      while (t + calendario.horasSeparacion <= end) {
        const hh = String(Math.floor(t / 60)).padStart(2, "0");
        const mm = String(t % 60).padStart(2, "0");
        horariosDisponibles.push(`${hh}:${mm}`);
        t += calendario.horasSeparacion;
      }
    }

    return { diasDisponibles, horariosDisponibles };
  }, [calendario, diasAdelante]);
}
