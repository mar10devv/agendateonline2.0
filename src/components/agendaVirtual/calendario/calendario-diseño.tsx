// src/components/agendaVirtual/ui/CalendarioBase.tsx
import { useMemo, useState, useEffect } from "react";

import {
  combinarConfigCalendario,
  normalizarTurnos,
  generarSlotsDelDia,
  esMismoDia,
  normalizarDia,
  bloquearSlotBackend,
  bloquearDiaCompletoBackend,
  liberarDiaCompletoBackend,
  esDuenoOAdmin,
  escucharTurnosEmpleadoTiempoReal,
  marcarTurnoAsistenciaBackend, // ✅ ya estaba
  cancelarTurnoBackend, // ✅ NUEVO
  type NegocioAgendaSource,
  type EmpleadoAgendaSource,
  type TurnoFuente,
  type SlotCalendario,
  type UsuarioActual,
  type TurnoExistente,
} from "./calendario-backend";

export type ModoCalendario = "cliente" | "negocio";

type Props = {
  modo: ModoCalendario;
  usuarioActual: UsuarioActual;
  negocio: NegocioAgendaSource;
  empleado: EmpleadoAgendaSource | null;
  empleados?: EmpleadoAgendaSource[];
  turnos?: TurnoFuente[];
  minutosPorSlot?: number;
  /** ⏱ duración real del servicio en minutos (ej: 60, 90, 120) */
  duracionServicioMin?: number;
  onSlotLibreClick?: (slot: SlotCalendario) => void;
  onSlotOcupadoClick?: (slot: SlotCalendario) => void;
  onSlotBloqueadoClick?: (slot: SlotCalendario) => void;
};

type ModalDiaState = {
  visible: boolean;
  fecha: Date | null;
  desbloquear: boolean;
};

type ModalSlotState = {
  visible: boolean;
  slot: SlotCalendario | null;
};

type ModalTurnoState = {
  visible: boolean;
  turno: TurnoExistente | null;
};

// ======================= HELPERS EMPLEADOS =======================

// Dueño solo cuenta como trabajador si esEmpleado === true.
// El resto se asume que sí trabaja.
const esTrabajadorReal = (e: EmpleadoAgendaSource): boolean => {
  const anyEmp = e as any;
  const rolNorm = (anyEmp.rol || "").toLowerCase();

  if (
    (rolNorm === "dueño" || rolNorm === "dueno" || rolNorm === "owner") &&
    anyEmp.esEmpleado !== true
  ) {
    return false;
  }

  if (typeof anyEmp.esEmpleado === "boolean") {
    return anyEmp.esEmpleado;
  }

  return true;
};

