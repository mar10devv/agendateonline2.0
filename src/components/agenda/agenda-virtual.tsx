// src/components/agenda/agenda-virtual.tsx
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

// Paneles existentes
import DashboardAgenda from "../panel/panel-agenda";
import DashboardEmpleados from "../panel/panel-empleados";
// Nueva agenda simplificada para clientes
import AgendarTurnoLite from "./agendar-turno-lite";

type Props = {
  negocioId: string;
  empleados: any[];
};

export default function AgendaVirtual({ negocioId, empleados }: Props) {
  const [user, setUser] = useState<any>(null);
  const [esDueno, setEsDueno] = useState(false);
  const [estado, setEstado] = useState<"cargando" | "listo" | "no-sesion">(
    "cargando"
  );
  const [tab, setTab] = useState<"agenda" | "empleados">("agenda");

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        setEstado("no-sesion");
        return;
      }

      setUser(usuario);

      // Verificamos si es dueño premium
      const userRef = doc(db, "Usuarios", usuario.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data?.premium) {
          setEsDueno(true);
        }
      }

      setEstado("listo");
    });

    return () => unsub();
  }, []);

  if (estado === "cargando") {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-700">
        <div className="w-10 h-10 border-4 border-t-indigo-500 border-gray-300 rounded-full animate-spin"></div>
        <p className="ml-3">Cargando agenda virtual...</p>
      </div>
    );
  }

  if (estado === "no-sesion") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-700">
        <p className="text-lg mb-4">
          🔒 Debes iniciar sesión para acceder a la agenda.
        </p>
        <button
          onClick={async () => {
            const {
              getAuth,
              signInWithPopup,
              GoogleAuthProvider,
            } = await import("firebase/auth");
            const auth = getAuth();
            const provider = new GoogleAuthProvider();
            try {
              await signInWithPopup(auth, provider);
            } catch (err) {
              console.error("Error iniciando sesión:", err);
              alert("❌ No se pudo iniciar sesión. Intenta nuevamente.");
            }
          }}
          className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
        >
          Iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <div className="w-full p-6 md:p-10 flex justify-center">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Encabezado */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">Agenda Virtual</h1>
        </div>

        {/* Tabs si es dueño */}
        {esDueno && (
          <div className="flex border-b bg-gray-50">
            <button
              onClick={() => setTab("agenda")}
              className={`flex-1 px-4 py-3 text-center font-medium transition ${
                tab === "agenda"
                  ? "border-b-2 border-indigo-600 text-indigo-600 bg-white"
                  : "text-gray-600 hover:text-indigo-600"
              }`}
            >
              Agenda
            </button>
            <button
              onClick={() => setTab("empleados")}
              className={`flex-1 px-4 py-3 text-center font-medium transition ${
                tab === "empleados"
                  ? "border-b-2 border-indigo-600 text-indigo-600 bg-white"
                  : "text-gray-600 hover:text-indigo-600"
              }`}
            >
              Empleados
            </button>
          </div>
        )}

        {/* Contenido */}
        <div className="p-6">
          {esDueno ? (
            <>
              {tab === "agenda" && <DashboardAgenda />}
              {tab === "empleados" && <DashboardEmpleados />}
            </>
          ) : (
            <AgendarTurnoLite negocioId={negocioId} empleados={empleados} />
          )}
        </div>
      </div>
    </div>
  );
}
