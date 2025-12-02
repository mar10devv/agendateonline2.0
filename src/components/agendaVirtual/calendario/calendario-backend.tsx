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

export type ModoTurnos = "personalizado" | "jornada";

export type NegocioAgendaConfig = {
  diasLibres?: (string | number)[];
  modoTurnos?: ModoTurnos;
  clientesPorDia?: number | null;
  horaInicio?: string; // en Firestore viene como "inicio"
  horaFin?: string; // en Firestore viene como "fin"
  horasSeparacion?: number | null;
};

export type EmpleadoAgendaConfig = {
  inicio?: string; // "HH:mm"
  fin?: string; // "HH:mm"
  diasLibres?: (string | number)[];
  descansoDiaMedio?: string | null;
  descansoTurnoMedio?: "manana" | "tarde" | null;
};

export type EmpleadoAgendaSource = {
  id?: string;
  nombre?: string;
  calendario?: EmpleadoAgendaConfig;

  // algunos empleados pueden tener estos campos en la raíz
  inicio?: string;
  fin?: string;
  diasLibres?: (string | number)[];
  descansoDiaMedio?: string | null;
  descansoTurnoMedio?: "manana" | "tarde" | null;

  [key: string]: any;
};

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
  descansoTurnoMedio?: "manana" | "tarde" | null;
};

/* -------- Turnos ya guardados en Firestore (normalizados) -------- */

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

  raw?: any;
};

export type SlotEstado =
  | "libre"
  | "ocupado"
  | "bloqueado"
  | "pasado"
  | "cerradoNegocio"
  | "descansoEmpleado";

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

