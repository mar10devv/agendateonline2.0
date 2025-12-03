import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";

/* =====================================================
   Tipos base (negocio, empleado, turnos, slots)
   ===================================================== */

/**
 * Modo en que se generan los turnos:
 * - "personalizado": se reparten X clientes por día en forma equidistante.
 * - "jornada": se generan slots cada X minutos.
 */
export type ModoTurnos = "personalizado" | "jornada";

/**
 * Configuración general de la agenda del negocio.
 * (lo que está guardado en Negocios/{id}.configuracionAgenda)
 */
export type NegocioAgendaConfig = {
  diasLibres?: (string | number)[];
  modoTurnos?: ModoTurnos;
  clientesPorDia?: number | null;
  horaInicio?: string; // en Firestore puede venir como "inicio"
  horaFin?: string; // en Firestore puede venir como "fin"
  horasSeparacion?: number | null;
};

/**
 * Configuración de calendario de un empleado.
 * Normalmente está dentro de empleado.calendario
 */
export type EmpleadoAgendaConfig = {
  inicio?: string; // "HH:mm"
  fin?: string; // "HH:mm"
  diasLibres?: (string | number)[];
  descansoDiaMedio?: string | null; // ej: "sabado" (medio turno)
  descansoDiaLibre?: string | null; // ej: "viernes" (día libre completo principal)
  descansoTurnoMedio?: "manana" | "tarde" | null;
};

/**
 * Estructura genérica de empleado que usamos para mapear
 * tanto lo que viene en memoria (empleados / empleadosData)
 * como lo que pueda estar guardado en Firestore.
 */
export type EmpleadoAgendaSource = {
  id?: string;
  nombre?: string;
  calendario?: EmpleadoAgendaConfig;

  // algunos empleados pueden tener estos campos en la raíz
  inicio?: string;
  fin?: string;
  diasLibres?: (string | number)[];
  descansoDiaMedio?: string | null;
  descansoDiaLibre?: string | null;
  descansoTurnoMedio?: "manana" | "tarde" | null;

  [key: string]: any;
};

/**
 * Estructura del negocio que usa la agenda.
 * Incluye config de agenda, roles y empleados.
 */
export type NegocioAgendaSource = {
  id: string;
  nombre: string;

  configuracionAgenda?: NegocioAgendaConfig;

  slug?: string | null;
  ownerUid?: string | null;
  adminUids?: string[];

  empleados?: EmpleadoAgendaSource[];
  empleadosData?: EmpleadoAgendaSource[];

  [key: string]: any;
};

/**
 * Configuración unificada NEGOCIO + EMPLEADO ya procesada
 * para usar directamente en la generación de slots.
 */
export type ConfigCalendarioUnificado = {
  inicio: string;
  fin: string;

  modoTurnos: ModoTurnos;
  clientesPorDia?: number;
  horasSeparacion?: number;

  diasLibresNegocioNorm: string[];
  diasLibresEmpleadoNorm: string[];
  diasLibresCombinadosNorm: string[];

  descansoDiaMedio?: string | null;
  descansoDiaLibre?: string | null;
  descansoTurnoMedio?: "manana" | "tarde" | null;
};

/* -------- Turnos ya guardados en Firestore (normalizados) -------- */

/**
 * Turno normalizado y listo para usar en el calendario (Date reales).
 */
export type TurnoExistente = {
  id: string;
  inicio: Date;
  fin: Date;
  bloqueado?: boolean;

  servicioId?: string;
  servicioNombre?: string;

  clienteUid?: string | null;
  clienteNombre?: string | null;
  clienteEmail?: string | null;
  clienteTelefono?: string | null;
  clienteFotoUrl?: string | null; // ✅ NUEVO

  raw?: any; // documento original (para debug o uso avanzado)
};

/**
 * Estados posibles de un slot de agenda.
 */
export type SlotEstado =
  | "libre"
  | "ocupado"
  | "bloqueado"
  | "pasado"
  | "cerradoNegocio"
  | "descansoEmpleado";

/**
 * Representa un slot específico de la grilla de calendario.
 */
export type SlotCalendario = {
  fecha: Date;
  hora: string;
  inicio: Date;
  fin: Date;
  estado: SlotEstado;
  turnoOcupado?: TurnoExistente;
};

/* =====================================================
   Helpers de fechas, horas y días
   ===================================================== */

const MESES_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sept",
  "Oct",
  "Nov",
  "Dic",
];

const MAP_DIA_NUM_A_STR = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

/**
 * Normaliza un nombre de día/cadena:
 * - Pasa a minúsculas
 * - Quita tildes
 * - Quita espacios extras
 */
