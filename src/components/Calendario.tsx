// src/components/Calendario.tsx
import React, { useState } from "react";
import { useCalendario } from "../lib/useCalendario";

type CalendarioEmpleado = {
  inicio: string;
  fin: string;
  diasLibres: string[];
};

type Props = {
  calendario?: CalendarioEmpleado | null;
  onSeleccionarTurno?: (fecha: Date, hora: string) => void;
};

export default function CalendarioNuevo({ calendario, onSeleccionarTurno }: Props) {
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null);
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null);

  const { diasDisponibles, horariosDisponibles } = useCalendario(calendario, 15);

  // 🚨 Caso: no hay calendario configurado
  if (!calendario || !calendario.inicio || !calendario.fin) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-300 rounded-xl text-center shadow">
        <p className="text-yellow-700 font-medium mb-3">
          ⚠️ Este barbero/profesional no tiene su calendario configurado.
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
      <h3 className="text-xl font-bold mb-6 text-center">Selecciona tu turno</h3>

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
            {horariosDisponibles.map((slot) => (
              <button
                key={slot}
                onClick={() => {
                  setHoraSeleccionada(slot);
                  onSeleccionarTurno?.(fechaSeleccionada, slot);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  horaSeleccionada === slot
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-800 hover:bg-green-100"
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
