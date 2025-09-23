import { useState, useEffect } from "react";
import { db, auth, googleProvider } from "../../lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import Loader from "../ui/loaders";
import FormRegisterEmpresa from "../ui/form-registerEmpresa";
import FormRegisterEmpresa2 from "../ui/form-registerEmpresa2";

const tiposDeNegocio = ["Barbería", "Casa de Tattoo", "Estilista", "Dentista", "Spa"];
const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

type LoaderProps = {
  mensaje?: string;
  color?: string;      // 👉 ahora sí existe
  textColor?: string;  // 👉 ahora sí existe
};

// 🔑 Normaliza string
function normalizarTexto(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

// 🔑 Base desde email (antes del @)
function baseDesdeEmail(email: string) {
  if (!email) return "usuario";
  return normalizarTexto(email.split("@")[0]);
}


// 🔑 Generar slug único en Firestore
async function generarSlugUnico(nombre: string, email: string) {
  // ahora primero usa "nombre", y si no existe usa email
  const base = nombre
    ? normalizarTexto(nombre)
    : baseDesdeEmail(email);

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


export default function PanelRegistro() {
  const [paso, setPaso] = useState(1);

  // 👉 control de acceso
const [tieneNegocio, setTieneNegocio] = useState<boolean | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (user) => {
    if (user) {
      const negocioSnap = await getDoc(doc(db, "Negocios", user.uid));
      if (negocioSnap.exists()) {
        setTieneNegocio(true); // ✅ ya tiene negocio
      } else {
        setTieneNegocio(false); // ✅ no tiene negocio
      }
    } else {
      setTieneNegocio(null); // ✅ no está logueado
    }
    setLoading(false);
  });
  return () => unsub();
}, []);

  // Paso 1
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("");
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // Validaciones
  const nombreValido = nombre.trim().length > 2;
  const emailValido = /\S+@\S+\.\S+/.test(email);
  const telefonoValido = /^\d{8,15}$/.test(telefono);
  const tipoValido = tipoNegocio !== "";
  const formularioValido = nombreValido && emailValido && telefonoValido && tipoValido;

  const handleNext = () => {
    if (!formularioValido) {
      alert("⚠️ Completa todos los campos obligatorios correctamente");
      return;
    }
    setPaso(2);
  };

  // Paso 2
  const [mostrarDias, setMostrarDias] = useState(false);
  const [diasLibres, setDiasLibres] = useState<string[]>([]);
  const [modoTurnos, setModoTurnos] = useState<"jornada" | "personalizado">("jornada");
  const [subModoJornada, setSubModoJornada] = useState<"minutos" | "horas" | null>(null);
