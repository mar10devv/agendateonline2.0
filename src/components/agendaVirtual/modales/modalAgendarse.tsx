// src/components/agendaVirtual/ui/modalAgendarse.tsx
import { useState, useEffect } from "react";
import ModalBase from "../../ui/modalGenerico";
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
  query,
  where,
  doc,
  getDoc,
  deleteDoc,
  setDoc,
  Firestore,
} from "firebase/firestore";
import type { DocumentReference, DocumentData } from "firebase/firestore";

import Loader from "../../ui/loaderSpinner";

import { db } from "../../../lib/firebase";
import CalendarioBase from "../calendario/calendario-diseño";
import { getAuth, onAuthStateChanged } from "firebase/auth";

type Empleado = {
  nombre: string;
  fotoPerfil?: string;
  trabajos?: string[];
  calendario?: any;
  id?: string;
};

type Servicio = {
  id: string;
  servicio: string;
  precio: number;
  duracion: number;
};

type Props = {
  abierto: boolean;
  onClose: () => void;
  onSuccess?: (turnoConfirmado?: boolean) => void; // ✅ Callback con parámetro opcional
  negocio: {
    id: string;
    nombre: string;
    empleadosData?: Empleado[];
    configuracionAgenda?: {
      modoPago?: "libre" | "senia";
      porcentajeSenia?: number;
      mercadoPago?: {
        conectado?: boolean;
        accessToken?: string;
      };
      diasLibres?: string[];
      modoTurnos?: "jornada" | "personalizado";
      clientesPorDia?: number | null;
      horaInicio?: string;
      horaFin?: string;
      horasSeparacion?: number | null;
    };
    ubicacion?: {
      lat: number;
      lng: number;
      direccion: string;
    };
    esEmprendimiento?: boolean;
  };
};

type Bloqueo = {
  activo: boolean;
  inicio: Date | null;
  fin: Date | null;
  docPath?: string | null;
};

function docFromPath(path: string): DocumentReference<DocumentData> {
  const segments = path.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new Error("Path inválido en docFromPath: " + path);
  }
  return doc(db as Firestore, ...(segments as [string, ...string[]]));
}

type TurnoData = {
  negocioId?: string;
  turnoIdNegocio?: string;
};

function toDateSafe(f: any): Date {
  if (!f) return new Date(NaN);
  if (f instanceof Date) return f;
  if (f instanceof Timestamp) return f.toDate();
  if (typeof f?.toDate === "function") return f.toDate();
  if (typeof f === "string") return new Date(f);
  return new Date(f);
}

function parseDuracionMin(d: any): number {
  if (typeof d === "number") return d;
  if (typeof d === "string") {
    if (d.includes(":")) {
      const [h, m] = d.split(":").map(Number);
      return (h || 0) * 60 + (m || 0) * 1;
    }
    const n = Number(d);
    if (!Number.isNaN(n)) return n;
  }
  return 30;
}

