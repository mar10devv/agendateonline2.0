import { useEffect, useState } from "react";
import { obtenerConfigNegocio, guardarConfigNegocio } from "../lib/firestore";
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
  const [estado, setEstado] = useState<
    "cargando" | "listo" | "guardando" | "sin-acceso"
  >("cargando");
  const [mensaje, setMensaje] = useState("");
  const [mostrarPaleta, setMostrarPaleta] = useState(false);

  const COLORES = [
    "#ef4444", "#f97316", "#eab308", "#22c55e", "#0ea5e9",
    "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#000000",
  ];

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
          } else {
            const negocioRef = doc(db, "Negocios", usuario.uid);
            const configInicial = {
              nombre: data.nombre || "Mi Negocio",
              slug: generarSlug(data.nombre || "mi-negocio"),
              plantilla: data.plantilla || "barberia",
              hoverColor: "#3b82f6",
              logoUrl: "",
              usarLogo: false,
              email: data.email,
            };

            await setDoc(negocioRef, configInicial);

            setUser(usuario);
            setConfig(configInicial);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev: any) => {
      const newConfig = { ...prev, [name]: type === "checkbox" ? checked : value };
      if (name === "nombre") newConfig.slug = generarSlug(value);
      return newConfig;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstado("guardando");
    const ok = await guardarConfigNegocio(user.uid, config);
    setMensaje(ok ? "✅ Cambios guardados correctamente." : "❌ Error al guardar.");
    setEstado("listo");
  };

  if (estado === "cargando")
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-700">
        {/* Loader animado */}
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
    <div className="max-w-5xl mx-auto p-8">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* ✅ Encabezado */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">
            Panel – {config.nombre}
          </h1>
          <a href="/" className="text-sm underline hover:text-gray-200 transition">
            Volver atrás
          </a>
        </div>

        {/* Contenido */}
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-8">
          {/* Nombre */}
          <div className="relative">
            <input
              name="nombre"
              value={config.nombre}
              onChange={handleChange}
              required
              className="peer w-full px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-md 
                         focus:outline-none focus:ring-2 focus:ring-gray-800 transition-all placeholder-transparent"
              placeholder="Nombre del negocio"
            />
            <label
              className={`absolute left-3 top-2.5 text-gray-500 font-medium transition-all
                ${config.nombre
                  ? "-translate-y-6 scale-90 text-gray-700"
                  : "peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100"}
                peer-focus:-translate-y-6 peer-focus:scale-90 peer-focus:text-gray-700`}
            >
              Nombre del negocio
            </label>
          </div>

          {/* Logo */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo de tu negocio
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const imageUrl = URL.createObjectURL(file);
                  setConfig((prev: any) => ({
                    ...prev,
                    logoUrl: imageUrl,
                    usarLogo: true,
                  }));
                }
              }}
              className="block w-full text-sm text-gray-700 
               file:mr-4 file:py-2 file:px-4 
               file:rounded-md file:border-0 
               file:text-sm file:font-semibold 
               file:bg-blue-50 file:text-blue-700 
               hover:file:bg-blue-100 cursor-pointer"
            />

            {config.logoUrl && config.usarLogo && (
              <div className="mt-3">
                <img
                  src={config.logoUrl}
                  alt="Logo del negocio"
                  className="max-h-20 object-contain rounded-md border"
                />
              </div>
            )}

            <div className="flex items-center mt-3">
              <input
                type="checkbox"
                name="usarLogo"
                checked={!config.usarLogo}
                onChange={(e) => {
                  setConfig((prev: any) => ({
                    ...prev,
                    usarLogo: !e.target.checked,
                  }));
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer"
              />
              <label className="ml-2 text-sm text-gray-700">
                Usar texto, no quiero logo
              </label>
            </div>
          </div>

          {/* Color hover */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color del hover
            </label>
            <button
              type="button"
              onClick={() => setMostrarPaleta(!mostrarPaleta)}
              className="flex items-center justify-center w-full px-4 py-2 rounded-xl shadow-sm text-white font-medium transition-transform hover:scale-105"
              style={{ backgroundColor: config.hoverColor }}
            >
              {mostrarPaleta ? "Selecciona un color" : "Cambiar color"}
            </button>

            {mostrarPaleta && (
              <div className="grid grid-cols-5 gap-3 mt-3">
                {COLORES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setConfig((prev: any) => ({ ...prev, hoverColor: color }));
                      setMostrarPaleta(false);
                    }}
                    className="w-10 h-10 rounded-full border-2 border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Plantilla */}
          <div className="relative">
            <select
              name="plantilla"
              value={config.plantilla}
              onChange={handleChange}
              required
              className="peer w-full px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-md 
               focus:outline-none focus:ring-2 focus:ring-gray-800 transition-all"
            >
              <option value="" disabled hidden></option>
              <option value="estilo1">Estilo 1</option>
              <option value="estilo2">Estilo 2</option>
              <option value="estilo3">Estilo 3</option>
            </select>
            <label
              className={`absolute left-3 top-2.5 text-gray-500 font-medium transition-all
              ${config.plantilla
                ? "-translate-y-6 scale-90 text-gray-700"
                : "peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100"}
              peer-focus:-translate-y-6 peer-focus:scale-90 peer-focus:text-gray-700`}
            >
              Plantilla
            </label>
          </div>

          {/* Botones */}
          <div className="flex items-center gap-4 mt-4">
            <button
              type="submit"
              disabled={estado === "guardando"}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 shadow"
            >
              {estado === "guardando" ? "Guardando..." : "Guardar cambios"}
            </button>

            {config?.plantilla && config?.slug && (
              <a
                href={`/${config.plantilla}/${config.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow"
              >
                Visitar web
              </a>
            )}

            {/* 👉 Nuevo botón para empleados */}
            <a
              href="/panel-empleados"
              className="bg-green-600 text-white px-6 py-2 rounded-lg shadow hover:bg-green-700 transition"
            >
              Configurar empleados y agenda
            </a>
          </div>
        </form>

        {/* Vista previa */}
        <div className="border-t px-8 py-6 bg-gray-50">
          <h2 className="text-lg font-semibold mb-4">
            Vista previa de tu plantilla
          </h2>
          <style>{`
            .preview a:hover,
            .preview button:hover,
            .preview .btn:hover {
              background-color: ${config.hoverColor};
              color: white;
              transition: all 0.3s ease;
            }
          `}</style>
          <div className="preview space-y-4 p-4 bg-white rounded-lg shadow">
            <a href="#" className="inline-block px-4 py-2 border rounded-lg">
              Ver servicios
            </a>
            <button className="btn px-4 py-2 border rounded-lg">
              Reservar turno
            </button>
            <div className="card border p-4 rounded-lg shadow hover:shadow-md">
              Tarjeta promocional
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
