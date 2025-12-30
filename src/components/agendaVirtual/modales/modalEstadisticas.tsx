// src/components/agendaVirtual/ui/modalEstadisticas.tsx
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";

import {
  normalizarTurnos,
  type TurnoFuente,
  type TurnoExistente,
  type EmpleadoAgendaSource,
  type NegocioAgendaSource,
} from "../calendario/calendario-backend";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  negocio: NegocioAgendaSource;
  empleados: EmpleadoAgendaSource[];
  turnos?: TurnoFuente[];
};

// --------- Tipos internos ---------
type EmpleadoStats = {
  empleadoNombre: string;

  // Día seleccionado
  totalIngresosDia: number;
  clientesDia: number;

  // Mes del día seleccionado
  ingresosMesActual: number;
  clientesMesActual: number;

  // Mes anterior al día seleccionado
  ingresosMesPasado: number;
  clientesMesPasado: number;

  // Mejor mes histórico
  mejorMesKey: string | null; // "2025-03"
  mejorMesMonto: number;

  servicioMasFrecuente: string | null;
};

type EstadoCarga = "idle" | "cargando" | "ok" | "error";

// --------- Helpers de negocio ---------

/**
 * Determina si un turno se considera "VALIDADO / ASISTIDO" para estadísticas.
 * Regla:
 * - No bloqueado
 * - Debe estar marcado como validado/asistido/completado en algún campo
 */
function esTurnoValidado(t: TurnoExistente): boolean {
  const raw: any = t.raw || {};

  // Nunca contar bloqueados
  if (raw.bloqueado || t.bloqueado) return false;

  // Flags directas (ajustá estos nombres si en tu base están distintos)
  if (raw.validado === true) return true;
  if (raw.asistio === true) return true;
  if (raw.asistencia === true) return true;
  if (t as any && (t as any).validado === true) return true;

  // Campo tipo "estadoCliente": "asistio", "no-asistio", etc.
  const estadoCliente = String(raw.estadoCliente || "").trim().toLowerCase();
  if (
    estadoCliente === "asistio" ||
    estadoCliente === "asistió" ||
    estadoCliente === "completado"
  ) {
    return true;
  }

  // Campo estado / status con palabras clave
  const estado = String(raw.estado || raw.status || (t as any).estado || "")
    .trim()
    .toLowerCase();

  // Lo consideramos validado solo si incluye estas palabras
  if (
    estado.includes("asist") ||      // asistio / asistió
    estado.includes("valid") ||      // validado
    estado.includes("complet") ||    // completado
    estado.includes("realiz")        // realizado
  ) {
    return true;
  }

  // Si no encontramos una señal clara de validación, no lo contamos
  return false;
}

/**
 * Devuelve el nombre del empleado asociado al turno.
 */
function obtenerNombreEmpleadoDeTurno(t: TurnoExistente): string {
  const raw: any = t.raw || {};
  return (
    raw.empleadoNombre ||
    (raw.empleado && raw.empleado.nombre) ||
    t.raw?.empleadoNombre ||
    "Sin nombre"
  );
}

/**
 * Devuelve el nombre del servicio del turno.
 */
function obtenerNombreServicioDeTurno(t: TurnoExistente): string {
  const raw: any = t.raw || {};
  return (
    raw.servicioNombre ||
    (raw.servicio && raw.servicio.nombre) ||
    t.servicioNombre ||
    "Sin servicio"
  );
}

/**
 * Obtiene el monto del turno (montoTotal, precio, importe, etc.).
 */
