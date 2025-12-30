// src/components/agendaVirtual/ui/CalendarioUI.tsx
import { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  type DocumentData,
  type QuerySnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

type Turno = {
  hora: string;
  disponible: boolean;
};

type TurnoGuardado = {
  hora: string;             // "HH:mm"
  duracion: number | string; // minutos o "H:MM"
  fecha: Date;              // siempre Date aquí
};

type Props = {
  empleado: any;
  servicio: any;
  negocioId: string;
  onSelectTurno: (t: { hora: string; fecha: Date }) => void;
  generarTurnos?: (fecha: Date) => Turno[];
  onAbrirModalCliente?: () => void;
};

/* -------------------- Helpers de fecha/hora -------------------- */
const esMismoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const esTurnoPasado = (fecha: Date, hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  const turno = new Date(fecha);
  turno.setHours(h, m, 0, 0);
  return turno < new Date();
};

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function parseDuracionMin(d: any): number {
  if (typeof d === "number") return d;
  if (typeof d === "string") {
    if (d.includes(":")) {
      const [h, m] = d.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    }
    const n = Number(d);
    if (!Number.isNaN(n)) return n;
  }
  return 30; // fallback por seguridad
}

function solapan(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  // intervalos medio-abiertos [start, end)
  return aStart < bEnd && aEnd > bStart;
}

function toDateSafe(f: any): Date {
  if (!f) return new Date(NaN);
  if (f instanceof Date) return f;
  if (f instanceof Timestamp) return f.toDate();
  if (typeof f?.toDate === "function") return f.toDate();
  if (typeof f === "string") {
    // admite "YYYY-MM-DD"
    const [y, m, d] = f.split("-").map(Number);
    if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
      return new Date(y, (m || 1) - 1, d || 1);
    }
    // intento genérico
    const t = new Date(f);
    return t;
  }
  return new Date(f);
}

/* =========================== Componente =========================== */
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

  /* 🔤 Normalizamos días libres (negocio + empleado) */
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const diasLibres: string[] = empleado?.calendario?.diasLibres || [];
  const diasLibresNorm = diasLibres.map(normalize);

  console.log("[CalendarioUI] diasLibres desde empleado.calendario →", diasLibres);
  console.log("[CalendarioUI] diasLibres normalizados →", diasLibresNorm);

  const esDiaLibre = (fecha: Date) => {
    const nombreDia = fecha
      .toLocaleDateString("es-ES", { weekday: "long" })
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return diasLibresNorm.includes(nombreDia);
  };

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

  /* -------- Generador de slots con disponibilidad correcta -------- */
  const generarTurnosInterno = (fecha: Date) => {
    const turnosTemp: Turno[] = [];
    if (!empleado?.calendario) return [];

    // ❌ Si el día es libre (negocio o empleado), no generamos turnos
    if (esDiaLibre(fecha)) {
      console.log("[CalendarioUI] Día libre, no se generan slots para", fecha);
      return [];
    }

    const [hInicio, mInicio] = (empleado.calendario.inicio || "08:00")
      .split(":")
      .map(Number);
    const [hFin, mFin] = (empleado.calendario.fin || "22:00")
      .split(":")
      .map(Number);

    const inicioJ = hInicio * 60 + mInicio;
    const finJ = hFin * 60 + mFin;

    const paso = 30;
    const duracionServicio = parseDuracionMin(servicio?.duracion);

    for (let mins = inicioJ; mins + paso <= finJ; mins += paso) {
      const hh = String(Math.floor(mins / 60)).padStart(2, "0");
      const mm = String(mins % 60).padStart(2, "0");
      const horaSlot = `${hh}:${mm}`;

      const disponible = (() => {
        const sStart = mins;
        const sEnd = sStart + duracionServicio;

        if (sStart < inicioJ) return false;
        if (sEnd > finJ) return false;

        const reservas = turnosOcupados
          .filter((t) => t.fecha && esMismoDia(fecha, t.fecha))
          .map((t) => {
            const i = toMin(t.hora);
            const d = parseDuracionMin(t.duracion);
            return { inicio: i, fin: i + d };
          });

        for (const r of reservas) {
          if (sStart < r.fin && sEnd > r.inicio) return false;
        }
        return true;
      })();

      turnosTemp.push({ hora: horaSlot, disponible });
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

  /* ------------- Escucha de turnos ocupados (con parseo seguro) ------------- */
  useEffect(() => {
    if (!empleado || !empleado.nombre || !negocioId) return;

    const ref = collection(db, "Negocios", negocioId, "Turnos");
    const q = query(ref, where("empleadoNombre", "==", empleado.nombre));

    const unsub = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      const lista: TurnoGuardado[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          hora: data.hora,
          duracion: data.duracion,
          fecha: toDateSafe(data.fecha), // ✅ ahora siempre Date válido
        };
      });
      setTurnosOcupados(lista);
    });

    return () => unsub();
  }, [empleado, negocioId]);

  /* ---- Recalcular slots cuando cambian reservas/duración/calendario/día ---- */
  useEffect(() => {
    if (!diaSeleccionado) return;
    setTurnos(
      generarTurnos
        ? generarTurnos(diaSeleccionado)
        : generarTurnosInterno(diaSeleccionado)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnosOcupados, servicio?.duracion, empleado?.calendario, diaSeleccionado]);

  /* --------------------------------- UI --------------------------------- */
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
        {dias.map((d, idx) => {
          if (!d) return <div key={idx} className="w-10 h-10" />;

          const esLibre = esDiaLibre(d);
          const esPasado = d < hoy && !esMismoDia(d, hoy);
          const fueraRango = d < fechaMinima || d > fechaMaxima;

          const disabled = esLibre || esPasado || fueraRango;

          const baseClases =
            "w-10 h-10 flex items-center justify-center rounded-lg transition";

          let clases = "";
          if (esLibre) {
            clases = "bg-neutral-800 text-red-400 line-through cursor-not-allowed";
          } else if (esPasado) {
            clases = "text-gray-500 line-through cursor-not-allowed";
          } else if (esMismoDia(d, hoy)) {
            clases = "bg-white text-black font-bold";
          } else if (diaSeleccionado && esMismoDia(d, diaSeleccionado)) {
            clases = "bg-indigo-600 text-white font-bold";
          } else {
            clases = "hover:bg-neutral-700";
          }

          return (
            <button
              key={idx}
              onClick={() => !disabled && seleccionarDia(d)}
              disabled={disabled}
              className={`${baseClases} ${clases}`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      {/* Turnos disponibles */}
      {diaSeleccionado && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">
            Turnos disponibles para{" "}
            {diaSeleccionado.toLocaleDateString("es-ES")}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {turnos.length === 0 && (
              <p className="col-span-2 text-xs text-gray-400">
                No hay turnos disponibles para este día.
              </p>
            )}

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
