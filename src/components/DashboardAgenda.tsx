// src/components/DashboardAgenda.tsx
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { obtenerConfigNegocio } from "../lib/firestore";

type Turno = {
  id: string;
  cliente: string;
  email: string;
  servicio: string;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:mm
  estado: "pendiente" | "confirmado" | "cancelado";
  barbero: string;
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

  // 🔹 Generar los próximos 14 días
  const generarDias = () => {
    const hoy = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  };
  const dias = generarDias();

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

            // ⚡ Aquí deberías cargar turnos desde Firestore:
            // const q = query(collection(db, "Turnos"), where("negocioId", "==", usuario.uid))
            // const snap = await getDocs(q)
            // setTurnos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Turno)))

            setEstado("listo");
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

  // 🔹 Calcular ocupación del día para colorear punto
  const ocupacionDia = (fecha: string) => {
    const turnosDia = turnos.filter((t) => t.barbero === barberoSeleccionado && t.fecha === fecha);
    if (turnosDia.length === 0) return "verde";
    if (turnosDia.length < horariosDisponibles.length / 2) return "amarillo";
    return "rojo";
  };

  if (estado === "cargando")
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-700">
        <div className="w-10 h-10 border-4 border-t-green-500 border-gray-300 rounded-full animate-spin"></div>
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
        <div className="grid grid-cols-7 gap-4 p-6">
          {dias.map((d) => (
            <button
              key={d}
              onClick={() => setFechaSeleccionada(d)}
              className={`relative p-3 rounded-lg border ${
                fechaSeleccionada === d ? "border-indigo-600 bg-indigo-50" : "border-gray-200 bg-gray-50"
              }`}
            >
              <span className="block font-medium">{new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
              {/* Punto de ocupación */}
              <span
                className={`absolute top-1 right-1 w-3 h-3 rounded-full ${
                  ocupacionDia(d) === "verde"
                    ? "bg-green-500"
                    : ocupacionDia(d) === "amarillo"
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
              ></span>
            </button>
          ))}
        </div>

        {/* Lista de horarios del día */}
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4">
            Turnos para {new Date(fechaSeleccionada).toLocaleDateString("es-ES")}
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {horariosDisponibles.map((h) => {
              const turno = turnosDelDia.find((t) => t.hora === h);
              return (
                <div
                  key={h}
                  className={`p-4 rounded-lg shadow border ${
                    turno
                      ? "bg-red-50 border-red-200"
                      : "bg-green-50 border-green-200"
                  }`}
                >
                  <p className="font-medium">{h}</p>
                  {turno ? (
                    <div className="text-sm text-gray-700 mt-1">
                      <p><strong>{turno.cliente}</strong> ({turno.email})</p>
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
