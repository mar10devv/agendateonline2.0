import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, onSnapshot, deleteDoc } from "firebase/firestore"; // 👈 deleteDoc
import { db } from "../lib/firebase";
import { obtenerConfigNegocio } from "../lib/firestore";
import { useFechasAgenda } from "../lib/useFechasAgenda"; // 👈 usamos el hook compartido

type Turno = {
  id: string;
  cliente: string;
  email: string;
  servicio: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm
  estado: "pendiente" | "confirmado" | "cancelado";
  barbero: string;
  uidCliente?: string;
};

export default function DashboardAgenda() {
  const [user, setUser] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [estado, setEstado] = useState<"cargando" | "listo" | "sin-acceso">("cargando");
  const [mensaje, setMensaje] = useState("");

  const [barberoSeleccionado, setBarberoSeleccionado] = useState<string>("");
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    new Date().toISOString().split("T")[0] // hoy
  );

  // 🔹 Generar horarios del día
  const generarHorarios = () => {
    const horarios: string[] = [];
    let hora = 10;
    let minuto = 30;
    while (hora < 21 || (hora === 21 && minuto <= 30)) {
      const h = hora.toString().padStart(2, "0");
      const m = minuto.toString().padStart(2, "0");
      horarios.push(`${h}:${m}`);
      hora++;
      minuto = 30;
    }
    return horarios;
  };
  const horariosDisponibles = generarHorarios();

  // 🔹 Fechas sincronizadas (14 días)
  const fechas = useFechasAgenda(14);

  // 🔹 Verifica usuario y carga config
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (usuario) => {
      if (usuario) {
        const userRef = doc(db, "Usuarios", usuario.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          setEstado("sin-acceso");
          setMensaje("🚫 No tienes acceso al panel.");
          return;
        }

        const data = snap.data();
        if (data?.premium) {
          const negocioConfig = await obtenerConfigNegocio(usuario.uid);
          if (negocioConfig) {
            setUser(usuario);
            setConfig(negocioConfig);
            setBarberoSeleccionado(negocioConfig.empleadosData?.[0]?.nombre || "");

            // ⚡ Escuchar turnos en tiempo real
            const turnosRef = collection(db, "Negocios", usuario.uid, "Turnos");
            const unsubTurnos = onSnapshot(turnosRef, (snap) => {
              const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Turno[];
              setTurnos(data);
            });

            setEstado("listo");
            return () => unsubTurnos();
          }
        } else {
          setEstado("sin-acceso");
          setMensaje("🚫 No tienes acceso al panel.");
        }
      } else {
        setEstado("sin-acceso");
        setMensaje("🔒 No has iniciado sesión.");
      }
    });

    return () => unsub();
  }, []);

  // 🔹 Turnos filtrados del día y barbero
  const turnosDelDia = turnos.filter(
    (t) => t.barbero === barberoSeleccionado && t.fecha === fechaSeleccionada
  );

  // 🔹 Función para borrar turno
  const eliminarTurno = async (turno: Turno) => {
    if (!user) return;

    const confirmacion = window.confirm(
      `¿Seguro que quieres eliminar el turno de ${turno.cliente} (${turno.hora})?`
    );
    if (!confirmacion) return;

    try {
      // 📌 Borrar turno del negocio
      await deleteDoc(doc(db, "Negocios", user.uid, "Turnos", turno.id));

      // 📌 Borrar copia en el usuario (si existe uidCliente)
      if (turno.uidCliente) {
        await deleteDoc(doc(db, "Usuarios", turno.uidCliente, "Turnos", turno.id));
      }

      alert("✅ Turno eliminado con éxito");
    } catch (error) {
      console.error("Error al eliminar turno:", error);
      alert("❌ Hubo un error al eliminar el turno");
    }
  };

  if (estado === "cargando")
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-700">
        <div className="loader">
          <div className="circle"></div>
          <div className="circle"></div>
          <div className="circle"></div>
          <div className="circle"></div>
        </div>
        <p className="mt-6 text-lg font-medium">Cargando agenda...</p>
      </div>
    );

  if (estado === "sin-acceso")
    return <p className="text-red-600 text-center mt-10">{mensaje}</p>;

  if (!config) return null;

  return (
    <div className="w-full p-6 md:p-10 flex justify-center">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Encabezado */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">Agenda de turnos</h1>

          <button
            onClick={() => (window.location.href = "/panel")}
            className="flex items-center gap-2 bg-white text-indigo-700 px-4 py-2 rounded-lg shadow hover:bg-indigo-50 transition"
          >
            <span className="text-lg">←</span>
            <span className="font-medium">Volver al panel</span>
          </button>
        </div>

        {/* Filtros */}
        <div className="p-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="font-medium">Barbero:</label>
            <select
              value={barberoSeleccionado}
              onChange={(e) => setBarberoSeleccionado(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              {config.empleadosData?.map((emp: any, i: number) => (
                <option key={i} value={emp.nombre}>
                  {emp.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Calendario 14 días */}
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {fechas.map((d) => (
              <button
                key={d.value}
                onClick={() => setFechaSeleccionada(d.value)}
                className={`relative py-2 px-6 text-sm font-bold rounded-full overflow-hidden transition-all duration-400 ease-in-out shadow-md
                  ${fechaSeleccionada === d.value
                    ? "text-white bg-gradient-to-r from-indigo-600 to-blue-400 scale-105"
                    : "text-black bg-white hover:scale-105 hover:text-white hover:shadow-lg active:scale-90"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de horarios del día */}
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4">
            Turnos para {new Date(fechaSeleccionada).toLocaleDateString("es-ES")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {horariosDisponibles.map((h) => {
              const turno = turnosDelDia.find((t) => t.hora === h);
              return (
                <div
                  key={h}
                  className={`p-4 rounded-lg shadow border ${
                    turno ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
                  }`}
                >
                  <p className="font-medium">{h}</p>
                  {turno ? (
                    <div className="text-sm text-gray-700 mt-1">
                      <p>
                        <strong>{turno.cliente}</strong> ({turno.email})
                      </p>
                      <p>{turno.servicio}</p>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          turno.estado === "pendiente"
                            ? "bg-yellow-100 text-yellow-800"
                            : turno.estado === "confirmado"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {turno.estado}
                      </span>

                      {/* 👇 Botón de eliminar */}
                      <button
                        onClick={() => eliminarTurno(turno)}
                        className="mt-2 px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 transition flex items-center gap-2"
                      >
                        🗑️ Eliminar turno
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">Disponible</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
