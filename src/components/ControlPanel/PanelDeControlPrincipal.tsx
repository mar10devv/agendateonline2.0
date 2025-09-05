// src/components/DashboardTemp.tsx
import { useEffect, useState } from "react";
import { obtenerConfigNegocio } from "../../lib/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDoc, setDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";

// ✅ Importamos íconos como URL
import CalendarioIcon from "../../assets/calendario-svg.svg?url";
import PersonalIcon from "../../assets/personal-svg.svg?url";
import PlantillaIcon from "../../assets/plantilla-svg.svg?url";
import EstadisticasIcon from "../../assets/estadisticas-svg.svg?url";
import SoporteIcon from "../../assets/soporte-tecnico-svg.svg?url";
import MejorarPlan from "../../assets/rayo-svg.svg?url";

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
    if (!usuario) {
      setEstado("sin-acceso");
      setMensaje("🔒 No has iniciado sesión.");
      return;
    }

    try {
      // ✅ Revisar si ya tenemos cache
      const cachePremium = localStorage.getItem("usuarioPremium");
      const cacheConfig = localStorage.getItem("negocioConfig");

      if (cachePremium === "true" && cacheConfig) {
        setUser(usuario);
        setConfig(JSON.parse(cacheConfig));
        setEstado("listo");
        return; // 👈 evitamos volver a consultar Firestore
      }

      const userRef = doc(db, "Usuarios", usuario.uid);

      // 👇 Pedimos al mismo tiempo user y config
      const [snap, negocioConfig] = await Promise.all([
        getDoc(userRef),
        obtenerConfigNegocio(usuario.uid),
      ]);

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
      if (data?.premium && negocioConfig) {
        if (!negocioConfig.slug) {
          negocioConfig.slug = generarSlug(negocioConfig.nombre || "mi-negocio");
        }

        // ✅ Guardamos en localStorage para no consultar más
        localStorage.setItem("usuarioPremium", "true");
        localStorage.setItem("negocioConfig", JSON.stringify(negocioConfig));

        setUser(usuario);
        setConfig(negocioConfig);
        setEstado("listo");
      } else {
        setEstado("sin-acceso");
        setMensaje("🚫 No tienes acceso al panel.");
      }
    } catch (e) {
      console.error(e);
      setEstado("sin-acceso");
      setMensaje("❌ Error al cargar el panel.");
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
        <p className="mt-6 text-lg font-medium">Cargando usuario y configuración...</p>
      </div>
    );

  if (estado === "sin-acceso") return <p className="text-red-600">{mensaje}</p>;
  if (!config) return null;

  return (
    <div className="w-[95vw] sm:w-[90vw] max-w-6xl mx-auto p-2 sm:p-4 md:p-6">
      <div className="w-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* ✅ Encabezado */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">Panel de Control</h1>
          <button
            onClick={() => (window.location.href = "/")}
            className="flex items-center gap-2 bg-white text-blue-700 px-4 py-2 rounded-lg shadow hover:bg-blue-50 transition"
          >
            <span className="text-lg">←</span>
            <span className="font-medium">Volver atrás</span>
          </button>
        </div>

        {/* ✅ Menú principal (cards cuadradas con íconos) */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {/* Card Agenda */}
            <a
  href="/ControlPanel/AgendaControlPanel"
  className="w-full aspect-square bg-gray-100 rounded-xl shadow-2xl flex flex-col items-center justify-center text-lg font-semibold text-gray-700 hover:scale-105 transition"
>
  <img src={CalendarioIcon} alt="Agenda" className="w-12 h-12 mb-3" />
  <span>Mi Agenda</span>
</a>


            {/* Card Personal */}
            <a
              href="/panel-empleados"
              className="w-full aspect-square bg-gray-100 rounded-xl shadow-2xl flex flex-col items-center justify-center text-lg font-semibold text-gray-700 hover:scale-105 transition"
            >
              <img src={PersonalIcon} alt="Personal" className="w-12 h-12 mb-3" />
              <span>Mi Personal</span>
            </a>

            {/* Card Plantilla */}
            <a
              href="/panel-plantilla"
              className="w-full aspect-square bg-gray-100 rounded-xl shadow-2xl flex flex-col items-center justify-center text-lg font-semibold text-gray-700 hover:scale-105 transition"
            >
              <img src={PlantillaIcon} alt="Plantilla" className="w-12 h-12 mb-3" />
              <span>Personalizar mi web</span>
            </a>

            {/* ✅ Soporte Técnico (con SVG) */}
            <a
              href="/panel-soporte"
              className="w-full aspect-square bg-gray-100 rounded-xl shadow-2xl flex flex-col items-center justify-center text-lg font-semibold text-gray-700 hover:scale-105 transition"
              aria-label="Soporte técnico"
            >
              <img src={SoporteIcon} alt="Soporte técnico" className="w-12 h-12 mb-3" />
              <span className="text-center leading-tight">
                Soporte<br />Técnico
              </span>
            </a>

            {/* ✅ Estadísticas (con SVG) */}
            <a
              href="/panel-estadisticas"
              className="w-full aspect-square bg-gray-100 rounded-xl shadow-2xl flex flex-col items-center justify-center text-lg font-semibold text-gray-700 hover:scale-105 transition"
              aria-label="Estadísticas"
            >
              <img src={EstadisticasIcon} alt="Estadísticas" className="w-12 h-12 mb-3" />
              <span>Estadísticas</span>
            </a>

            {/* Ejemplo 3 (placeholder) */}
            <a
              href="#"
              className="w-full aspect-square bg-gray-100 rounded-xl shadow-2xl flex flex-col items-center justify-center text-lg font-semibold text-gray-700 hover:scale-105 transition"
            >
              <img src={MejorarPlan} alt="Estadísticas" className="w-12 h-12 mb-3" />
              Mejorar Plan
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