function obtenerMontoTurno(t: TurnoExistente): number {
  const raw: any = t.raw || {};
  const montoRaw =
    raw.montoTotal ?? raw.precio ?? raw.importe ?? raw.monto ?? 0;
  const n = Number(montoRaw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Formatea un número como moneda simple "$ 1.234".
 */
function formatearMonto(monto: number): string {
  try {
    return `$ ${monto.toLocaleString("es-UY", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  } catch {
    return `$ ${Math.round(monto)}`;
  }
}

/**
 * Convierte Date a "YYYY-MM-DD".
 */
function toISODateOnly(d: Date): string {
  return d.toISOString().split("T")[0];
}

/**
 * Convierte "YYYY-MM" a "marzo 2025".
 */
function formatearMesHumano(key: string | null): string {
  if (!key) return "Sin datos";
  const [yearStr, monthStr] = key.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return key;

  const fecha = new Date(year, month - 1, 1);
  try {
    return new Intl.DateTimeFormat("es-UY", {
      month: "long",
      year: "numeric",
    }).format(fecha);
  } catch {
    return key;
  }
}

export default function ModalEstadisticas({
  abierto,
  onCerrar,
  negocio,
  empleados,
}: Props) {
  const [fechaStr, setFechaStr] = useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );
  const [estado, setEstado] = useState<EstadoCarga>("idle");
  const [stats, setStats] = useState<EmpleadoStats[]>([]);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    if (!negocio?.id) return;
    if (!fechaStr) return;

    let cancelado = false;

    const cargar = async () => {
      setEstado("cargando");
      setMensajeError(null);

      try {
        // Día de referencia elegido por el dueño
        const fechaSel = new Date(`${fechaStr}T00:00:00`);
        const fechaSeleccionadaISO = toISODateOnly(fechaSel);

        const yearRef = fechaSel.getFullYear();
        const monthRef = fechaSel.getMonth(); // 0–11

        // Mes del día seleccionado
        const mesActualKey = `${yearRef}-${String(monthRef + 1).padStart(
          2,
          "0"
        )}`;

        // Mes anterior al día seleccionado
        const fechaMesPasado = new Date(yearRef, monthRef - 1, 1);
        const mesPasadoKey = `${fechaMesPasado.getFullYear()}-${String(
          fechaMesPasado.getMonth() + 1
        ).padStart(2, "0")}`;

        const refTurnos = collection(
          db,
          "Negocios",
          negocio.id,
          "Turnos"
        );

        // 🔥 Traemos TODO el historial de turnos del negocio
        const snap = await getDocs(refTurnos);

        const brutos: TurnoFuente[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));

        // 👇 Solo turnos VALIDADOS / ASISTIDOS
        const normalizados: TurnoExistente[] =
          normalizarTurnos(brutos).filter(esTurnoValidado);

        if (cancelado) return;

        const resultado: EmpleadoStats[] = empleados.map((emp) => {
          const nombreEmp = emp.nombre || "Sin nombre";

          // Todos los turnos validados del empleado (histórico)
          const turnosEmpleado = normalizados.filter((t) => {
            const nombreTurno = obtenerNombreEmpleadoDeTurno(t);
            return nombreTurno === nombreEmp;
          });

          // --- Día seleccionado ---
          const turnosDelDia = turnosEmpleado.filter((t) => {
            const fechaTurno =
              t.inicio instanceof Date ? t.inicio : new Date(t.inicio);
            return toISODateOnly(fechaTurno) === fechaSeleccionadaISO;
          });

          const totalIngresosDia = turnosDelDia.reduce(
            (acc, t) => acc + obtenerMontoTurno(t),
            0
          );
          const clientesDia = turnosDelDia.length;

          // --- Agrupación por mes (histórico) ---
          const mapaMeses = new Map<
            string,
            { ingresos: number; clientes: number }
          >();

          for (const t of turnosEmpleado) {
            const fechaTurno =
              t.inicio instanceof Date ? t.inicio : new Date(t.inicio);
            const mesKey = `${fechaTurno.getFullYear()}-${String(
              fechaTurno.getMonth() + 1
            ).padStart(2, "0")}`;
            const monto = obtenerMontoTurno(t);

            const actual = mapaMeses.get(mesKey) || {
              ingresos: 0,
              clientes: 0,
            };
            actual.ingresos += monto;
            actual.clientes += 1;
            mapaMeses.set(mesKey, actual);
          }

          const mesActual = mapaMeses.get(mesActualKey) || {
            ingresos: 0,
            clientes: 0,
          };
          const mesPasado = mapaMeses.get(mesPasadoKey) || {
            ingresos: 0,
            clientes: 0,
          };

          // --- Mejor mes histórico ---
          let mejorMesKey: string | null = null;
          let mejorMesMonto = 0;
          for (const [mesKey, dataMes] of mapaMeses.entries()) {
            if (dataMes.ingresos > mejorMesMonto) {
              mejorMesMonto = dataMes.ingresos;
              mejorMesKey = mesKey;
            }
          }

          // --- Servicio más ejercido (histórico, solo validados) ---
          const contadorServicios = new Map<string, number>();
          for (const t of turnosEmpleado) {
            const servicio = obtenerNombreServicioDeTurno(t);
            const key = servicio || "Sin servicio";
            contadorServicios.set(
              key,
              (contadorServicios.get(key) || 0) + 1
            );
          }

          let servicioMasFrecuente: string | null = null;
          let maxCount = 0;
          for (const [serv, count] of contadorServicios.entries()) {
            if (count > maxCount) {
              maxCount = count;
              servicioMasFrecuente = serv;
            }
          }

          if (!servicioMasFrecuente) {
            servicioMasFrecuente =
              turnosEmpleado.length > 0 ? "Sin nombre" : null;
          }

          return {
            empleadoNombre: nombreEmp,
            totalIngresosDia,
            clientesDia,
            ingresosMesActual: mesActual.ingresos,
            clientesMesActual: mesActual.clientes,
            ingresosMesPasado: mesPasado.ingresos,
            clientesMesPasado: mesPasado.clientes,
            mejorMesKey,
            mejorMesMonto,
            servicioMasFrecuente,
          };
        });

        if (cancelado) return;

        setStats(resultado);
        setEstado("ok");
      } catch (err: any) {
        if (cancelado) return;
        setEstado("error");
        setMensajeError(
          "No se pudieron cargar las estadísticas. Intentá nuevamente."
        );
      }
    };

    cargar();

    return () => {
      cancelado = true;
    };
  }, [abierto, negocio?.id, fechaStr, empleados]);

  if (!abierto) return null;

  const nombreNegocio = negocio.nombre || "tu negocio";

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-2 sm:p-6">
      {/* Fondo oscuro */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onCerrar}
      />

      {/* Contenido */}
      <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white">
              Estadísticas de la agenda
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              Solo se cuentan turnos{" "}
              <span className="font-semibold">validados / asistidos</span>{" "}
              por empleado en{" "}
              <span className="font-semibold">{nombreNegocio}</span>.
            </p>
          </div>

          <button
            onClick={onCerrar}
            className="text-gray-400 hover:text-white text-lg leading-none px-2"
            aria-label="Cerrar estadísticas"
          >
            ✕
          </button>
        </div>

        {/* Selector de fecha + info de rango */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <label className="text-gray-300 whitespace-nowrap">
              Tomar como referencia el día:
            </label>
            <input
              type="date"
              value={fechaStr}
              onChange={(e) => setFechaStr(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-xs sm:text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <p className="text-[10px] sm:text-xs text-gray-400">
            Cálculos hechos sobre todo el historial de turnos{" "}
            <span className="font-semibold">validados</span> de cada
            empleado.
          </p>
        </div>

        {/* Estado de carga / error */}
        {estado === "cargando" && (
          <div className="py-6 text-center text-sm text-gray-300">
            Cargando estadísticas...
          </div>
        )}

        {estado === "error" && (
          <div className="py-6 text-center text-sm text-red-400">
            {mensajeError ||
              "Ocurrió un error al cargar las estadísticas."}
          </div>
        )}

        {/* Lista de empleados */}
        {estado !== "cargando" && (
          <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-3">
            {stats.length === 0 && (
              <p className="text-xs text-gray-400">
                No hay empleados configurados o no se encontraron
                turnos validados en el historial.
              </p>
            )}

            {stats.map((e) => (
              <div
                key={e.empleadoNombre}
                className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-3 sm:px-4 sm:py-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm sm:text-base font-semibold text-white">
                    {e.empleadoNombre}
                  </h3>
                </div>

                {/* Métricas principales */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
                  {/* Ingresos del día */}
                  <div className="bg-neutral-900 rounded-lg p-2 sm:p-3 flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wide text-gray-400">
                      Ingresos del día (validados)
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-emerald-400">
                      {formatearMonto(e.totalIngresosDia)}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Clientes: {e.clientesDia}
                    </span>
                  </div>

                  {/* Ingresos mes actual */}
                  <div className="bg-neutral-900 rounded-lg p-2 sm:p-3 flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wide text-gray-400">
                      Ingresos mes actual (validados)
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-emerald-400">
                      {formatearMonto(e.ingresosMesActual)}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Clientes: {e.clientesMesActual}
                    </span>
                  </div>

                  {/* Ingresos mes pasado */}
                  <div className="bg-neutral-900 rounded-lg p-2 sm:p-3 flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wide text-gray-400">
                      Ingresos mes pasado (validados)
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-emerald-400">
                      {formatearMonto(e.ingresosMesPasado)}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Clientes: {e.clientesMesPasado}
                    </span>
                  </div>

                  {/* Mejor mes */}
                  <div className="bg-neutral-900 rounded-lg p-2 sm:p-3 flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wide text-gray-400">
                      Mejor mes histórico (validados)
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-white">
                      {formatearMesHumano(e.mejorMesKey)}
                    </span>
                    <span className="text-[11px] text-emerald-400">
                      {formatearMonto(e.mejorMesMonto)}
                    </span>
                  </div>
                </div>

                {/* Extra: servicio más ejercido */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-1 gap-3 text-[11px] sm:text-xs">
                  <div className="bg-neutral-900 rounded-lg p-2 sm:p-3 flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wide text-gray-400">
                      Servicio más ejercido (en turnos validados)
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-white">
                      {e.servicioMasFrecuente || "Sin datos"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
