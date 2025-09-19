import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import Calendario from "../Calendario";

type CalendarioEmpleado = {
  inicio: string;
  fin: string;
  diasLibres: string[];
};

type Empleado = {
  nombre: string;
  fotoPerfil?: string;
  calendario?: CalendarioEmpleado | null;
};

type Turno = {
  id: string;
  fecha: string;
  hora: string;
  barbero: string;
  servicio: string;
  precio: number;
  cliente: string;
  email: string;
  uidCliente: string;
  estado: string;
  creadoEn: any;
};

type Props = {
  empleados: Empleado[];
  negocioId: string;
  slug?: string;
};

// 🔑 etiquetas dinámicas
const etiquetasPorPlantilla: Record<string, string> = {
  barberia: "Barbero",
  dentista: "Dentista",
  tatuajes: "Tatuador",
  peluqueria: "Estilista",
  spa: "Masajista",
};
function getEtiquetaEmpleado(plantilla?: string) {
  if (!plantilla) return "empleado";
  return etiquetasPorPlantilla[plantilla.toLowerCase()] || "empleado";
}

export default function AgendarTurnoLite({ empleados, negocioId, slug }: Props) {
  const [user, setUser] = useState<any>(null);
  const [plantilla, setPlantilla] = useState<string>(""); // 👈 traemos del negocio

  const [barberoSeleccionado, setBarberoSeleccionado] =
    useState<Empleado | null>(null);
  const [conAmigos, setConAmigos] = useState<"solo" | "amigos" | null>(null);
  const [cantidadAmigos, setCantidadAmigos] = useState<number>(1);

  const [serviciosDisponibles, setServiciosDisponibles] = useState<
    { servicio: string; precio: number }[]
  >([]);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<
    { servicio: string; precio: number } | null
  >(null);

  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<string | null>(
    null
  );
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);

  const [estado, setEstado] = useState<"inicial" | "exito" | "error">("inicial");

  // 🔹 Detectar usuario logueado
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // 🔹 Traer plantilla del negocio
  useEffect(() => {
    if (!negocioId) return;
    const negocioRef = doc(db, "Negocios", negocioId);
    getDoc(negocioRef).then((snap) => {
      if (snap.exists()) {
        setPlantilla(snap.data()?.plantilla?.toLowerCase() || "");
      }
    });
  }, [negocioId]);

  // 🔹 Escuchar servicios disponibles
  useEffect(() => {
    if (!negocioId) return;
    const preciosRef = collection(db, "Negocios", negocioId, "Precios");
    const unsub = onSnapshot(preciosRef, (snap) => {
      setServiciosDisponibles(
        snap.docs.map((d) => d.data() as { servicio: string; precio: number })
      );
    });
    return () => unsub();
  }, [negocioId]);

  // 🔹 Escuchar horarios ocupados del empleado
  useEffect(() => {
    if (!barberoSeleccionado || !fechaSeleccionada) return;
    const qTurnos = query(
      collection(db, "Negocios", negocioId, "Turnos"),
      where("barbero", "==", barberoSeleccionado.nombre),
      where("fecha", "==", fechaSeleccionada)
    );
    const unsub = onSnapshot(qTurnos, (snap) => {
      setHorariosOcupados(snap.docs.map((d) => d.data().hora as string));
    });
    return () => unsub();
  }, [barberoSeleccionado, fechaSeleccionada, negocioId]);

  // 🔹 Guardar turno
  const guardarTurno = async () => {
    if (
      !barberoSeleccionado ||
      !fechaSeleccionada ||
      !horarioSeleccionado ||
      !servicioSeleccionado
    ) {
      alert("Completa todos los campos.");
      return;
    }
    try {
      if (!user) {
        alert("Debes iniciar sesión.");
        return;
      }

      const turnoRef = await addDoc(
        collection(db, "Negocios", negocioId, "Turnos"),
        {
          barbero: barberoSeleccionado.nombre,
          servicio: servicioSeleccionado.servicio,
          precio: servicioSeleccionado.precio,
          fecha: fechaSeleccionada,
          hora: horarioSeleccionado,
          cliente: user.displayName || "Cliente",
          email: user.email || "",
          uidCliente: user.uid,
          estado: "pendiente",
          creadoEn: new Date(),
        }
      );

      await setDoc(doc(db, "Usuarios", user.uid, "Turnos", turnoRef.id), {
        negocioId,
        negocioNombre: slug || "Negocio",
        barbero: barberoSeleccionado.nombre,
        servicio: servicioSeleccionado.servicio,
        precio: servicioSeleccionado.precio,
        fecha: fechaSeleccionada,
        hora: horarioSeleccionado,
        estado: "pendiente",
        creadoEn: new Date(),
      });

      setEstado("exito");
    } catch (err) {
      console.error(err);
      setEstado("error");
    }
  };

  if (!user) {
    return (
      <div className="text-center py-10">
        <p className="text-lg">🔒 Debes iniciar sesión para reservar un turno.</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6 md:p-10 flex justify-center">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Cabecera */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
          <h1 className="text-xl md:text-2xl font-bold">
            AgendateOnline en {slug || "tu negocio"}
          </h1>
        </div>

        {/* Contenido */}
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4 text-center">Agendar Turno</h2>

          {estado === "exito" && (
            <p className="text-green-600 text-center mb-4">
              ✅ Turno reservado con éxito
            </p>
          )}
          {estado === "error" && (
            <p className="text-red-600 text-center mb-4">
              ❌ Error al reservar turno
            </p>
          )}

          {/* Paso 1: elegir empleado dinámico */}
          {!barberoSeleccionado && (
            <div>
              <h3 className="font-semibold mb-3">
                Selecciona un {getEtiquetaEmpleado(plantilla)}:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 px-4">
                {empleados.map((e, i) => (
                  <div
                    key={i}
                    onClick={() => setBarberoSeleccionado(e)}
                    className="relative w-full max-w-sm h-96 flex flex-col items-center rounded-2xl bg-white shadow-lg cursor-pointer hover:shadow-2xl transition mx-auto"
                  >
                    {/* Banner degradado negro */}
                    <div className="w-full h-48 bg-gradient-to-r from-gray-900 to-black rounded-t-2xl"></div>

                    {/* Avatar */}
                    <div className="absolute top-24 w-28 h-28 rounded-full border-4 border-white shadow-md bg-white flex items-center justify-center">
                      <img
                        src={e.fotoPerfil || "/img/default-avatar.png"}
                        alt={e.nombre}
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    </div>

                    {/* Nombre */}
                    <div className="mt-20 text-center">
                      <h4 className="font-semibold text-lg text-gray-800">
                        {e.nombre}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {getEtiquetaEmpleado(plantilla)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paso 2: solo o amigos */}
          {barberoSeleccionado && !conAmigos && (
            <div className="mt-6 flex flex-col items-center text-center">
              <p className="mb-3 text-lg font-medium">
                ¿Vienes solo o con amigos?
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => {
                    setConAmigos("solo");
                    setCantidadAmigos(1);
                  }}
                  className="px-6 py-3 rounded-lg bg-indigo-600 text-white w-48 sm:w-auto"
                >
                  Siguiente (Solo)
                </button>
                <button
                  onClick={() => setConAmigos("amigos")}
                  className="px-6 py-3 rounded-lg bg-gray-200 w-48 sm:w-auto"
                >
                  Siguiente (Con amigos)
                </button>
              </div>
              <button
                onClick={() => setBarberoSeleccionado(null)}
                className="mt-6 text-sm text-gray-500 underline self-start"
              >
                ← Volver a {getEtiquetaEmpleado(plantilla)}s
              </button>
            </div>
          )}

          {/* Paso 3: servicios */}
          {conAmigos && !servicioSeleccionado && (
            <div className="mt-6 flex flex-col items-center text-center">
              <h3 className="font-semibold mb-3 text-lg">
                Selecciona un servicio:
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-3xl">
                {serviciosDisponibles.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setServicioSeleccionado(s)}
                    className="px-4 py-3 w-full rounded-lg border bg-white shadow hover:bg-indigo-50 transition text-gray-700 font-medium"
                  >
                    {s.servicio} - ${s.precio}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setConAmigos(null)}
                className="mt-6 text-sm text-gray-500 underline self-start"
              >
                ← Volver
              </button>
            </div>
          )}

          {/* Paso 4: fecha/hora */}
          {servicioSeleccionado && (
            <div className="mt-6 flex flex-col items-center text-center">
              {/* Si aún no se confirmó el turno */}
              {estado !== "exito" && (
                <>
                  <h3 className="font-semibold mb-3">
                    Selecciona fecha y hora:
                  </h3>
                  <Calendario
                    calendario={barberoSeleccionado?.calendario}
                    horariosOcupados={horariosOcupados}
                    onSeleccionarTurno={(fecha: Date, hora: string | null) => {
                      setFechaSeleccionada(fecha.toISOString().split("T")[0]);
                      setHorarioSeleccionado(hora);
                    }}
                  />
                  <div className="flex flex-col gap-3 mt-4 w-full max-w-sm">
                    <button
                      onClick={guardarTurno}
                      disabled={!fechaSeleccionada || !horarioSeleccionado}
                      className="w-full px-4 py-2 rounded-lg bg-green-600 text-white font-medium disabled:opacity-50"
                    >
                      Confirmar turno
                    </button>
                    <button
                      onClick={() => setServicioSeleccionado(null)}
                      className="text-sm text-gray-500 underline"
                    >
                      ← Volver
                    </button>
                  </div>
                </>
              )}

              {/* Si ya se confirmó */}
              {estado === "exito" && (
                <button
                  onClick={() =>
                    alert(
                      `📅 Tu turno está reservado para el ${fechaSeleccionada} a las ${horarioSeleccionado}`
                    )
                  }
                  className="mt-6 px-6 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
                >
                  Ver mi turno
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