export function normalizarDia(str: any): string {
  if (!str) return "";
  return String(str)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function mapDiaGeneric(d: string | number): string {
  if (typeof d === "number") {
    return MAP_DIA_NUM_A_STR[d] || "";
  }
  return normalizarDia(String(d));
}

export function esMismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function toMin(hhmm: string): number {
  const [h, m] = (hhmm || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minToHHMM(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const mm = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function combinarFechaHora(fecha: Date, hhmm: string): Date {
  const [h, m] = (hhmm || "00:00").split(":").map((n) => Number(n || 0));
  const d = new Date(fecha);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

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

export function toDateSafe(v: any): Date {
  if (!v) return new Date(NaN);
  if (v instanceof Date) return v;
  if (typeof (v as any)?.toDate === "function") return (v as any).toDate();
  if (typeof v === "string") return new Date(v);
  return new Date(v);
}

export function solapan(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/* =====================================================
   1) Unificar configuración NEGOCIO + EMPLEADO
   ===================================================== */

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
  if ((!calEmp.inicio && !calEmp.fin) && empFull) {
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
        descansoTurnoMedio: empFull.descansoTurnoMedio ?? null,
      };
    }
  }

  // horarios negocio en firestore: "inicio"/"fin"
  const horaInicioNeg =
    (confNeg as any).inicio || confNeg.horaInicio || "09:00";
  const horaFinNeg = (confNeg as any).fin || confNeg.horaFin || "18:00";

  // ---------- DIAS LIBRES NEGOCIO ----------
  const diasNegocioRaw = (confNeg.diasLibres || []) as (string | number)[];
  const diasLibresNegocioNorm = diasNegocioRaw
    .map(mapDiaGeneric)
    .filter(Boolean);

  // ---------- DIAS LIBRES EMPLEADO (solo de ese empleado) ----------
  let diasEmpleadoRaw: (string | number)[] = [];

  // prioridad 1: lo que trae empFull.calendario.diasLibres (lo que está en Firestore)
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

  // prioridad 2: empFull.diasLibres en raíz
  if (empFull && Array.isArray((empFull as any).diasLibres)) {
    diasEmpleadoRaw = [
      ...diasEmpleadoRaw,
      ...(((empFull as any).diasLibres as (string | number)[]) || []),
    ];
  }

  // prioridad 3: calendario recibido por props
  if (calEmp && Array.isArray(calEmp.diasLibres)) {
    diasEmpleadoRaw = [
      ...diasEmpleadoRaw,
      ...(calEmp.diasLibres as (string | number)[]),
    ];
  }

  // prioridad 4: diasLibres en la raíz del empleado recibido por props
  if (empleado && Array.isArray((empleado as any).diasLibres)) {
    diasEmpleadoRaw = [
      ...diasEmpleadoRaw,
      ...(((empleado as any).diasLibres as (string | number)[]) || []),
    ];
  }

  // quitamos duplicados
  diasEmpleadoRaw = Array.from(new Set(diasEmpleadoRaw));

  const diasLibresEmpleadoNorm = diasEmpleadoRaw
    .map(mapDiaGeneric)
    .filter(Boolean);

  const diasLibresCombinadosNorm = Array.from(
    new Set([...diasLibresNegocioNorm, ...diasLibresEmpleadoNorm])
  );

  const modoTurnos: ModoTurnos = confNeg.modoTurnos || "jornada";

  const clientesPorDia =
    modoTurnos === "personalizado" && confNeg.clientesPorDia
      ? confNeg.clientesPorDia
      : undefined;

  const horasSeparacion =
    modoTurnos === "jornada"
      ? confNeg.horasSeparacion || 30
      : undefined;

  // prioridad: horario del empleado > horario del negocio
  const inicio = calEmp.inicio || horaInicioNeg;
  const fin = calEmp.fin || horaFinNeg;

  const descansoDiaMedio =
    calEmp.descansoDiaMedio ?? empleado?.descansoDiaMedio ?? null;

  const descansoTurnoMedio =
    calEmp.descansoTurnoMedio ?? empleado?.descansoTurnoMedio ?? null;

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
    descansoTurnoMedio,
  };
}

/* =====================================================
   2) Generar días del rango
   ===================================================== */

export type DiaCalendario = {
  date: Date;
  label: string;
  value: string;
  disabledNegocio: boolean;
  disabledEmpleado: boolean;
  disabled: boolean;
};

export function generarDiasRango(
  config: ConfigCalendarioUnificado,
  diasAdelante: number = 14,
  desde?: Date
): DiaCalendario[] {
  const hoy = desde ? new Date(desde) : new Date();
  hoy.setHours(0, 0, 0, 0);

  const lista: DiaCalendario[] = [];

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

    const disabledNegocio = config.diasLibresNegocioNorm.includes(diaNorm);
    const disabledEmpleado = config.diasLibresEmpleadoNorm.includes(diaNorm);

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

  if (config.modoTurnos === "personalizado" && config.clientesPorDia) {
    const step = Math.floor(totalMinutes / config.clientesPorDia);
    for (let i = 0; i < config.clientesPorDia; i++) {
      const t = start + i * step;
      const hh = String(Math.floor(t / 60)).padStart(2, "0");
      const mm = String(t % 60).padStart(2, "0");
      horariosBase.push(`${hh}:${mm}`);
    }
  } else if (config.modoTurnos === "jornada" && config.horasSeparacion) {
    let t = start;
    while (t + config.horasSeparacion <= end) {
      const hh = String(Math.floor(t / 60)).padStart(2, "0");
      const mm = String(t % 60).padStart(2, "0");
      horariosBase.push(`${hh}:${mm}`);
      t += config.horasSeparacion;
    }
  }

  if (!fechaSeleccionada) return horariosBase;

  let horariosDisponibles = [...horariosBase];

  if (
    config.descansoDiaMedio &&
    config.descansoTurnoMedio &&
    horariosBase.length > 0
  ) {
    const diaSeleccionadoNombre = fechaSeleccionada.toLocaleDateString(
      "es-ES",
      { weekday: "long" }
    );
    const diaSeleccionadoNorm = normalizarDia(diaSeleccionadoNombre);
    const diaMedioNorm = normalizarDia(config.descansoDiaMedio);

    if (diaSeleccionadoNorm === diaMedioNorm) {
      const CUATRO_HORAS = 4 * 60;

      if (totalMinutes > CUATRO_HORAS) {
        let ventanaInicio = start;
        let ventanaFin = end;

        if (config.descansoTurnoMedio === "manana") {
          ventanaInicio = start;
          ventanaFin = start + CUATRO_HORAS;
        } else {
          ventanaInicio = end - CUATRO_HORAS;
          ventanaFin = end;
        }

        horariosDisponibles = horariosBase.filter((hora) => {
          const [hh, mm] = hora.split(":").map(Number);
          const t = hh * 60 + mm;
          return t >= ventanaInicio && t < ventanaFin;
        });

        if (horariosDisponibles.length === 0) {
          horariosDisponibles = [...horariosBase];
        }
      }
    }
  }

  return horariosDisponibles;
}

/* =====================================================
   4) Normalizar turnos
   ===================================================== */

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

  [key: string]: any;
};

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
      raw: t,
    });
  }

  out.sort((a, b) => +a.inicio - +b.inicio);

  return out;
}

/* =====================================================
   5) Generar SLOTS de un día
   ===================================================== */

export type GenerarSlotsOpciones = {
  ahora?: Date;
  minutosPorSlot?: number;
};