export function normalizarDia(str: any): string {
  if (!str) return "";
  return String(str)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Convierte un número de día (0-6) o string a un nombre de día normalizado.
 */
function mapDiaGeneric(d: string | number): string {
  if (typeof d === "number") {
    return MAP_DIA_NUM_A_STR[d] || "";
  }
  return normalizarDia(String(d));
}

/**
 * Verifica si dos fechas corresponden al mismo día (año/mes/día).
 */
export function esMismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Convierte "HH:mm" a minutos totales desde las 00:00.
 */
export function toMin(hhmm: string): number {
  const [h, m] = (hhmm || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Convierte minutos totales desde 00:00 a string "HH:mm".
 */
export function minToHHMM(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const mm = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/**
 * Combina una fecha (Date) con una hora "HH:mm" y devuelve un nuevo Date.
 */
export function combinarFechaHora(fecha: Date, hhmm: string): Date {
  const [h, m] = (hhmm || "00:00").split(":").map((n) => Number(n || 0));
  const d = new Date(fecha);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

/**
 * Intenta interpretar una duración en minutos:
 * - number: se devuelve tal cual
 * - "HH:mm": se convierte a minutos
 * - "30": se convierte a número
 * - default: 30 min
 */
export function parseDuracionMin(d: any): number {
  if (typeof d === "number") return d;
  if (typeof d === "string") {
    if (d.includes(":")) {
      const [h, m] = d.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    }
    const n = Number(d);
    if (!Number.isNaN(n)) return n;
  }
  return 30;
}

/**
 * Convierte distintos formatos a Date:
 * - Date: se devuelve tal cual
 * - Firestore Timestamp (tiene .toDate()): se convierte
 * - string: new Date(string)
 * - number/otros: new Date(v)
 */
export function toDateSafe(v: any): Date {
  if (!v) return new Date(NaN);
  if (v instanceof Date) return v;
  if (typeof (v as any)?.toDate === "function") return (v as any).toDate();
  if (typeof v === "string") return new Date(v);
  return new Date(v);
}

/**
 * Indica si dos rangos [aStart, aEnd) y [bStart, bEnd) se solapan.
 * Los parámetros son timestamps numéricos (ej: +Date).
 */
export function solapan(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Calcula la ventana de trabajo (en minutos) para un día de medio turno.
 *
 * Regla:
 * - Si el medio día es el día ANTERIOR al día libre principal  => trabaja MAÑANA (inicio -> mitad).
 * - Si el medio día es el día POSTERIOR al día libre principal => trabaja TARDE (mitad -> fin).
 * - Si no se puede inferir por descansoDiaLibre, se mira diasLibresEmpleado/Negocio.
 * - Si aún así no alcanza, se usa descansoTurnoMedio ("manana" / "tarde") como fallback.
 */
function calcularVentanaMedioDia(
  config: ConfigCalendarioUnificado,
  diaNormActual: string,
  jornadaInicioMin: number,
  jornadaFinMin: number
): { inicioMin: number; finMin: number } | null {
  const medioNorm = normalizarDia(config.descansoDiaMedio || "");
  if (!medioNorm || medioNorm !== diaNormActual) return null;

  const total = jornadaFinMin - jornadaInicioMin;
  if (total <= 0) return null;

  // Mitad de la jornada (no asumimos 4h fijas, usamos 50% real del rango)
  const mitad = jornadaInicioMin + Math.floor(total / 2);

  // Helper: nombre de día normalizado -> índice (0..6)
  const getDiaIndex = (nombre: string) =>
    MAP_DIA_NUM_A_STR.indexOf(normalizarDia(nombre));

  let relacion: "antes" | "despues" | null = null;

  // 1) Intentar con el día libre principal del empleado (descansoDiaLibre)
  const librePrincipalNorm = normalizarDia(config.descansoDiaLibre || "");
  if (librePrincipalNorm) {
    const idxMedio = getDiaIndex(medioNorm);
    const idxLibre = getDiaIndex(librePrincipalNorm);

    if (idxMedio !== -1 && idxLibre !== -1) {
      // medio = día ANTERIOR al libre  -> "antes"
      if (idxMedio === (idxLibre + 6) % 7) {
        relacion = "antes";
      }
      // medio = día POSTERIOR al libre -> "despues"
      else if (idxMedio === (idxLibre + 1) % 7) {
        relacion = "despues";
      }
    }
  }

  // 2) Si no se pudo con descansoDiaLibre, usamos los días libres conocidos
  if (!relacion) {
    // Usamos primero días libres del empleado; si no tiene, usamos los del negocio.
    const diasLibresBase =
      config.diasLibresEmpleadoNorm.length > 0
        ? config.diasLibresEmpleadoNorm
        : config.diasLibresNegocioNorm;

    const idxMedio = getDiaIndex(medioNorm);

    if (idxMedio !== -1) {
      for (const diaLibre of diasLibresBase) {
        const idxLibre = getDiaIndex(diaLibre);
        if (idxLibre === -1) continue;

        if (idxMedio === (idxLibre + 6) % 7) {
          relacion = "antes";
          break;
        }
        if (idxMedio === (idxLibre + 1) % 7) {
          relacion = "despues";
          break;
        }
      }
    }
  }

  if (relacion === "antes") {
    // trabaja de inicio -> mitad (mañana)
    return { inicioMin: jornadaInicioMin, finMin: mitad };
  }
  if (relacion === "despues") {
    // trabaja de mitad -> fin (tarde)
    return { inicioMin: mitad, finMin: jornadaFinMin };
  }

  // 3) 🔁 Fallback: si no pudimos deducir por días libres, usamos descansoTurnoMedio
  if (config.descansoTurnoMedio === "manana") {
    return { inicioMin: jornadaInicioMin, finMin: mitad };
  }
  if (config.descansoTurnoMedio === "tarde") {
    return { inicioMin: mitad, finMin: jornadaFinMin };
  }

  return null;
}

/* =====================================================
   1) Unificar configuración NEGOCIO + EMPLEADO
   ===================================================== */

/**
 * Combina la configuración del NEGOCIO y del EMPLEADO para generar
 * un solo objeto de configuración que se usa al construir el calendario.
 *
 * Reglas principales:
 * - Se buscan los datos "full" del empleado en negocio.empleadosData / empleados.
 * - El horario del empleado tiene prioridad sobre el horario del negocio.
 * - Los días libres se combinan (negocio + empleado) y se normalizan.
 * - Se respetan modos de turnos ("jornada" / "personalizado") y descansos de medio día.
 */
export function combinarConfigCalendario(
  negocio: NegocioAgendaSource,
  empleado: EmpleadoAgendaSource | null
): ConfigCalendarioUnificado {
  const confNeg: NegocioAgendaConfig = negocio.configuracionAgenda || {};

  // ---------- buscamos SIEMPRE el empleado "full" en el negocio ----------
  const listaCruda =
    (negocio.empleadosData && negocio.empleadosData.length > 0
      ? negocio.empleadosData
      : negocio.empleados) || [];

  const empFull =
    empleado?.nombre
      ? (listaCruda as any[]).find((e) => e && e.nombre === empleado.nombre)
      : null;

  // 1) calendario del empleado que viene por props
  let calEmp: EmpleadoAgendaConfig = empleado?.calendario || {};

  // 2) si viene SIN horarios, usamos el del empFull
  if (!calEmp.inicio && !calEmp.fin && empFull) {
    if (empFull.calendario) {
      calEmp = {
        ...(empFull.calendario as EmpleadoAgendaConfig),
      };
    } else {
      calEmp = {
        inicio: empFull.inicio,
        fin: empFull.fin,
        diasLibres: empFull.diasLibres,
        descansoDiaMedio: empFull.descansoDiaMedio ?? null,
        descansoDiaLibre: empFull.descansoDiaLibre ?? null,
        descansoTurnoMedio: empFull.descansoTurnoMedio ?? null,
      };
    }
  }

  // horarios negocio en firestore
  const horaInicioNeg =
    (confNeg as any).inicio || confNeg.horaInicio || "07:00";
  const horaFinNeg = (confNeg as any).fin || confNeg.horaFin || "20:00";

  // ---------- DIAS LIBRES NEGOCIO ----------
  const diasNegocioRaw = (confNeg.diasLibres || []) as (string | number)[];
  const diasLibresNegocioNorm = diasNegocioRaw
    .map(mapDiaGeneric)
    .filter(Boolean);

  // ---------- DIAS LIBRES EMPLEADO (sin contar aún diaYMedio) ----------
  let diasEmpleadoRaw: (string | number)[] = [];

  // prioridad 1: empFull.calendario.diasLibres
  if (
    empFull &&
    empFull.calendario &&
    Array.isArray((empFull.calendario as any).diasLibres)
  ) {
    diasEmpleadoRaw = [
      ...diasEmpleadoRaw,
      ...((empFull.calendario as any).diasLibres as (string | number)[]),
    ];
  }

  // prioridad 2: empFull.diasLibres
  if (empFull && Array.isArray((empFull as any).diasLibres)) {
    diasEmpleadoRaw = [...diasEmpleadoRaw, ...(empFull as any).diasLibres];
  }

  // prioridad 3: calendario recibido por props
  if (calEmp && Array.isArray(calEmp.diasLibres)) {
    diasEmpleadoRaw = [...diasEmpleadoRaw, ...(calEmp.diasLibres as any[])];
  }

  // prioridad 4: diasLibres en raíz del empleado recibido por props
  if (empleado && Array.isArray((empleado as any).diasLibres)) {
    diasEmpleadoRaw = [...diasEmpleadoRaw, ...(empleado as any).diasLibres];
  }

  diasEmpleadoRaw = Array.from(new Set(diasEmpleadoRaw));
  let diasLibresEmpleadoNorm = diasEmpleadoRaw
    .map(mapDiaGeneric)
    .filter(Boolean);

  const modoTurnos: ModoTurnos = confNeg.modoTurnos || "jornada";

  const clientesPorDia =
    modoTurnos === "personalizado" && confNeg.clientesPorDia
      ? confNeg.clientesPorDia
      : undefined;

  const horasSeparacion =
    modoTurnos === "jornada" ? confNeg.horasSeparacion || 30 : undefined;

  // prioridad: horario del empleado
  const inicio = calEmp.inicio || horaInicioNeg;
  const fin = calEmp.fin || horaFinNeg;

  // Valores iniciales de descansos
  let descansoDiaMedio =
    calEmp.descansoDiaMedio ??
    empleado?.descansoDiaMedio ??
    empFull?.calendario?.descansoDiaMedio ??
    empFull?.descansoDiaMedio ??
    null;

  let descansoDiaLibre =
    calEmp.descansoDiaLibre ??
    empleado?.descansoDiaLibre ??
    empFull?.calendario?.descansoDiaLibre ??
    empFull?.descansoDiaLibre ??
    null;

  let descansoTurnoMedio =
    calEmp.descansoTurnoMedio ??
    empleado?.descansoTurnoMedio ??
    empFull?.calendario?.descansoTurnoMedio ??
    empFull?.descansoTurnoMedio ??
    null;

  // =======================================================
  // 📌 Normalizar diaYMedio desde Firebase (diaCompleto + medioDia)
  // =======================================================
  const dy = empFull?.calendario?.diaYMedio;
  if (dy) {
    const diaCompletoNorm = normalizarDia(dy.diaCompleto);
    const medioDiaNorm = normalizarDia(dy.medioDia);
    const tipo = dy.tipo as "antes" | "despues" | undefined;

    if (diaCompletoNorm) {
      descansoDiaLibre = diaCompletoNorm;
    }
    if (medioDiaNorm) {
      descansoDiaMedio = medioDiaNorm;
    }

    if (tipo === "antes") {
      descansoTurnoMedio = "manana";
    } else if (tipo === "despues") {
      descansoTurnoMedio = "tarde";
    }
  }

  // 🔥 NUEVO: el día libre completo también cuenta como día libre normal del empleado
  const descansoDiaLibreNorm = normalizarDia(descansoDiaLibre || "");
  if (
    descansoDiaLibreNorm &&
    !diasLibresEmpleadoNorm.includes(descansoDiaLibreNorm)
  ) {
    diasLibresEmpleadoNorm = [...diasLibresEmpleadoNorm, descansoDiaLibreNorm];
  }

  const diasLibresCombinadosNorm = Array.from(
    new Set([...diasLibresNegocioNorm, ...diasLibresEmpleadoNorm])
  );

  return {
    inicio,
    fin,
    modoTurnos,
    clientesPorDia,
    horasSeparacion,
    diasLibresNegocioNorm,
    diasLibresEmpleadoNorm,
    diasLibresCombinadosNorm,
    descansoDiaMedio,
    descansoDiaLibre,
    descansoTurnoMedio,
  };
}

/* =====================================================
   2) Generar días del rango
   ===================================================== */

/**
 * Representa un día en la tira de días del calendario.
 */
export type DiaCalendario = {
  date: Date;
  label: string; // ejemplo: "Lun 02/Ene"
  value: string; // yyyy-mm-dd
  disabledNegocio: boolean;
  disabledEmpleado: boolean;
  disabled: boolean;
};

/**
 * Genera una lista de días a partir de hoy (o desde una fecha dada)
 * respetando días libres de negocio y empleado.
 *
 * IMPORTANTE: el día de medio turno (descansoDiaMedio) SIEMPRE aparece
 * como día disponible, aunque esté listado en diasLibres, porque se trabaja
 * media jornada.
 */
export function generarDiasRango(
  config: ConfigCalendarioUnificado,
  diasAdelante: number = 14,
  desde?: Date
): DiaCalendario[] {
  const hoy = desde ? new Date(desde) : new Date();
  hoy.setHours(0, 0, 0, 0);

  const lista: DiaCalendario[] = [];

  const diaMedioNormConfig = normalizarDia(config.descansoDiaMedio || "");
  const tieneMedioDia = !!diaMedioNormConfig;

  for (let i = 0; i < diasAdelante; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);

    const dayNameShort = d
      .toLocaleDateString("es-ES", { weekday: "short" })
      .replace(".", "");
    const dayNameLong = d.toLocaleDateString("es-ES", { weekday: "long" });
    const dayNum = d.getDate().toString().padStart(2, "0");
    const monthName = MESES_ES[d.getMonth()];

    const diaNorm = normalizarDia(dayNameLong);

    // ¿Este día es el configurado como medio turno del empleado?
    const esDiaMedio = tieneMedioDia && diaMedioNormConfig === diaNorm;

    // 1) Negocio: si está libre, cierra SIEMPRE, aunque sea medio día del empleado
    const disabledNegocio = config.diasLibresNegocioNorm.includes(diaNorm);

    // 2) Empleado: si está libre, solo se respeta si NO es su medio día
    const disabledEmpleadoRaw = config.diasLibresEmpleadoNorm.includes(diaNorm);
    const disabledEmpleado = esDiaMedio ? false : disabledEmpleadoRaw;

    const disabled = disabledNegocio || disabledEmpleado;

    lista.push({
      date: d,
      label:
        `${dayNameShort.charAt(0).toUpperCase() + dayNameShort.slice(1)} ` +
        `${dayNum}/${monthName}`,
      value: d.toISOString().split("T")[0],
      disabledNegocio,
      disabledEmpleado,
      disabled,
    });
  }

  return lista;
}

/* =====================================================
   3) Generar horarios base
   ===================================================== */

/**
 * Genera los horarios base (lista de "HH:mm") para un día:
 *
 * - Si modoTurnos = "personalizado": reparte clientesPorDia en el rango.
 * - Si modoTurnos = "jornada": genera slots cada horasSeparacion minutos.
 * - Si hay descanso de medio día: limita los horarios a solo media jornada
 *   (mañana o tarde) según la relación con el día libre.
 *
 * @param config Configuración unificada negocio+empleado.
 * @param fechaSeleccionada Fecha concreta (para validar medio día).
 */
export function generarHorariosBase(
  config: ConfigCalendarioUnificado,
  fechaSeleccionada?: Date | null
): string[] {
  const horariosBase: string[] = [];

  const [hIni, mIni] = config.inicio.split(":").map(Number);
  const [hFin, mFin] = config.fin.split(":").map(Number);

  const start = hIni * 60 + mIni;
  const end = hFin * 60 + mFin;
  const totalMinutes = end - start;

  if (totalMinutes <= 0) {
    return [];
  }

  // ---- MODO PERSONALIZADO: dividir la jornada entre N clientesPorDia ----
  if (config.modoTurnos === "personalizado" && config.clientesPorDia) {
    const step = Math.floor(totalMinutes / config.clientesPorDia);
    for (let i = 0; i < config.clientesPorDia; i++) {
      const t = start + i * step;
      const hh = String(Math.floor(t / 60)).padStart(2, "0");
      const mm = String(t % 60).padStart(2, "0");
      horariosBase.push(`${hh}:${mm}`);
    }
  }
  // ---- MODO JORNADA: slots cada horasSeparacion minutos ----
  else if (config.modoTurnos === "jornada" && config.horasSeparacion) {
    let t = start;
    while (t + config.horasSeparacion <= end) {
      const hh = String(Math.floor(t / 60)).padStart(2, "0");
      const mm = String(t % 60).padStart(2, "0");
      horariosBase.push(`${hh}:${mm}`);
      t += config.horasSeparacion;
    }
  }

  // si no hay fecha concreta, devolvemos los horarios base sin filtrar
  if (!fechaSeleccionada) return horariosBase;

  let horariosDisponibles = [...horariosBase];

  // ---- Ajustar por día de medio turno (medio día de trabajo) ----
  if (config.descansoDiaMedio && horariosBase.length > 0) {
    const diaSeleccionadoNombre = fechaSeleccionada.toLocaleDateString(
      "es-ES",
      { weekday: "long" }
    );
    const diaSeleccionadoNorm = normalizarDia(diaSeleccionadoNombre);

    const ventana = calcularVentanaMedioDia(
      config,
      diaSeleccionadoNorm,
      start,
      end
    );

    if (ventana) {
      const { inicioMin, finMin } = ventana;

      // Filtramos slots que caen dentro de esa ventana
      horariosDisponibles = horariosBase.filter((hora) => {
        const [hh, mm] = hora.split(":").map(Number);
        const t = hh * 60 + mm;
        return t >= inicioMin && t < finMin;
      });

      // seguridad: si por algún motivo no queda ninguno, devolvemos todos
      if (horariosDisponibles.length === 0) {
        horariosDisponibles = [...horariosBase];
      }
    }
  }

  return horariosDisponibles;
}

/* =====================================================
   4) Normalizar turnos
   ===================================================== */

/**
 * Forma cruda de turno que viene de Firestore
 * (o de distintos formatos históricos).
 */
export type TurnoFuente = {
  id: string;
  inicioTs?: any;
  finTs?: any;
  fecha?: any;
  hora?: string;
  duracion?: number | string;
  bloqueado?: boolean;

  servicioId?: string;
  servicioNombre?: string;

  clienteUid?: string | null;
  clienteNombre?: string | null;
  clienteEmail?: string | null;
  clienteTelefono?: string | null;
  clienteFotoUrl?: string | null; // ✅ NUEVO

  [key: string]: any;
};

/**
 * Intenta deducir inicio y fin de un turno dado (TurnoFuente),
 * soportando múltiples nombres de campos usados en el historial del sistema.
 *
 * Devuelve null si no puede determinar correctamente las fechas.
 */
function calcularInicioFinDesdeTurno(
  t: TurnoFuente
): { inicio: Date; fin: Date } | null {
  // 1) Caso ideal: ya viene inicioTs / finTs (Timestamp o Date)
  const iniTs = (t as any).inicioTs ?? (t as any).inicio ?? null;
  const finTs = (t as any).finTs ?? (t as any).fin ?? null;

  const ini1 = iniTs ? toDateSafe(iniTs) : null;
  const fin1 = finTs ? toDateSafe(finTs) : null;

  if (ini1 && fin1 && !isNaN(+ini1) && !isNaN(+fin1)) {
    return { inicio: ini1, fin: fin1 };
  }

  // 2) Fecha + hora en distintos nombres de campos
  const rawFecha =
    t.fecha ??
    (t as any).dia ??
    (t as any).fechaTurno ??
    (t as any).fechaISO ??
    (t as any).date ??
    null;

  const rawHora =
    t.hora ??
    (t as any).horaInicio ??
    (t as any).horario ??
    (t as any).horaTurno ??
    (t as any).horaInicioStr ??
    null;

  if (!rawFecha || !rawHora) {
    return null;
  }

  const f = toDateSafe(rawFecha);
  if (isNaN(+f)) {
    return null;
  }

  const inicio = combinarFechaHora(f, String(rawHora));
  const dur = parseDuracionMin(
    t.duracion ??
      (t as any).duracionMin ??
      (t as any).duracionMinutos ??
      (t as any).minutos ??
      30
  );
  const fin = new Date(inicio.getTime() + dur * 60000);

  return { inicio, fin };
}

/**
 * Convierte una lista de TurnoFuente a TurnoExistente:
 * - Calcula inicio/fin como Date.
 * - Ordena por fecha/hora de inicio.
 */
export function normalizarTurnos(lista: TurnoFuente[]): TurnoExistente[] {
  const out: TurnoExistente[] = [];

  for (const t of lista) {
    const par = calcularInicioFinDesdeTurno(t);
    if (!par) {
      continue;
    }

    out.push({
      id: t.id,
      inicio: par.inicio,
      fin: par.fin,
      bloqueado: t.bloqueado ?? false,
      servicioId: t.servicioId,
      servicioNombre: t.servicioNombre,
      clienteUid: t.clienteUid ?? null,
      clienteNombre: t.clienteNombre ?? null,
      clienteEmail: t.clienteEmail ?? null,
      clienteTelefono: t.clienteTelefono ?? null,
      clienteFotoUrl: t.clienteFotoUrl ?? null, // ✅ NUEVO
      raw: t,
    });
  }

  // Ordenamos por fecha/hora de inicio (menor a mayor)
  out.sort((a, b) => +a.inicio - +b.inicio);

  return out;
}

/* =====================================================
   5) Generar SLOTS de un día
   ===================================================== */

/**
 * Opciones al generar slots de un día concreto.
 */
export type GenerarSlotsOpciones = {
  ahora?: Date; // para testear o simular "hoy"
  minutosPorSlot?: number; // tamaño de cada slot (default 30)
  duracionServicioMin?: number; // duración real del servicio en minutos
};

/**
 * Genera la grilla de slots de un día específico para un empleado:
 * - Respeta días libres, medio día, horarios, etc.
 * - Marca slots como libre / ocupado / bloqueado / pasado.
 * - Tiene en cuenta la duración real del servicio para saber qué inicios son válidos.
 *
 * @param config Configuración unificada (negocio+empleado).
 * @param fecha Día a generar.
 * @param turnosDelEmpleado Turnos ya cargados de ese empleado.
 * @param opciones Tamaño de slot, duración de servicio y referencia de "ahora".
 */
export function generarSlotsDelDia(
  config: ConfigCalendarioUnificado,
  fecha: Date,
  turnosDelEmpleado: TurnoExistente[],
  opciones: GenerarSlotsOpciones = {}
): SlotCalendario[] {
  const ahora = opciones.ahora ? new Date(opciones.ahora) : new Date();
  const minutosPorSlot = opciones.minutosPorSlot || 30;

  // 👉 si no pasan duracionServicioMin, por defecto usamos el tamaño del slot
  const duracionServicioMin =
    typeof opciones.duracionServicioMin === "number"
      ? opciones.duracionServicioMin
      : minutosPorSlot;

  // Nombre de día normalizado del día a generar (lunes, martes, etc.)
  const diaNombreLong = fecha.toLocaleDateString("es-ES", {
    weekday: "long",
  });
  const diaNorm = normalizarDia(diaNombreLong);

  // Jornada completa del empleado/negocio en minutos
  const jornadaInicioMin = toMin(config.inicio);
  const jornadaFinMin = toMin(config.fin);

  if (jornadaFinMin <= jornadaInicioMin) {
    return [];
  }

  // ¿Este día es el configurado como medio turno?
  const diaMedioNorm = normalizarDia(config.descansoDiaMedio || "");
  const esDiaMedio = !!diaMedioNorm && diaMedioNorm === diaNorm;

  // 🔥 1) NEGOCIO MANDA SIEMPRE
  // Si el negocio tiene este día como libre, no se generan slots para nadie,
  // aunque sea el medio día del empleado.
  if (config.diasLibresNegocioNorm.includes(diaNorm)) {
    return [];
  }

  // 2) DÍAS LIBRES DEL EMPLEADO
  // Solo bloquean el día completo si NO es su medio día.
  if (!esDiaMedio && config.diasLibresEmpleadoNorm.includes(diaNorm)) {
    return [];
  }

  // ==========================
  //   VENTANA DE TRABAJO REAL
  // ==========================
  let inicioJ = jornadaInicioMin;
  let finJ = jornadaFinMin;

  // Usamos la misma lógica de medio día que en generarHorariosBase
  const ventanaMedio = calcularVentanaMedioDia(
    config,
    diaNorm,
    jornadaInicioMin,
    jornadaFinMin
  );

  // Si es el día de medio turno y tenemos ventana válida, recortamos jornada
  if (esDiaMedio && ventanaMedio) {
    inicioJ = ventanaMedio.inicioMin;
    finJ = ventanaMedio.finMin;

    // Seguridad: si algo quedó raro, volvemos a jornada completa
    if (finJ <= inicioJ) {
      inicioJ = jornadaInicioMin;
      finJ = jornadaFinMin;
    }
  }

  // ==========================
  //   TURNOS EXISTENTES DEL DÍA
  // ==========================
  const reservasDia = turnosDelEmpleado
    .filter((t) => esMismoDia(t.inicio, fecha))
    .map((t) => ({
      ...t,
      i: +t.inicio,
      f: +t.fin,
    }));

  const slots: SlotCalendario[] = [];

  // ==========================
  //   MODO PERSONALIZADO
  //   -> X clientesPorDia distribuidos en la jornada
  // ==========================
  if (
    config.modoTurnos === "personalizado" &&
    config.clientesPorDia &&
    config.clientesPorDia > 0
  ) {
    const totalJornada = finJ - inicioJ;
    const step = Math.floor(totalJornada / config.clientesPorDia);

    if (step <= 0) {
      return [];
    }

    for (let i = 0; i < config.clientesPorDia; i++) {
      const slotInicioMin = inicioJ + step * i;
      const hora = minToHHMM(slotInicioMin);
      const inicio = combinarFechaHora(fecha, hora);

      // ventana que ocuparía el servicio si empieza en este slot
      const finServicioMin = slotInicioMin + duracionServicioMin;

      const fin = new Date(inicio.getTime() + duracionServicioMin * 60000);
      const esPasado = inicio < ahora;

      // si el servicio no entra dentro de la jornada real, lo marcamos como cerrado
      if (finServicioMin > finJ) {
        slots.push({
          fecha,
          hora,
          inicio,
          fin,
          estado: esPasado ? "pasado" : "cerradoNegocio",
          turnoOcupado: undefined,
        });
        continue;
      }

      // ¿Algún turno cubre este rango completo del servicio?
      const covering = reservasDia.find((t) =>
        solapan(+inicio, +fin, t.i, t.f)
      );

      let estado: SlotEstado = "libre";

      if (covering?.bloqueado) {
        estado = esPasado ? "pasado" : "bloqueado";
      } else if (covering) {
        estado = esPasado ? "pasado" : "ocupado";
      } else if (esPasado) {
        estado = "pasado";
      }

      slots.push({
        fecha,
        hora,
        inicio,
        fin,
        estado,
        turnoOcupado: covering,
      });
    }

    return slots;
  }

  // ==========================
  //   MODO JORNADA (normal)
  //   -> slots cada minutosPorSlot
  // ==========================
  for (let m = inicioJ; m < finJ; m += minutosPorSlot) {
    const hora = minToHHMM(m);
    const inicio = combinarFechaHora(fecha, hora);

    // ventana completa que ocuparía el servicio
    const finServicioMin = m + duracionServicioMin;
    const fin = new Date(inicio.getTime() + duracionServicioMin * 60000);
    const esPasado = inicio < ahora;

    // si el servicio no entra en la jornada (ej: cierre 20:00 y servicio 1h30 → 19:00 OK, 19:30 no)
    if (finServicioMin > finJ) {
      slots.push({
        fecha,
        hora,
        inicio,
        fin,
        estado: esPasado ? "pasado" : "cerradoNegocio",
        turnoOcupado: undefined,
      });
      continue;
    }

    // ¿Algún turno cubre este rango completo del servicio?
    const covering = reservasDia.find((t) =>
      solapan(+inicio, +fin, t.i, t.f)
    );

    let estado: SlotEstado = "libre";

    if (covering?.bloqueado) {
      estado = esPasado ? "pasado" : "bloqueado";
    } else if (covering) {
      estado = esPasado ? "pasado" : "ocupado";
    } else if (esPasado) {
      estado = "pasado";
    }

    slots.push({
      fecha,
      hora,
      inicio,
      fin,
      estado,
      turnoOcupado: covering,
    });
  }

  return slots;
}

/* =====================================================
   6) Calendario de rango completo
   ===================================================== */

/**
 * Estructura del calendario de un empleado para un rango de días.
 */
export type CalendarioEmpleadoRango = {
  dias: DiaCalendario[];
  slotsPorDia: Record<string, SlotCalendario[]>; // key = "yyyy-mm-dd"
};

/**
 * Genera el calendario completo para un empleado en un rango de días:
 * - Combina config del negocio + empleado.
 * - Genera lista de días.
 * - Para cada día, genera slots según turnos existentes.
 */
export function generarCalendarioEmpleadoRango(
  negocio: NegocioAgendaSource,
  empleado: EmpleadoAgendaSource | null,
  turnos: TurnoExistente[],
  opciones?: {
    diasAdelante?: number;
    desde?: Date;
    minutosPorSlot?: number;
    duracionServicioMin?: number;
  }
): CalendarioEmpleadoRango {
  const diasAdelante = opciones?.diasAdelante ?? 14;
  const desde = opciones?.desde;
  const minutosPorSlot = opciones?.minutosPorSlot ?? 30;
  const duracionServicioMin = opciones?.duracionServicioMin;

  const config = combinarConfigCalendario(negocio, empleado);
  const dias = generarDiasRango(config, diasAdelante, desde);

  const slotsPorDia: Record<string, SlotCalendario[]> = {};

  for (const dia of dias) {
    const fecha = dia.date;
    const key = dia.value;

    // días deshabilitados no tienen slots
    if (dia.disabled) {
      slotsPorDia[key] = [];
      continue;
    }

    const slots = generarSlotsDelDia(config, fecha, turnos, {
      minutosPorSlot,
      duracionServicioMin,
    });
    slotsPorDia[key] = slots;
  }

  return { dias, slotsPorDia };
}

/* =====================================================
   7) Backend: permisos y acciones
   ===================================================== */

/**
 * Representa al usuario logueado (solo necesitamos el uid).
 */
export type UsuarioActual = {
  uid: string | null;
};

/**
 * Verifica si el usuario es dueño o admin del negocio.
 * Usa distintos posibles nombres de campos (compatibilidad histórica).
 */
export function esDuenoOAdmin(
  usuario: UsuarioActual,
  negocio: NegocioAgendaSource
): boolean {
  const uid = usuario.uid;
  if (!uid) return false;

  const anyNeg: any = negocio;

  const ownerUid =
    anyNeg.ownerUid || anyNeg.owner_uid || anyNeg.uidOwner || null;

  const adminUids: string[] = anyNeg.adminUids || [];

  const esOwner = ownerUid ? uid === ownerUid : false;
  const esAdmin = adminUids.includes(uid);

  return esOwner || esAdmin;
}

/**
 * Lanza un error si el usuario NO es dueño ni admin del negocio.
 * Si el negocio no tiene info de owner/admin en memoria, deja pasar.
 */
export function assertDuenoOAdmin(
  usuario: UsuarioActual,
  negocio: NegocioAgendaSource
) {
  const anyNeg: any = negocio;

  if (esDuenoOAdmin(usuario, negocio)) return;

  // si el negocio no trae info de owner/admin en memoria, dejamos pasar
  if (!anyNeg.ownerUid && !(anyNeg.adminUids && anyNeg.adminUids.length)) {
    return;
  }

  throw new Error("NO_PERMISO_AGENDA");
}

/**
 * 7.1 Bloquear un slot individual
 *
 * Crea un documento en Negocios/{id}/Turnos con bloqueado = true
 * para la fecha/hora indicada (no asocia cliente).
 */
export async function bloquearSlotBackend(opts: {
  usuario: UsuarioActual;
  negocio: NegocioAgendaSource;
  empleadoId?: string | null;
  empleadoNombre: string;
  fecha: Date;
  hora: string;
  duracionMin?: number;
}) {
  const {
    usuario,
    negocio,
    empleadoId,
    empleadoNombre,
    fecha,
    hora,
    duracionMin = 30,
  } = opts;

  // Validamos permisos (dueño/admin)
  assertDuenoOAdmin(usuario, negocio);

  const inicio = combinarFechaHora(fecha, hora);
  const fin = new Date(inicio.getTime() + duracionMin * 60000);

  const refNeg = collection(db, "Negocios", negocio.id, "Turnos");

  await addDoc(refNeg, {
    negocioId: negocio.id,
    negocioNombre: negocio.nombre,
    empleadoId: empleadoId || null,
    empleadoNombre,
    fecha: inicio.toISOString().split("T")[0],
    hora,
    inicioTs: inicio,
    finTs: fin,
    bloqueado: true,
    creadoEn: new Date(),
    creadoPor: "negocio-bloquear-slot",
  });
}

/**
 * 7.2 Crear turno manual
 *
 * Crea un turno directamente (como si la agenda lo hubiera agendado):
 * - Asigna servicio, cliente y empleado.
 */
export async function crearTurnoManualBackend(opts: {
  usuario: UsuarioActual;
  negocio: NegocioAgendaSource;
  empleadoId?: string | null;
  empleadoNombre: string;
  fecha: Date;
  hora: string;
  servicioId: string;
  servicioNombre: string;
  duracion: number | string;
  clienteNombre: string;
  clienteEmail?: string | null;
  clienteTelefono?: string | null;
  clienteFotoUrl?: string | null; // ✅ NUEVO
}) {
  const {
    usuario,
    negocio,
    empleadoId,
    empleadoNombre,
    fecha,
    hora,
    servicioId,
    servicioNombre,
    duracion,
    clienteNombre,
    clienteEmail,
    clienteTelefono,
    clienteFotoUrl, // ✅ NUEVO
  } = opts;

  // Validamos permisos (dueño/admin)
  assertDuenoOAdmin(usuario, negocio);

  const durMin = parseDuracionMin(duracion);
  const inicio = combinarFechaHora(fecha, hora);
  const fin = new Date(inicio.getTime() + durMin * 60000);

  const refNeg = collection(db, "Negocios", negocio.id, "Turnos");

  await addDoc(refNeg, {
    negocioId: negocio.id,
    negocioNombre: negocio.nombre,
    servicioId,
    servicioNombre,
    duracion,
    empleadoId: empleadoId || null,
    empleadoNombre,
    fecha: inicio.toISOString().split("T")[0],
    hora,
    inicioTs: inicio,
    finTs: fin,
    clienteNombre: clienteNombre.trim(),
    clienteEmail: clienteEmail || null,
    clienteTelefono: clienteTelefono || null,
    clienteFotoUrl: clienteFotoUrl || null, // ✅ NUEVO
    creadoEn: new Date(),
    creadoPor: "negocio-manual",
  });
}

/**
 * 7.3 Bloquear día completo
 *
 * Genera múltiples documentos bloqueados en Negocios/{id}/Turnos
 * para cubrir un rango [horaInicio, horaFin) cada X minutos.
 */
export async function bloquearDiaCompletoBackend(opts: {
  usuario: UsuarioActual;
  negocio: NegocioAgendaSource;
  empleadoId?: string | null;
  empleadoNombre: string;
  fecha: Date;
  horaInicio: string;
  horaFin: string;
  minutosPaso?: number;
}) {
  const {
    usuario,
    negocio,
    empleadoId,
    empleadoNombre,
    fecha,
    horaInicio,
    horaFin,
    minutosPaso = 30,
  } = opts;

  // Validamos permisos (dueño/admin)
  assertDuenoOAdmin(usuario, negocio);

  const inicioMin = toMin(horaInicio);
  const finMin = toMin(horaFin);

  if (finMin <= inicioMin) {
    throw new Error("RANGO_INVALIDO");
  }

  const refNeg = collection(db, "Negocios", negocio.id, "Turnos");

  const batch = writeBatch(db);
  const fechaStr = fecha.toISOString().split("T")[0];

  for (let m = inicioMin; m < finMin; m += minutosPaso) {
    const hora = minToHHMM(m);
    const inicio = combinarFechaHora(fecha, hora);
    const fin = new Date(inicio.getTime() + minutosPaso * 60000);

    const docRef = doc(refNeg);

    batch.set(docRef, {
      negocioId: negocio.id,
      negocioNombre: negocio.nombre,
      empleadoId: empleadoId || null,
      empleadoNombre,
      fecha: fechaStr,
      hora,
      inicioTs: inicio,
      finTs: fin,
      bloqueado: true,
      creadoEn: new Date(),
      creadoPor: "negocio-bloquear-dia",
    });
  }

  await batch.commit();
}

/**
 * 7.4 Liberar día completo
 *
 * Elimina todos los turnos bloqueados de un empleado
 * para una fecha concreta.
 */
export async function liberarDiaCompletoBackend(opts: {
  usuario: UsuarioActual;
  negocio: NegocioAgendaSource;
  empleadoNombre: string;
  fecha: Date;
}) {
  const { usuario, negocio, empleadoNombre, fecha } = opts;

  // Validamos permisos (dueño/admin)
  assertDuenoOAdmin(usuario, negocio);

  const fechaStr = fecha.toISOString().split("T")[0];

  const refNeg = collection(db, "Negocios", negocio.id, "Turnos");
  const qTurnos = query(
    refNeg,
    where("empleadoNombre", "==", empleadoNombre),
    where("fecha", "==", fechaStr),
    where("bloqueado", "==", true)
  );

  const snap = await getDocs(qTurnos);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

/* =====================================================
   8) Cargar / escuchar turnos desde Firestore
   ===================================================== */

/**
 * Carga una sola vez todos los turnos de un empleado
 * para un negocio específico y los devuelve normalizados.
 */
export async function cargarTurnosEmpleadoUnaVez(opts: {
  negocioId: string;
  empleadoNombre: string;
}): Promise<TurnoExistente[]> {
  const { negocioId, empleadoNombre } = opts;

  const refNeg = collection(db, "Negocios", negocioId, "Turnos");
  const qTurnos = query(refNeg, where("empleadoNombre", "==", empleadoNombre));

  const snap = await getDocs(qTurnos);

  const brutos: TurnoFuente[] = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  }));

  return normalizarTurnos(brutos);
}

/**
 * Escucha en tiempo real los turnos de un empleado (o todos los turnos del negocio).
 *
 * - Si se pasa empleadoNombre, filtra por ese empleado.
 * - Si no se pasa, escucha todos los turnos del negocio.
 *
 * onUpdate recibe la lista cruda de TurnoFuente (para que el caller
 * decida cómo normalizar o filtrar).
 *
 * Devuelve una función para desuscribirse del listener.
 */
export function escucharTurnosEmpleadoTiempoReal(opts: {
  negocioId: string;
  empleadoNombre?: string;
  onUpdate: (turnos: TurnoFuente[]) => void;
}) {
  const { negocioId, empleadoNombre, onUpdate } = opts;

  const refNeg = collection(db, "Negocios", negocioId, "Turnos");

  const qTurnos =
    empleadoNombre && empleadoNombre.trim() !== ""
      ? query(refNeg, where("empleadoNombre", "==", empleadoNombre))
      : query(refNeg);

  const unsub = onSnapshot(qTurnos, (snap) => {
    const brutos: TurnoFuente[] = [];

    snap.forEach((d) => {
      brutos.push({
        id: d.id,
        ...(d.data() as any),
      });
    });

    onUpdate(brutos);
  });

  // devolvemos función de cleanup para usar en useEffect
  return () => {
    unsub();
  };
}