export default function CalendarioBase({
  modo,
  usuarioActual,
  negocio,
  empleado,
  empleados,
  turnos = [],
  minutosPorSlot = 30,
  duracionServicioMin,
  onSlotLibreClick,
  onSlotOcupadoClick,
  onSlotBloqueadoClick,
}: Props) {
  const hoy = new Date();
  const [mesVisible, setMesVisible] = useState<Date>(new Date(hoy));
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(
    new Date(hoy)
  );

  const [modalDia, setModalDia] = useState<ModalDiaState>({
    visible: false,
    fecha: null,
    desbloquear: false,
  });

  const [modalSlot, setModalSlot] = useState<ModalSlotState>({
    visible: false,
    slot: null,
  });

  const [modalTurno, setModalTurno] = useState<ModalTurnoState>({
    visible: false,
    turno: null,
  });

  // loading para marcar asistencia
  const [marcandoAsistencia, setMarcandoAsistencia] = useState(false);
  // loading para cancelar turno
  const [cancelandoTurno, setCancelandoTurno] = useState(false);

  // ======================= EMPLEADO ACTUAL =======================

  // Lista base (tal cual viene por props)
  const listaEmpleadosBruta: EmpleadoAgendaSource[] = useMemo(() => {
    if (empleados && empleados.length > 0) return empleados;
    if (empleado) return [empleado];
    return [];
  }, [empleados, empleado]);

  // Lista usada en el selector: solo “trabajadores reales”;
  // si no hay ninguno marcado así, mostramos la lista completa.
  const listaEmpleados: EmpleadoAgendaSource[] = useMemo(() => {
    if (!listaEmpleadosBruta.length) return [];
    const trabajadores = listaEmpleadosBruta.filter(esTrabajadorReal);
    if (trabajadores.length > 0) return trabajadores;
    return listaEmpleadosBruta;
  }, [listaEmpleadosBruta]);

  // nombre que maneja el <select>
  const [empleadoSeleccionadoNombre, setEmpleadoSeleccionadoNombre] =
    useState<string>("");

  // sincronizar estado local con el empleado que viene del padre
  useEffect(() => {
    if (!listaEmpleados.length) return;

    // Si aún no tenemos un nombre seleccionado
    if (!empleadoSeleccionadoNombre) {
      // 1) intentamos usar el empleado que viene por props (si está en la lista)
      if (empleado?.nombre) {
        const existe = listaEmpleados.some(
          (e) => e.nombre === empleado.nombre
        );
        if (existe) {
          setEmpleadoSeleccionadoNombre(empleado.nombre);
          return;
        }
      }

      // 2) fallback: el primero de la lista
      if (listaEmpleados[0]?.nombre) {
        setEmpleadoSeleccionadoNombre(listaEmpleados[0].nombre!);
      }
      return;
    }

    // Si ya tenemos un nombre guardado, asegurarnos de que siga existiendo
    const actualExiste = listaEmpleados.some(
      (e) => e.nombre === empleadoSeleccionadoNombre
    );
    if (!actualExiste) {
      const primero = listaEmpleados[0];
      setEmpleadoSeleccionadoNombre(primero?.nombre || "");
    }
  }, [listaEmpleados, empleado?.nombre, empleadoSeleccionadoNombre]);

  const empleadoActual: EmpleadoAgendaSource | null = useMemo(() => {
    if (!listaEmpleados.length) return empleado;

    // 1) si hay un nombre seleccionado en el estado local → ese manda
    if (empleadoSeleccionadoNombre) {
      const porNombre = listaEmpleados.find(
        (e) => e.nombre === empleadoSeleccionadoNombre
      );
      if (porNombre) return porNombre;
    }

    // 2) si el padre pasa empleado y está en la lista → usarlo
    if (empleado && empleado.nombre) {
      const match = listaEmpleados.find((e) => e.nombre === empleado.nombre);
      if (match) return match;
      return empleado;
    }

    // 3) fallback: primero de la lista
    return listaEmpleados[0] || null;
  }, [listaEmpleados, empleadoSeleccionadoNombre, empleado]);

  const empleadoNombreRef = empleadoActual?.nombre?.trim() || "empleado";

  // En modo "negocio" asumimos que ya está en contexto de dueño/admin.
  const usuarioEsDuenoAdmin =
    modo === "negocio" ? true : esDuenoOAdmin(usuarioActual, negocio);

  // ======================= TURNOS EN TIEMPO REAL =======================

  const [turnosTiempoReal, setTurnosTiempoReal] = useState<TurnoFuente[] | null>(
    null
  );

  useEffect(() => {
    if (!negocio?.id) return;

    const unsub = escucharTurnosEmpleadoTiempoReal({
      negocioId: negocio.id,
      empleadoNombre: empleadoActual?.nombre || undefined,
      onUpdate: (lista) => {
        setTurnosTiempoReal(lista);
      },
    });

    return () => {
      unsub();
    };
  }, [negocio?.id, empleadoActual?.nombre]);

  const turnosOrigen: TurnoFuente[] = useMemo(() => {
    if (turnosTiempoReal) return turnosTiempoReal;
    return turnos;
  }, [turnosTiempoReal, turnos]);

  // ======================= CONFIG + TURNOS =======================

  const config = useMemo(
    () => combinarConfigCalendario(negocio, empleadoActual),
    [negocio, empleadoActual]
  );

  const turnosFiltrados = useMemo(() => {
    if (!empleadoActual) return turnosOrigen;
    return turnosOrigen.filter(
      (t: any) => t.empleadoNombre === empleadoActual.nombre
    );
  }, [turnosOrigen, empleadoActual]);

  const turnosNormalizados = useMemo(
    () => normalizarTurnos(turnosFiltrados),
    [turnosFiltrados]
  );

  // ========= DIAS LIBRES NEGOCIO + EMPLEADO POR SEPARADO =========

  // Días libres del negocio → configuracionAgenda.diasLibres
  const diasLibresNegocioNorm: string[] = useMemo(() => {
    const cfg: any = (negocio as any).configuracionAgenda || {};
    const src = cfg.diasLibres as any[] | undefined;

    if (!src || !Array.isArray(src)) return [];

    const diasSemana = [
      "domingo",
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
    ];

    const normalizados = src
      .map((d) => {
        if (typeof d === "string") return normalizarDia(d);
        if (typeof d === "number") {
          const nombre = diasSemana[d] ?? "";
          return normalizarDia(nombre);
        }
        return "";
      })
      .filter(Boolean);

    return normalizados;
  }, [negocio]);

  // Días libres por empleado → empleadoActual.calendario.diasLibres
  const diasLibresEmpleadoNorm: string[] = useMemo(() => {
    const src = (empleadoActual as any)?.calendario?.diasLibres as
      | any[]
      | undefined;

    if (!src || !Array.isArray(src)) return [];

    const diasSemana = [
      "domingo",
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
    ];

    const normalizados = src
      .map((d) => {
        if (typeof d === "string") return normalizarDia(d);
        if (typeof d === "number") {
          const nombre = diasSemana[d] ?? "";
          return normalizarDia(nombre);
        }
        return "";
      })
      .filter(Boolean);

    return normalizados;
  }, [empleadoActual]);

  // ======================= CALENDARIO MENSUAL =======================

  const year = mesVisible.getFullYear();
  const month = mesVisible.getMonth();
  const primerDia = new Date(year, month, 1);
  const ultimoDia = new Date(year, month + 1, 0);
  const diasEnMes = ultimoDia.getDate();
  const inicioSemana = (primerDia.getDay() + 6) % 7; // lunes=0

  // 🔥 Cambios acá:
  // - En modo "cliente" los días vencidos NO se muestran (fechaMinima = hoy)
  // - En modo "negocio" seguimos viendo hasta 10 días hacia atrás
  const fechaMinima = new Date(hoy);
  if (modo === "cliente") {
    fechaMinima.setHours(0, 0, 0, 0);
  } else {
    fechaMinima.setDate(hoy.getDate() - 10);
    fechaMinima.setHours(0, 0, 0, 0);
  }

  const fechaMaxima = new Date(hoy);
  fechaMaxima.setDate(hoy.getDate() + 30);
  fechaMaxima.setHours(23, 59, 59, 999);

  const dias: (Date | null)[] = [];
  for (let i = 0; i < inicioSemana; i++) dias.push(null);
  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = new Date(year, month, d);
    if (fecha >= fechaMinima && fecha <= fechaMaxima) {
      dias.push(fecha);
    } else {
      // fuera de rango (pasado para cliente o >30 días) → celda vacía
      dias.push(null);
    }
  }

  const hayDiasEnMes = (y: number, m: number) => {
    const primero = new Date(y, m, 1);
    const ultimo = new Date(y, m + 1, 0);
    return ultimo >= fechaMinima && primero <= fechaMaxima;
  };

  const puedeIrAnterior = hayDiasEnMes(year, month - 1);
  const puedeIrSiguiente = hayDiasEnMes(year, month + 1);

  const irMesAnterior = () =>
    puedeIrAnterior && setMesVisible(new Date(year, month - 1, 1));
  const irMesSiguiente = () =>
    puedeIrSiguiente && setMesVisible(new Date(year, month + 1, 1));

  const nombreMes = mesVisible.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  // -------- Slots del día seleccionado --------
  const slotsDelDiaRaw: SlotCalendario[] = useMemo(() => {
    if (!diaSeleccionado) return [];

    const nombreDiaLong = diaSeleccionado.toLocaleDateString("es-ES", {
      weekday: "long",
    });
    const diaNorm = normalizarDia(nombreDiaLong);

    // Validación del día medio (lógica backend reflejada en el front)
    const diaMedioNorm = normalizarDia(config.descansoDiaMedio || "");
    const esDiaMedio = diaMedioNorm && diaMedioNorm === diaNorm;

    // Día libre completo (negocio o empleado)
    const esDiaLibre =
      config.diasLibresNegocioNorm.includes(diaNorm) ||
      config.diasLibresEmpleadoNorm.includes(diaNorm);

    // 👉 Si es día libre TOTAL → ningún slot
    if (!esDiaMedio && esDiaLibre) {
      return [];
    }

    // 👉 Si es medio turno o día laboral normal → backend se encarga de la ventana
    return generarSlotsDelDia(config, diaSeleccionado, turnosNormalizados, {
      minutosPorSlot,
      // 🔥 acá va la magia: le pasamos la duración real del servicio
      duracionServicioMin: duracionServicioMin ?? minutosPorSlot,
    });
  }, [
    config,
    diaSeleccionado,
    turnosNormalizados,
    minutosPorSlot,
    duracionServicioMin,
  ]);

  // 🔥 NUEVO: para el cliente solo mostramos slots LIBRES
  const slotsDelDia: SlotCalendario[] = useMemo(() => {
    if (modo === "cliente") {
      return slotsDelDiaRaw.filter((s) => s.estado === "libre");
    }
    return slotsDelDiaRaw;
  }, [slotsDelDiaRaw, modo]);

  // ======================= HANDLERS =======================

  const manejarClickDia = (
    d: Date,
    opciones: { esPasado: boolean; esDiaLibre: boolean }
  ) => {
    const { esPasado, esDiaLibre } = opciones;
    if (esPasado || esDiaLibre) return;

    if (
      modo === "negocio" &&
      diaSeleccionado &&
      esMismoDia(d, diaSeleccionado)
    ) {
      const turnosDia = turnosNormalizados.filter((t) =>
        esMismoDia(t.inicio, d)
      );
      const todosBloqueados =
        turnosDia.length > 0 && turnosDia.every((t) => t.bloqueado);

      setModalDia({
        visible: true,
        fecha: d,
        desbloquear: todosBloqueados,
      });
      return;
    }

    setDiaSeleccionado(d);
  };

  const manejarClickSlot = (slot: SlotCalendario) => {
    // 🧍 MODO CLIENTE
    if (modo === "cliente") {
      if (slot.estado !== "libre") return;
      onSlotLibreClick?.(slot);
      return;
    }

    // 👑 MODO NEGOCIO

    // 1) Si es un turno pasado pero con reserva → ver detalle
    if (slot.estado === "pasado" && slot.turnoOcupado) {
      setModalTurno({ visible: true, turno: slot.turnoOcupado });
      onSlotOcupadoClick?.(slot);
      return;
    }

    // 2) Si está ocupado → ver detalle del cliente
    if (slot.estado === "ocupado" && slot.turnoOcupado) {
      setModalTurno({ visible: true, turno: slot.turnoOcupado });
      onSlotOcupadoClick?.(slot);
      return;
    }

    // 3) Slot libre → opciones (agregar manual / bloquear)
    if (slot.estado === "libre") {
      setModalSlot({ visible: true, slot });
      return;
    }

    // 4) Slot bloqueado → callback opcional
    if (slot.estado === "bloqueado") {
      onSlotBloqueadoClick?.(slot);
      return;
    }
  };

  const getSlotClasses = (slot: SlotCalendario) => {
    const base =
      "h-12 w-full rounded-lg text-sm font-semibold flex items-center justify-center transition focus:outline-none";

    switch (slot.estado) {
      case "libre":
        // ✅ disponibles en VERDE
        return `${base} bg-emerald-600 text-white hover:bg-emerald-700`;

      case "ocupado":
        // ✅ turnos ocupados en ROJO
        if (modo === "cliente") {
          return `${base} bg-red-700 text-white cursor-not-allowed opacity-70`;
        }
        return `${base} bg-red-600 text-white hover:bg-red-700`;

      case "bloqueado":
        // 🚫 bloqueado: rojo más oscuro / apagado
        if (modo === "cliente") {
          return `${base} bg-red-900 text-red-200 cursor-not-allowed opacity-60`;
        }
        return `${base} bg-red-900 text-red-100 hover:bg-red-800`;

      case "pasado":
        // 🔹 PASADO SIN reserva → gris apagado (igual que antes)
        if (!slot.turnoOcupado) {
          return `${base} bg-neutral-900 text-gray-500 cursor-not-allowed`;
        }

        // 🔸 PASADO CON reserva → gris PERO marcado con borde y mejor contraste
        return `${base} bg-neutral-800 text-gray-100 border border-gray-400/80 hover:bg-neutral-700`;

      default:
        return `${base} bg-neutral-700 text-gray-300`;
    }
  };

  const getSlotTitle = (slot: SlotCalendario) => {
    if (modo === "cliente") {
      if (slot.estado === "libre") return "Seleccionar este horario";
      if (slot.estado === "ocupado") return "Horario reservado";
      if (slot.estado === "bloqueado") return "Horario no disponible";
      if (slot.estado === "pasado") return "Horario pasado";
      return "";
    }

    if (slot.estado === "libre") {
      return "Opciones para este horario";
    }
    if (slot.estado === "ocupado") {
      return "Ver detalle de la reserva";
    }
    if (slot.estado === "bloqueado") {
      return "Horario bloqueado por el negocio";
    }
    if (slot.estado === "pasado") {
      return slot.turnoOcupado
        ? "Turno pasado (ver detalle)"
        : "Horario pasado";
    }
    return "";
  };

  // handler para marcar asistencia desde el modal
  const handleMarcarAsistencia = async (
    turno: TurnoExistente,
    nuevoEstado: "asistio" | "no-asistio"
  ) => {
    if (!negocio?.id || !turno?.id) return;
    try {
      setMarcandoAsistencia(true);
      await marcarTurnoAsistenciaBackend({
        negocioId: negocio.id,
        turnoId: turno.id,
        asistencia: nuevoEstado,
      });

      // actualizar estado local del modal para que se vea al instante
      setModalTurno((prev) =>
        prev.turno
          ? {
              visible: true,
              turno: {
                ...prev.turno,
                asistencia: nuevoEstado,
                estado: "completado",
              },
            }
          : prev
      );
    } catch (err: any) {
      alert(
        "Ocurrió un error al marcar la asistencia. Intentá de nuevo en unos segundos."
      );
    } finally {
      setMarcandoAsistencia(false);
    }
  };

  // handler para cancelar turno y liberar slots + enviar mail
