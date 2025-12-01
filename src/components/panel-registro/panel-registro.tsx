import { useState, useEffect } from "react";
import { db, auth, googleProvider } from "../../lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import Loader from "../ui/loaders";

import AgendaPaso1 from "./registro-paso1";
import RegistroPaso2 from "./registro-paso2";
import RegistroPaso3 from "./registro-paso3";
import RegistroPaso4Dias from "./registro-paso4";
import RegistroPaso5Horarios from "./registro-paso5";
import RegistroPaso6Codigo from "./registro-paso6";
import RegistroPaso7Confirmacion from "./registro-paso7";

// ---------- helpers ----------
function normalizarTexto(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function baseDesdeEmail(email: string) {
  if (!email) return "usuario";
  return normalizarTexto(email.split("@")[0]);
}

async function generarSlugUnico(nombre: string, email: string) {
  const base = nombre ? normalizarTexto(nombre) : baseDesdeEmail(email);

  let slug = base;
  let existe = true;

  while (existe) {
    const q = query(collection(db, "Negocios"), where("slug", "==", slug));
    const snap = await getDocs(q);

    if (snap.empty) {
      existe = false;
    } else {
      const randomSuffix = Math.random().toString(36).substring(2, 7);
      slug = `${base}-${randomSuffix}`;
    }
  }

  return slug;
}

type TipoAgenda = "emprendimiento" | "negocio" | null;
type ModoTurnos = "jornada" | "personalizado" | null;

// ---------- componente principal ----------
export default function PanelRegistro() {
  const [paso, setPaso] = useState(1);
  const totalPasos = 7;

  // control de acceso
  const [tieneNegocio, setTieneNegocio] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const negocioSnap = await getDoc(doc(db, "Negocios", user.uid));
          if (negocioSnap.exists()) {
            setTieneNegocio(true);
          } else {
            setTieneNegocio(false);
          }
        } else {
          setTieneNegocio(null);
        }
      } catch (err) {
        console.error("Error comprobando negocio:", err);
        setTieneNegocio(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Paso 1
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");

  // Paso 2
  const [tipoNegocio, setTipoNegocio] = useState("");

  // Paso 3
  const [tipoAgenda, setTipoAgenda] = useState<TipoAgenda>(null);

  // Paso 4: días (libres o cerrados)
  const [diasLibres, setDiasLibres] = useState<string[]>([]);

  // Paso 5: horarios
  const [modoTurnos, setModoTurnos] = useState<ModoTurnos>(null);
  const [clientesPorDia, setClientesPorDia] = useState<number | null>(null);
  const [horaInicio, setHoraInicio] = useState<string>("09:00");
  const [horaFin, setHoraFin] = useState<string>("18:00");

  // Paso 6: código
  const [codigo, setCodigo] = useState("");
  const [codigoValido, setCodigoValido] = useState<boolean | null>(null);

  // Paso 7: confirmación
  const [slugGenerado, setSlugGenerado] = useState<string | null>(null);

  // ---------- verificar código y crear negocio ----------
  const verificarCodigo = async () => {
    if (!codigo || codigo.length < 15) {
      alert("⚠️ Ingresa un código válido de 15 cifras");
      return;
    }

    try {
      let user = auth.currentUser;
      if (!user) {
        const result = await signInWithPopup(auth, googleProvider);
        user = result.user;
      }

      const codigoRef = doc(db, "CodigosPremium", codigo);
      const codigoSnap = await getDoc(codigoRef);

      if (!codigoSnap.exists()) {
        setCodigoValido(false);
        alert("❌ Código inválido, no existe en el sistema.");
        return;
      }

      const data = codigoSnap.data();
      if (!data.valido) {
        setCodigoValido(false);
        alert("❌ Código ya fue utilizado.");
        return;
      }

      const slug = await generarSlugUnico(nombre, email);

      const plantillaNormalizada = tipoNegocio
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const configuracionBase = {
        diasLibres,
        modoTurnos: modoTurnos || "jornada",
        clientesPorDia,
        horaInicio,
        horaFin,
        onboardingCompletado: false,
      };

      await setDoc(
        doc(db, "Negocios", user.uid),
        {
          nombre,
          emailContacto: email,
          telefono,
          tipoNegocio,
          tipoAgenda: tipoAgenda || "emprendimiento",
          slug,
          urlPersonal: `https://agendateonline.com/agenda/${slug}`,
          plantilla: plantillaNormalizada,
          ownerUid: user.uid,
          plan: "agenda",
          premium: true,
          tipoPremium: "lite",
          fechaRegistro: new Date().toISOString(),
          codigoRegistro: codigo,
          configuracionAgenda: configuracionBase,
          empleados: 1,
          empleadosData: [
            {
              nombre: user.displayName || nombre || "Empleado 1",
              fotoPerfil: user.photoURL || "",
              calendario: configuracionBase,
            },
          ],
        },
        { merge: true }
      );

      await setDoc(
        doc(db, "Usuarios", user.uid),
        {
          nombre: user.displayName || nombre,
          email: user.email,
          rol: "negocio",
          premium: true,
          tipoPremium: "lite",
          codigoRegistro: codigo,
        },
        { merge: true }
      );

      await updateDoc(codigoRef, {
        valido: false,
        usado: true,
        usadoPor: user.uid,
        fechaUso: new Date().toISOString(),
      });

      setSlugGenerado(slug);
      setCodigoValido(true);
      setPaso(7);
    } catch (error) {
      console.error("Error verificando el código:", error);
      alert("⚠️ Ocurrió un error verificando el código.");
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error(e);
      alert("No se pudo iniciar sesión. Intenta nuevamente.");
    }
  };

  // ---------- estados especiales ----------
  if (loading) {
    return (
      <div className="flex justify-center.items-center py-10">
        <Loader
          mensaje="Cargando datos..."
          textColor="text-white"
          circleColor="#ffffff"
        />
      </div>
    );
  }

  if (tieneNegocio === true) {
    return (
      <div className="text-center py-10 text-red-600 font-semibold">
        🚫 Ya tienes tu negocio registrado
      </div>
    );
  }

  if (tieneNegocio === null) {
    return (
      <div className="w-full">
        <div className="max-w-xl mx-auto text-center space-y-4">
          <div className="text-2xl font-semibold text-white">
            🔐 Debes iniciar sesión
          </div>
          <p className="text-white/90">
            Para registrar tu negocio primero iniciá sesión.
          </p>

          <button
            onClick={handleLogin}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-indigo-50 transition"
          >
            <span>Iniciar sesión con Google</span>
          </button>

          <div className="text-xs text-white/80">
            Al continuar aceptas nuestros Términos y Política de Privacidad.
          </div>
        </div>
      </div>
    );
  }

  // texto indicador pasos
  const descripcionPaso =
    paso === 1
      ? "Nombre de la agenda"
      : paso === 2
      ? "Tipo de negocio"
      : paso === 3
      ? "Configura tu agenda"
      : paso === 4
      ? tipoAgenda === "negocio"
        ? "Días cerrado"
        : "Días libres"
      : paso === 5
      ? "Horarios y turnos"
      : paso === 6
      ? "Activación"
      : "Confirmación";

  // ---------- UI principal ----------
  return (
    <div className="w-full flex justify-center px-4">
      <div className="w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_18px_45px_rgba(15,23,42,0.35)] border border-white/70 p-6 sm:p-8 text-black">
        {/* indicador de pasos */}
        <div className="mb-6 flex items-center justify-between">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
            {`Paso ${paso} de ${totalPasos} · ${descripcionPaso}`}
          </span>
        </div>

        {/* Paso 1 */}
        {paso === 1 && (
          <AgendaPaso1
            nombre={nombre}
            email={email}
            telefono={telefono}
            tipoNegocio={tipoNegocio}
            onChange={(patch) => {
              if (patch.nombre !== undefined) setNombre(patch.nombre);
              if (patch.email !== undefined) setEmail(patch.email);
              if (patch.telefono !== undefined) setTelefono(patch.telefono);
            }}
            onNext={() => setPaso(2)}
          />
        )}

        {/* Paso 2 */}
        {paso === 2 && (
          <RegistroPaso2
            tipoNegocio={tipoNegocio}
            onChange={(patch) => {
              if (patch.tipoNegocio !== undefined)
                setTipoNegocio(patch.tipoNegocio);
            }}
            onNext={() => setPaso(3)}
            onBack={() => setPaso(1)}
          />
        )}

        {/* Paso 3 */}
        {paso === 3 && (
          <RegistroPaso3
            tipoAgenda={tipoAgenda}
            onChange={(valor) => setTipoAgenda(valor)}
            onNext={() => setPaso(4)}
            onBack={() => setPaso(2)}
          />
        )}

        {/* Paso 4 */}
        {paso === 4 && (
          <RegistroPaso4Dias
            tipoAgenda={tipoAgenda}
            diasSeleccionados={diasLibres}
            onChange={(dias) => setDiasLibres(dias)}
            onNext={() => setPaso(5)}
            onBack={() => setPaso(3)}
          />
        )}

        {/* Paso 5 */}
        {paso === 5 && (
          <RegistroPaso5Horarios
            tipoAgenda={tipoAgenda}
            diasLibres={diasLibres}
            modoTurnos={modoTurnos}
            clientesPorDia={clientesPorDia}
            horaInicio={horaInicio}
            horaFin={horaFin}
            onChange={(patch) => {
              if (patch.modoTurnos !== undefined)
                setModoTurnos(patch.modoTurnos);
              if (patch.clientesPorDia !== undefined)
                setClientesPorDia(patch.clientesPorDia);
              if (patch.horaInicio !== undefined)
                setHoraInicio(patch.horaInicio);
              if (patch.horaFin !== undefined) setHoraFin(patch.horaFin);
            }}
            onNext={() => setPaso(6)}
            onBack={() => setPaso(4)}
          />
        )}

        {/* Paso 6 – Método de pago / código */}
        {paso === 6 && (
          <RegistroPaso6Codigo
            codigo={codigo}
            codigoValido={codigoValido}
            onChange={(valor) => {
              setCodigo(valor);
              if (codigoValido !== null) setCodigoValido(null);
            }}
            onValidar={verificarCodigo}
            onBack={() => setPaso(5)}
          />
        )}

        {/* Paso 7 – Confirmación */}
        {paso === 7 && <RegistroPaso7Confirmacion slugGenerado={slugGenerado} />}

      </div>
    </div>
  );
}
