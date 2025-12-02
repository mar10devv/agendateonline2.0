// src/lib/useCalendario.ts
import { useMemo } from "react";

type ConfiguracionAgenda = {
  modoTurnos: "personalizado" | "jornada";
  clientesPorDia?: number;         // usado en modo personalizado
  horasSeparacion?: number;        // minutos por cliente en modo jornada
  diasLibres?: string[];           // ← NEGOCIO + EMPLEADO
  inicio: string;                  // "08:00"
  fin: string;                     // "17:00"

  // 🆕 Opcionales para empleados con "1 día y medio"
  descansoDiaMedio?: string | null;             // ej: "viernes"
  descansoTurnoMedio?: "manana" | "tarde" | null; // medio turno en mañana o tarde
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
  diasAdelante = 14,
  // 🆕 fecha seleccionada, para poder aplicar medio turno solo ese día
  fechaSeleccionada?: Date | null
) {
  // Usamos un timestamp normalizado para que useMemo sepa cuándo recalcular
  const fechaTimestamp = fechaSeleccionada
    ? new Date(fechaSeleccionada).setHours(0, 0, 0, 0)
    : null;

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

    // ⏰ HORARIOS BASE (sin tener en cuenta medio día todavía)
    const horariosBase: string[] = [];
    const [hIni, mIni] = calendario.inicio.split(":").map(Number);
    const [hFin, mFin] = calendario.fin.split(":").map(Number);

    const start = hIni * 60 + mIni; // minutos desde 00:00
    const end = hFin * 60 + mFin;
    const totalMinutes = end - start;

    if (totalMinutes <= 0) {
      console.warn("⚠️ Rango horario inválido en calendario:", calendario);
      return { diasDisponibles, horariosDisponibles: [] };
    }

    if (
      calendario.modoTurnos === "personalizado" &&
      calendario.clientesPorDia
    ) {
      const step = Math.floor(totalMinutes / calendario.clientesPorDia);
      for (let i = 0; i < calendario.clientesPorDia; i++) {
        const t = start + i * step;
        const hh = String(Math.floor(t / 60)).padStart(2, "0");
        const mm = String(t % 60).padStart(2, "0");
        horariosBase.push(`${hh}:${mm}`);
      }
    } else if (
      calendario.modoTurnos === "jornada" &&
      calendario.horasSeparacion
    ) {
      let t = start;
      while (t + calendario.horasSeparacion <= end) {
        const hh = String(Math.floor(t / 60)).padStart(2, "0");
        const mm = String(t % 60).padStart(2, "0");
        horariosBase.push(`${hh}:${mm}`);
        t += calendario.horasSeparacion;
      }
    }

    console.log("[useCalendario] horariosBase:", horariosBase);

    // 🆕 APLICAR MEDIO TURNO (solo si:
    // - hay fecha seleccionada
    // - y el calendario tiene definido descansoDiaMedio + descansoTurnoMedio)
    let horariosDisponibles = [...horariosBase];

    if (
      fechaSeleccionada &&
      calendario.descansoDiaMedio &&
      calendario.descansoTurnoMedio &&
      horariosBase.length > 0
    ) {
      const diaSeleccionadoNombre = fechaSeleccionada.toLocaleDateString(
        "es-ES",
        { weekday: "long" }
      );
      const diaSeleccionadoNorm = normalizeDia(diaSeleccionadoNombre);
      const diaMedioNorm = normalizeDia(calendario.descansoDiaMedio);

      // Solo aplicamos medio turno si justo es el día configurado como "medio día"
      if (diaSeleccionadoNorm === diaMedioNorm) {
        // ⏱️ SIEMPRE 4 HORAS DE TRABAJO EN MEDIO DÍA
        const CUATRO_HORAS = 4 * 60;

        // Si la jornada ya es de 4h o menos, no recortamos nada:
        if (totalMinutes > CUATRO_HORAS) {
          let ventanaInicio = start;
          let ventanaFin = end;

          if (calendario.descansoTurnoMedio === "manana") {
            // Medio día en la mañana → solo primeras 4 horas
            ventanaInicio = start;
            ventanaFin = start + CUATRO_HORAS;
          } else {
            // Medio día en la tarde → solo últimas 4 horas
            ventanaInicio = end - CUATRO_HORAS;
            ventanaFin = end;
          }

          horariosDisponibles = horariosBase.filter((hora) => {
            const [hh, mm] = hora.split(":").map(Number);
            const t = hh * 60 + mm;
            // Incluimos horarios dentro de la ventana [ventanaInicio, ventanaFin)
            return t >= ventanaInicio && t < ventanaFin;
          });

          // Por seguridad, si quedamos sin horarios por redondeos, volvemos a los base
          if (horariosDisponibles.length === 0) {
            horariosDisponibles = [...horariosBase];
          }

          console.log(
            "[useCalendario] medio turno aplicado:",
            calendario.descansoTurnoMedio,
            "ventana",
            ventanaInicio,
            ventanaFin,
            "→ horariosDisponibles:",
            horariosDisponibles
          );
        } else {
          console.log(
            "[useCalendario] jornada <= 4h, no se recorta medio turno"
          );
        }
      }
    }

    return { diasDisponibles, horariosDisponibles };
  }, [calendario, diasAdelante, fechaTimestamp]);
}