const handleCancelarTurno = async (turno: TurnoExistente) => {
  if (!negocio?.id || !turno?.id) return;

  const confirmar = window.confirm(
    "¿Seguro que querés cancelar este turno y liberar el horario?\n\nEl cliente recibirá el horario nuevamente disponible para reservar."
  );
  if (!confirmar) return;

  try {
    setCancelandoTurno(true);
    await cancelarTurnoBackend({
      negocioId: negocio.id,
      turnoId: turno.id,
      clienteUid: turno.clienteUid ?? null,
      inicio: turno.inicio,
    });

    // cerramos modal luego de cancelar
    setModalTurno({ visible: false, turno: null });
  } catch (err: any) {
    console.error("Error al cancelar el turno:", err);
    alert(
      "Ocurrió un error al cancelar el turno. Intentá de nuevo en unos segundos."
    );
  } finally {
    setCancelandoTurno(false);
  }
};


  // ======================= RENDER =======================

  return (
    <>
      <div className="w-full rounded-2xl p-4 bg-[var(--color-primario)] text-[var(--color-texto)] transition-colors duration-300">
        {/* Selector de empleado (solo dueño/admin en modo negocio) */}
        {modo === "negocio" &&
          usuarioEsDuenoAdmin &&
          listaEmpleados.length > 0 && (
            <div className="flex items-center justify-between mb-4 gap-3">
              <span className="text-xs font-medium text-gray-200">
                Seleccionar agenda de:
              </span>
              <select
                className="flex-1 bg-neutral-900 border border-neutral-700 text-xs rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={
                  empleadoSeleccionadoNombre ||
                  empleadoActual?.nombre ||
                  ""
                }
                onChange={(e) =>
                  setEmpleadoSeleccionadoNombre(e.target.value)
                }
              >
                {listaEmpleados.map((emp) => (
                  <option key={emp.nombre} value={emp.nombre}>
                    {emp.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

        {/* Header calendario */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={irMesAnterior}
            disabled={!puedeIrAnterior}
            className={`px-2 text-sm ${
              puedeIrAnterior
                ? "text-gray-300 hover:text-white"
                : "text-gray-600 cursor-not-allowed"
            }`}
            title="Mes anterior"
          >
            ◀
          </button>
          <h3 className="text-sm font-semibold capitalize">
            {nombreMes}
          </h3>
          <button
            onClick={irMesSiguiente}
            disabled={!puedeIrSiguiente}
            className={`px-2 text-sm ${
              puedeIrSiguiente
                ? "text-gray-300 hover:text-white"
                : "text-gray-600 cursor-not-allowed"
            }`}
            title="Mes siguiente"
          >
            ▶
          </button>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 text-xs text-gray-400 mb-1">
          {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
            <div
              key={i}
              className="w-10 h-8 flex items-center justify-center"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7 gap-y-1 text-sm mb-4">
          {dias.map((d, idx) => {
            if (!d) return <div key={idx} className="w-10 h-8" />;

            const esHoy =
              d.toDateString() === hoy.toDateString();
            const esPasado =
              d <
              new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

            const nombreDiaLong = d.toLocaleDateString("es-ES", {
              weekday: "long",
            });
            const diaNorm = normalizarDia(nombreDiaLong);

            // ======================
            // 🔥 Jerarquía de días libres
            // ======================
            const diasNegocio = (config as any).diasLibresNegocioNorm || [];
            const diasEmpleado = (config as any).diasLibresEmpleadoNorm || [];

            // RAW (tal cual vienen)
            const esLibreNegocioRaw = diasNegocio.includes(diaNorm);
            const esLibreEmpleadoRaw = diasEmpleado.includes(diaNorm);

            // Detectar si ES el día medio del empleado
            const diaMedioNorm = normalizarDia(config.descansoDiaMedio || "");
            const esDiaMedio = diaMedioNorm && diaMedioNorm === diaNorm;

            // 👉 El negocio manda SIEMPRE:
            const esLibreNegocio = esLibreNegocioRaw;

            // 👉 El empleado solo aporta día libre completo si NO es su medio día
            const esLibreEmpleado = esDiaMedio ? false : esLibreEmpleadoRaw;

            // Día libre total si:
            //  - negocio lo marca libre, o
            //  - empleado lo marca libre y NO es medio día
            const esDiaLibre = esLibreNegocio || esLibreEmpleado;

            const seleccionado =
              diaSeleccionado && esMismoDia(d, diaSeleccionado);
            const disabled = esPasado || esDiaLibre;

            // ======================
            // 🎨 ESTILOS DEL DÍA
            // ======================
            let clases =
              "w-10 h-8 flex items-center justify-center rounded-lg transition ";

            if (esDiaLibre) {
              clases +=
                "text-red-400 line-through cursor-not-allowed opacity-70";
            } else if (esHoy) {
              clases += "bg-white text-black font-bold";
            } else if (esPasado) {
              clases += "text-gray-500 line-through cursor-not-allowed";
            } else if (seleccionado) {
              clases += "bg-indigo-600 text-white font-bold";
            } else {
              clases += "hover:bg-neutral-700";
            }

            return (
              <button
                key={idx}
                disabled={disabled}
                onClick={() =>
                  manejarClickDia(d, {
                    esPasado,
                    esDiaLibre,
                  })
                }
                className={clases}
                title={
                  esDiaLibre
                    ? esLibreNegocio
                      ? "Día cerrado por el negocio"
                      : "Día libre del empleado"
                    : ""
                }
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>

        {/* Slots del día */}
        {diaSeleccionado ? (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-medium">
                {modo === "cliente"
                  ? "Horarios disponibles"
                  : "Horarios de la agenda"}
                {" • "}
                {diaSeleccionado.toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
              </h4>
            </div>

            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {slotsDelDia.length === 0 && (
                <p className="col-span-full text-xs text-gray-400">
                  {modo === "cliente"
                    ? "No hay horarios disponibles para este día."
                    : "No hay horarios para este día."}
                </p>
              )}

              {slotsDelDia.map((slot, idx) => {
                const disabledBtn =
                  (modo === "cliente" && slot.estado !== "libre") ||
                  (slot.estado === "pasado" && !slot.turnoOcupado);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      !disabledBtn && manejarClickSlot(slot)
                    }
                    disabled={disabledBtn}
                    className={getSlotClasses(slot)}
                    title={getSlotTitle(slot)}
                  >
                    {slot.hora}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            Seleccioná un día del calendario.
          </p>
        )}
      </div>

      {/* MODAL: BLOQUEAR / LIBERAR DÍA */}
      {modo === "negocio" && modalDia.visible && modalDia.fecha && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-6">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() =>
              setModalDia({
                visible: false,
                fecha: null,
                desbloquear: false,
              })
            }
          />
          <div className="w-full max-w-md relative z-10 rounded-2xl bg-neutral-900 border border-neutral-700 shadow-xl p-6">
            <h3 className="text-lg font-semibold mb-3">
              {modalDia.desbloquear
                ? "Liberar día completo"
                : "Bloquear día completo"}
            </h3>
            <p className="text-sm text-gray-200 mb-5">
              {modalDia.desbloquear ? (
                <>
                  ¿Seguro que deseas{" "}
                  <b>liberar este día completo</b> para que los
                  horarios vuelvan a estar disponibles?
                </>
              ) : (
                <>
                  ¿Seguro que deseas{" "}
                  <b>bloquear este día completo</b>? Ningún cliente
                  podrá agendarse en esta fecha.
                </>
              )}
              <br />
              <span className="font-medium">
                {modalDia.fecha.toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
              </span>
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() =>
                  setModalDia({
                    visible: false,
                    fecha: null,
                    desbloquear: false,
                  })
                }
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!modalDia.fecha) return;

                  try {
                    if (modalDia.desbloquear) {
                      await liberarDiaCompletoBackend({
                        usuario: usuarioActual,
                        negocio,
                        empleadoNombre: empleadoNombreRef,
                        fecha: modalDia.fecha,
                      });
                    } else {
                      await bloquearDiaCompletoBackend({
                        usuario: usuarioActual,
                        negocio,
                        empleadoId: null,
                        empleadoNombre: empleadoNombreRef,
                        fecha: modalDia.fecha,
                        horaInicio: config.inicio,
                        horaFin: config.fin,
                        minutosPaso: minutosPorSlot,
                      });
                    }
                  } catch (err: any) {
                    alert(
                      err?.message === "NO_PERMISO_AGENDA"
                        ? "No tenés permisos para modificar esta agenda."
                        : "Ocurrió un error al actualizar el día."
                    );
                  }

                  setModalDia({
                    visible: false,
                    fecha: null,
                    desbloquear: false,
                  });
                }}
                className={`px-4 py-2 rounded-lg text-sm text-white font-medium ${
                  modalDia.desbloquear
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {modalDia.desbloquear ? "Liberar día" : "Bloquear día"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETALLE TURNO OCUPADO (NEGOCIO) */}
      {modo === "negocio" && modalTurno.visible && modalTurno.turno && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-2 sm:p-6">
          {/* Fondo */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setModalTurno({ visible: false, turno: null })}
          />

          {/* Contenido */}
          <div className="w-full max-w-md relative z-10 rounded-2xl bg-neutral-900 border border-neutral-700 shadow-xl p-6">
            {(() => {
              const t = modalTurno.turno!;
              const fechaStr = t.inicio.toLocaleDateString("es-UY", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
              });
              const horaStr = t.inicio.toLocaleTimeString("es-UY", {
                hour: "2-digit",
                minute: "2-digit",
              });

              const iniciales =
                (t.clienteNombre || "?")
                  .split(" ")
                  .map((p) => p[0]?.toUpperCase())
                  .join("")
                  .slice(0, 2) || "?";

              const asistenciaLabel =
                t.asistencia === "asistio"
                  ? "Cliente asistió"
                  : t.asistencia === "no-asistio"
                  ? "Cliente no asistió"
                  : "Pendiente de marcar";

              const asistenciaColor =
                t.asistencia === "asistio"
                  ? "bg-emerald-600/20 text-emerald-300 border-emerald-600/50"
                  : t.asistencia === "no-asistio"
                  ? "bg-red-600/20 text-red-300 border-red-600/50"
                  : "bg-yellow-500/10 text-yellow-200 border-yellow-500/50";

              const puedeCancelar =
                t.estado !== "cancelado" && t.estado !== "cancelado-negocio";

              return (
                <div className="space-y-4 text-sm text-gray-100">
                  {/* Header + botón cancelar */}
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <h3 className="text-lg font-semibold">
                      Detalle del turno
                    </h3>

                    {puedeCancelar && (
                      <button
                        type="button"
                        onClick={() => handleCancelarTurno(t)}
                        disabled={cancelandoTurno}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-500 ${
                          cancelandoTurno
                            ? "bg-red-800/70 text-red-100 cursor-wait"
                            : "bg-red-700 hover:bg-red-800 text-white"
                        }`}
                        title="Cancelar este turno y liberar el horario"
                      >
                        {cancelandoTurno ? "Cancelando..." : "Cancelar turno"}
                      </button>
                    )}
                  </div>

                  {/* Cliente */}
                  <div className="flex items-center gap-3">
                    {t.clienteFotoUrl ? (
                      <img
                        src={t.clienteFotoUrl}
                        alt={t.clienteNombre || "Cliente"}
                        className="w-12 h-12 rounded-full object-cover border border-white/10"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
                        {iniciales}
                      </div>
                    )}

                    <div>
                      <p className="font-semibold text-base">
                        {t.clienteNombre || "Cliente sin nombre"}
                      </p>
                      <p className="text-xs text-gray-300">
                        {t.clienteEmail || "Sin email registrado"}
                      </p>
                    </div>
                  </div>

                  {/* Servicio y horario */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-400">
                        Servicio
                      </p>
                      <p className="text-sm font-medium mt-1">
                        {t.servicioNombre || "Sin servicio asignado"}
                      </p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-400">
                        Día y hora
                      </p>
                      <p className="text-sm font-medium mt-1">
                        {fechaStr} · {horaStr} hs
                      </p>
                    </div>
                  </div>

                  {/* Contacto */}
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400">
                      Contacto
                    </p>
                    <div className="mt-1 space-y-1">
                      <p className="text-xs break-all">
                        <span className="font-semibold">Email: </span>
                        {t.clienteEmail || "No registrado"}
                      </p>
                      <p className="text-xs">
                        <span className="font-semibold">Teléfono: </span>
                        {t.clienteTelefono || "No registrado"}
                      </p>
                    </div>
                  </div>

                  {/* Estado / asistencia */}
                  <div className="bg-white/5 rounded-lg p-3 space-y-2">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400">
                      Asistencia
                    </p>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-medium ${asistenciaColor}`}
                    >
                      {asistenciaLabel}
                    </span>

                    <div className="flex flex-col sm:flex-row gap-2 mt-3">
                      <button
                        disabled={marcandoAsistencia || cancelandoTurno}
                        onClick={() =>
                          handleMarcarAsistencia(t, "asistio")
                        }
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 ${
                          marcandoAsistencia || cancelandoTurno
                            ? "bg-emerald-700/60 text-emerald-100 cursor-wait"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        ✅ Marcó asistencia
                      </button>

                      <button
                        disabled={marcandoAsistencia || cancelandoTurno}
                        onClick={() =>
                          handleMarcarAsistencia(t, "no-asistio")
                        }
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 ${
                          marcandoAsistencia || cancelandoTurno
                            ? "bg-red-700/60 text-red-100 cursor-wait"
                            : "bg-red-600 hover:bg-red-700 text-white"
                        }`}
                      >
                        ❌ No asistió
                      </button>
                    </div>

                    {(marcandoAsistencia || cancelandoTurno) && (
                      <p className="text-[11px] text-gray-400 mt-1">
                        {cancelandoTurno
                          ? "Cancelando turno..."
                          : "Guardando asistencia..."}
                      </p>
                    )}
                  </div>

                  {/* Botón cerrar */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() =>
                        setModalTurno({ visible: false, turno: null })
                      }
                      className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL: OPCIONES SLOT NEGOCIO */}
      {modo === "negocio" && modalSlot.visible && modalSlot.slot && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-6">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setModalSlot({ visible: false, slot: null })}
          />
          <div className="w-full max-w-md relative z-10 rounded-2xl bg-neutral-900 border border-neutral-700 shadow-xl p-6">
            <h3 className="text-lg font-semibold mb-4">
              Turno {modalSlot.slot.hora} •{" "}
              {modalSlot.slot.fecha.toLocaleDateString("es-ES")}
            </h3>

            <div className="flex flex-col gap-3">
              <button
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex items-center justify-center gap-2"
                onClick={() => {
                  if (onSlotLibreClick && modalSlot.slot) {
                    onSlotLibreClick(modalSlot.slot);
                  }
                  setModalSlot({ visible: false, slot: null });
                }}
              >
                <span>➕</span> Agregar manualmente
              </button>

              <button
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-sm flex items-center justify-center gap-2"
                onClick={async () => {
                  if (!modalSlot.slot) return;

                  try {
                    await bloquearSlotBackend({
                      usuario: usuarioActual,
                      negocio,
                      empleadoId: null,
                      empleadoNombre: empleadoNombreRef,
                      fecha: modalSlot.slot.fecha,
                      hora: modalSlot.slot.hora,
                      duracionMin: minutosPorSlot,
                    });
                  } catch (err: any) {
                    alert(
                      err?.message === "NO_PERMISO_AGENDA"
                        ? "No tenés permisos para modificar esta agenda."
                        : "Ocurrió un error al bloquear el turno."
                    );
                  }

                  setModalSlot({ visible: false, slot: null });
                }}
              >
                <span>🚫</span> No trabajar este turno
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
