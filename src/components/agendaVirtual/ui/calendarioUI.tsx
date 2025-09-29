// src/components/agendaVirtual/ui/CalendarioUI.tsx
import { useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import type { DocumentData, QuerySnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase";

type Turno = {
  hora: string;
  disponible: boolean;
};

type TurnoGuardado = {
  hora: string;
  duracion: number;
  fecha: Date; // siempre Date
};

type Props = {
  empleado: any;
  servicio: any;
  negocioId: string;
  onSelectTurno: (t: { hora: string; fecha: Date }) => void;
  generarTurnos?: (fecha: Date) => Turno[];
  onAbrirModalCliente?: () => void;
};

// 🔎 Helper para comparar fechas sin hora
const esMismoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// 🔎 Helper para saber si un turno ya pasó
const esTurnoPasado = (fecha: Date, hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  const turno = new Date(fecha);
  turno.setHours(h, m, 0, 0);
  return turno < new Date();
};

// 🔎 Verifica si un slot se superpone con un turno reservado
function seSuperpone(
  horaSlot: string,
  duracionServicio: number,
  turnos: TurnoGuardado[],
  fecha: Date
) {
  const [h, m] = horaSlot.split(":").map(Number);
  const inicioSlot = h * 60 + m;
  const finSlot = inicioSlot + duracionServicio;

  return turnos.some((t) => {
    if (!esMismoDia(fecha, t.fecha)) return false;

    const [th, tm] = t.hora.split(":").map(Number);
    const inicioTurno = th * 60 + tm;
    const finTurno = inicioTurno + (t.duracion || 0);

    return inicioSlot < finTurno && finSlot > inicioTurno;
  });
}

export default function CalendarioUI({
  empleado,
  servicio,
  negocioId,
  onSelectTurno,
  generarTurnos,
}: Props) {
  const hoy = new Date();
  const [mesVisible, setMesVisible] = useState(new Date(hoy));
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [turnosOcupados, setTurnosOcupados] = useState<TurnoGuardado[]>([]);
  const calendarioRef = useRef<HTMLDivElement>(null);

  const year = mesVisible.getFullYear();
  const month = mesVisible.getMonth();

  const primerDia = new Date(year, month, 1);
  const ultimoDia = new Date(year, month + 1, 0);
  const diasEnMes = ultimoDia.getDate();
  const inicioSemana = (primerDia.getDay() + 6) % 7;

  const fechaMinima = new Date(hoy);
  fechaMinima.setDate(hoy.getDate() - 10);
  const fechaMaxima = new Date(hoy);
  fechaMaxima.setDate(hoy.getDate() + 30);

  const dias: (Date | null)[] = [];
  for (let i = 0; i < inicioSemana; i++) dias.push(null);
  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = new Date(year, month, d);
    if (fecha >= fechaMinima && fecha <= fechaMaxima) dias.push(fecha);
  }

  const nombreMes = mesVisible.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

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

  // ⚡ Generar turnos internos
  const generarTurnosInterno = (fecha: Date) => {
    const turnosTemp: Turno[] = [];
    if (!empleado?.calendario) return [];

    const [hInicio, mInicio] = empleado.calendario.inicio
      ? empleado.calendario.inicio.split(":").map(Number)
      : [8, 0];
    const [hFin, mFin] = empleado.calendario.fin
      ? empleado.calendario.fin.split(":").map(Number)
      : [16, 0];

    let mins = hInicio * 60 + mInicio;
    const finMins = hFin * 60 + mFin;
    const duracion = Number(servicio?.duracion) || 30;

    while (mins + duracion <= finMins) {
      const hh = String(Math.floor(mins / 60)).padStart(2, "0");
      const mm = String(mins % 60).padStart(2, "0");
      const horaSlot = `${hh}:${mm}`;

      const ocupado = seSuperpone(horaSlot, duracion, turnosOcupados, fecha);
      turnosTemp.push({ hora: horaSlot, disponible: !ocupado });

      mins += duracion;
    }

    return turnosTemp;
  };

  const seleccionarDia = (fecha: Date) => {
    setDiaSeleccionado(fecha);
    const nuevosTurnos = generarTurnos
      ? generarTurnos(fecha)
      : generarTurnosInterno(fecha);
    setTurnos(nuevosTurnos);
  };

  // 👀 Escuchar turnos ocupados en tiempo real
  useEffect(() => {
    if (!empleado || !empleado.nombre) return;

    const ref = collection(db, "Negocios", negocioId, "Turnos");
    const q = query(ref, where("empleadoNombre", "==", empleado.nombre));

    const unsub = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      const lista: TurnoGuardado[] = snap.docs.map((doc) => {
        const data = doc.data() as any;

        // ⚡ convertir "2025-09-29" → Date(2025, 8, 29)
        let fecha: Date;
        if (typeof data.fecha === "string") {
          const [y, m, d] = data.fecha.split("-").map(Number);
          fecha = new Date(y, m - 1, d);
        } else {
          fecha = new Date(data.fecha);
        }

        return {
          ...data,
          fecha,
        } as TurnoGuardado;
      });
      setTurnosOcupados(lista);
    });

    return () => unsub();
  }, [empleado, negocioId]);

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
              disabled={
                (d < hoy && !esMismoDia(d, hoy)) ||
                d < fechaMinima ||
                d > fechaMaxima
              }
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition
                ${
                  esMismoDia(d, hoy)
                    ? "bg-white text-black font-bold"
                    : diaSeleccionado && esMismoDia(d, diaSeleccionado)
                    ? "bg-indigo-600 text-white font-bold"
                    : d < hoy && !esMismoDia(d, hoy)
                    ? "text-gray-500 line-through cursor-not-allowed"
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
            {turnos.map((t, i) => {
              const vencido = esTurnoPasado(diaSeleccionado, t.hora);
              const ocupado = !t.disponible;

              return (
                <button
                  key={i}
                  disabled={ocupado || vencido}
                  onClick={() =>
                    !ocupado &&
                    !vencido &&
                    onSelectTurno({ hora: t.hora, fecha: diaSeleccionado })
                  }
                  className={`px-3 py-2 rounded-md text-sm transition ${
                    vencido
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : ocupado
                      ? "bg-red-600 text-white cursor-not-allowed"
                      : "bg-white text-black hover:bg-gray-200"
                  }`}
                >
                  {t.hora}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
