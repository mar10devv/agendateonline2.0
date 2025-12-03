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
import CalendarioBase from "../calendario/calendario-diseño"; // ✅ usamos el calendario nuevo
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
  duracion: number; // minutos
};

type Props = {
  abierto: boolean;
  onClose: () => void;
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
      // usados en calendario
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
      return (h || 0) * 60 + (m || 0);
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
        negSnaps.push(
          await getDocs(query(refNeg, where("clienteEmail", "==", u.email)))
        );
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

/* 🔹 helper: ¿el empleado tiene descanso configurado? (días libres o día y medio) */
const empleadoTieneDescansoConfigurado = (e: Empleado): boolean => {
  if (!e || !e.calendario) return false;

  const cal: any = e.calendario || {};
  const diasLibres = cal.diasLibres;
  const diaYMedio = cal.diaYMedio;

  const tieneListaDias =
    Array.isArray(diasLibres) && diasLibres.length > 0;

  const tieneDiaYMedio =
    !!diaYMedio &&
    typeof diaYMedio.diaCompleto === "string" &&
    diaYMedio.diaCompleto.trim() !== "" &&
    typeof diaYMedio.medioDia === "string" &&
    diaYMedio.medioDia.trim() !== "";

  return tieneListaDias || tieneDiaYMedio;
};

export default function ModalAgendarse({ abierto, onClose, negocio }: Props) {
  const [paso, setPaso] = useState(1);
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [turno, setTurno] = useState<any>(null);

  const [usuario, setUsuario] = useState<{ uid?: string | null; email?: string | null } | null>(
    null
  );
  const [cargandoCheck, setCargandoCheck] = useState(false);
  const [bloqueo, setBloqueo] = useState<Bloqueo>({ activo: false, inicio: null, fin: null });

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

  return (
    <ModalBase abierto={abierto} onClose={onClose} titulo="Agendar turno" maxWidth="max-w-lg">
      <div
        className="relative flex flex-col h-[450px] overflow-y-auto px-4 pb-6 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {cargandoCheck && (
          <div className="p-4 text-sm text-gray-300">Verificando turnos disponibles...</div>
        )}

        {!cargandoCheck && bloqueo.activo && (
          <div className="p-4 space-y-3">
            <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3">
              <div className="text-amber-300 font-semibold">Ya tienes un turno reservado</div>
              <div className="text-amber-200 text-sm">
                Día:{" "}
                <b>
                  {bloqueo.inicio?.toLocaleDateString("es-ES", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </b>{" "}
                a las{" "}
                <b>
                  {bloqueo.inicio?.toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </b>
                . No faltes <b>{negocio?.nombre ?? "a tu turno"}</b>.
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md bg-white text-black hover:bg-gray-200 text-sm"
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
                      alert("Tu turno fue cancelado y el horario quedó libre.");
                    } catch (err) {
                      console.error("Error cancelando turno:", err);
                      alert("Hubo un error al cancelar el turno.");
                    }
                  }}
                  className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 text-sm"
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
                onSaved={() => {
                  setPaso(5);
                }}
              />
            )}

            {paso === 5 && <PasoFinal negocio={negocio} onClose={onClose} />}
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

  if (cargando) return <p>Cargando servicios...</p>;

  return (
    <div className="grid gap-4">
      {servicios.length > 0 ? (
        servicios.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="w-full p-4 bg-neutral-800 rounded-xl hover:bg-neutral-700 transition text-left"
          >
            <p className="text-lg font-medium">{s.servicio}</p>
            <p className="text-sm text-gray-400">
              ${s.precio} · {s.duracion} min
            </p>
          </button>
        ))
      ) : (
        <p className="text-gray-400 text-sm">No hay servicios configurados.</p>
      )}
    </div>
  );
}

