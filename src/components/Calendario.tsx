// src/components/Calendario.tsx
import React, { useState, useEffect } from "react";
import { useCalendario } from "../lib/useCalendario";

//
// Calendario final procesado (NEGOCIO + EMPLEADO)
// Debe llegar desde AgendaVirtual / ModalAgendarse ya combinado.
//
export type CalendarioEmpleado = {
  inicio: string; // "10:00"
  fin: string; // "20:00"
  modoTurnos: "personalizado" | "jornada";
  clientesPorDia?: number; // usado en modo personalizado
  horasSeparacion?: number; // usado en modo jornada
  diasLibres?: string[]; // negocio + empleado (ej: ["domingo"])

  // 🆕 opcionales para medio día
  descansoDiaMedio?: string | null; // ej: "viernes"
  descansoTurnoMedio?: "manana" | "tarde" | null;
};

type Props = {
  calendario?: CalendarioEmpleado | null;
  onSeleccionarTurno?: (fecha: Date, hora: string | null) => void;
  horariosOcupados?: string[];
};

// Normaliza día: " Domingo " / "DOMINGO" / "Domíngo" → "domingo"
function normalizeDia(str: any): string {
  if (!str) return "";
  return String(str)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function Calendario({
  calendario,
  onSeleccionarTurno,
  horariosOcupados = [],
}: Props) {
  // 🔍 DEBUG: ver qué calendario está llegando
  console.log("[Calendario] props.calendario:", calendario);

  // Estado local de selección
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null);
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null);

  // ✅ Consideramos "válido" solo si tiene datos mínimos
  const calendarioValido: CalendarioEmpleado | null =
    calendario &&
    calendario.inicio &&
    calendario.fin &&
    calendario.modoTurnos
      ? calendario
      : null;

  //
  // 🟢 useCalendario genera base de días + horarios
  //    AHORA le pasamos también la fechaSeleccionada para que aplique medio día.
  //
  const { diasDisponibles: diasBase, horariosDisponibles } = useCalendario(
    calendarioValido as any, // puede ser null, el hook ya lo maneja
    15,
    fechaSeleccionada
  );

  // Normalizamos los días libres que vienen del negocio/empleado
  const diasLibresNormalizados =
    calendarioValido?.diasLibres?.map(normalizeDia) ?? [];

  console.log("[Calendario] diasLibres (crudo):", calendarioValido?.diasLibres);
  console.log(
    "[Calendario] diasLibres normalizados:",
    diasLibresNormalizados
  );

  // Refuerzo: vuelvo a marcar como disabled los días libres aquí
  const diasDisponibles = diasBase.map((d) => {
    const dayNameLong = d.date.toLocaleDateString("es-ES", {
      weekday: "long",
    });
    const dayNameNorm = normalizeDia(dayNameLong);

    const disabledByDiaLibre = diasLibresNormalizados.includes(dayNameNorm);

    const item = {
      ...d,
      disabled: d.disabled || disabledByDiaLibre,
    };

    return item;
  });

  console.log("[Calendario] diasDisponibles finales:", diasDisponibles);
  console.log(
    "[Calendario] horariosDisponibles para fecha:",
    fechaSeleccionada,
    horariosDisponibles
  );

  //
  // 🟢 Seleccionar automáticamente el primer día HÁBIL
  //
  useEffect(() => {
    const primerDia = diasDisponibles.find((d) => !d.disabled);
    if (primerDia) {
      setFechaSeleccionada(primerDia.date);
      setHoraSeleccionada(null);
      onSeleccionarTurno?.(primerDia.date, null);
    } else {
      setFechaSeleccionada(null);
      setHoraSeleccionada(null);
    }
  }, [diasDisponibles, onSeleccionarTurno]);

  // 🔴 Si NO hay calendario válido, mostramos aviso (después de hooks)
  if (!calendarioValido) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-300 rounded-xl text-center shadow">
        <p className="text-yellow-700 font-medium mb-3">
          ⚠️ Este profesional no tiene su calendario configurado.
        </p>
        <button
          type="button"
          className="px-5 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg shadow hover:opacity-90 transition"
        >
          Configurar horarios
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-xl shadow bg-white w-full max-w-lg mx-auto">
      <h3 className="text-xl font-bold mb-6 text-center">
        Selecciona tu turno
      </h3>

      {/* 📅 Días disponibles */}
      <div className="grid grid-cols-7 gap-3 mb-6">
        {diasDisponibles.map(({ date, disabled }, i) => (
          <button
            key={i}
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setFechaSeleccionada(date);
                setHoraSeleccionada(null);
                onSeleccionarTurno?.(date, null);
              }
            }}
            className={`py-3 rounded-lg font-semibold transition ${
              disabled
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : fechaSeleccionada?.toDateString() === date.toDateString()
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            {date.getDate()}
          </button>
        ))}
      </div>

      {/* ⏰ Horarios disponibles */}
      {fechaSeleccionada && (
        <div>
          <p className="font-medium mb-3 text-center">
            Horarios disponibles para{" "}
            {fechaSeleccionada.toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {horariosDisponibles.map((slot) => {
              const ocupado = horariosOcupados.includes(slot);

              return (
                <button
                  key={slot}
                  disabled={ocupado}
                  onClick={() => {
                    if (!ocupado) {
                      setHoraSeleccionada(slot);
                      onSeleccionarTurno?.(fechaSeleccionada, slot);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    ocupado
                      ? "bg-red-500 text-white cursor-not-allowed"
                      : horaSeleccionada === slot
                      ? "bg-green-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-800 hover:bg-green-100"
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
