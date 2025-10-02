// src/components/agendaVirtual/admin/AgendaNegocio.tsx
import { useEffect, useMemo, useState } from "react";
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
import { db } from "../../../lib/firebase";

/* ================== Tipos ================== */
type Empleado = {
  id?: string;
  nombre: string;
  calendario?: {
    inicio?: string; // "HH:mm"
    fin?: string;    // "HH:mm"
    diasLibres?: number[];
  };
};
type Negocio = { id: string; nombre: string; empleadosData?: Empleado[]; slug?: string }; // 👈 agrega slug

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

type Servicio = { id: string; servicio: string; precio: number; duracion: number | string };


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

  const [empleadoSel, setEmpleadoSel] = useState<Empleado | null>(
    negocio.empleadosData?.[0] || null
  );
  const [mesVisible, setMesVisible] = useState<Date>(new Date(hoy));

const [modalEliminar, setModalEliminar] = useState<{
  visible: boolean;
  turno?: TurnoNegocio | null;
  motivo?: string;
  estado?: "idle" | "loading" | "success" | "error";
}>({ visible: false, turno: null, motivo: "", estado: "idle" });


  // ⛔️ NO abrir horarios automáticamente
  const [diaSel, setDiaSel] = useState<Date | null>(null);

  // Guardamos TODOS los turnos del empleado (sin filtrar por día en la suscripción)
  const [turnos, setTurnos] = useState<TurnoNegocio[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);

  // modales
  const [detalles, setDetalles] = useState<TurnoNegocio | null>(null);
  const [clienteExtra, setClienteExtra] = useState<{ nombre?: string; fotoPerfil?: string } | null>(null);
const [modalOpciones, setModalOpciones] = useState<{ visible: boolean; hora?: string | null }>({ visible: false });

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
  // ¿El slot ya pasó respecto a "ahora"?
const esSlotPasado = (fecha: Date, hhmm: string) => {
  const d = combinarFechaHora(fecha, hhmm);
  return d < new Date();
};

  const puedeIrAnterior = hayDiasEnMes(year, month - 1);
  const puedeIrSiguiente = hayDiasEnMes(year, month + 1);

  const irMesAnterior = () => puedeIrAnterior && setMesVisible(new Date(year, month - 1, 1));
  const irMesSiguiente = () => puedeIrSiguiente && setMesVisible(new Date(year, month + 1, 1));

  /* ---------- Cargar servicios del negocio ---------- */
  useEffect(() => {
    if (!negocio?.id) return;
    (async () => {
      try {
        const ref = collection(db, "Negocios", negocio.id, "Precios");
        const snap = await getDocs(ref);
        const lista = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Servicio[];
        setServicios(lista);
      } catch {
        setServicios([]);
      }
    })();
  }, [negocio?.id]);

  // ✅ Asegura que siempre haya un empleado seleccionado cuando el prop llega o cambia
useEffect(() => {
  const lista = negocio.empleadosData || [];
  if (!lista.length) return;

  // si no hay seleccionado o el seleccionado ya no existe, tomamos el primero
  if (!empleadoSel || !lista.some(e => e.nombre === empleadoSel.nombre)) {
    setEmpleadoSel(lista[0]);
  }
  // si sí existe, lo dejamos como está
}, [negocio.empleadosData]);


  /* ---------- Escucha de turnos del EMPLEADO (no depende del día) ---------- */
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
      lista.sort((a, b) => +toDateSafe(a.inicioTs) - +toDateSafe(b.inicioTs));
      setTurnos(lista);
    });

    return () => off();
  }, [negocio?.id, empleadoSel?.nombre]);

  /* ---------- Reset al cambiar empleado/negocio ---------- */
  useEffect(() => {
    setDiaSel(null);
  }, [empleadoSel?.nombre, negocio?.id]);

  /* ---------- Slots 30' y ocupación (filtramos por día aquí) ---------- */
