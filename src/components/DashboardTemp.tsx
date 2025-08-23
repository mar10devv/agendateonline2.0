import { useEffect, useState } from "react";
import { obtenerConfigNegocio } from "../lib/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDoc, setDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";

// 🔨 función para crear slug a partir del nombre
function generarSlug(nombre: string) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function DashboardTemp() {
  const [user, setUser] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "sin-acceso">("cargando");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (usuario) => {
      if (usuario) {
        const userRef = doc(db, "Usuarios", usuario.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          await setDoc(userRef, {
            uid: usuario.uid,
            email: usuario.email,
            nombre: usuario.displayName || "",
            foto: usuario.photoURL || "",
            premium: false,
            plantilla: null,
            localesRecientes: [],
            ubicacion: null,
            creadoEn: new Date(),
          });
          setEstado("sin-acceso");
          setMensaje("🚫 No tienes acceso al panel.");
          return;
        }

        const data = snap.data();

        if (data?.premium) {
          const negocioConfig = await obtenerConfigNegocio(usuario.uid);
          if (negocioConfig) {
            if (!negocioConfig.slug) {
              negocioConfig.slug = generarSlug(negocioConfig.nombre || "mi-negocio");
            }
            setUser(usuario);
            setConfig(negocioConfig);
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

  if (estado === "cargando")
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-gray-700">
      <div className="loader">
        <div className="circle"></div>
        <div className="circle"></div>
        <div className="circle"></div>
        <div className="circle"></div>
      </div>
      <p className="mt-6 text-lg font-medium">
        Cargando usuario y configuración...
      </p>
    </div>
  );


  if (estado === "sin-acceso") return <p className="text-red-600">{mensaje}</p>;
  if (!config) return null;

  return (
    <div className="w-[95vw] sm:w-[90vw] max-w-6xl mx-auto p-2 sm:p-4 md:p-6">
      <div className="w-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* ✅ Encabezado */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">
            Panel – {config.nombre}
          </h1>
          <button
            onClick={() => (window.location.href = "/")}
            className="flex items-center gap-2 bg-white text-blue-700 px-4 py-2 rounded-lg shadow hover:bg-blue-50 transition"
          >
            <span className="text-lg">←</span>
            <span className="font-medium">Volver atrás</span>
          </button>
        </div>

        {/* ✅ Menú principal */}
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <a
              href="/panel-agenda"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center rounded-2xl aspect-square shadow hover:scale-105 transition"
            >
              Agenda
            </a>
            <a
              href="/panel-empleados"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center rounded-2xl aspect-square shadow hover:scale-105 transition"
            >
              Personal
            </a>
            <a
              href="/panel-plantilla"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center rounded-2xl aspect-square shadow hover:scale-105 transition"
            >
              Plantilla
            </a>
            <a
              href="#"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center rounded-2xl aspect-square shadow hover:scale-105 transition"
            >
              Ejemplo 1
            </a>
            <a
              href="#"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center rounded-2xl aspect-square shadow hover:scale-105 transition"
            >
              Ejemplo 2
            </a>
            <a
              href="#"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center rounded-2xl aspect-square shadow hover:scale-105 transition"
            >
              Ejemplo 3
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
