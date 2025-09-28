// src/components/agendaVirtual/calendario/modalCalendarioCliente.tsx
import { useState } from "react";

type Props = {
  servicio: { duracion: number };
  empleado: { nombre: string; calendario?: any };
  onSelectTurno: (t: { fecha: string; hora: string }) => void;
};

export default function ModalCalendarioCliente({
  servicio,
  empleado,
  onSelectTurno,
}: Props) {
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>("");

  // ⚠️ slots de prueba (luego se calculan según el empleado)
  const slotsDisponibles = ["09:00", "10:00", "11:00", "14:00", "15:00"];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">
        Selecciona día y hora con {empleado.nombre}
      </h3>

      <input
        type="date"
        value={fechaSeleccionada}
        onChange={(e) => setFechaSeleccionada(e.target.value)}
        className="p-2 rounded bg-neutral-700 text-white"
      />

      {fechaSeleccionada && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {slotsDisponibles.map((h) => (
            <button
              key={h}
              onClick={() => onSelectTurno({ fecha: fechaSeleccionada, hora: h })}
              className="p-2 bg-purple-600 hover:bg-purple-700 rounded"
            >
              {h}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