const [clientesPorDia, setClientesPorDia] = useState<number | null>(4);
const [horasSeparacion, setHorasSeparacion] = useState<number | null>(1);


  const toggleDia = (dia: string) => {
    setDiasLibres((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

const handleFinalizar = () => {
  if (!modoTurnos) {
    alert("⚠️ Debes seleccionar un modo de turnos (jornada o personalizado).");
    return;
  }

  if (modoTurnos === "jornada") {
    if (!subModoJornada) {
      alert("⚠️ Debes indicar si trabajas por minutos o por horas.");
      return;
    }

    if ((horasSeparacion ?? 0) <= 0) {   // 👈 usa fallback en null
      alert("⚠️ Debes configurar el tiempo de separación entre clientes.");
      return;
    }
  }

  if (modoTurnos === "personalizado") {
    if ((clientesPorDia ?? 0) <= 0) {   // 👈 usa fallback en null
      alert("⚠️ Debes indicar cuántos clientes atiendes por día.");
      return;
    }
  }

  if (diasLibres.length === 0) {
    alert("⚠️ Debes seleccionar al menos un día libre.");
    return;
  }

  // ✅ Normalizar los valores según el modo
  if (modoTurnos === "personalizado") {
    setHorasSeparacion(null);
    setSubModoJornada(null);
  } else if (modoTurnos === "jornada") {
    setClientesPorDia(null);
  }

  // ✅ Si todo está bien, avanza
  setPaso(3);
};



  // Paso 3 → selección de plan
  const [planSeleccionado, setPlanSeleccionado] = useState<"agenda" | "web" | null>(null);

  // Paso 4 → pago
  const [codigo, setCodigo] = useState("");
  const [codigoValido, setCodigoValido] = useState<boolean | null>(null);

  // Paso 5 → confirmación final
  const [finalizado, setFinalizado] = useState(false);
  const [slugGenerado, setSlugGenerado] = useState<string | null>(null);

  // ✅ Validación en Firestore con login
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

      // ✅ Crear negocio y usuario
      const slug = await generarSlugUnico(nombre, email);

// Normalizar tipoNegocio para plantilla
const plantillaNormalizada = tipoNegocio
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, ""); // quita acentos

// 👇 Configuración base de agenda (del paso 2)
const configuracionBase = {
  diasLibres,
  modoTurnos,
  subModoJornada,
  clientesPorDia,
  horasSeparacion,
};

await setDoc(
  doc(db, "Negocios", user.uid),
  {
    nombre,
    emailContacto: email,
    telefono,
    tipoNegocio,
    slug,
    urlPersonal: `http://localhost:4321/agenda/${slug}`,
    plantilla: plantillaNormalizada,
    ownerUid: user.uid,
    plan: planSeleccionado,
    premium: true,
    tipoPremium: planSeleccionado === "agenda" ? "lite" : "gold",
    fechaRegistro: new Date().toISOString(),

    // 👇 Guardar la key de registro
    codigoRegistro: codigo,

    // 🔹 Configuración general
    configuracionAgenda: configuracionBase,

    // 🔹 Duplicado inicial para empleados
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
    tipoPremium: planSeleccionado === "agenda" ? "lite" : "gold",
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
      setFinalizado(true);
      setPaso(5);
    } catch (error) {
      console.error("Error verificando el código:", error);
      alert("⚠️ Ocurrió un error verificando el código.");
    }
  };

  const renderIcon = (campo: string, valido: boolean) => {
    if (!touched[campo]) return null;
    return valido ? (
      <span className="text-green-600 font-bold">✔</span>
    ) : (
      <span className="text-red-600 font-bold">✖</span>
    );
  };

{/* Loarder de cargando */}
if (loading) {
  return (
    <div className="flex justify-center items-center py-10">
      <Loader
        mensaje="Cargando datos..."
        textColor="text-white"
        circleColor="#ffffff"   // ✅ hex en lugar de bg-white
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
    <div className="text-center py-10 text-gray-700">
      🔑 Debes iniciar sesión para registrar tu negocio
    </div>
  );
}


  return (
    <div className="w-full max-w-2xl bg-white p-6 rounded-lg shadow-lg">
      {/* Paso 1 */}
{paso === 1 && (
  <FormRegisterEmpresa
    valoresIniciales={{
      nombreEmpresa: nombre,
      correo: email,
      telefono: telefono,
      tipoNegocio: tipoNegocio,
    }}
    onSubmit={(valores) => {
      setNombre(valores.nombreEmpresa || "");
      setEmail(valores.correo || "");
      setTelefono(valores.telefono || "");
      setTipoNegocio(valores.tipoNegocio || "");

      // 👉 si el form ya estaba válido (botón azul),
      // avanzamos directo al paso 2
      setPaso(2);
    }}
  />
)}
      {/* Paso 2 */}
{paso === 2 && (
  <FormRegisterEmpresa2
    onSubmit={(valores) => {
      // guardamos en los estados locales lo que venga del form
      setDiasLibres(valores.diasLibres);
      setModoTurnos(valores.modoTurnos || "jornada");
      setSubModoJornada(valores.subModoJornada || null);
      setHorasSeparacion(valores.horasSeparacion ?? null);
      setClientesPorDia(valores.clientesPorDia ?? null);

      // cuando el form se valide pasa al paso 3
      setPaso(3);
    }}
  />
)}

      {/* Paso 3 */}
      {paso === 3 && (
        <>
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Elige tu plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plan Agenda */}
            <div className="border rounded-lg p-6 shadow hover:shadow-lg transition">
              <h3 className="text-xl font-bold mb-2">Agenda</h3>
              <p className="text-2xl font-extrabold text-blue-600 mb-4">$15 USD / mes</p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Hasta 3 empleados configurables</li>
                <li>Cancelar turnos</li>
                <li>Agregar servicios</li>
                <li>Personalizar agenda</li>
                <li>Ver turnos ocupados y disponibles</li>
                <li>Ver qué usuario se agendó y qué servicio tomó</li>
              </ul>
              <button
                onClick={() => {
                  setPlanSeleccionado("agenda");
                  setPaso(4);
                }}
                className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Seleccionar Agenda
              </button>
            </div>
            {/* Plan Agenda + Web */}
            <div className="border rounded-lg p-6 shadow hover:shadow-lg transition">
              <h3 className="text-xl font-bold mb-2">Agenda + Web personalizada</h3>
              <p className="text-2xl font-extrabold text-indigo-600 mb-4">$50 USD / mes</p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Página web acorde al negocio</li>
                <li>Incluye agenda completa y personalizable</li>
                <li>Ubicación en Google Maps</li>
                <li>Indexada en buscadores</li>
                <li>Mostrar trabajos de cada empleado</li>
                <li>Panel de personalización: logo, texto, imágenes</li>
                <li>Mensajes directos a clientes</li>
                <li>Estadísticas mes a mes</li>
                <li>Clientes y turnos más frecuentes</li>
                <li>Servicios más consumidos</li>
              </ul>
              <button
                onClick={() => {
                  setPlanSeleccionado("web");
                  setPaso(4);
                }}
                className="mt-4 w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
              >
                Seleccionar Agenda + Web
              </button>
            </div>
          </div>
        </>
      )}

      {/* Paso 4 */}
      {paso === 4 && (
        <>
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Método de pago</h2>
          <div className="mb-4 p-3 bg-gray-100 rounded">
            <p className="text-gray-800">
              Estás contratando:{" "}
              <strong>
                {planSeleccionado === "agenda"
                  ? "Agenda ($15 USD / mes)"
                  : "Agenda + Web personalizada ($50 USD / mes)"}
              </strong>
            </p>
          </div>
          <div className="space-y-6">
            {/* Opción Transferencia */}
            <div className="border rounded-lg p-6 shadow">
              <h3 className="text-xl font-bold mb-2 text-blue-600">Transferencia bancaria</h3>
              <p className="text-gray-700 mb-2">
                Puedes realizar la transferencia a la siguiente cuenta:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li><strong>Banco:</strong> Prex</li>
                <li><strong>Número de cuenta:</strong> 123456789</li>
                <li><strong>Titular:</strong> Martin Martinez</li>
              </ul>
              <button
                onClick={() => alert("✅ Recibiremos tu comprobante de transferencia.")}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Confirmar transferencia
              </button>
            </div>
            {/* Opción Código */}
            <div className="border rounded-lg p-6 shadow">
              <h3 className="text-xl font-bold mb-2 text-indigo-600">Pagar vía código</h3>
              <p className="text-gray-700 mb-4">
                Ingresa tu código de 15 cifras para activar el servicio:
              </p>
              <input
                type="text"
                maxLength={15}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="w-full p-2 border rounded mb-3"
                placeholder="Ej: 123456789012345"
              />
              <button
                onClick={verificarCodigo}
                className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
              >
                Validar código
              </button>
              {codigoValido === true && (
                <p className="mt-2 text-green-600 font-semibold">
                  ✅ Código válido, servicio activado.
                </p>
              )}
              {codigoValido === false && (
                <p className="mt-2 text-red-600 font-semibold">
                  ❌ Código inválido, por favor verifica.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Paso 5 */}
      {paso === 5 && (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">
            🎉 Tu empresa fue validada con éxito
          </h2>
          {planSeleccionado === "agenda" && slugGenerado ? (
            <a
              href={`https://agendateonline.com/agenda/${slugGenerado}`}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Ver mi agenda
            </a>
          ) : (
            <a
              href="/panel/paneldecontrol"
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700"
            >
              Ver mi panel
            </a>
          )}
        </div>
      )}

    </div>
  );
}
