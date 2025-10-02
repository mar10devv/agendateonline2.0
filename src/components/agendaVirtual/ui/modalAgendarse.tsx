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
  Firestore
} from "firebase/firestore";
import type { DocumentReference, DocumentData } from "firebase/firestore"; // ✅ Import solo de tipos

// al inicio de ModalAgendarse:
import Loader from "../../ui/loaderSpinner";

import { db } from "../../../lib/firebase";
import CalendarioUI from "../ui/calendarioUI";
import { getAuth, onAuthStateChanged } from "firebase/auth";

type Empleado = {
  nombre: string;
  fotoPerfil?: string;
  trabajos?: string[];
  calendario?: any;
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
    ubicacion?: {
      lat: number;
      lng: number;
      direccion: string;
    };
  };
};

// ✅ Tipo consistente para el bloqueo
type Bloqueo = {
  activo: boolean;
  inicio: Date | null;
  fin: Date | null;
  docPath?: string | null;
};

// ✅ Helper global para construir un DocumentReference desde un path
function docFromPath(path: string): DocumentReference<DocumentData> {
  const segments = path.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new Error("Path inválido en docFromPath: " + path);
  }
  // ✅ Se fuerza a Firestore + segments como [string,...]
  return doc(db as Firestore, ...segments as [string, ...string[]]);
}

// ✅ Tipo para los datos que guarda un turno en Usuarios/{uid}/Turnos
type TurnoData = {
  negocioId?: string;
  turnoIdNegocio?: string;
};

/* -------------------- HELPERS -------------------- */
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

/* -------------------- VERIFICACIÓN DE TURNO ACTIVO -------------------- */
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

  if (!abierto) return null;

  return (
  <ModalBase abierto={abierto} onClose={onClose} titulo="Agendar turno" maxWidth="max-w-lg">
    {cargandoCheck && (
      <div className="p-4 text-sm text-gray-300">Verificando turnos disponibles...</div>
    )}

    {/* 🔹 Si el usuario YA tiene turno reservado */}
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
                  const data = snap.exists() ? (snap.data() as TurnoData) : null;

                  // ❌ Eliminar el turno en Usuarios/{uid}/Turnos
                  await deleteDoc(refUser);

                  // ❌ Eliminar también el turno en Negocios/{negocioId}/Turnos
                  if (data?.negocioId && data?.turnoIdNegocio) {
                    const refNeg = doc(db, "Negocios", data.negocioId, "Turnos", data.turnoIdNegocio);
                    await deleteDoc(refNeg);
                  }

                  // ✅ Resetear estados
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

    {/* 🔹 Si NO tiene turno reservado → mostrar flujo normal */}
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
            onConfirm={() => setPaso(5)}
            onBack={() => setPaso(3)}
          />
        )}

        {paso === 5 && <PasoFinal negocio={negocio} onClose={onClose} />}
      </>
    )}
  </ModalBase>
);

}


/* ============================================================
   SUBCOMPONENTES
   ============================================================ */

// 🔹 Paso 1 – Servicios
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
        const lista = snap.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Servicio)
        );
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

// 🔹 Paso 2 – Empleados
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
    if (!e.calendario?.diasLibres || e.calendario.diasLibres.length === 0) {
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

      {error && (
        <p className="text-red-400 text-sm bg-red-900/30 p-2 rounded-lg">
          {error}
        </p>
      )}

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
        <p className="text-gray-400 text-sm">
          No hay empleados disponibles para este servicio.
        </p>
      )}

      <button onClick={onBack} className="text-sm text-gray-400">
        ← Volver
      </button>
    </div>
  );
}

