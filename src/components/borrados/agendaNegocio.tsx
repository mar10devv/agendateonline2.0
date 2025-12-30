// src/components/agendaVirtual/admin/AgendaNegocio.tsx
import { useEffect, useMemo, useState } from "react";
import { writeBatch } from "firebase/firestore";
import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
  getDoc,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

/* ================== Tipos ================== */
type Empleado = {
  id?: string;
  nombre: string;
  calendario?: {
    inicio?: string; // "HH:mm"
    fin?: string; // "HH:mm"
    // puede venir como números (0-6) o como strings ("lunes", etc.)
    diasLibres?: (number | string)[];

    // 🆕 medio día guardado dentro del calendario
    descansoDiaMedio?: string | null;
    descansoTurnoMedio?: "manana" | "tarde" | null;
  };

  // 🆕 por si en algún momento los guardamos al nivel del empleado
  descansoDiaMedio?: string | null;
  descansoTurnoMedio?: "manana" | "tarde" | null;

  esEmpleado?: boolean; // true si trabaja atendiendo
  rol?: string; // "dueño" | "empleado" etc.
};

type Negocio = {
  id: string;
  nombre: string;
  empleadosData?: Empleado[];
  slug?: string;
  configuracionAgenda?: {
    diasLibres?: (string | number)[]; // días libres del negocio
    modoTurnos?: "personalizado" | "jornada";
    clientesPorDia?: number | null;
    horaInicio?: string;
    horaFin?: string;
  };
};

type TurnoNegocio = {
  id: string;
  servicioId?: string;
  servicioNombre?: string;
  duracion?: number | string;
  empleadoId?: string | null;
  empleadoNombre: string;
  fecha?: string;
  hora?: string;
  inicioTs?: Date | Timestamp;
  finTs?: Date | Timestamp;
  clienteUid?: string | null;
  clienteEmail?: string | null;
  clienteTelefono?: string | null;
  clienteNombre?: string | null;
  creadoEn?: any;
  bloqueado?: boolean;
};

type Servicio = {
  id: string;
  servicio: string;
  precio: number;
  duracion: number | string;
};

/* =============== Helpers fecha/hora =============== */
const esMismoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const toDateSafe = (v: any): Date => {
  if (!v) return new Date(NaN);
  if (v instanceof Date) return v;
  if (v instanceof Timestamp) return v.toDate();
  if (typeof v?.toDate === "function") return v.toDate();
  if (typeof v === "string") return new Date(v);
  return new Date(v);
};

// Motivos predeterminados para cancelar
const MOTIVOS_PREDETERMINADOS = [
  "El empleado no podrá asistir",
  "Inconveniente con el local",
  "Reprogramación por agenda del negocio",
  "Falla de energía/servicio en el local",
  "Emergencia de último momento",
  "El cliente solicitó cancelar",
];

