// src/components/agenda/AgendarTurnoLite.tsx
import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  setDoc,
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
};

export default function AgendarTurnoLite({ empleados, negocioId }: Props) {
  const [user, setUser] = useState<any>(null);

  const [barberoSeleccionado, setBarberoSeleccionado] = useState<Empleado | null>(null);
  const [conAmigos, setConAmigos] = useState<"solo" | "amigos" | null>(null);
  const [cantidadAmigos, setCantidadAmigos] = useState<number>(1);

  const [serviciosDisponibles, setServiciosDisponibles] = useState<
    { servicio: string; precio: number }[]
  >([]);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<
    { servicio: string; precio: number } | null
  >(null);

  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<string | null>(null);
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);

  const [estado, setEstado] = useState<"inicial" | "exito" | "error">("inicial");

  // 🔹 Detectar usuario logueado
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

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

  // 🔹 Escuchar horarios ocupados del barbero
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
    if (!barberoSeleccionado || !fechaSeleccionada || !horarioSeleccionado || !servicioSeleccionado) {
      alert("Completa todos los campos.");
      return;
    }
    try {
      if (!user) {
        alert("Debes iniciar sesión.");
        return;
      }

      const turnoRef = await addDoc(collection(db, "Negocios", negocioId, "Turnos"), {
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
      });

      await setDoc(doc(db, "Usuarios", user.uid, "Turnos", turnoRef.id), {
        negocioId,
        negocioNombre: "Negocio",
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
    <div className="p-6 max-w-3xl mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Agendar Turno</h2>

      {estado === "exito" && (
        <p className="text-green-600 text-center mb-4">✅ Turno reservado con éxito</p>
      )}
      {estado === "error" && (
        <p className="text-red-600 text-center mb-4">❌ Error al reservar turno</p>
      )}

      {/* Paso 1: elegir barbero */}
      {!barberoSeleccionado && (
        <div>
          <h3 className="font-semibold mb-3">Selecciona un barbero:</h3>
          <div className="grid grid-cols-2 gap-4">
            {empleados.map((e, i) => (
              <button
                key={i}
                onClick={() => setBarberoSeleccionado(e)}
                className="p-3 border rounded-lg hover:bg-indigo-50"
              >
                {e.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Paso 2: solo o amigos */}
      {barberoSeleccionado && !conAmigos && (
        <div className="mt-6">
          <p className="mb-3">¿Vienes solo o con amigos?</p>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setConAmigos("solo");
                setCantidadAmigos(1);
              }}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
            >
              Solo
            </button>
            <button
              onClick={() => setConAmigos("amigos")}
              className="px-4 py-2 rounded-lg bg-gray-200"
            >
              Con amigos
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: servicios */}
      {conAmigos && !servicioSeleccionado && (
        <div className="mt-6">
          <h3 className="font-semibold mb-3">Selecciona un servicio:</h3>
          <div className="grid grid-cols-2 gap-4">
            {serviciosDisponibles.map((s, i) => (
              <button
                key={i}
                onClick={() => setServicioSeleccionado(s)}
                className="p-3 border rounded-lg hover:bg-indigo-50"
              >
                {s.servicio} - ${s.precio}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Paso 4: fecha/hora */}
      {servicioSeleccionado && (
        <div className="mt-6">
          <h3 className="font-semibold mb-3">Selecciona fecha y hora:</h3>
          <Calendario
            calendario={barberoSeleccionado?.calendario}
            horariosOcupados={horariosOcupados}
            onSeleccionarTurno={(fecha: Date, hora: string | null) => {
              setFechaSeleccionada(fecha.toISOString().split("T")[0]);
              setHorarioSeleccionado(hora);
            }}
          />
          <button
            onClick={guardarTurno}
            disabled={!fechaSeleccionada || !horarioSeleccionado}
            className="mt-4 w-full px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-50"
          >
            Confirmar turno
          </button>
        </div>
      )}
    </div>
  );
}