function PasoEmpleados({
  servicio,
  negocio,
  onSelect,
  onBack,
}: {
  servicio: Servicio;
  negocio: { empleadosData?: Empleado[] };
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
        emp.trabajos.some(
          (t: string) => String(t).trim() === String(servicio.id).trim()
        )
    );

    setFiltrados(disponibles);
  }, [servicio, negocio]);

  const validarEmpleado = (e: Empleado) => {
    if (!empleadoTieneDescansoConfigurado(e)) {
      setError(`⚠️ ${e.nombre} no tiene sus días libres configurados.`);
      return;
    }

    const tieneHorario = e.calendario?.inicio && e.calendario?.fin;
    if (!tieneHorario) {
      setError(`⚠️ ${e.nombre} no tiene horario cargado.`);
      return;
    }

    setError(null);
    onSelect(e);
  };

  return (
    <div className="space-y-4">
      <p className="mb-2">
        Servicio <b>{servicio.servicio}</b>
        <br />
        Selecciona un empleado
      </p>

      {error && <p className="text-red-400 text-sm bg-red-900/30 p-2 rounded-lg">{error}</p>}

      {filtrados.length > 0 ? (
        filtrados.map((e, idx) => (
          <button
            key={idx}
            onClick={() => validarEmpleado(e)}
            className="w-full flex items-center gap-4 p-3 rounded-xl transition bg-neutral-800 hover:bg-neutral-700"
          >
            {e.fotoPerfil || (e as any).foto ? (
              <img
                src={e.fotoPerfil || (e as any).foto}
                alt={e.nombre}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                {e.nombre?.charAt(0) || "?"}
              </div>
            )}
            <div className="text-left">
              <p className="font-medium">{e.nombre}</p>
            </div>
          </button>
        ))
      ) : (
        <p className="text-gray-400 text-sm">No hay empleados disponibles para este servicio.</p>
      )}

      <button onClick={onBack} className="text-sm text-gray-400">
        ← Volver
      </button>
    </div>
  );
}

/* ---------- PasoTurnos: usa CalendarioBase (calendario-backend) ---------- */
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
  const minutosPorSlot =
    negocio.configuracionAgenda?.horasSeparacion ?? 30;

  return (
    <div>
      <p className="mb-4 text-center">
        Selecciona un turno para <b>{empleado?.nombre}</b>
      </p>

      <div className="flex justify-center mb-6">
        <CalendarioBase
          modo="cliente"
          usuarioActual={{} as any}        // en modo cliente no usamos permisos
          negocio={negocio as any}
          empleado={empleado as any}
          empleados={(negocio.empleadosData || []) as any}
          minutosPorSlot={minutosPorSlot}
          onSlotLibreClick={(slot: any) => {
            onSelect({
              fecha: slot.fecha,
              hora: slot.hora,
            });
          }}
        />
      </div>

      <div className="text-center">
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-gray-200 transition"
        >
          ← Volver
        </button>
      </div>
    </div>
  );
}

/* ---------- PasoConfirmacion con seña + guardado ---------- */
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

  // ---------- CREAR TURNO EN FIRESTORE + EMAIL ---------- //
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

      alert("✅ Turno guardado y email enviado correctamente.");
      onSaved?.();
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
        <p className="mt-4 text-yellow-300 font-medium">
          💳 Esperando confirmación del pago...
        </p>
        <p className="text-xs text-gray-400 mt-2 max-w-xs">
          Puedes cerrar esta ventana. Tu turno será confirmado automáticamente
          cuando Mercado Pago apruebe tu seña.
        </p>

        <button
          onClick={() => setEsperandoPago(false)}
          className="mt-4 px-4 py-2 bg-neutral-700 rounded-lg text-sm text-white hover:bg-neutral-600 transition"
        >
          Volver a intentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <p>Confirma tu turno:</p>
      <ul className="mb-4 text-sm">
        <li>Servicio: {servicio?.servicio}</li>
        <li>Empleado: {empleado?.nombre}</li>
        <li>
          Día:{" "}
          {turno?.fecha?.toLocaleDateString?.("es-ES") ||
            new Date(turno.fecha).toLocaleDateString("es-ES")}{" "}
          – {turno?.hora}
        </li>

        {requiereSenia && (
          <li className="text-amber-400">
            💰 Se requiere una seña del {porcentajeSenia}% (${montoSenia})
          </li>
        )}
      </ul>

      <div className="flex justify-end gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded bg-gray-700 text-white"
          disabled={pagando || guardandoTurno}
        >
          Volver
        </button>

        {requiereSenia ? (
          <button
            onClick={pagarSenia}
            className="px-4 py-2 rounded bg-blue-600 text-white"
            disabled={pagando || guardandoTurno}
          >
            {pagando ? "Procesando..." : "Pagar seña"}
          </button>
        ) : (
          <button
            onClick={guardarTurno}
            className="px-4 py-2 rounded bg-green-600 text-white"
            disabled={guardandoTurno}
          >
            {guardandoTurno ? "Guardando..." : "Confirmar turno"}
          </button>
        )}
      </div>
    </div>
  );
}

function PasoFinal({ negocio, onClose }: any) {
  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold mb-4">
        ✅ Turno agendado con éxito
      </h2>
      <p className="mb-4">Te esperamos en {negocio.nombre}</p>
      <button
        className="mt-6 w-full py-2 bg-purple-600 rounded-xl"
        onClick={onClose}
      >
        Cerrar
      </button>
    </div>
  );
}