function combinarFechaHora(fecha: Date, hhmm: string): Date {
  const [h, m] = String(hhmm ?? "00:00").split(":").map((n) => Number(n || 0));
  const d = new Date(fecha);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function calcularInicioFinDesdeDoc(t: any): { inicio: Date; fin: Date } | null {
  const inicioTs = t.inicioTs ? toDateSafe(t.inicioTs) : null;
  const finTs = t.finTs ? toDateSafe(t.finTs) : null;
  if (inicioTs && finTs && !isNaN(+inicioTs) && !isNaN(+finTs)) {
    return { inicio: inicioTs, fin: finTs };
  }
  const f = toDateSafe(t.fecha);
  if (isNaN(+f)) return null;
  const inicio = combinarFechaHora(f, t.hora || "00:00");
  const dur = parseDuracionMin(t.duracion);
  const fin = new Date(inicio.getTime() + dur * 60000);
  return { inicio, fin };
}

async function verificarTurnoActivoPorUsuarioYNegocio(
  negocioId: string,
  u: { uid?: string | null; email?: string | null } | null
): Promise<Bloqueo> {
  if (!u?.uid || !negocioId) return { activo: false, inicio: null, fin: null };

  const ahora = new Date();
  let inicioSel: Date | null = null;
  let finSel: Date | null = null;
  let docPathSel: string | null = null;

  const pick = (inicio: Date, fin: Date, docPath: string) => {
    if (fin <= ahora) return;
    if (!inicioSel || inicio < inicioSel) {
      inicioSel = inicio;
      finSel = fin;
      docPathSel = docPath;
    }
  };

  try {
    const refUser = collection(db, "Usuarios", u.uid, "Turnos");
    let snaps: any[] = [];
    try {
      const q1 = query(
        refUser,
        where("negocioId", "==", negocioId),
        where("finTs", ">", ahora)
      );
      snaps.push(await getDocs(q1));
    } catch {
      const q2 = query(refUser, where("finTs", ">", ahora));
      snaps.push(await getDocs(q2));
    }

    for (const s of snaps) {
      s.forEach((doc: any) => {
        const t = doc.data();
        const par = calcularInicioFinDesdeDoc(t);
        if (!par) return;
        if (t.negocioId && t.negocioId !== negocioId) return;
        pick(par.inicio, par.fin, doc.ref.path);
      });
    }
    if (inicioSel && finSel) {
      return { activo: true, inicio: inicioSel, fin: finSel, docPath: docPathSel };
    }

    const allSnap = await getDocs(refUser);
    allSnap.forEach((doc) => {
      const t = doc.data();
      if (t.negocioId && t.negocioId !== negocioId) return;
      const par = calcularInicioFinDesdeDoc(t);
      if (!par) return;
      pick(par.inicio, par.fin, doc.ref.path);
    });
    if (inicioSel && finSel) {
      return { activo: true, inicio: inicioSel, fin: finSel, docPath: docPathSel };
    }
  } catch {}

  try {
    const refNeg = collection(db, "Negocios", negocioId, "Turnos");
    let negSnaps: any[] = [];
    try {
      if (u.uid)
        negSnaps.push(
          await getDocs(
            query(refNeg, where("clienteUid", "==", u.uid), where("finTs", ">", ahora))
          )
        );
    } catch {
      if (u.uid) negSnaps.push(await getDocs(query(refNeg, where("clienteUid", "==", u.uid))));
    }
    try {
      if (u.email)
        negSnaps.push(
          await getDocs(
            query(refNeg, where("clienteEmail", "==", u.email), where("finTs", ">", ahora))
          )
        );
    } catch {
      if (u.email)
        negSnaps.push(await getDocs(query(refNeg, where("clienteEmail", "==", u.email))));
    }

    for (const s of negSnaps) {
      s.forEach((doc: any) => {
        const t = doc.data();
        const par = calcularInicioFinDesdeDoc(t);
        if (!par) return;
        pick(par.inicio, par.fin, doc.ref.path);
      });
    }
    if (inicioSel && finSel) {
      return { activo: true, inicio: inicioSel, fin: finSel, docPath: docPathSel };
    }
  } catch {}

  return { activo: false, inicio: null, fin: null, docPath: null };
}

const empleadoTieneDescansoConfigurado = (e: Empleado): boolean => {
  if (!e || !e.calendario) return false;

  const cal: any = e.calendario || {};
  const diasLibres = cal.diasLibres;
  const diaYMedio = cal.diaYMedio;

  const tieneListaDias = Array.isArray(diasLibres) && diasLibres.length > 0;

  const tieneDiaYMedio =
    !!diaYMedio &&
    typeof diaYMedio.diaCompleto === "string" &&
    diaYMedio.diaCompleto.trim() !== "" &&
    typeof diaYMedio.medioDia === "string" &&
    diaYMedio.medioDia.trim() !== "";

  return tieneListaDias || tieneDiaYMedio;
};

function getAvatarUrl(e: Empleado): string | null {
  if (typeof e.fotoPerfil === "string" && e.fotoPerfil.trim() !== "") {
    return e.fotoPerfil.trim();
  }

  const f: any = (e as any).foto;
  if (!f) return null;

  if (typeof f === "string" && f.trim() !== "") {
    return f.trim();
  }

  if (typeof f === "object") {
    if (typeof f.url === "string" && f.url.trim() !== "") {
      return f.url.trim();
    }
    if (typeof f.secure_url === "string" && f.secure_url.trim() !== "") {
      return f.secure_url.trim();
    }
  }

  return null;
}

export default function ModalAgendarse({ abierto, onClose, onSuccess, negocio }: Props) {
  const [paso, setPaso] = useState(1);
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [turno, setTurno] = useState<any>(null);

  const [usuario, setUsuario] = useState<{ uid?: string | null; email?: string | null } | null>(
    null
  );
  const [cargandoCheck, setCargandoCheck] = useState(false);
  const [bloqueo, setBloqueo] = useState<Bloqueo>({ activo: false, inicio: null, fin: null });

  const [resumenTurno, setResumenTurno] = useState<{ fecha: string; hora: string } | null>(null);

  const siguiente = () => setPaso((p) => p + 1);
  const volver = () => setPaso((p) => p - 1);

  useEffect(() => {
    if (!abierto || !negocio?.id) return;
    setCargandoCheck(true);
    const auth = getAuth();
    const off = onAuthStateChanged(auth, async (u) => {
      const info = u ? { uid: u.uid, email: u.email } : null;
      setUsuario(info);
      if (!u) {
        setBloqueo({ activo: false, inicio: null, fin: null });
        setCargandoCheck(false);
        return;
      }
      try {
        const r = await verificarTurnoActivoPorUsuarioYNegocio(negocio.id, info);
        setBloqueo(r);
      } catch {
        setBloqueo({ activo: false, inicio: null, fin: null });
      } finally {
        setCargandoCheck(false);
      }
    });
    return () => off();
  }, [abierto, negocio?.id]);

  const requiereSenia =
    negocio?.configuracionAgenda?.modoPago === "senia" &&
    negocio?.configuracionAgenda?.mercadoPago?.conectado;

  const porcentajeSenia = negocio?.configuracionAgenda?.porcentajeSenia || 0;

  if (!abierto) return null;

  // 🔹 Títulos dinámicos según el paso
  const getTitulo = () => {
    switch (paso) {
      case 1:
        return "Elige un servicio";
      case 2:
        return "Elige un profesional";
      case 3:
        return "Selecciona horario";
      case 4:
        return "Confirma tu turno";
      case 5:
        return "¡Turno confirmado!";
      default:
        return "Agendar turno";
    }
  };

  return (
    <ModalBase abierto={abierto} onClose={onClose} titulo={getTitulo()} maxWidth="max-w-lg">
      {/* Indicador de pasos */}
      {!cargandoCheck && !bloqueo.activo && paso < 5 && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3, 4].map((p) => (
              <div
                key={p}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  p === paso
                    ? "w-8 bg-white"
                    : p < paso
                    ? "w-4 bg-white/60"
                    : "w-4 bg-white/20"
                }`}
              />
            ))}
          </div>
          {/* Línea separadora */}
          <div className="flex justify-center">
            <div className="w-2/3 h-px bg-white/20" />
          </div>
        </div>
      )}

      {/* Línea separadora para paso 5 */}
      {!cargandoCheck && !bloqueo.activo && paso === 5 && (
        <div className="px-4 pb-4">
          <div className="flex justify-center">
            <div className="w-2/3 h-px bg-white/20" />
          </div>
        </div>
      )}

      <div
        className="relative flex flex-col min-h-[200px] max-h-[70vh] overflow-y-auto px-4 pb-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {cargandoCheck && (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader />
            <p className="mt-4 text-white/70 text-sm">Verificando disponibilidad...</p>
          </div>
        )}

        {!cargandoCheck && bloqueo.activo && (
          <div className="p-4 space-y-4">
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 backdrop-blur-sm p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-amber-300 font-semibold">Ya tienes un turno</div>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">
                Tu turno está agendado para el{" "}
                <span className="font-semibold text-white">
                  {bloqueo.inicio?.toLocaleDateString("es-ES", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </span>{" "}
                a las{" "}
                <span className="font-semibold text-white">
                  {bloqueo.inicio?.toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
              >
                Entendido
              </button>

              {bloqueo.docPath && (
                <button
                  onClick={async () => {
                    if (!confirm("¿Seguro que deseas cancelar este turno?")) return;
                    try {
                      const refUser = docFromPath(bloqueo.docPath!);
                      const snap = await getDoc(refUser);
                      if (!snap.exists()) throw new Error("Turno no encontrado en usuario");
                      const data = snap.data() as TurnoData & { negocioId: string };
                      await deleteDoc(refUser);
                      if (data.negocioId) {
                        const turnoId = refUser.id;
                        const refNeg = doc(db, "Negocios", data.negocioId, "Turnos", turnoId);
                        await deleteDoc(refNeg);
                      }
                      setBloqueo({ activo: false, inicio: null, fin: null, docPath: null });
                      setPaso(1);
                      setServicio(null);
                      setEmpleado(null);
                      setTurno(null);
                      
                      // ✅ Avisar al padre que se canceló el turno
                      onSuccess?.(false);
                    } catch (err) {
                      console.error("Error cancelando turno:", err);
                      alert("Hubo un error al cancelar el turno.");
                    }
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium transition-all border border-red-500/30"
                >
                  Cancelar turno
                </button>
              )}
            </div>
          </div>
        )}

        {!cargandoCheck && !bloqueo.activo && (
          <>
            {paso === 1 && (
              <PasoServicios
                negocio={negocio}
                onSelect={(s) => {
                  setServicio(s);
                  setPaso(2);
                }}
              />
            )}

            {paso === 2 && servicio && (
              <PasoEmpleados
                servicio={servicio}
                negocio={negocio}
                esEmprendimiento={negocio.esEmprendimiento === true}
                onSelect={(e) => {
                  setEmpleado(e);
                  setPaso(3);
                }}
                onBack={() => setPaso(1)}
              />
            )}

            {paso === 3 && empleado && servicio && (
              <PasoTurnos
                negocio={negocio}
                empleado={empleado}
                servicio={servicio}
                onSelect={(t) => {
                  setTurno(t);
                  setPaso(4);
                }}
                onBack={() => setPaso(2)}
              />
            )}

            {paso === 4 && turno && servicio && empleado && (
              <PasoConfirmacion
                servicio={servicio}
                empleado={empleado}
                turno={turno}
                negocio={negocio}
                usuario={usuario}
                requiereSenia={requiereSenia}
                porcentajeSenia={porcentajeSenia}
                onBack={() => setPaso(3)}
                onSaved={(data: { fecha: string; hora: string }) => {
                  setResumenTurno(data);
                  setPaso(5);
                }}
              />
            )}

            {paso === 5 && (
              <PasoFinal 
                negocio={negocio} 
                resumen={resumenTurno} 
                onClose={() => {
                  onSuccess?.(true); // ✅ Avisar que se confirmó un turno
                  onClose();
                }} 
              />
            )}
          </>
        )}
      </div>
    </ModalBase>
  );
}

/* ===========================================================
   SUBCOMPONENTES
   =========================================================== */

function PasoServicios({
  negocio,
  onSelect,
}: {
  negocio: any;
  onSelect: (s: Servicio) => void;
}) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarServicios() {
      try {
        const ref = collection(db, "Negocios", negocio.id, "Precios");
        const snap = await getDocs(ref);
        const lista = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Servicio));
        setServicios(lista);
      } catch (err) {
        console.error("Error cargando servicios:", err);
      } finally {
        setCargando(false);
      }
    }
    cargarServicios();
  }, [negocio.id]);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader />
        <p className="mt-4 text-white/70 text-sm">Cargando servicios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      {servicios.length > 0 ? (
        servicios.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="group w-full p-4 rounded-2xl transition-all duration-200 text-left
                       bg-white/10 hover:bg-white/20 
                       border border-white/10 hover:border-white/30
                       hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-white group-hover:text-white">
                  {s.servicio}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-white/90 font-medium">${s.precio}</span>
                  <span className="text-white/50">•</span>
                  <span className="text-white/60 text-sm flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {s.duracion} min
                  </span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-all">
                <svg className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        ))
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-white/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-white/60">No hay servicios disponibles</p>
        </div>
      )}
    </div>
  );
}

function PasoEmpleados({
  servicio,
  negocio,
  esEmprendimiento = false,
  onSelect,
  onBack,
}: {
  servicio: Servicio;
  negocio: { empleadosData?: Empleado[] };
  esEmprendimiento?: boolean;
  onSelect: (e: Empleado) => void;
  onBack: () => void;
}) {
  const [filtrados, setFiltrados] = useState<Empleado[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!servicio || !Array.isArray(negocio.empleadosData)) return;

    const disponibles = negocio.empleadosData.filter(
      (emp: Empleado) =>
        Array.isArray(emp.trabajos) &&
        emp.trabajos.some((t: string) => String(t).trim() === String(servicio.id).trim())
    );

    setFiltrados(disponibles);
  }, [servicio, negocio]);

  const validarEmpleado = (e: Empleado) => {
    if (!esEmprendimiento) {
      if (!empleadoTieneDescansoConfigurado(e)) {
        setError(`${e.nombre} no tiene sus días libres configurados.`);
        return;
      }

      const tieneHorario = e.calendario?.inicio && e.calendario?.fin;
      if (!tieneHorario) {
        setError(`${e.nombre} no tiene horario cargado.`);
        return;
      }
    }

    setError(null);
    onSelect(e);
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Servicio seleccionado */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-white/60 text-xs">Servicio seleccionado</p>
          <p className="text-white font-medium">{servicio.servicio}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
          <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {filtrados.length > 0 ? (
        <div className="space-y-3">
          {filtrados.map((e, idx) => {
            const avatarUrl = getAvatarUrl(e);

            return (
              <button
                key={idx}
                onClick={() => validarEmpleado(e)}
                className="group w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200
                           bg-white/10 hover:bg-white/20 
                           border border-white/10 hover:border-white/30
                           hover:scale-[1.02] active:scale-[0.98]"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={e.nombre}
                    className="w-14 h-14 rounded-full object-cover border-2 border-white/20 group-hover:border-white/40 transition-colors"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold border-2 border-white/20 group-hover:border-white/40 transition-colors">
                    {e.nombre?.charAt(0) || "?"}
                  </div>
                )}

                <div className="flex-1 text-left">
                  <p className="font-semibold text-white text-lg">{e.nombre}</p>
                  <p className="text-white/50 text-sm">Disponible</p>
                </div>

                <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-all">
                  <svg className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-white/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-white/60">No hay profesionales disponibles para este servicio</p>
        </div>
      )}

      <button
        onClick={onBack}
        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mt-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver
      </button>
    </div>
  );
}

function PasoTurnos({
  negocio,
  empleado,
  servicio,
  onSelect,
  onBack,
}: {
  negocio: { id: string; configuracionAgenda?: any; empleadosData?: Empleado[] };
  empleado: any;
  servicio: any;
  onSelect: (t: { hora: string; fecha: Date }) => void;
  onBack: () => void;
}) {
  const minutosPorSlot = negocio.configuracionAgenda?.horasSeparacion ?? 30;

  return (
    <div className="pt-2">
      {/* Info del profesional seleccionado */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 mb-4">
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-white/60 text-xs">Profesional</p>
          <p className="text-white font-medium">{empleado?.nombre}</p>
        </div>
      </div>

      <div className="flex justify-center mb-4">
        <CalendarioBase
          modo="cliente"
          usuarioActual={{} as any}
          negocio={negocio as any}
          empleado={empleado as any}
          empleados={(negocio.empleadosData || []) as any}
          minutosPorSlot={minutosPorSlot}
          duracionServicioMin={servicio.duracion}
          onSlotLibreClick={(slot: any) => {
            onSelect({
              fecha: slot.fecha,
              hora: slot.hora,
            });
          }}
        />
      </div>

      <button
        onClick={onBack}
        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver
      </button>
    </div>
  );
}

function PasoConfirmacion({
  servicio,
  empleado,
  turno,
  negocio,
  usuario,
  requiereSenia,
  porcentajeSenia,
  onBack,
  onSaved,
}: any) {
  const [pagando, setPagando] = useState(false);
  const [esperandoPago, setEsperandoPago] = useState(false);
  const [guardandoTurno, setGuardandoTurno] = useState(false);

  const montoSenia = Math.round((servicio.precio * porcentajeSenia) / 100);

  const fechaFormateada = turno?.fecha?.toLocaleDateString?.("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }) || new Date(turno.fecha).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const pagarSenia = async () => {
    try {
      setPagando(true);

      const res = await fetch("/.netlify/functions/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          negocioId: negocio.id,
          servicioId: servicio.id,
          servicio: servicio.servicio,
          descripcion: `${servicio.servicio} con ${empleado.nombre}`,
          precio: servicio.precio,
          emailCliente: usuario?.email,
          empleadoId: empleado.id,
          empleadoNombre: empleado.nombre,
          fecha: turno.fecha,
          hora: turno.hora,
          clienteUid: usuario?.uid,
          clienteNombre: usuario?.nombre,
        }),
      });

      const data = await res.json();
      if (data?.init_point) {
        window.open(data.init_point, "_blank");
        setEsperandoPago(true);
      } else {
        throw new Error(data?.error || "No se pudo iniciar el pago.");
      }
    } catch (err) {
      console.error("❌ Error iniciando pago:", err);
      alert("No se pudo iniciar el pago. Intenta nuevamente.");
    } finally {
      setPagando(false);
    }
  };

  const guardarTurno = async () => {
    if (!usuario?.uid) {
      alert("Debes iniciar sesión para reservar un turno.");
      return;
    }

    setGuardandoTurno(true);
    try {
      const inicioDate = combinarFechaHora(turno.fecha, turno.hora);
      const dur = parseDuracionMin(servicio.duracion);
      const finDate = new Date(inicioDate.getTime() + dur * 60000);
      const inicioTs = Timestamp.fromDate(inicioDate);
      const finTs = Timestamp.fromDate(finDate);

      const fechaTexto = inicioDate.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const horaTexto = inicioDate.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const slugNegocio = negocio.nombre
        ? negocio.nombre.toLowerCase().replace(/\s+/g, "-")
        : negocio.id;

      const docNegocioData: any = {
        servicioId: servicio.id,
        servicio: servicio.servicio,
        servicioNombre: servicio.servicio,

        empleadoId: empleado.id || null,
        empleadoNombre: empleado.nombre || null,

        inicioTs,
        finTs,
        fecha: fechaTexto,
        hora: horaTexto,

        precio: servicio.precio,
        duracion: servicio.duracion,

        clienteUid: usuario.uid || null,
        clienteEmail: usuario.email || null,
        clienteNombre: usuario?.displayName || usuario?.email || "",

        negocioId: negocio.id,
        negocioNombre: negocio.nombre || "",
        slugNegocio,

        estado: "confirmado",
        creadoEn: Timestamp.now(),

        emailConfirmacionEnviado: false,
        emailConfirmacionError: null,
      };

      const turnosRef = collection(db, "Negocios", negocio.id, "Turnos");
      const created = await addDoc(turnosRef, docNegocioData);
      const nuevoId = created.id;

      await setDoc(
        doc(db, "Usuarios", usuario.uid, "Turnos", nuevoId),
        {
          ...docNegocioData,
          turnoIdNegocio: nuevoId,
        },
        { merge: true }
      );

      await fetch("/.netlify/functions/confirmar-turno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docPath: `Negocios/${negocio.id}/Turnos/${nuevoId}`,
        }),
      });

      onSaved?.({ fecha: fechaTexto, hora: horaTexto });
    } catch (err) {
      console.error("❌ Error guardando turno:", err);
      alert("No se pudo guardar el turno. Intenta nuevamente.");
    } finally {
      setGuardandoTurno(false);
    }
  };

  if (esperandoPago) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Loader />
        <p className="mt-4 text-amber-300 font-medium">
          Esperando confirmación del pago...
        </p>
        <p className="text-white/50 text-sm mt-2 max-w-xs">
          Puedes cerrar esta ventana. Tu turno será confirmado automáticamente
          cuando se apruebe tu seña.
        </p>

        <button
          onClick={() => setEsperandoPago(false)}
          className="mt-6 px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all"
        >
          Volver a intentar
        </button>
      </div>
    );
  }

  return (
    <div className="pt-2 space-y-4">
      {/* Resumen del turno */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="p-4 space-y-3">
          {/* Servicio */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-white/50 text-xs">Servicio</p>
              <p className="text-white font-medium">{servicio?.servicio}</p>
            </div>
          </div>

          {/* Profesional */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-white/50 text-xs">Profesional</p>
              <p className="text-white font-medium">{empleado?.nombre}</p>
            </div>
          </div>

          {/* Fecha y hora */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-white/50 text-xs">Fecha y hora</p>
              <p className="text-white font-medium capitalize">{fechaFormateada} · {turno?.hora}</p>
            </div>
          </div>
        </div>

        {/* Precio */}
        <div className="border-t border-white/10 p-4 flex items-center justify-between">
          <span className="text-white/70">Total</span>
          <span className="text-2xl font-bold text-white">${servicio.precio}</span>
        </div>

        {requiereSenia && (
          <div className="border-t border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-center gap-2 text-amber-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Se requiere seña del {porcentajeSenia}%</span>
            </div>
            <p className="text-amber-200/70 text-sm mt-1">
              Debes pagar <span className="font-semibold">${montoSenia}</span> para confirmar tu turno
            </p>
          </div>
        )}
      </div>

      {/* Botones */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
          disabled={pagando || guardandoTurno}
        >
          Volver
        </button>

        {requiereSenia ? (
          <button
            onClick={pagarSenia}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold transition-all disabled:opacity-50"
            disabled={pagando || guardandoTurno}
          >
            {pagando ? "Procesando..." : `Pagar $${montoSenia}`}
          </button>
        ) : (
          <button
            onClick={guardarTurno}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white font-semibold transition-all disabled:opacity-50"
            disabled={guardandoTurno}
          >
            {guardandoTurno ? "Confirmando..." : "Confirmar turno"}
          </button>
        )}
      </div>
    </div>
  );
}

function PasoFinal({
  negocio,
  resumen,
  onClose,
}: {
  negocio: any;
  resumen: { fecha: string; hora: string } | null;
  onClose: () => void;
}) {
  const tieneUbicacion =
    negocio?.ubicacion && negocio.ubicacion.lat && negocio.ubicacion.lng;

  return (
    <div className="text-center py-4 space-y-5">
      {/* Icono de éxito */}
      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          ¡Turno confirmado!
        </h2>

        {resumen && (
          <p className="text-white/70">
            Te esperamos el{" "}
            <span className="font-semibold text-white">{resumen.fecha}</span>
            <br />
            a las <span className="font-semibold text-white">{resumen.hora}</span>
          </p>
        )}
      </div>

      <p className="text-white/50 text-sm max-w-xs mx-auto">
        Te enviamos un email de confirmación. Si no puedes asistir, recuerda cancelar con anticipación.
      </p>

      {/* ✅ Botón ARRIBA del mapa, bien visible */}
      <button
        className="w-full py-3 bg-white text-violet-600 font-semibold rounded-xl hover:bg-white/90 transition-all"
        onClick={onClose}
      >
        Entendido
      </button>

      {/* Mapa (opcional, abajo del botón) */}
      {tieneUbicacion && (
        <div className="w-full rounded-2xl overflow-hidden border border-white/10 mt-2">
          <div className="px-4 py-3 bg-white/5">
            <p className="text-white/50 text-xs mb-1">📍 Ubicación</p>
            <p className="text-white text-sm">{negocio.ubicacion.direccion}</p>
          </div>
          <iframe
            title="Mapa ubicación del negocio"
            src={`https://www.google.com/maps?q=${negocio.ubicacion.lat},${negocio.ubicacion.lng}&hl=es&z=16&output=embed`}
            className="w-full h-36"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
    </div>
  );
}