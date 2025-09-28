// src/components/agendaVirtual/calendario/CalendarioNegocio.tsx
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase";

type Turno = {
  id: string;
  cliente: string;
  servicio: string;
  hora: string;
  empleado: string;
  estado: "pendiente" | "confirmado" | "cancelado";
};

type Props = {
  negocioId: string;
};

export default function CalendarioNegocio({ negocioId }: Props) {
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>("");
  const [turnos, setTurnos] = useState<Turno[]>([]);

  useEffect(() => {
    if (!fechaSeleccionada) return;

    const q = query(
      collection(db, "Negocios", negocioId, "Turnos"),
      where("fecha", "==", fechaSeleccionada)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Turno[];
      setTurnos(data);
    });

    return () => unsub();
  }, [fechaSeleccionada, negocioId]);

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-2">📅 Calendario del negocio</h3>

      {/* Selector de fecha */}
      <input
        type="date"
        value={fechaSeleccionada}
        onChange={(e) => setFechaSeleccionada(e.target.value)}
        className="p-2 rounded bg-neutral-700 text-white"
      />

      {/* Lista de turnos */}
      <div className="mt-4 space-y-2">
        {turnos.length === 0 ? (
          <p className="text-gray-400">No hay turnos para este día.</p>
        ) : (
          turnos.map((t) => (
            <div
              key={t.id}
              className="p-3 rounded bg-neutral-800 border border-neutral-600"
            >
              <p>
                ⏰ {t.hora} – <b>{t.cliente}</b>
              </p>
              <p className="text-sm text-gray-400">
                {t.servicio} con {t.empleado} ({t.estado})
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