export function generarSlotsDelDia(
  config: ConfigCalendarioUnificado,
  fecha: Date,
  turnosDelEmpleado: TurnoExistente[],
  opciones: GenerarSlotsOpciones = {}
): SlotCalendario[] {
  const ahora = opciones.ahora ? new Date(opciones.ahora) : new Date();
  const minutosPorSlot = opciones.minutosPorSlot || 30;

  const diaNombreLong = fecha.toLocaleDateString("es-ES", {
    weekday: "long",
  });
  const diaNorm = normalizarDia(diaNombreLong);

  if (config.diasLibresNegocioNorm.includes(diaNorm)) return [];
  if (config.diasLibresEmpleadoNorm.includes(diaNorm)) return [];

  const [hIni, mIni] = config.inicio.split(":").map(Number);
  const [hFin, mFin] = config.fin.split(":").map(Number);

  let inicioJ = hIni * 60 + mIni;
  let finJ = hFin * 60 + mFin;
  let totalMinutes = finJ - inicioJ;

  if (totalMinutes <= 0) {
    return [];
  }

  const descansoDiaMedioNorm = normalizarDia(config.descansoDiaMedio || "");
  const esDiaMedio =
    descansoDiaMedioNorm &&
    descansoDiaMedioNorm === diaNorm &&
    !!config.descansoTurnoMedio;

  if (esDiaMedio && totalMinutes > 4 * 60) {
    const CUATRO_HORAS = 4 * 60;

    if (config.descansoTurnoMedio === "manana") {
      finJ = inicioJ + CUATRO_HORAS;
    } else {
      inicioJ = finJ - CUATRO_HORAS;
    }

    totalMinutes = finJ - inicioJ;
    if (totalMinutes <= 0) {
      inicioJ = hIni * 60 + mIni;
      finJ = hFin * 60 + mFin;
    }
  }

  const reservasDia = turnosDelEmpleado
    .filter((t) => esMismoDia(t.inicio, fecha))
    .map((t) => ({
      ...t,
      i: +t.inicio,
      f: +t.fin,
    }));

  const out: SlotCalendario[] = [];

  for (let m = inicioJ; m < finJ; m += minutosPorSlot) {
    const hora = minToHHMM(m);
    const inicio = combinarFechaHora(fecha, hora);
    const fin = new Date(+inicio + minutosPorSlot * 60000);

    const covering = reservasDia.find((t) => solapan(+inicio, +fin, t.i, t.f));
    const esPasado = inicio < ahora;

    let estado: SlotEstado = "libre";

    if (covering?.bloqueado) {
      estado = esPasado ? "pasado" : "bloqueado";
    } else if (covering) {
      estado = esPasado ? "pasado" : "ocupado";
    } else if (esPasado) {
      estado = "pasado";
    }

    out.push({
      fecha,
      hora,
      inicio,
      fin,
      estado,
      turnoOcupado: covering,
    });
  }

  return out;
}

/* =====================================================
   6) Calendario de rango completo
   ===================================================== */

export type CalendarioEmpleadoRango = {
  dias: DiaCalendario[];
  slotsPorDia: Record<string, SlotCalendario[]>;
};

export function generarCalendarioEmpleadoRango(
  negocio: NegocioAgendaSource,
  empleado: EmpleadoAgendaSource | null,
  turnos: TurnoExistente[],
  opciones?: {
    diasAdelante?: number;
    desde?: Date;
    minutosPorSlot?: number;
  }
): CalendarioEmpleadoRango {
  const diasAdelante = opciones?.diasAdelante ?? 14;
  const desde = opciones?.desde;
  const minutosPorSlot = opciones?.minutosPorSlot ?? 30;

  const config = combinarConfigCalendario(negocio, empleado);
  const dias = generarDiasRango(config, diasAdelante, desde);

  const slotsPorDia: Record<string, SlotCalendario[]> = {};

  for (const dia of dias) {
    const fecha = dia.date;
    const key = dia.value;

    if (dia.disabled) {
      slotsPorDia[key] = [];
      continue;
    }

    const slots = generarSlotsDelDia(config, fecha, turnos, {
      minutosPorSlot,
    });
    slotsPorDia[key] = slots;
  }

  return { dias, slotsPorDia };
}

/* =====================================================
   7) Backend: permisos y acciones
   ===================================================== */

export type UsuarioActual = {
  uid: string | null;
};

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
  } = opts;

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
    creadoEn: new Date(),
    creadoPor: "negocio-manual",
  });
}

/**
 * 7.3 Bloquear día completo
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
 */
export async function liberarDiaCompletoBackend(opts: {
  usuario: UsuarioActual;
  negocio: NegocioAgendaSource;
  empleadoNombre: string;
  fecha: Date;
}) {
  const { usuario, negocio, empleadoNombre, fecha } = opts;

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

  return () => {
    unsub();
  };
}