// 🔹 Paso 3 – Turnos
function PasoTurnos({
  negocio,
  empleado,
  servicio,
  onSelect,
  onBack,
}: {
  negocio: { id: string };
  empleado: any;
  servicio: any;
  onSelect: (t: { hora: string; fecha: Date }) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <p className="mb-4 text-center">
        Selecciona un turno para <b>{empleado?.nombre}</b>
      </p>

      <div className="flex justify-center mb-6">
        <CalendarioUI
          empleado={empleado}
          servicio={servicio}
          negocioId={negocio.id}
          onSelectTurno={(t) => {
            onSelect(t);
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

// 🔹 Paso 4 – Confirmación
function PasoConfirmacion({
  servicio,
  empleado,
  turno,
  negocio,
  usuario,
  onConfirm,
  onBack,
}: any) {
  const [cargando, setCargando] = useState(false);

  const guardarTurno = async () => {
  try {
    setCargando(true);

    const auth = getAuth();
    const u = auth.currentUser;
    let uInfo = {
      uid: u?.uid ?? usuario?.uid ?? null,
      email: u?.email ?? usuario?.email ?? null,
      nombre: u?.displayName ?? null,
    };

    // 🔎 Buscar datos extra en Firestore si faltan
    if (uInfo.uid) {
      const userDoc = await getDoc(doc(db, "Usuarios", uInfo.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (!uInfo.email && data.email) uInfo.email = data.email;
        if (!uInfo.nombre && data.nombre) uInfo.nombre = data.nombre;
      }
    }

    // Calculamos inicio/fin
    const fechaStr = turno.fecha.toISOString().split("T")[0];
    const inicio = combinarFechaHora(turno.fecha, turno.hora);
    const fin = new Date(inicio.getTime() + (servicio.duracion || 30) * 60000);

    // 1️⃣ Generar un ID único
    const refNeg = doc(collection(db, "Negocios", negocio.id, "Turnos"));
    const turnoId = refNeg.id;

    const dataFinal = {
      negocioId: negocio.id,
      negocioNombre: negocio.nombre,
      servicioId: servicio.id,
      servicioNombre: servicio.servicio,
      duracion: servicio.duracion,
      empleadoId: empleado.id || null,
      empleadoNombre: empleado.nombre,
      fecha: fechaStr,
      hora: turno.hora,
      inicioTs: inicio,
      finTs: fin,

      clienteUid: uInfo.uid,
      clienteEmail: uInfo.email,
      clienteNombre: uInfo.nombre,
      creadoEn: new Date(),
      emailConfirmacionEnviado: false,
      email24Enviado: false,
      email1hEnviado: false,
    };

    // 2️⃣ Guardar en negocio
    await setDoc(refNeg, dataFinal);

    // 3️⃣ Guardar en usuario con el mismo ID
    if (uInfo.uid) {
      await setDoc(doc(db, "Usuarios", uInfo.uid, "Turnos", turnoId), dataFinal);
    }

    // 4️⃣ Enviar confirmación
    await fetch("/.netlify/functions/confirmar-turno", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docPath: refNeg.path }),
    });

    onConfirm();
  } catch (err) {
    console.error("❌ Error guardando turno:", err);
    alert("Hubo un error al guardar el turno. Intenta de nuevo.");
  } finally {
    setCargando(false);
  }
};

  return (
    <div>
      {cargando ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader /> {/* 👈 tu componente ya importado */}
          <p className="mt-4 text-sm text-gray-300">Guardando tu turno...</p>
        </div>
      ) : (
        <>
          <p>Confirma tu turno:</p>
          <ul className="mb-4 text-sm">
            <li>Servicio: {servicio?.servicio}</li>
            <li>Empleado: {empleado?.nombre}</li>
            <li>
              Día: {turno?.fecha?.toLocaleDateString("es-ES")} – {turno?.hora}
            </li>
          </ul>
          <div className="flex justify-end gap-4">
            <button
              onClick={onBack}
              className="px-4 py-2 rounded bg-gray-700 text-white"
            >
              Volver
            </button>
            <button
              onClick={guardarTurno}
              className="px-4 py-2 rounded bg-green-600 text-white"
            >
              Confirmar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// 🔹 Paso 5 – Final
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
