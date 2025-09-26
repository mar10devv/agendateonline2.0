// src/components/agendaVirtual/ui/CalendarioUI.tsx
import { useState, useEffect, useRef } from "react";

type Turno = {
  hora: string;
  disponible: boolean;
};

// 🔎 Helper para comparar fechas sin hora
const esMismoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function CalendarioUI() {
  const hoy = new Date();
  const [mesVisible, setMesVisible] = useState(new Date(hoy));
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);

  const calendarioRef = useRef<HTMLDivElement>(null);

  const year = mesVisible.getFullYear();
  const month = mesVisible.getMonth();

  // Primer día y último día del mes
  const primerDia = new Date(year, month, 1);
  const ultimoDia = new Date(year, month + 1, 0);
  const diasEnMes = ultimoDia.getDate();

  // Ajustar inicio de semana (Lunes=0)
  const inicioSemana = (primerDia.getDay() + 6) % 7;

  // 🔥 Fechas límite dinámicas
  const fechaMinima = new Date(hoy);
  fechaMinima.setDate(hoy.getDate() - 10);
  const fechaMaxima = new Date(hoy);
  fechaMaxima.setDate(hoy.getDate() + 30);

  // Generar días visibles dentro del rango permitido
  const dias: (Date | null)[] = [];
  for (let i = 0; i < inicioSemana; i++) {
    dias.push(null);
  }
  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = new Date(year, month, d);
    if (fecha >= fechaMinima && fecha <= fechaMaxima) {
      dias.push(fecha);
    }
  }

  const nombreMes = mesVisible.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  // 🔎 Validar si hay días válidos en el mes anterior/siguiente
  const hayDiasEnMes = (y: number, m: number) => {
    const primero = new Date(y, m, 1);
    const ultimo = new Date(y, m + 1, 0);
    return ultimo >= fechaMinima && primero <= fechaMaxima;
  };

  const puedeIrAnterior = hayDiasEnMes(year, month - 1);
  const puedeIrSiguiente = hayDiasEnMes(year, month + 1);

  const irMesAnterior = () => {
    if (puedeIrAnterior) setMesVisible(new Date(year, month - 1, 1));
  };
  const irMesSiguiente = () => {
    if (puedeIrSiguiente) setMesVisible(new Date(year, month + 1, 1));
  };

  // ⚡ Simulación de horarios de un empleado (8:00 a 16:00, cada 1hr)
  const generarTurnos = (fecha: Date) => {
    const turnosTemp: Turno[] = [];
    for (let h = 8; h < 16; h++) {
      turnosTemp.push({
        hora: `${h.toString().padStart(2, "0")}:00`,
        disponible: true,
      });
    }
    setTurnos(turnosTemp);
  };

  const seleccionarDia = (fecha: Date) => {
    setDiaSeleccionado(fecha);
    generarTurnos(fecha);
  };

  // 👀 Detectar click/touch fuera del calendario
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        calendarioRef.current &&
        !calendarioRef.current.contains(event.target as Node)
      ) {
        setDiaSeleccionado(null); // cerrar turnos
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={calendarioRef}
      className="bg-neutral-900 text-white p-4 rounded-2xl w-[340px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={irMesAnterior}
          disabled={!puedeIrAnterior}
          className={`px-2 ${
            puedeIrAnterior
              ? "text-gray-400 hover:text-white"
              : "text-gray-600 cursor-not-allowed"
          }`}
        >
          ◀
        </button>
        <h2 className="text-sm font-semibold capitalize">{nombreMes}</h2>
        <button
          onClick={irMesSiguiente}
          disabled={!puedeIrSiguiente}
          className={`px-2 ${
            puedeIrSiguiente
              ? "text-gray-400 hover:text-white"
              : "text-gray-600 cursor-not-allowed"
          }`}
        >
          ▶
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 text-xs text-gray-400 mb-2">
        {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
          <div key={i} className="w-10 h-10 flex items-center justify-center">
            {d}
          </div>
        ))}
      </div>

      {/* Días del mes */}
      <div className="grid grid-cols-7 gap-y-2 text-sm mb-4">
        {dias.map((d, idx) =>
          d ? (
            <button
              key={idx}
              onClick={() => seleccionarDia(d)}
              disabled={d < fechaMinima || d > fechaMaxima}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition
                ${
                  esMismoDia(d, hoy)
                    ? "bg-white text-black font-bold"
                    : diaSeleccionado && esMismoDia(d, diaSeleccionado)
                    ? "bg-indigo-600 text-white font-bold"
                    : d < hoy
                    ? "text-gray-500 line-through"
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

      {/* Turnos disponibles */}
      {diaSeleccionado && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">
            Turnos disponibles para{" "}
            {diaSeleccionado.toLocaleDateString("es-ES")}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {turnos.map((t, i) => (
              <button
                key={i}
                disabled={!t.disponible}
                className={`px-3 py-2 rounded-md text-sm transition ${
                  t.disponible
                    ? "bg-white text-black hover:bg-gray-200"
                    : "bg-red-600 text-white cursor-not-allowed"
                }`}
              >
                {t.hora}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
