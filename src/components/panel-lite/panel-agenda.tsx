// src/components/panel-lite/panel-agenda.tsx
import { useEffect, useState, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, onSnapshot, deleteDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { obtenerConfigNegocio } from "../../lib/firestore";
import { useCalendario } from "../../lib/useCalendario";

type Turno = {
  id: string;
  cliente: string;
  email: string;
  servicio: string;
  fecha: string;
  hora: string;
  estado: "pendiente" | "confirmado" | "cancelado";
  barbero: string;
  uidCliente?: string;
};

// 🔑 etiquetas dinámicas por plantilla
const etiquetasPorPlantilla: Record<string, string> = {
  barberia: "Barbero",
  dentista: "Dentista",
  tatuajes: "Tatuador",
  peluqueria: "Estilista",
  spa: "Masajista",
};

function getEtiquetaEmpleado(plantilla?: string) {
  if (!plantilla) return "Empleado";
  return etiquetasPorPlantilla[plantilla] || "Empleado";
}

export default function DashboardAgendaLite() {
  const [user, setUser] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [plantilla, setPlantilla] = useState<string>(""); // 👈 traemos de Negocios
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [estado, setEstado] = useState<"cargando" | "listo" | "sin-acceso">("cargando");
  const [mensaje, setMensaje] = useState("");
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<string>("");

  // Fecha local de hoy
  const hoyLocal = new Date();
  const fechaLocal = `${hoyLocal.getFullYear()}-${String(
    hoyLocal.getMonth() + 1
  ).padStart(2, "0")}-${String(hoyLocal.getDate()).padStart(2, "0")}`;
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(fechaLocal);

  // Scroll horizontal
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDown.current = true;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
  };
  const handleMouseLeaveOrUp = () => {
    isDown.current = false;
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  // Cargar datos
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        setEstado("sin-acceso");
        setMensaje("🔒 No has iniciado sesión.");
        return;
      }

      const userRef = doc(db, "Usuarios", usuario.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        setEstado("sin-acceso");
        setMensaje("🚫 No tienes acceso a la agenda.");
        return;
      }

      const data = snap.data();
      if (data?.premium) {
        const negocioConfig = await obtenerConfigNegocio(usuario.uid);
        if (negocioConfig) {
          setUser(usuario);
          setConfig(negocioConfig);
          setEmpleadoSeleccionado(negocioConfig.empleadosData?.[0]?.nombre || "");

          // 👇 traer plantilla directamente de Negocios/{id}
          const negocioRef = doc(db, "Negocios", usuario.uid);
          const negocioSnap = await getDoc(negocioRef);
          if (negocioSnap.exists()) {
            const plantillaFirestore = negocioSnap.data()?.plantilla || "";
            setPlantilla(plantillaFirestore.toLowerCase());
            console.log("Plantilla desde Firestore:", plantillaFirestore);
          }

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
        setMensaje("🚫 Tu plan no tiene acceso a la agenda.");
      }
    });

    return () => unsub();
  }, []);

  // Calendario con hook
  const calendarioEmpleado = config?.empleadosData?.find(
    (e: any) => e.nombre === empleadoSeleccionado
  )?.calendario;
  const { diasDisponibles, horariosDisponibles } = useCalendario(calendarioEmpleado, 14);

  // Turnos del día
  const turnosDelDia = turnos.filter(
    (t) => t.barbero === empleadoSeleccionado && t.fecha === fechaSeleccionada
  );

  // Eliminar turno
  const eliminarTurno = async (turno: Turno) => {
    if (!user) return;
    if (!window.confirm(`¿Eliminar turno de ${turno.cliente} (${turno.hora})?`)) return;
    try {
      await deleteDoc(doc(db, "Negocios", user.uid, "Turnos", turno.id));
      if (turno.uidCliente) {
        await deleteDoc(doc(db, "Usuarios", turno.uidCliente, "Turnos", turno.id));
      }
    } catch (err) {
      console.error("❌ Error al eliminar turno:", err);
    }
  };

  if (estado === "cargando") return <p className="text-center">Cargando agenda...</p>;
  if (estado === "sin-acceso") return <p className="text-red-600 text-center mt-10">{mensaje}</p>;
  if (!config) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Filtro empleados */}
      <div className="flex items-center gap-2">
        <label className="font-medium">
          {getEtiquetaEmpleado(plantilla)}:
        </label>
        <select
          value={empleadoSeleccionado}
          onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          {config.empleadosData?.map((emp: any, i: number) => (
            <option key={i} value={emp.nombre}>
              {emp.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Fechas */}
      <div
        ref={scrollRef}
        className="flex sm:grid sm:grid-cols-7 gap-2 overflow-x-auto no-scrollbar pb-2 cursor-grab"
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeaveOrUp}
        onMouseUp={handleMouseLeaveOrUp}
        onMouseMove={handleMouseMove}
      >
        {diasDisponibles.map((d) => {
          const turnosDeEseDia = turnos.filter((t) => t.fecha === d.value);
          const tieneConfirmados = turnosDeEseDia.some((t) => t.estado === "confirmado");
          const tienePendientes = turnosDeEseDia.some((t) => t.estado === "pendiente");
          const estaSeleccionado = fechaSeleccionada === d.value;
          return (
            <button
              key={d.value}
              onClick={() => setFechaSeleccionada(d.value)}
              disabled={d.disabled}
              className={`flex-shrink-0 h-20 w-20 sm:h-24 sm:w-full flex flex-col items-center justify-center 
                rounded-lg font-bold transition relative
                ${
                  estaSeleccionado
                    ? "bg-indigo-500 text-white"
                    : tieneConfirmados
                    ? "bg-green-500 text-white"
                    : tienePendientes
                    ? "bg-yellow-400 text-white"
                    : d.disabled
                    ? "bg-gray-200 text-gray-400"
                    : "bg-white text-gray-800 border hover:bg-indigo-100"
                }`}
            >
              <span className="text-sm">{d.label.split(" ")[0]}</span>
              <span className="text-lg">{d.date.getDate()}</span>
            </button>
          );
        })}
      </div>

      {/* Turnos del día */}
      <div>
        <h2 className="text-lg font-bold mb-4">
          {(() => {
            const [y, m, d] = fechaSeleccionada.split("-").map(Number);
            const fechaLocal = new Date(y, m - 1, d);
            return `Turnos para ${fechaLocal.toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}`;
          })()}
        </h2>

        {!calendarioEmpleado?.inicio || !calendarioEmpleado?.fin ? (
          <div className="p-6 bg-yellow-50 border border-yellow-300 rounded-xl text-center shadow">
            <p className="text-yellow-700 font-medium">
              ⚠️ Primero configura el horario y días libres de este{" "}
              {getEtiquetaEmpleado(plantilla).toLowerCase()}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {horariosDisponibles.map((h) => {
              const turno = turnosDelDia.find((t) => t.hora === h);
              return (
                <div
                  key={h}
                  className={`p-4 rounded-lg shadow border text-center ${
                    turno ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
                  }`}
                >
                  <p className="font-medium">{h}</p>
                  {turno ? (
                    <div className="text-sm text-gray-700 mt-1 space-y-1">
                      <p className="font-semibold truncate w-full" title={turno.cliente}>
                        {turno.cliente}
                      </p>
                      <p className="text-xs text-gray-600 truncate w-full" title={turno.email}>
                        {turno.email}
                      </p>
                      <p className="truncate w-full" title={turno.servicio}>
                        {turno.servicio}
                      </p>
                      <span
                        className={`px-2 py-1 text-xs rounded inline-block ${
                          turno.estado === "pendiente"
                            ? "bg-yellow-100 text-yellow-800"
                            : turno.estado === "confirmado"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {turno.estado}
                      </span>
                      <button
                        onClick={() => eliminarTurno(turno)}
                        className="mt-2 px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 transition"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">Disponible</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