const toMin = (hhmm: string) => {
  const [h, m] = (hhmm || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const minToHHMM = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};
const parseDuracionMin = (d: any): number => {
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
};
const combinarFechaHora = (fecha: Date, hhmm: string) => {
  const [h, m] = (hhmm || "00:00").split(":").map((n) => Number(n || 0));
  const d = new Date(fecha);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};

const calcularInicioFinDesdeDoc = (t: any): { inicio: Date; fin: Date } | null => {
  const ini = t.inicioTs ? toDateSafe(t.inicioTs) : null;
  const fin = t.finTs ? toDateSafe(t.finTs) : null;
  if (ini && fin && !isNaN(+ini) && !isNaN(+fin)) return { inicio: ini, fin };
  const f = toDateSafe(t.fecha);
  if (isNaN(+f)) return null;
  const inicio = combinarFechaHora(f, t.hora || "00:00");
  const dur = parseDuracionMin(t.duracion);
  return { inicio, fin: new Date(inicio.getTime() + dur * 60000) };
};
const solapan = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && aEnd > bStart;

/* ==== Helpers para días libres negocio + empleado ==== */
const normalize = (str: string) =>
  (str || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const MAP_DIA_NUM_A_STR = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

function mapDiaGeneric(d: string | number): string {
  if (typeof d === "number") {
    return MAP_DIA_NUM_A_STR[d] || "";
  }
  return normalize(String(d));
}

/**
 * Junta días libres de negocio (configuracionAgenda.diasLibres)
 * y días libres del empleado (calendario.diasLibres).
 * Los devuelve normalizados (sin acentos, minúsculas, sin espacios).
 *
 * Jerarquía: si el NEGOCIO marca un día como libre, ya queda bloqueado
 * para todos los empleados, sin importar medio día, etc.
 */
function getDiasLibresNorm(
  negocio: Negocio,
  empleadoSel: Empleado | null
): string[] {
  const diasNegocioRaw =
    (negocio?.configuracionAgenda?.diasLibres || []) as (string | number)[];
  const diasEmpleadoRaw =
    (empleadoSel?.calendario?.diasLibres || []) as (string | number)[];

  const diasNegocio = diasNegocioRaw.map(mapDiaGeneric).filter(Boolean);
  const diasEmpleado = diasEmpleadoRaw.map(mapDiaGeneric).filter(Boolean);

  const mezclados = [...new Set([...diasNegocio, ...diasEmpleado])];
  return mezclados;
}

function esDiaLibreFecha(fecha: Date, diasLibresNorm: string[]): boolean {
  const nombreDia = normalize(
    fecha.toLocaleDateString("es-ES", { weekday: "long" })
  );
  return diasLibresNorm.includes(nombreDia);
}

/* ==== Helper para saber si un empleado realmente trabaja ==== */
const esTrabajadorReal = (e: Empleado): boolean => {
  const rolNorm = (e.rol || "").toLowerCase();

  // Si es dueño y NO está marcado explícitamente como empleado, NO trabaja
  if (
    (rolNorm === "dueño" || rolNorm === "dueno" || rolNorm === "owner") &&
    e.esEmpleado !== true
  ) {
    return false;
  }

  // Si tiene el flag esEmpleado definido, respetamos ese valor
  if (typeof e.esEmpleado === "boolean") {
    return e.esEmpleado;
  }

  // Para el resto (empleados comunes sin flag), asumimos que sí trabajan
  return true;
};

/* =============== Componente principal =============== */
export default function AgendaNegocio({ negocio }: { negocio: Negocio }) {
  const hoy = new Date();

  // Rango visible (−10 / +30)
  const fechaMinima = useMemo(() => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - 10);
    return d;
  }, []);
  const fechaMaxima = useMemo(() => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + 30);
    return d;
  }, []);

  // Empleado seleccionado inicial: primer empleado que realmente trabaja
  const [empleadoSel, setEmpleadoSel] = useState<Empleado | null>(() => {
    const lista = negocio.empleadosData || [];
    const trabajadores = lista.filter(esTrabajadorReal);

    if (trabajadores.length > 0) return trabajadores[0];
    return lista[0] || null;
  });

  // Lista para el selector: solo empleados que realmente trabajan
  const empleadosParaSelector =
    (negocio.empleadosData || []).filter(esTrabajadorReal) ?? [];

  const [mesVisible, setMesVisible] = useState<Date>(new Date(hoy));

  const [modalEliminar, setModalEliminar] = useState<{
    visible: boolean;
    turno?: TurnoNegocio | null;
    motivo?: string;
    estado?: "idle" | "loading" | "success" | "error";
  }>({ visible: false, turno: null, motivo: "", estado: "idle" });

  const [modalBloquearDia, setModalBloquearDia] = useState<{
    visible: boolean;
    fecha?: Date | null;
    desbloquear?: boolean;
    estado?: "idle" | "loading" | "success" | "error";
  }>({ visible: false, fecha: null, desbloquear: false, estado: "idle" });

  // NO abrir horarios automáticamente
  const [diaSel, setDiaSel] = useState<Date | null>(null);

  // Turnos del empleado
  const [turnos, setTurnos] = useState<TurnoNegocio[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);

  // Modales
  const [detalles, setDetalles] = useState<TurnoNegocio | null>(null);
  const [clienteExtra, setClienteExtra] = useState<{
    nombre?: string;
    fotoPerfil?: string;
  } | null>(null);
  const [modalOpciones, setModalOpciones] = useState<{
    visible: boolean;
    hora?: string | null;
  }>({
    visible: false,
  });

  const [manualOpen, setManualOpen] = useState<{
    visible: boolean;
    hora: string | null;
    paso: 1 | 2 | 3;
    servicio?: Servicio | null;
    nombre?: string;
    email?: string;
    telefono?: string;
    error?: string | null;
  }>({ visible: false, hora: null, paso: 1 });

  /* ---------- Calendario del mes ---------- */
  const year = mesVisible.getFullYear();
  const month = mesVisible.getMonth();
  const primerDia = new Date(year, month, 1);
  const ultimoDia = new Date(year, month + 1, 0);
  const diasEnMes = ultimoDia.getDate();
  const inicioSemana = (primerDia.getDay() + 6) % 7; // Lunes=0

  const dias: (Date | null)[] = [];
  for (let i = 0; i < inicioSemana; i++) dias.push(null);
  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = new Date(year, month, d);
    if (fecha >= fechaMinima && fecha <= fechaMaxima) dias.push(fecha);
  }

  const hayDiasEnMes = (y: number, m: number) => {
    const primero = new Date(y, m, 1);
    const ultimo = new Date(y, m + 1, 0);
    return ultimo >= fechaMinima && primero <= fechaMaxima;
  };

  const esSlotPasado = (fecha: Date, hhmm: string) => {
    const d = combinarFechaHora(fecha, hhmm);
    return d < new Date();
  };

  const puedeIrAnterior = hayDiasEnMes(year, month - 1);
  const puedeIrSiguiente = hayDiasEnMes(year, month + 1);

  const irMesAnterior = () =>
    puedeIrAnterior && setMesVisible(new Date(year, month - 1, 1));
  const irMesSiguiente = () =>
    puedeIrSiguiente && setMesVisible(new Date(year, month + 1, 1));

  /* ---------- Días libres negocio + empleado NORMALIZADOS ---------- */
  const diasLibresNorm = useMemo(
    () => getDiasLibresNorm(negocio, empleadoSel),
    [negocio, empleadoSel]
  );

  /* ---------- Cargar servicios del negocio ---------- */
  useEffect(() => {
    if (!negocio?.id) return;
    (async () => {
      try {
        const ref = collection(db, "Negocios", negocio.id, "Precios");
        const snap = await getDocs(ref);
        const lista = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Servicio[];
        setServicios(lista);
      } catch {
        setServicios([]);
      }
    })();
  }, [negocio?.id]);

  /* ---------- Asegurar empleado seleccionado válido ---------- */
  useEffect(() => {
    const lista = negocio.empleadosData || [];
    if (!lista.length) return;

    const trabajadores = lista.filter(esTrabajadorReal);

    // si el seleccionado sigue existiendo y además trabaja, lo dejamos
    if (empleadoSel && trabajadores.some((e) => e.nombre === empleadoSel.nombre)) {
      return;
    }

    // si hay trabajadores, elegimos el primero
    if (trabajadores.length > 0) {
      setEmpleadoSel(trabajadores[0]);
    } else {
      // si no hay ninguno “trabajador real”, usamos el primero de la lista
      setEmpleadoSel(lista[0]);
    }
  }, [negocio.empleadosData, empleadoSel?.nombre]);

  /* ---------- Escucha de turnos del EMPLEADO ---------- */
  useEffect(() => {
    if (!negocio?.id || !empleadoSel?.nombre) return;

    const ref = collection(db, "Negocios", negocio.id, "Turnos");
    const qBase = query(ref, where("empleadoNombre", "==", empleadoSel.nombre));

    const off = onSnapshot(qBase, (snap) => {
      const lista: TurnoNegocio[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        const par = calcularInicioFinDesdeDoc(data);
        if (!par) return;
        lista.push({
          id: d.id,
          ...data,
          inicioTs: par.inicio,
          finTs: par.fin,
        });
      });
      lista.sort(
        (a, b) => +toDateSafe(a.inicioTs) - +toDateSafe(b.inicioTs)
      );
      setTurnos(lista);
    });

    return () => off();
  }, [negocio?.id, empleadoSel?.nombre]);

  /* ---------- Reset al cambiar empleado/negocio ---------- */
  useEffect(() => {
    setDiaSel(null);
  }, [empleadoSel?.nombre, negocio?.id]);

  // 🧠 Configuración de calendario para este empleado (negocio + empleado)
  const calendarioEmpleado = useMemo(() => {
    if (!empleadoSel) return null;

    const cal = empleadoSel.calendario || {};

    // Días libres del negocio
    const diasNegocio =
      (negocio.configuracionAgenda?.diasLibres || []) as (string | number)[];

    // Días libres del empleado (pueden venir como número o string)
    const diasEmpleadoRaw = (cal.diasLibres || []) as (string | number)[];
    const diasEmpleado = diasEmpleadoRaw.map((d) =>
      typeof d === "number" ? MAP_DIA_NUM_A_STR[d] || "" : String(d)
    );

    const diasLibres = Array.from(new Set([...diasNegocio, ...diasEmpleado]));

    return {
      modoTurnos: negocio.configuracionAgenda?.modoTurnos || "jornada",
      clientesPorDia:
        negocio.configuracionAgenda?.modoTurnos === "personalizado"
          ? negocio.configuracionAgenda?.clientesPorDia || undefined
          : undefined,
      // En jornada usamos intervalos de 30 minutos en este panel
      horasSeparacion:
        negocio.configuracionAgenda?.modoTurnos === "jornada" ? 30 : undefined,
      diasLibres,
      inicio:
        (cal as any).inicio ||
        negocio.configuracionAgenda?.horaInicio ||
        "09:00",
      fin:
        (cal as any).fin ||
        negocio.configuracionAgenda?.horaFin ||
        "18:00",

      // 🆕 medio día (puede venir en calendario o en el empleado)
      descansoDiaMedio:
        (cal as any).descansoDiaMedio ??
        (empleadoSel as any)?.descansoDiaMedio ??
        null,
      descansoTurnoMedio:
        (cal as any).descansoTurnoMedio ??
        (empleadoSel as any)?.descansoTurnoMedio ??
        null,
    };
  }, [empleadoSel, negocio.configuracionAgenda]);

  /* ---------- Slots 30' y ocupación (respetando medio día REAL) ---------- */
  const slots = useMemo(() => {
    if (!diaSel || !empleadoSel) {
      return [] as { hora: string; ocupado: boolean; turno?: TurnoNegocio }[];
    }

    const cal: any = empleadoSel.calendario || {};

    // Horario base (empleado o negocio como fallback)
    const [hi, mi] = String(
      cal.inicio || negocio.configuracionAgenda?.horaInicio || "09:00"
    )
      .split(":")
      .map(Number);

    const [hf, mf] = String(
      cal.fin || negocio.configuracionAgenda?.horaFin || "18:00"
    )
      .split(":")
      .map(Number);

    let inicioJ = (hi || 0) * 60 + (mi || 0); // minutos inicio jornada
    let finJ = (hf || 0) * 60 + (mf || 0); // minutos fin jornada
    let totalMinutes = finJ - inicioJ;

    if (totalMinutes <= 0) {
      console.warn("[AgendaNegocio] Rango horario inválido", {
        inicio: cal.inicio,
        fin: cal.fin,
      });
      return [];
    }

    // 🧠 Medio día configurado (día concreto + turno mañana/tarde)
    const descansoDiaMedioRaw: string | null =
      cal.descansoDiaMedio ?? (empleadoSel as any)?.descansoDiaMedio ?? null;

    const descansoTurnoMedio: "manana" | "tarde" | null =
      cal.descansoTurnoMedio ??
      (empleadoSel as any)?.descansoTurnoMedio ??
      null;

    let esDiaMedio = false;

    if (descansoDiaMedioRaw && descansoTurnoMedio) {
      const diaMedioNorm = normalize(descansoDiaMedioRaw);
      const diaSelNorm = normalize(
        diaSel.toLocaleDateString("es-ES", { weekday: "long" })
      );

      esDiaMedio = diaSelNorm === diaMedioNorm;
    }

    // ⏱️ Aplicar recorte de medio día SOLO si el negocio NO tiene ese día
    // marcado como libre completo. Si el negocio lo tiene libre, ya ni
    // siquiera deberíamos estar acá porque el día completo está bloqueado.
    const nombreDiaSelNorm = normalize(
      diaSel.toLocaleDateString("es-ES", { weekday: "long" })
    );
    const negocioTieneLibreEseDia = diasLibresNorm.includes(nombreDiaSelNorm);

    if (esDiaMedio && !negocioTieneLibreEseDia && totalMinutes > 120) {
      const mitad = Math.floor(totalMinutes / 2); // mitad de la jornada

      if (descansoTurnoMedio === "manana") {
        // medio día EN LA MAÑANA → trabaja solo la primera mitad
        // Ej: 08:00–20:00 → 08:00–14:00
        finJ = inicioJ + mitad;
      } else if (descansoTurnoMedio === "tarde") {
        // medio día EN LA TARDE → trabaja solo la segunda mitad
        // Ej: 08:00–20:00 → 14:00–20:00
        inicioJ = finJ - mitad;
      }

      totalMinutes = finJ - inicioJ;

      if (totalMinutes <= 0) {
        console.warn(
          "[AgendaNegocio] Medio día dejó un rango vacío, se vuelve a jornada completa"
        );
        inicioJ = (hi || 0) * 60 + (mi || 0);
        finJ = (hf || 0) * 60 + (mf || 0);
      }

      console.log("[AgendaNegocio] Ventana final aplicada medio día →", {
        empleado: empleadoSel.nombre,
        descansoDiaMedioRaw,
        descansoTurnoMedio,
        inicioJ,
        finJ,
        totalMinutes,
      });
    }

    const paso = 30;

    // Turnos ya ocupados / bloqueados de ese día
    const turnosDelDia = turnos
      .filter((t) => esMismoDia(toDateSafe(t.inicioTs as any), diaSel))
      .map((t) => {
        const ini = toDateSafe(t.inicioTs as any);
        const fin = t.finTs
          ? toDateSafe(t.finTs as any)
          : new Date(+ini + parseDuracionMin(t.duracion) * 60000);
        return { ...t, _ini: ini, _fin: fin };
      });

    const out: { hora: string; ocupado: boolean; turno?: TurnoNegocio }[] = [];

    for (let m = inicioJ; m < finJ; m += paso) {
      const hhmm = minToHHMM(m);
      const slotStart = combinarFechaHora(diaSel, hhmm);
      const slotEnd = new Date(+slotStart + paso * 60000);

      const covering = turnosDelDia.find(
        (t) => t._ini < slotEnd && t._fin > slotStart
      );

      out.push({
        hora: hhmm,
        ocupado: Boolean(covering),
        turno: covering as any,
      });
    }

    return out;
  }, [empleadoSel, negocio.configuracionAgenda, turnos, diaSel, diasLibresNorm]);

  /* ---------- Datos extra del cliente ---------- */
  useEffect(() => {
    const loadCliente = async () => {
      setClienteExtra(null);
      if (!detalles?.clienteUid) return;
      try {
        const docRef = doc(db, "Usuarios", detalles.clienteUid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const d = snap.data() as any;
          setClienteExtra({ nombre: d?.nombre, fotoPerfil: d?.fotoPerfil });
        }
      } catch {}
    };
    loadCliente();
  }, [detalles?.clienteUid]);

  /* ---------- Validación de hueco ---------- */
  const puedeAsignarEn = (inicio: Date, durMin: number) => {
    const fin = new Date(inicio.getTime() + durMin * 60000);
    const reservas = turnos
      .map((t) => {
        const par = calcularInicioFinDesdeDoc(t);
        return par ? { i: +par.inicio, f: +par.fin } : null;
      })
      .filter(Boolean) as { i: number; f: number }[];

    const sI = +inicio;
    const sF = +fin;
    for (const r of reservas) {
      if (solapan(sI, sF, r.i, r.f)) return false;
    }

    const cal = empleadoSel?.calendario || {};
    const [hi, mi] = String(cal.inicio || "08:00").split(":").map(Number);
    const [hf, mf] = String(cal.fin || "22:00").split(":").map(Number);
    const jI = (hi || 0) * 60 + (mi || 0);
    const jF = (hf || 0) * 60 + (mf || 0);
    const slotMin = inicio.getHours() * 60 + inicio.getMinutes();
    return slotMin >= jI && slotMin + durMin <= jF;
  };

  /* ------------------------------- UI ------------------------------- */
  const nombreMes = mesVisible.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  const reservasDelDia = diaSel
    ? turnos
        .filter((t) => esMismoDia(toDateSafe(t.inicioTs as any), diaSel))
        .sort(
          (a, b) =>
            +toDateSafe(a.inicioTs as any) - +toDateSafe(b.inicioTs as any)
        )
    : [];

  const handleEliminarTurno = async (
    turno: TurnoNegocio,
    motivo: string
  ): Promise<boolean> => {
    try {
      const batch = writeBatch(db);

      batch.delete(doc(db, "Negocios", negocio.id, "Turnos", turno.id));

      if (turno.clienteUid) {
        batch.delete(
          doc(db, "Usuarios", turno.clienteUid, "Turnos", turno.id)
        );
      }

      await batch.commit();
      console.log("✅ Turno borrado en negocio y cliente");

      if (turno.clienteEmail) {
        try {
          const origin =
            typeof window !== "undefined" && window.location?.origin
              ? window.location.origin
              : "";

          const payload = {
            email: turno.clienteEmail,
            nombre: turno.clienteNombre,
            servicio: turno.servicioNombre,
            fecha: turno.fecha,
            hora: turno.hora,
            motivo,
            negocioNombre: negocio.nombre,
            slug: negocio.slug ?? null,
            agendaUrl: `${origin}/agenda/${negocio.slug || ""}`,
          };

          console.log("[frontend] notificar-cancelacion payload →", payload);

          const res = await fetch(
            "/.netlify/functions/notificar-cancelacion",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }
          );

          const txt = await res.text();
          if (!res.ok) {
            console.error(
              "❌ No se pudo enviar el mail de cancelación:",
              res.status,
              txt
            );
          } else {
            console.log("✅ Mail de cancelación enviado:", txt);
          }
        } catch (err) {
          console.error("❌ Error de red enviando el mail:", err);
        }
      }

      return true;
    } catch (e) {
      console.error("❌ Error eliminando turno:", e);
      return false;
    }
  };

  return (
    <div
      className="text-white p-5 rounded-2xl transition-colors duration-300"
      style={{ backgroundColor: "var(--color-fondo)" }}
    >
      {/* Header */}
      <div className="mb-2">
        <h2 className="text-xl font-semibold">Mi Agenda</h2>
      </div>

      {/* Selector de empleado */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="text-sm font-medium transition-colors duration-300"
          style={{ color: "var(--color-texto, #fff)" }}
        >
          Seleccionar agenda de:
        </span>
        <select
          className="rounded-lg px-3 py-2 text-sm outline-none transition-colors duration-300"
          style={{
            backgroundColor: "var(--color-primario)",
            color: "#fff",
          }}
          value={empleadoSel?.nombre || ""}
          onChange={(e) => {
            const emp =
              empleadosParaSelector.find(
                (x) => x.nombre === e.target.value
              ) || null;
            setEmpleadoSel(emp);
          }}
        >
          {empleadosParaSelector.map((e, i) => (
            <option key={i} value={e.nombre}>
              {e.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Calendario + Slots */}
      <div className="flex flex-col gap-6 lg:max-w-3xl mx-auto">
        {/* Calendario mensual */}
        <div
          className="rounded-2xl p-4 transition-colors duration-300"
          style={{ backgroundColor: "var(--color-primario)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={irMesAnterior}
              disabled={!puedeIrAnterior}
              className={`px-2 ${
                puedeIrAnterior
                  ? "text-gray-400 hover:text-white"
                  : "text-gray-600 cursor-not-allowed"
              }`}
              title="Mes anterior"
            >
              ◀
            </button>
            <h3 className="text-sm font-semibold capitalize">{nombreMes}</h3>
            <button
              onClick={irMesSiguiente}
              disabled={!puedeIrSiguiente}
              className={`px-2 ${
                puedeIrSiguiente
                  ? "text-gray-400 hover:text-white"
                  : "text-gray-600 cursor-not-allowed"
              }`}
              title="Mes siguiente"
            >
              ▶
            </button>
          </div>

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

          {/* Días (respetando días libres negocio+empleado) */}
          <div className="grid grid-cols-7 gap-y-1 text-sm">
            {dias.map((d, idx) => {
              if (!d) return <div key={idx} className="w-10 h-8" />;

              const esHoy = esMismoDia(d, hoy);
              const esPasado =
                d <
                new Date(
                  hoy.getFullYear(),
                  hoy.getMonth(),
                  hoy.getDate()
                );
              const esLibre = esDiaLibreFecha(d, diasLibresNorm);
              const seleccionado = diaSel && esMismoDia(diaSel, d);
              const disabled = esPasado || esLibre;

              const handleClick = () => {
                if (disabled) return;

                if (diaSel && esMismoDia(diaSel, d)) {
                  const turnosDia = turnos.filter((t) =>
                    esMismoDia(toDateSafe(t.inicioTs as any), d)
                  );
                  const todosBloqueados =
                    turnosDia.length > 0 &&
                    turnosDia.every((t) => t.bloqueado);

                  setModalBloquearDia({
                    visible: true,
                    fecha: d,
                    desbloquear: todosBloqueados,
                    estado: "idle",
                  });
                } else {
                  setDiaSel(d);
                }
              };

              let clases =
                "w-10 h-8 flex items-center justify-center rounded-lg transition ";
              if (esLibre) {
                clases +=
                  "text-red-400 line-through cursor-not-allowed opacity-70";
              } else if (esHoy) {
                clases += "bg-white text-black font-bold";
              } else if (esPasado) {
                clases +=
                  "text-gray-500 line-through cursor-not-allowed";
              } else if (seleccionado) {
                clases += "bg-indigo-600 text-white font-bold";
              } else {
                clases += "hover:bg-neutral-700";
              }

              return (
                <button
                  key={idx}
                  onClick={handleClick}
                  disabled={disabled}
                  className={clases}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel derecho */}
        <div
          className="rounded-2xl p-4 transition-colors duration-300"
          style={{ backgroundColor: "var(--color-primario)" }}
        >
          {!diaSel ? (
            <div className="text-sm text-gray-400">
              Selecciona un día del calendario para ver los turnos.
            </div>
          ) : (
            <>
              {/* Encabezado + contador */}
              <div
                className="flex items-center justify-between mb-3 sticky top-0 rounded-lg px-3 py-2 transition-colors duration-300"
                style={{
                  backgroundColor: "var(--color-primario)",
                  color: "#fff",
                }}
              >
                <div className="text-sm font-medium">
                  {empleadoSel?.nombre} •{" "}
                  {diaSel.toLocaleDateString("es-ES", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  })}
                </div>
                <div className="text-xs opacity-90">
                  {reservasDelDia.length} turno
                  {reservasDelDia.length === 1 ? "" : "s"}
                </div>
              </div>

              {/* Quién se agendó o bloqueó */}
              {reservasDelDia.length > 0 && (
                <ul className="mb-3 space-y-1 text-xs">
                  {reservasDelDia.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between bg-neutral-900 rounded px-2 py-1"
                    >
                      <span className="font-semibold">
                        {toDateSafe(
                          t.inicioTs
                        ).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      <span className="truncate">
                        {t.bloqueado
                          ? "Bloqueado"
                          : t.clienteNombre ?? "Reservado"}
                        {t.servicioNombre && !t.bloqueado
                          ? ` • ${t.servicioNombre}`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Slots del día */}
              <div className="max-h-[420px] overflow-auto pr-1">
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {slots.map((s, i) => {
                    const bloqueado = s.turno?.bloqueado;
                    const ocupado = s.ocupado && !bloqueado;
                    const vencido = diaSel
                      ? esSlotPasado(diaSel, s.hora)
                      : false;

                    let claseEstado = "";
                    if (vencido) {
                      claseEstado = "horario-pasado";
                    } else if (bloqueado) {
                      claseEstado = "horario-bloqueado";
                    } else if (ocupado) {
                      claseEstado = "horario-ocupado";
                    } else {
                      claseEstado = "horario-disponible";
                    }

                    return (
                      <button
                        key={i}
                        disabled={vencido && !ocupado && !bloqueado}
                        onClick={async () => {
                          if (bloqueado) {
                            if (!vencido) {
                              if (
                                confirm(
                                  "¿Desea liberar este turno para que vuelva a estar disponible?"
                                )
                              ) {
                                await deleteDoc(
                                  doc(
                                    db,
                                    "Negocios",
                                    negocio.id,
                                    "Turnos",
                                    s.turno!.id
                                  )
                                );
                              }
                            }
                          } else if (ocupado) {
                            setDetalles(s.turno!);
                          } else if (!vencido) {
                            setModalOpciones({
                              visible: true,
                              hora: s.hora,
                            });
                          }
                        }}
                        className={`horario-btn h-14 grid place-items-center text-sm font-semibold transition focus:outline-none ${claseEstado}`}
                        style={{
                          ["--horario-bg" as any]: undefined,
                        }}
                        title={
                          vencido
                            ? ocupado
                              ? "Turno pasado (ver detalle)"
                              : "Turno pasado"
                            : bloqueado
                            ? "No disponible (bloqueado)"
                            : ocupado
                            ? "Turno ocupado"
                            : "Opciones de turno"
                        }
                      >
                        {s.hora}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal detalle de turno */}
      {detalles && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-6">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              setDetalles(null);
              setClienteExtra(null);
            }}
          />
          <div
            className="rounded-2xl p-6 w-full max-w-md relative z-10 shadow-xl border border-neutral-700 transition-colors duration-300"
            style={{ backgroundColor: "var(--color-fondo)" }}
          >
            <h3 className="text-lg font-semibold mb-4">
              Detalle del turno
            </h3>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-400">Hora:</span>{" "}
                <b>{detalles.hora}</b>
              </div>
              <div>
                <span className="text-gray-400">Fecha:</span>{" "}
                <b>{detalles.fecha}</b>
              </div>
              <div>
                <span className="text-gray-400">Empleado:</span>{" "}
                <b>{detalles.empleadoNombre}</b>
              </div>

              {!detalles.bloqueado ? (
                <>
                  <div>
                    <span className="text-gray-400">
                      Servicio:
                    </span>{" "}
                    <b>{detalles.servicioNombre || "—"}</b>
                  </div>
                  <div>
                    <span className="text-gray-400">
                      Cliente:
                    </span>{" "}
                    <b>{detalles.clienteNombre || "—"}</b>
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span>{" "}
                    <b>{detalles.clienteEmail || "—"}</b>
                  </div>
                  <div>
                    <span className="text-gray-400">
                      Teléfono:
                    </span>{" "}
                    <b>{detalles.clienteTelefono || "—"}</b>
                  </div>
                  {clienteExtra?.nombre && (
                    <div className="text-xs text-gray-400">
                      Perfil: {clienteExtra.nombre}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-amber-300">
                  Este horario está bloqueado por el negocio.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => {
                  setDetalles(null);
                  setClienteExtra(null);
                }}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700"
              >
                Cerrar
              </button>

              {!detalles.bloqueado && (
                <button
                  onClick={() => {
                    setModalEliminar({
                      visible: true,
                      turno: detalles,
                      motivo: "",
                      estado: "idle",
                    });
                    setDetalles(null);
                    setClienteExtra(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                >
                  Eliminar turno
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal eliminar turno */}
      {modalEliminar.visible && modalEliminar.turno && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-2 sm:p-6">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (modalEliminar.estado === "loading") return;
              setModalEliminar({
                visible: false,
                turno: null,
                motivo: "",
                estado: "idle",
              });
            }}
          />
          <div
            className="rounded-2xl p-6 w-full max-w-md relative z-10 shadow-xl border border-neutral-700 transition-colors duration-300"
            style={{ backgroundColor: "var(--color-fondo)" }}
          >
            <h3 className="text-lg font-semibold mb-4">
              Eliminar turno
            </h3>

            <p className="text-sm mb-4">
              Estás por eliminar el turno de{" "}
              <b>
                {modalEliminar.turno.clienteNombre || "Cliente"}
              </b>{" "}
              a las <b>{modalEliminar.turno.hora}</b> el{" "}
              <b>{modalEliminar.turno.fecha}</b>.
            </p>

            <div className="mb-3">
              <div className="text-sm text-gray-300 mb-2">
                Elige un motivo rápido:
              </div>
              <div className="flex flex-wrap gap-2">
                {MOTIVOS_PREDETERMINADOS.map((m) => {
                  const activo =
                    (modalEliminar.motivo || "").trim() === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={modalEliminar.estado === "loading"}
                      onClick={() =>
                        setModalEliminar((s) => ({
                          ...s,
                          motivo: m,
                        }))
                      }
                      className={`px-3 py-1.5 rounded-full text-xs border transition
                  ${
                    activo
                      ? "bg-indigo-600 text-white border-indigo-500"
                      : "bg-neutral-800 text-gray-200 border-neutral-700 hover:bg-neutral-700"
                  } ${
                        modalEliminar.estado === "loading"
                          ? "opacity-60 cursor-not-allowed"
                          : ""
                      }`}
                      title={m}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block text-sm text-gray-300 mb-2">
              Motivo de cancelación (se notificará al cliente):
            </label>
            <textarea
              className="w-full p-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm mb-4"
              rows={3}
              placeholder="Ej. El empleado no podrá asistir"
              value={modalEliminar.motivo || ""}
              disabled={modalEliminar.estado === "loading"}
              onChange={(e) =>
                setModalEliminar((s) => ({
                  ...s,
                  motivo: e.target.value,
                }))
              }
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() =>
                  setModalEliminar({
                    visible: false,
                    turno: null,
                    motivo: "",
                    estado: "idle",
                  })
                }
                disabled={modalEliminar.estado === "loading"}
                className={`px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 ${
                  modalEliminar.estado === "loading"
                    ? "opacity-60 cursor-not-allowed"
                    : ""
                }`}
              >
                Cancelar
              </button>

              <button
                onClick={async () => {
                  if (modalEliminar.estado === "loading") return;

                  setModalEliminar((s) => ({
                    ...s,
                    estado: "loading",
                  }));

                  const motivo = (modalEliminar.motivo || "").trim();
                  const ok = await handleEliminarTurno(
                    modalEliminar.turno!,
                    motivo
                  );

                  if (ok) {
                    setModalEliminar((s) => ({
                      ...s,
                      estado: "success",
                    }));
                    setTimeout(() => {
                      setModalEliminar({
                        visible: false,
                        turno: null,
                        motivo: "",
                        estado: "idle",
                      });
                    }, 1200);
                  } else {
                    setModalEliminar((s) => ({
                      ...s,
                      estado: "error",
                    }));
                  }
                }}
                disabled={
                  modalEliminar.estado === "loading" ||
                  (modalEliminar.motivo || "").trim().length === 0
                }
                aria-busy={modalEliminar.estado === "loading"}
                className={`px-4 py-2 rounded-lg text-white flex items-center gap-2
            ${
              modalEliminar.estado === "success"
                ? "bg-emerald-600"
                : modalEliminar.estado === "loading"
                ? "bg-red-600 cursor-wait"
                : modalEliminar.estado === "error"
                ? "bg-red-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
              >
                {modalEliminar.estado === "loading" && (
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"
                    ></path>
                  </svg>
                )}
                {modalEliminar.estado === "success"
                  ? "Se eliminó el turno"
                  : modalEliminar.estado === "loading"
                  ? "Eliminando turno…"
                  : modalEliminar.estado === "error"
                  ? "Error. Reintentar"
                  : "Eliminar turno"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal bloquear/liberar día */}
      {modalBloquearDia.visible && modalBloquearDia.fecha && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-2 sm:p-6">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (modalBloquearDia.estado === "loading") return;
              setModalBloquearDia({
                visible: false,
                fecha: null,
                desbloquear: false,
                estado: "idle",
              });
            }}
          />
          <div
            className="rounded-2xl p-6 w-full max-w-md relative z-10 shadow-xl border border-neutral-700 transition-colors duration-300"
            style={{ backgroundColor: "var(--color-fondo)" }}
          >
            <h3 className="text-lg font-semibold mb-4">
              {modalBloquearDia.desbloquear
                ? "Liberar día completo"
                : "Bloquear día completo"}
            </h3>

            <p className="text-sm mb-4">
              {modalBloquearDia.desbloquear ? (
                <>
                  ¿Seguro que deseas <b>liberar</b> el día{" "}
                  {modalBloquearDia.fecha.toLocaleDateString(
                    "es-ES",
                    {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    }
                  )}
                  ?
                  <br />
                  Todos los turnos bloqueados volverán a estar
                  disponibles.
                </>
              ) : (
                <>
                  ¿Seguro que deseas <b>bloquear</b> el día{" "}
                  {modalBloquearDia.fecha.toLocaleDateString(
                    "es-ES",
                    {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    }
                  )}
                  ?
                  <br />
                  Todos los turnos quedarán inhabilitados.
                </>
              )}
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() =>
                  setModalBloquearDia({
                    visible: false,
                    fecha: null,
                    desbloquear: false,
                    estado: "idle",
                  })
                }
                disabled={modalBloquearDia.estado === "loading"}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                onClick={async () => {
                  if (modalBloquearDia.estado === "loading") return;

                  setModalBloquearDia((s) => ({
                    ...s,
                    estado: "loading",
                  }));

                  try {
                    if (modalBloquearDia.desbloquear) {
                      const turnosDia = turnos.filter(
                        (t) =>
                          esMismoDia(
                            toDateSafe(t.inicioTs as any),
                            modalBloquearDia.fecha!
                          ) && t.bloqueado
                      );
                      for (const t of turnosDia) {
                        await deleteDoc(
                          doc(
                            db,
                            "Negocios",
                            negocio.id,
                            "Turnos",
                            t.id
                          )
                        );
                      }
                    } else {
                      const fecha = modalBloquearDia.fecha!;
                      const cal = empleadoSel?.calendario || {};
                      const [hi, mi] = String(cal.inicio || "08:00")
                        .split(":")
                        .map(Number);
                      const [hf, mf] = String(cal.fin || "22:00")
                        .split(":")
                        .map(Number);
                      const inicioJ = (hi || 0) * 60 + (mi || 0);
                      const finJ = (hf || 0) * 60 + (mf || 0);
                      const paso = 30;

                      const refNeg = collection(
                        db,
                        "Negocios",
                        negocio.id,
                        "Turnos"
                      );

                      for (let m = inicioJ; m < finJ; m += paso) {
                        const hora = minToHHMM(m);
                        const inicio = combinarFechaHora(fecha, hora);
                        const fin = new Date(
                          inicio.getTime() + 30 * 60000
                        );

                        await addDoc(refNeg, {
                          negocioId: negocio.id,
                          negocioNombre: negocio.nombre,
                          empleadoId: empleadoSel?.id || null,
                          empleadoNombre: empleadoSel?.nombre,
                          fecha: fecha.toISOString().split("T")[0],
                          hora,
                          inicioTs: inicio,
                          finTs: fin,
                          bloqueado: true,
                          creadoEn: new Date(),
                          creadoPor: "negocio-bloqueo-dia",
                        });
                      }
                    }

                    setModalBloquearDia((s) => ({
                      ...s,
                      estado: "success",
                    }));
                    setTimeout(() => {
                      setModalBloquearDia({
                        visible: false,
                        fecha: null,
                        desbloquear: false,
                        estado: "idle",
                      });
                    }, 1200);
                  } catch (e) {
                    console.error(
                      "❌ Error bloqueando/liberando día:",
                      e
                    );
                    setModalBloquearDia((s) => ({
                      ...s,
                      estado: "error",
                    }));
                  }
                }}
                disabled={modalBloquearDia.estado === "loading"}
                className={`px-4 py-2 rounded-lg text-white flex items-center gap-2
            ${
              modalBloquearDia.estado === "success"
                ? "bg-emerald-600"
                : modalBloquearDia.estado === "loading"
                ? "bg-indigo-600 cursor-wait"
                : modalBloquearDia.estado === "error"
                ? "bg-red-700"
                : modalBloquearDia.desbloquear
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
              >
                {modalBloquearDia.estado === "loading"
                  ? modalBloquearDia.desbloquear
                    ? "Liberando..."
                    : "Bloqueando..."
                  : modalBloquearDia.estado === "success"
                  ? modalBloquearDia.desbloquear
                    ? "Se ha liberado"
                    : "Se ha bloqueado"
                  : modalBloquearDia.estado === "error"
                  ? "Error. Reintentar"
                  : modalBloquearDia.desbloquear
                  ? "Liberar día"
                  : "Bloquear día"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal opciones de turno */}
      {modalOpciones.visible && diaSel && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-6">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() =>
              setModalOpciones({ visible: false })
            }
          />
          <div className="bg-neutral-900 rounded-2xl p-6 w-full max-w-md relative z-10 shadow-xl border border-neutral-700">
            <h3 className="text-lg font-semibold mb-4">
              Turno {modalOpciones.hora} •{" "}
              {diaSel.toLocaleDateString("es-ES")}
            </h3>

            <div className="flex flex-col gap-3">
              {/* Agregar manualmente */}
              <button
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                onClick={() => {
                  setManualOpen({
                    visible: true,
                    hora: modalOpciones.hora || null,
                    paso: 1,
                  });
                  setModalOpciones({ visible: false });
                }}
              >
                ➕ Agregar manualmente
              </button>

              {/* No trabajar */}
              <button
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
                onClick={async () => {
                  try {
                    const inicio = combinarFechaHora(
                      diaSel!,
                      modalOpciones.hora!
                    );
                    const fin = new Date(
                      inicio.getTime() + 30 * 60000
                    );

                    const refNeg = collection(
                      db,
                      "Negocios",
                      negocio.id,
                      "Turnos"
                    );
                    await addDoc(refNeg, {
                      negocioId: negocio.id,
                      negocioNombre: negocio.nombre,
                      empleadoId: empleadoSel?.id || null,
                      empleadoNombre: empleadoSel?.nombre,
                      fecha: inicio.toISOString().split("T")[0],
                      hora: modalOpciones.hora,
                      inicioTs: inicio,
                      finTs: fin,
                      bloqueado: true,
                      creadoEn: new Date(),
                      creadoPor: "negocio-manual",
                    });

                    setModalOpciones({ visible: false });
                  } catch (e) {
                    console.error(
                      "❌ Error bloqueando turno:",
                      e
                    );
                  }
                }}
              >
                🚫 No trabajar este turno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal asignación manual */}
      {manualOpen.visible && diaSel && (
        <div className="fixed inset-0 z-[10000]">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() =>
              setManualOpen({
                visible: false,
                hora: null,
                paso: 1,
              })
            }
          />
          <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-6">
            <div
              className="w-full max-w-[680px] sm:rounded-2xl border border-neutral-700 shadow-2xl overflow-hidden transition-colors duration-300"
              style={{ backgroundColor: "var(--color-fondo)" }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
                <h4 className="text-base sm:text-lg font-semibold">
                  Asignar turno manualmente
                </h4>
                <button
                  onClick={() =>
                    setManualOpen({
                      visible: false,
                      hora: null,
                      paso: 1,
                    })
                  }
                  className="text-gray-300 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>

              {/* Paso 1 */}
              {manualOpen.paso === 1 && (
                <div className="p-4 sm:p-6 space-y-4 text-sm">
                  <p>
                    ¿Desea agendar manualmente un turno a las{" "}
                    <b>{manualOpen.hora}</b> para{" "}
                    <b>{empleadoSel?.nombre}</b> el{" "}
                    <b>
                      {diaSel.toLocaleDateString("es-ES")}
                    </b>
                    ?
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() =>
                        setManualOpen({
                          visible: false,
                          hora: null,
                          paso: 1,
                        })
                      }
                      className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() =>
                        setManualOpen((s) => ({
                          ...s,
                          paso: 2,
                        }))
                      }
                      className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {/* Paso 2 */}
              {manualOpen.paso === 2 && (
                <div className="p-4 sm:p-6 space-y-4 text-sm">
                  <div className="text-gray-300">
                    Selecciona un servicio:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {servicios.map((s) => (
                      <button
                        key={s.id}
                        onClick={() =>
                          setManualOpen((st) => ({
                            ...st,
                            servicio: s,
                            paso: 3,
                            error: null,
                          }))
                        }
                        className={`p-3 rounded-lg border transition text-left ${
                          manualOpen.servicio?.id === s.id
                            ? "border-indigo-500 bg-neutral-800"
                            : "border-neutral-700 hover:bg-neutral-800"
                        }`}
                      >
                        <div className="font-medium">
                          {s.servicio}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {s.duracion} min • ${s.precio}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() =>
                        setManualOpen((s) => ({
                          ...s,
                          paso: 1,
                        }))
                      }
                      className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700"
                    >
                      ← Volver
                    </button>
                    <button
                      onClick={() =>
                        setManualOpen((s) => ({
                          ...s,
                          paso: 3,
                        }))
                      }
                      disabled={!manualOpen.servicio}
                      className={`px-3 py-2 rounded-lg ${
                        manualOpen.servicio
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                          : "bg-gray-700 text-gray-300 cursor-not-allowed"
                      }`}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}

              {/* Paso 3 */}
              {manualOpen.paso === 3 && (
                <div className="p-4 sm:p-6 space-y-4 text-sm">
                  <div className="space-y-2">
                    <label className="block text-gray-300">
                      Nombre del cliente *
                    </label>
                    <input
                      className="w-full px-3 py-2 rounded-lg bg-neutral-800 outline-none"
                      placeholder="Ej. Juan Pérez"
                      value={manualOpen.nombre || ""}
                      onChange={(e) =>
                        setManualOpen((s) => ({
                          ...s,
                          nombre: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-300">
                        Email (opcional)
                      </label>
                      <input
                        className="w-full px-3 py-2 rounded-lg bg-neutral-800 outline-none"
                        placeholder="cliente@correo.com"
                        value={manualOpen.email || ""}
                        onChange={(e) =>
                          setManualOpen((s) => ({
                            ...s,
                            email: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300">
                        Teléfono (opcional)
                      </label>
                      <input
                        className="w-full px-3 py-2 rounded-lg bg-neutral-800 outline-none"
                        placeholder="+598 ..."
                        value={manualOpen.telefono || ""}
                        onChange={(e) =>
                          setManualOpen((s) => ({
                            ...s,
                            telefono: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {manualOpen.error && (
                    <div className="text-red-300 bg-red-900/30 border border-red-700 px-3 py-2 rounded-lg">
                      {manualOpen.error}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button
                      onClick={() =>
                        setManualOpen((s) => ({
                          ...s,
                          paso: 2,
                        }))
                      }
                      className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700"
                    >
                      ← Volver
                    </button>
                    <button
                      onClick={async () => {
                        if (!manualOpen.nombre?.trim()) {
                          setManualOpen((s) => ({
                            ...s,
                            error:
                              "El nombre del cliente es obligatorio.",
                          }));
                          return;
                        }
                        if (!manualOpen.servicio) {
                          setManualOpen((s) => ({
                            ...s,
                            error: "Seleccione un servicio.",
                          }));
                          return;
                        }

                        try {
                          const hora = manualOpen.hora!;
                          const inicio = combinarFechaHora(
                            diaSel!,
                            hora
                          );
                          const dur = parseDuracionMin(
                            manualOpen.servicio.duracion
                          );

                          if (!puedeAsignarEn(inicio, dur)) {
                            setManualOpen((s) => ({
                              ...s,
                              error:
                                "El servicio no entra en este horario o se solapa con otro turno.",
                            }));
                            return;
                          }

                          const fin = new Date(
                            inicio.getTime() + dur * 60000
                          );
                          const refNeg = collection(
                            db,
                            "Negocios",
                            negocio.id,
                            "Turnos"
                          );
                          await addDoc(refNeg, {
                            negocioId: negocio.id,
                            negocioNombre: negocio.nombre,
                            servicioId: manualOpen.servicio.id,
                            servicioNombre:
                              manualOpen.servicio.servicio,
                            duracion: manualOpen.servicio.duracion,
                            empleadoId: empleadoSel?.id || null,
                            empleadoNombre: empleadoSel?.nombre,
                            fecha: inicio.toISOString().split("T")[0],
                            hora,
                            inicioTs: inicio,
                            finTs: fin,
                            clienteNombre: manualOpen.nombre.trim(),
                            clienteEmail: manualOpen.email || null,
                            clienteTelefono:
                              manualOpen.telefono || null,
                            creadoEn: new Date(),
                            creadoPor: "negocio-manual",
                          });

                          setManualOpen({
                            visible: false,
                            hora: null,
                            paso: 1,
                          });
                        } catch (e) {
                          setManualOpen((s) => ({
                            ...s,
                            error:
                              "No se pudo guardar el turno.",
                          }));
                        }
                      }}
                      className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Guardar turno
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
