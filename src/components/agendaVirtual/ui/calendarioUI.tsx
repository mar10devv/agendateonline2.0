// src/components/agendaVirtual/ui/CalendarioUI.tsx
import { useState } from "react";

export default function CalendarioUI() {
  const hoy = new Date();
  const [mesVisible, setMesVisible] = useState(new Date(hoy));

  const year = mesVisible.getFullYear();
  const month = mesVisible.getMonth();

  // Primer día y último día del mes
  const primerDia = new Date(year, month, 1);
  const ultimoDia = new Date(year, month + 1, 0);
  const diasEnMes = ultimoDia.getDate();

  // Ajustar inicio de semana (Lunes=0)
  const inicioSemana = (primerDia.getDay() + 6) % 7;

  const dias = [];
  for (let i = 0; i < inicioSemana; i++) {
    dias.push(null);
  }
  for (let d = 1; d <= diasEnMes; d++) {
    dias.push(new Date(year, month, d));
  }

  const nombreMes = mesVisible.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  const irMesAnterior = () => setMesVisible(new Date(year, month - 1, 1));
  const irMesSiguiente = () => setMesVisible(new Date(year, month + 1, 1));

  return (
    <div className="bg-neutral-900 text-white p-4 rounded-2xl w-[340px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={irMesAnterior} className="px-2 text-gray-400 hover:text-white">
          ◀
        </button>
        <h2 className="text-sm font-semibold capitalize">{nombreMes}</h2>
        <button onClick={irMesSiguiente} className="px-2 text-gray-400 hover:text-white">
          ▶
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 text-xs text-gray-400 mb-2">
        {["L","M","X","J","V","S","D"].map((d, i) => (
          <div key={i} className="w-10 h-10 flex items-center justify-center">
            {d}
          </div>
        ))}
      </div>

      {/* Días del mes */}
      <div className="grid grid-cols-7 gap-y-2 text-sm">
        {dias.map((d, idx) =>
          d ? (
            <button
              key={idx}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition
                ${
                  d.toDateString() === hoy.toDateString()
                    ? "bg-white text-black font-bold"
                    : d < hoy
                    ? "text-gray-500 line-through" // 👈 tachar días pasados
                    : "hover:bg-neutral-700"
                }`}
            >
              {d.getDate()}
            </button>
          ) : (
            <div key={idx} className="w-10 h-10" />
          )
        )}
      </div>
    </div>
  );
}
