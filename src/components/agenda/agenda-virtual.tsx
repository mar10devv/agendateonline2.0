// src/components/agenda/agenda-virtual.tsx
import { useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

// Paneles
import DashboardAgenda from "../panel/panel-agenda";
import DashboardEmpleados from "../panel/panel-empleados";
import DashboardAgendaLite from "../panel-lite/panel-agenda";
import PanelEmpleadosLite from "../panel-lite/panel-empleados";
import AgendarTurnoLite from "./agendar-turno-lite";
import ConfigModalLite from "../panel-lite/panel-modal";

// SVG de configuración
import ConfigIcon from "../../assets/config-svg.svg?url";

type Props = {
  negocioId: string; // viene del uid del negocio
  empleados: any[];
};

export default function AgendaVirtual({ negocioId, empleados }: Props) {
  const [estado, setEstado] = useState<"cargando" | "listo" | "no-sesion">("cargando");
  const [rol, setRol] = useState<"usuario" | "negocio" | "admin">("usuario");
  const [plan, setPlan] = useState<"gratis" | "gold" | "lite">("gratis");
  const [esDuenio, setEsDuenio] = useState(false);
  const [tab, setTab] = useState<"agenda" | "empleados">("agenda");
  const [slug, setSlug] = useState<string>("");

  // 👇 Estado del modal de configuración
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    const auth = getAuth();

    // 🔹 Obtener slug del negocio
    const fetchSlug = async () => {
      try {
        const negocioRef = doc(db, "Negocios", negocioId);
        const negocioSnap = await getDoc(negocioRef);
        if (negocioSnap.exists()) {
          const data = negocioSnap.data();
          setSlug(data?.slug || "mi-negocio");
        }
      } catch (err) {
        console.error("❌ Error obteniendo slug del negocio:", err);
      }
    };
    fetchSlug();

    // 🔹 Verificar usuario logueado
    const unsub = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        setEstado("no-sesion");
        return;
      }

      try {
        const userRef = doc(db, "Usuarios", usuario.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();

          // Normalizar
          const updates: any = {};
          if (!("rol" in data)) updates.rol = "usuario";
          if (!("premium" in data)) updates.premium = false;
          if (!("tipoPremium" in data)) updates.tipoPremium = "";
          if (Object.keys(updates).length > 0) await updateDoc(userRef, updates);

          setRol((data.rol as any) || "usuario");
          if (!data.premium) setPlan("gratis");
          else if (data.tipoPremium === "gold") setPlan("gold");
          else if (data.tipoPremium === "lite") setPlan("lite");

          // 👇 dueño si uid === negocioId
          if (usuario.uid === negocioId) {
            setEsDuenio(true);
          }
        } else {
          await setDoc(userRef, {
            nombre: usuario.displayName || "",
            email: usuario.email || "",
            fotoPerfil: usuario.photoURL || "",
            creadoEn: new Date(),
            rol: "usuario",
            premium: false,
            tipoPremium: "",
          });
          setRol("usuario");
          setPlan("gratis");
        }
      } catch (err) {
        console.error("❌ Error obteniendo usuario:", err);
        setRol("usuario");
        setPlan("gratis");
      }

      setEstado("listo");
    });

    return () => unsub();
  }, [negocioId]);

  // 🔹 Actualizar título de la pestaña cuando cambia el slug
  useEffect(() => {
    if (slug) {
      document.title = slug; // 👈 ahora solo muestra el slug
    }
  }, [slug]);

  // Loader
  if (estado === "cargando") {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-700">
        <div className="w-10 h-10 border-4 border-t-indigo-500 border-gray-300 rounded-full animate-spin"></div>
        <p className="ml-3">Cargando agenda...</p>
      </div>
    );
  }

  // Usuario no logueado
  if (estado === "no-sesion") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-700">
        <p className="text-lg mb-4">🔒 Debes iniciar sesión para acceder a la agenda.</p>
        <button
          onClick={async () => {
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
          Iniciar sesión con Google
        </button>
      </div>
    );
  }

  // 🟢 Visitante/cliente
  if (!esDuenio) {
    return <AgendarTurnoLite negocioId={negocioId} empleados={empleados} slug={slug} />;
  }

  // 🔴 Dueño Gratis
  if (esDuenio && plan === "gratis") {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600 text-center p-6">
        🚫 Tu negocio está en plan <b>Gratis</b>.
        <br />
        Actualizá a Premium Lite o Premium Gold para activar tu agenda.
      </div>
    );
  }

  // 🟡 Dueño Premium (Lite o Gold)
  if (esDuenio && (plan === "lite" || plan === "gold")) {
    return (
      <>
        <div className="w-full p-6 md:p-10 flex justify-center">
          <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Cabecera */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
              <h1 className="text-xl md:text-2xl font-bold">
  Agenda de {slug.charAt(0).toUpperCase() + slug.slice(1)}
</h1>


              {/* Botón config visible solo para el dueño */}
              {esDuenio && (
                <button
                  onClick={() => setShowConfig(true)}
                  className="ml-4 p-2 rounded-full hover:bg-indigo-700 transition"
                >
                  <img
                    src={ConfigIcon}
                    alt="configuración"
                    className="w-6 h-6 filter invert"
                  />
                </button>
              )}
            </div>

            {/* Tabs */}
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

            {/* Contenido */}
            <div className="p-6">
              {tab === "agenda" &&
                (plan === "gold" ? <DashboardAgenda /> : <DashboardAgendaLite />)}
              {tab === "empleados" &&
                (plan === "gold" ? <DashboardEmpleados /> : <PanelEmpleadosLite />)}
            </div>
          </div>
        </div>

        {/* Modal de configuración */}
        {showConfig && (
          <ConfigModalLite
            negocioId={negocioId}
            slug={slug}
            onClose={() => setShowConfig(false)}
          />
        )}
      </>
    );
  }

  // Fallback
  return (
    <div className="flex items-center justify-center min-h-screen text-gray-600">
      ⚠️ No se pudo determinar el plan o rol de este usuario.
    </div>
  );
}