const slots = useMemo(() => {
  if (!diaSel) return [] as { hora: string; ocupado: boolean; turno?: TurnoNegocio }[];

  const cal = empleadoSel?.calendario || {};
  const [hi, mi] = String(cal.inicio || "08:00").split(":").map(Number);
  const [hf, mf] = String(cal.fin || "22:00").split(":").map(Number);
  const inicioJ = (hi || 0) * 60 + (mi || 0);
  const finJ = (hf || 0) * 60 + (mf || 0);
  const paso = 30;

  // Turnos del día (con inicio y fin seguros)
  const turnosDelDia = turnos
    .filter((t) => esMismoDia(toDateSafe(t.inicioTs as any), diaSel))
    .map((t) => {
      const ini = toDateSafe(t.inicioTs as any);
      const fin = t.finTs ? toDateSafe(t.finTs as any)
                          : new Date(+ini + parseDuracionMin(t.duracion) * 60000);
      return { ...t, _ini: ini, _fin: fin };
    });

  const out: { hora: string; ocupado: boolean; turno?: TurnoNegocio }[] = [];

  // usamos m < finJ para que el slot completo quede dentro de la jornada
  for (let m = inicioJ; m < finJ; m += paso) {
    const hhmm = minToHHMM(m);
    const slotStart = combinarFechaHora(diaSel, hhmm);
    const slotEnd = new Date(+slotStart + paso * 60000);

    // ⛔️ Ocupado si CUALQUIER turno se solapa con [slotStart, slotEnd)
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
}, [empleadoSel?.calendario, turnos, diaSel]);

  /* ---------- Datos extra del cliente (para detalle) ---------- */
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

  /* ---------- Validación de hueco (sin solape) ---------- */
  const puedeAsignarEn = (inicio: Date, durMin: number) => {
    const fin = new Date(inicio.getTime() + durMin * 60000);
    const reservas = turnos
      .map((t) => {
        const par = calcularInicioFinDesdeDoc(t);
        return par ? { i: +par.inicio, f: +par.fin } : null;
      })
      .filter(Boolean) as { i: number; f: number }[];

    const sI = +inicio, sF = +fin;
    for (const r of reservas) {
      if (solapan(sI, sF, r.i, r.f)) return false;
    }

    // respetar jornada del empleado
    const cal = empleadoSel?.calendario || {};
    const [hi, mi] = String(cal.inicio || "08:00").split(":").map(Number);
    const [hf, mf] = String(cal.fin || "22:00").split(":").map(Number);
    const jI = (hi || 0) * 60 + (mi || 0);
    const jF = (hf || 0) * 60 + (mf || 0);
    const slotMin = inicio.getHours() * 60 + inicio.getMinutes();
    return slotMin >= jI && slotMin + durMin <= jF;
  };

  /* ------------------------------- UI ------------------------------- */
  const nombreMes = mesVisible.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  // Reservas “quién se agendó” del día seleccionado
  const reservasDelDia = diaSel
    ? turnos
        .filter((t) => esMismoDia(toDateSafe(t.inicioTs as any), diaSel))
        .sort((a, b) => +toDateSafe(a.inicioTs as any) - +toDateSafe(b.inicioTs as any))
    : [];

    // 🔴 Reemplaza todo tu handleEliminarTurno por este
// ✅ Versión robusta: envía slug + agendaUrl absoluta y loguea el payload
const handleEliminarTurno = async (
  turno: TurnoNegocio,
  motivo: string
): Promise<boolean> => {
  try {
    // 1) Borrar de Firestore
    await deleteDoc(doc(db, "Negocios", negocio.id, "Turnos", turno.id));

    // 2) Notificar por email al cliente (solo si hay email)
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
          // 👇 siempre construimos la URL con el slug (aunque sea vacío)
          agendaUrl: `${origin}/agenda/${negocio.slug || ""}`,
        };

        console.log("[frontend] notificar-cancelacion payload →", payload);

        const res = await fetch("/.netlify/functions/notificar-cancelacion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const txt = await res.text();
        if (!res.ok) {
          console.error("❌ No se pudo enviar el mail de cancelación:", res.status, txt);
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
    <div className="bg-neutral-900 text-white p-5 rounded-2xl">
      {/* Header + selector de empleado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-xl font-semibold">Mi Agenda</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">Seleccionar empleado:</span>
          <select
            className="bg-neutral-800 rounded-lg px-3 py-2 text-sm outline-none"
            value={empleadoSel?.nombre || ""}
            onChange={(e) => {
              const emp = negocio.empleadosData?.find((x) => x.nombre === e.target.value) || null;
              setEmpleadoSel(emp);
            }}
          >
            {(negocio.empleadosData || []).map((e, i) => (
              <option key={i} value={e.nombre}>{e.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendario + Slots */}
<div className="flex flex-col gap-6 lg:max-w-3xl mx-auto">

        {/* Calendario mensual */}
        <div className="bg-neutral-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={irMesAnterior}
              disabled={!puedeIrAnterior}
              className={`px-2 ${puedeIrAnterior ? "text-gray-400 hover:text-white" : "text-gray-600 cursor-not-allowed"}`}
              title="Mes anterior"
            >◀</button>
            <h3 className="text-sm font-semibold capitalize">{nombreMes}</h3>
            <button
              onClick={irMesSiguiente}
              disabled={!puedeIrSiguiente}
              className={`px-2 ${puedeIrSiguiente ? "text-gray-400 hover:text-white" : "text-gray-600 cursor-not-allowed"}`}
              title="Mes siguiente"
            >▶</button>
          </div>

          <div className="grid grid-cols-7 text-xs text-gray-400 mb-1">
            {["L","M","X","J","V","S","D"].map((d, i) => (
              <div key={i} className="w-10 h-8 flex items-center justify-center">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-sm">
            {dias.map((d, idx) =>
              d ? (
                <button
                  key={idx}
                  onClick={() => setDiaSel(d)}
                  className={`w-10 h-8 flex items-center justify-center rounded-lg transition
                    ${
                      esMismoDia(d, hoy)
                        ? "bg-white text-black font-bold"
                        : diaSel && esMismoDia(d, diaSel)
                        ? "bg-indigo-600 text-white font-bold"
                        : "hover:bg-neutral-700"
                    }`}
                >
                  {d.getDate()}
                </button>
              ) : (
                <div key={idx} className="w-10 h-8" />
              )
            )}
          </div>
        </div>

        {/* Panel derecho */}
        <div className="bg-neutral-800 rounded-2xl p-4">
          {!diaSel ? (
            <div className="text-sm text-gray-400">Selecciona un día del calendario para ver los turnos.</div>
          ) : (
            <>
              {/* Encabezado + contador */}
              <div className="flex items-center justify-between mb-3 sticky top-0 bg-neutral-800 z-10">
                <div className="text-sm text-gray-300">
                  {empleadoSel?.nombre} • {diaSel.toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long" })}
                </div>
                <div className="text-xs text-gray-400">
                  {reservasDelDia.length} turno{reservasDelDia.length === 1 ? "" : "s"}
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
          {toDateSafe(t.inicioTs).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>

        {/* 👇 diferenciamos bloqueado de reservado */}
        <span className="truncate">
          {t.bloqueado
            ? "Bloqueado"
            : t.clienteNombre ?? "Reservado"}
          {t.servicioNombre && !t.bloqueado ? ` • ${t.servicioNombre}` : ""}
        </span>
      </li>
    ))}
  </ul>
)}


              {/* Slots del día (6 columnas) */}
<div className="max-h-[420px] overflow-auto pr-1">
  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
    {slots.map((s, i) => {
      const bloqueado = s.turno?.bloqueado; // 👈 nuevo flag
      const ocupado = s.ocupado && !bloqueado; // ocupado real
      const vencido = diaSel ? esSlotPasado(diaSel, s.hora) : false;

      // 🎨 estilos según estado
      const clase = vencido
        ? ocupado
          ? "bg-gray-700 hover:bg-gray-600 text-white"
          : "bg-gray-700 text-gray-400 cursor-not-allowed"
        : bloqueado
          ? "bg-gray-500 text-gray-300 cursor-not-allowed" // bloqueado = gris
          : ocupado
            ? "bg-red-600/95 hover:bg-red-600 text-white"
            : "bg-emerald-600/90 hover:bg-emerald-600 text-white";

      return (
        <button
          key={i}
          disabled={vencido && !ocupado && !bloqueado}
          onClick={async () => {
            if (bloqueado) {

              // 👇 solo negocio puede liberar antes que venza
              if (!vencido) {
                if (confirm("¿Desea liberar este turno para que vuelva a estar disponible?")) {
                  await deleteDoc(doc(db, "Negocios", negocio.id, "Turnos", s.turno!.id));
                }
              }
            } else if (ocupado) {
              setDetalles(s.turno!); // ver detalle
            } else if (!vencido) {
              setModalOpciones({ visible: true, hora: s.hora }); // opciones
            }
          }}
          className={`h-14 rounded-xl grid place-items-center text-sm font-semibold transition focus:outline-none ${clase}`}
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
      
{/* Modal detalle de turno (se abre al tocar un slot rojo) */}
{detalles && (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-6">
    <div
      className="absolute inset-0 bg-black/60"
      onClick={() => {
        setDetalles(null);
        setClienteExtra(null);
      }}
    />
    <div className="bg-neutral-900 rounded-2xl p-6 w-full max-w-md relative z-10 shadow-xl border border-neutral-700">
      <h3 className="text-lg font-semibold mb-4">Detalle del turno</h3>

      <div className="space-y-2 text-sm">
        <div><span className="text-gray-400">Hora:</span> <b>{detalles.hora}</b></div>
        <div><span className="text-gray-400">Fecha:</span> <b>{detalles.fecha}</b></div>
        <div><span className="text-gray-400">Empleado:</span> <b>{detalles.empleadoNombre}</b></div>

        {!detalles.bloqueado ? (
          <>
            <div><span className="text-gray-400">Servicio:</span> <b>{detalles.servicioNombre || "—"}</b></div>
            <div><span className="text-gray-400">Cliente:</span> <b>{detalles.clienteNombre || "—"}</b></div>
            <div><span className="text-gray-400">Email:</span> <b>{detalles.clienteEmail || "—"}</b></div>
            <div><span className="text-gray-400">Teléfono:</span> <b>{detalles.clienteTelefono || "—"}</b></div>
            {clienteExtra?.nombre && (
              <div className="text-xs text-gray-400">Perfil: {clienteExtra.nombre}</div>
            )}
          </>
        ) : (
          <div className="text-amber-300">Este horario está bloqueado por el negocio.</div>
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
              setModalEliminar({ visible: true, turno: detalles, motivo: "", estado: "idle" });
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
        if (modalEliminar.estado === "loading") return; // no cerrar mientras carga
        setModalEliminar({ visible: false, turno: null, motivo: "", estado: "idle" });
      }}
    />
    <div className="bg-neutral-900 rounded-2xl p-6 w-full max-w-md relative z-10 shadow-xl border border-neutral-700">
      <h3 className="text-lg font-semibold mb-4">Eliminar turno</h3>

      <p className="text-sm mb-4">
        Estás por eliminar el turno de{" "}
        <b>{modalEliminar.turno.clienteNombre || "Cliente"}</b> a las{" "}
        <b>{modalEliminar.turno.hora}</b> el{" "}
        <b>{modalEliminar.turno.fecha}</b>.
      </p>

      {/* Chips de motivos rápidos */}
      <div className="mb-3">
        <div className="text-sm text-gray-300 mb-2">Elige un motivo rápido:</div>
        <div className="flex flex-wrap gap-2">
          {MOTIVOS_PREDETERMINADOS.map((m) => {
            const activo = (modalEliminar.motivo || "").trim() === m;
            return (
              <button
                key={m}
                type="button"
                disabled={modalEliminar.estado === "loading"}
                onClick={() => setModalEliminar((s) => ({ ...s, motivo: m }))}
                className={`px-3 py-1.5 rounded-full text-xs border transition
                  ${
                    activo
                      ? "bg-indigo-600 text-white border-indigo-500"
                      : "bg-neutral-800 text-gray-200 border-neutral-700 hover:bg-neutral-700"
                  } ${modalEliminar.estado === "loading" ? "opacity-60 cursor-not-allowed" : ""}`}
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
          onClick={() => setModalEliminar({ visible: false, turno: null, motivo: "", estado: "idle" })}
          disabled={modalEliminar.estado === "loading"}
          className={`px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 ${
            modalEliminar.estado === "loading" ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          Cancelar
        </button>

        {/* Botón rojo con loader y estados */}
        <button
          onClick={async () => {
            if (modalEliminar.estado === "loading") return;

            setModalEliminar((s) => ({ ...s, estado: "loading" }));

            const motivo = (modalEliminar.motivo || "").trim();
            const ok = await handleEliminarTurno(modalEliminar.turno!, motivo);

            if (ok) {
              setModalEliminar((s) => ({ ...s, estado: "success" }));
              setTimeout(() => {
                setModalEliminar({ visible: false, turno: null, motivo: "", estado: "idle" });
              }, 1200);
            } else {
              setModalEliminar((s) => ({ ...s, estado: "error" }));
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
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"></path>
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




      {/* Modal opciones de turno */}
{modalOpciones.visible && diaSel && (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-6">
    <div
      className="absolute inset-0 bg-black/60"
      onClick={() => setModalOpciones({ visible: false })}
    />
    <div className="bg-neutral-900 rounded-2xl p-6 w-full max-w-md relative z-10 shadow-xl border border-neutral-700">
      <h3 className="text-lg font-semibold mb-4">
        Turno {modalOpciones.hora} • {diaSel.toLocaleDateString("es-ES")}
      </h3>

      <div className="flex flex-col gap-3">
        {/* ➕ Agregar manualmente */}
        <button
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          onClick={() => {
            setManualOpen({ visible: true, hora: modalOpciones.hora || null, paso: 1 });
            setModalOpciones({ visible: false });
          }}
        >
          ➕ Agregar manualmente
        </button>

        {/* 🚫 No trabajar */}
        <button
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
          onClick={async () => {
            try {
              const inicio = combinarFechaHora(diaSel!, modalOpciones.hora!);
              const fin = new Date(inicio.getTime() + 30 * 60000);

              const refNeg = collection(db, "Negocios", negocio.id, "Turnos");
              await addDoc(refNeg, {
                negocioId: negocio.id,
                negocioNombre: negocio.nombre,
                empleadoId: empleadoSel?.id || null,
                empleadoNombre: empleadoSel?.nombre,
                fecha: inicio.toISOString().split("T")[0],
                hora: modalOpciones.hora,
                inicioTs: inicio,
                finTs: fin,
                bloqueado: true,   // 👈 marca que el negocio no trabaja
                creadoEn: new Date(),
                creadoPor: "negocio-manual",
              });

              setModalOpciones({ visible: false });
            } catch (e) {
              console.error("❌ Error bloqueando turno:", e);
            }
          }}
        >
          🚫 No trabajar este turno
        </button>
      </div>
    </div>
  </div>
)}

      {/* Modal asignación manual (verde) */}
      {manualOpen.visible && diaSel && (
        <div className="fixed inset-0 z-[10000]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setManualOpen({ visible: false, hora: null, paso: 1 })} />
          <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-6">
            <div className="w-full max-w-[680px] sm:rounded-2xl bg-neutral-900 border border-neutral-700 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
                <h4 className="text-base sm:text-lg font-semibold">Asignar turno manualmente</h4>
                <button onClick={() => setManualOpen({ visible: false, hora: null, paso: 1 })} className="text-gray-300 hover:text-white text-xl">×</button>
              </div>

              {/* Paso 1: confirmación */}
              {manualOpen.paso === 1 && (
                <div className="p-4 sm:p-6 space-y-4 text-sm">
                  <p>¿Desea agendar manualmente un turno a las <b>{manualOpen.hora}</b> para <b>{empleadoSel?.nombre}</b> el <b>{diaSel.toLocaleDateString("es-ES")}</b>?</p>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setManualOpen({ visible: false, hora: null, paso: 1 })} className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700">Cancelar</button>
                    <button onClick={() => setManualOpen((s) => ({ ...s, paso: 2 }))} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">Continuar</button>
                  </div>
                </div>
              )}

              {/* Paso 2: elegir servicio */}
              {manualOpen.paso === 2 && (
                <div className="p-4 sm:p-6 space-y-4 text-sm">
                  <div className="text-gray-300">Selecciona un servicio:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {servicios.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setManualOpen((st) => ({ ...st, servicio: s, paso: 3, error: null }))}
                        className={`p-3 rounded-lg border transition text-left ${manualOpen.servicio?.id === s.id ? "border-indigo-500 bg-neutral-800" : "border-neutral-700 hover:bg-neutral-800"}`}
                      >
                        <div className="font-medium">{s.servicio}</div>
                        <div className="text-gray-400 text-xs">{s.duracion} min • ${s.precio}</div>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between">
                    <button onClick={() => setManualOpen((s) => ({ ...s, paso: 1 }))} className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700">← Volver</button>
                    <button
                      onClick={() => setManualOpen((s) => ({ ...s, paso: 3 }))}
                      disabled={!manualOpen.servicio}
                      className={`px-3 py-2 rounded-lg ${manualOpen.servicio ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-gray-700 text-gray-300 cursor-not-allowed"}`}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}

              {/* Paso 3: datos del cliente + guardar */}
              {manualOpen.paso === 3 && (
                <div className="p-4 sm:p-6 space-y-4 text-sm">
                  <div className="space-y-2">
                    <label className="block text-gray-300">Nombre del cliente *</label>
                    <input
                      className="w-full px-3 py-2 rounded-lg bg-neutral-800 outline-none"
                      placeholder="Ej. Juan Pérez"
                      value={manualOpen.nombre || ""}
                      onChange={(e) => setManualOpen((s) => ({ ...s, nombre: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-300">Email (opcional)</label>
                      <input
                        className="w-full px-3 py-2 rounded-lg bg-neutral-800 outline-none"
                        placeholder="cliente@correo.com"
                        value={manualOpen.email || ""}
                        onChange={(e) => setManualOpen((s) => ({ ...s, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300">Teléfono (opcional)</label>
                      <input
                        className="w-full px-3 py-2 rounded-lg bg-neutral-800 outline-none"
                        placeholder="+598 ..."
                        value={manualOpen.telefono || ""}
                        onChange={(e) => setManualOpen((s) => ({ ...s, telefono: e.target.value }))}
                      />
                    </div>
                  </div>

                  {manualOpen.error && (
                    <div className="text-red-300 bg-red-900/30 border border-red-700 px-3 py-2 rounded-lg">
                      {manualOpen.error}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button onClick={() => setManualOpen((s) => ({ ...s, paso: 2 }))} className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700">← Volver</button>
                    <button
                      onClick={async () => {
                        // Validaciones
                        if (!manualOpen.nombre?.trim()) {
                          setManualOpen((s) => ({ ...s, error: "El nombre del cliente es obligatorio." }));
                          return;
                        }
                        if (!manualOpen.servicio) {
                          setManualOpen((s) => ({ ...s, error: "Seleccione un servicio." }));
                          return;
                        }

                        try {
                          const hora = manualOpen.hora!;
                          const inicio = combinarFechaHora(diaSel!, hora);
                          const dur = parseDuracionMin(manualOpen.servicio.duracion);

                          if (!puedeAsignarEn(inicio, dur)) {
                            setManualOpen((s) => ({ ...s, error: "El servicio no entra en este horario o se solapa con otro turno." }));
                            return;
                          }

                          const fin = new Date(inicio.getTime() + dur * 60000);
                          const refNeg = collection(db, "Negocios", negocio.id, "Turnos");
                          await addDoc(refNeg, {
                            negocioId: negocio.id,
                            negocioNombre: negocio.nombre,
                            servicioId: manualOpen.servicio.id,
                            servicioNombre: manualOpen.servicio.servicio,
                            duracion: manualOpen.servicio.duracion,
                            empleadoId: empleadoSel?.id || null,
                            empleadoNombre: empleadoSel?.nombre,
                            fecha: inicio.toISOString().split("T")[0],
                            hora,
                            inicioTs: inicio,
                            finTs: fin,
                            clienteNombre: manualOpen.nombre.trim(),
                            clienteEmail: manualOpen.email || null,
                            clienteTelefono: manualOpen.telefono || null,
                            creadoEn: new Date(),
                            creadoPor: "negocio-manual",
                          });

                          setManualOpen({ visible: false, hora: null, paso: 1 });
                        } catch (e) {
                          setManualOpen((s) => ({ ...s, error: "No se pudo guardar el turno." }));
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
